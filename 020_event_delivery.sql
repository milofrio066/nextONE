begin;
create table public.event_meetings(content_id uuid primary key references public.content(id) on delete cascade,provider text not null check(provider in ('zoom','meet')),meeting_id text not null check(length(meeting_id) between 3 and 200),unique(provider,meeting_id));
alter table public.event_meetings enable row level security;
revoke all on public.event_meetings from public,anon,authenticated;
grant select on public.event_meetings to authenticated;
create policy meeting_read on public.event_meetings for select to authenticated using(public.is_admin() or exists(select 1 from public.content where id=content_id and owner_id=auth.uid() and public.active_member()));
create table public.attendance_receipts(id text primary key,content_id uuid references public.content(id) on delete cascade,user_id uuid references public.profiles(id),provider text not null,received_at timestamptz not null default now(),matched boolean not null);
alter table public.attendance_receipts enable row level security;
revoke all on public.attendance_receipts from public,anon,authenticated;
create table public.event_email_deliveries(content_id uuid references public.content(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,lease uuid,leased_at timestamptz,attempts integer not null default 0,sent_at timestamptz,last_error text not null default '',primary key(content_id,user_id));
alter table public.event_email_deliveries enable row level security;
revoke all on public.event_email_deliveries from public,anon,authenticated;
create function public.configure_event_meeting(p_content uuid,p_provider text,p_meeting text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() and not exists(select 1 from public.content where id=p_content and owner_id=auth.uid() and public.active_member()) then raise exception 'Solo responsable o administración';end if;
 if not exists(select 1 from public.content where id=p_content and kind in ('event','webinar')) then raise exception 'Selecciona un evento o webinar';end if;
 insert into public.event_meetings values(p_content,p_provider,trim(p_meeting)) on conflict(content_id) do update set provider=excluded.provider,meeting_id=excluded.meeting_id;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'meeting_configured',p_content,p_provider);
end $$;
create function public.ingest_verified_attendance(p_receipt text,p_provider text,p_meeting text,p_email text) returns boolean language plpgsql security definer set search_path='' as $$
declare target uuid;person uuid;inserted integer;
begin
 select content_id into target from public.event_meetings m join public.content c on c.id=m.content_id where provider=p_provider and meeting_id=p_meeting and c.published and c.starts_at<=now()+interval '1 day' and c.ends_at>=now()-interval '7 days';
 if target is null then return false;end if;
 select r.user_id into person from public.registrations r join auth.users u on u.id=r.user_id where r.content_id=target and r.status<>'cancelled' and lower(u.email)=lower(trim(p_email)) and u.email_confirmed_at is not null;
 insert into public.attendance_receipts values(left(p_receipt,250),target,person,p_provider,now(),person is not null) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return person is not null;end if;
 if person is not null then update public.registrations set status='attended' where content_id=target and user_id=person;end if;
 return person is not null;
end $$;
create function public.claim_event_reminder() returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.event_email_deliveries;token uuid:=gen_random_uuid();result jsonb;
begin
 -- Eligible from two hours after the end, for new events only. No backlog spam.
 insert into public.event_email_deliveries(content_id,user_id)
 select c.id,r.user_id from public.content c join public.registrations r on r.content_id=c.id join public.profiles p on p.id=r.user_id cross join public.fellowship_settings s
 where c.kind in ('event','webinar') and c.published and c.ends_at>=s.started_at and c.ends_at<=now()-interval '2 hours' and r.status<>'cancelled' and p.status='active' and not exists(select 1 from public.event_surveys v where v.content_id=c.id and v.user_id=r.user_id) on conflict do nothing;
 select d.* into job from public.event_email_deliveries d join public.content c on c.id=d.content_id join public.registrations r on r.content_id=d.content_id and r.user_id=d.user_id join public.profiles p on p.id=d.user_id
 where d.sent_at is null and d.attempts<5 and (d.leased_at is null or d.leased_at<now()-interval '10 minutes') and c.published and c.ends_at<=now()-interval '2 hours' and r.status<>'cancelled' and p.status='active' and not exists(select 1 from public.event_surveys v where v.content_id=d.content_id and v.user_id=d.user_id)
 order by c.ends_at for update of d skip locked limit 1;
 if not found then return null;end if;
 update public.event_email_deliveries set lease=token,leased_at=now(),attempts=attempts+1 where content_id=job.content_id and user_id=job.user_id;
 select jsonb_build_object('content_id',c.id,'user_id',u.id,'email',u.email,'title',c.title,'lease',token) into result from public.content c join auth.users u on u.id=job.user_id where c.id=job.content_id and u.email_confirmed_at is not null;
 return result;
end $$;
create function public.finish_event_reminder(p_content uuid,p_user uuid,p_lease uuid,p_sent boolean) returns void language plpgsql security definer set search_path='' as $$
begin update public.event_email_deliveries set sent_at=case when p_sent then now() end,last_error=case when p_sent then '' else 'El proveedor no confirmó el envío' end where content_id=p_content and user_id=p_user and lease=p_lease;end $$;
revoke all on function public.configure_event_meeting(uuid,text,text) from public,anon;
grant execute on function public.configure_event_meeting(uuid,text,text) to authenticated;
revoke all on function public.ingest_verified_attendance(text,text,text,text),public.claim_event_reminder(),public.finish_event_reminder(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.ingest_verified_attendance(text,text,text,text),public.claim_event_reminder(),public.finish_event_reminder(uuid,uuid,uuid,boolean) to service_role;
create function public.ingest_google_attendance(p_receipt text,p_meeting text,p_google_user text) returns boolean language plpgsql security definer set search_path='' as $$
declare mail text;
begin
 -- Google identity must be linked to the same nextONE account. Never match display names.
 select u.email into mail from auth.identities i join auth.users u on u.id=i.user_id where i.provider='google' and i.identity_data->>'sub'=replace(p_google_user,'users/','') and u.email_confirmed_at is not null;
 return public.ingest_verified_attendance(p_receipt,'meet',p_meeting,coalesce(mail,''));
end $$;
revoke all on function public.ingest_google_attendance(text,text,text) from public,anon,authenticated;
grant execute on function public.ingest_google_attendance(text,text,text) to service_role;
commit;
