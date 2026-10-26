-- Apply after 018. No historical attendance is inferred from link clicks.
begin;
alter table public.profiles add column if not exists fellowship_location_completed_at timestamptz;
alter table public.registrations add column if not exists confirmed_at timestamptz;
create table if not exists public.fellowship_settings(id boolean primary key default true check(id),started_at timestamptz not null default now());
alter table public.fellowship_settings enable row level security;
insert into public.fellowship_settings(id) values(true) on conflict do nothing;
revoke all on public.fellowship_settings from public,anon,authenticated;
create table if not exists public.event_surveys(
 content_id uuid references public.content(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,
 attended boolean not null,rating integer check(rating between 1 and 5),recommend integer check(recommend between 0 and 10),comment text not null default '' check(length(comment)<=2000),
 created_at timestamptz not null default now(),primary key(content_id,user_id),check(not attended or (rating is not null and recommend is not null))
);
alter table public.event_surveys enable row level security;
revoke all on public.event_surveys from public,anon,authenticated;
grant select on public.event_surveys to authenticated;
create policy survey_read on public.event_surveys for select to authenticated using(user_id=auth.uid() or public.is_admin());

-- Location is a separate gate, allowing approved members to supply it without a circular access check.
create or replace function public.save_member_location(p_country text,p_region text default '',p_city text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Espera la aprobación';end if;
 if nullif(trim(p_region),'') is null or nullif(trim(p_city),'') is null or nullif(p_country,'') is null then raise exception 'Completa país, región y ciudad';end if;
 perform public.save_member_location_before_onboarding(p_country,p_region,p_city);
 update public.profiles set fellowship_location_completed_at=now() where id=auth.uid();
end $$;
-- Backfill only members whose declared location was already complete.
update public.profiles p set fellowship_location_completed_at=now() from public.member_location l where l.user_id=p.id and l.country is not null and trim(l.region)<>'' and trim(l.city)<>'' and p.fellowship_location_completed_at is null;
create or replace function public.active_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active' and onboarding_completed_at is not null and fellowship_location_completed_at is not null)
 and not exists(select 1 from public.registrations r join public.content c on c.id=r.content_id cross join public.fellowship_settings s where r.user_id=auth.uid() and r.status<>'cancelled' and c.kind in ('event','webinar') and c.published and c.ends_at<=now() and c.ends_at>=s.started_at and not exists(select 1 from public.event_surveys v where v.content_id=c.id and v.user_id=auth.uid()))
$$;
-- Bootstrap the mandatory location before the existing atomic profile completion RPC.
alter function public.complete_onboarding(jsonb,jsonb,jsonb) rename to complete_onboarding_before_fellowship;
revoke all on function public.complete_onboarding_before_fellowship(jsonb,jsonb,jsonb) from public,anon,authenticated;
create function public.complete_onboarding(p_profile jsonb,p_theme jsonb,p_location jsonb default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.save_member_location(p_location->>'country',p_location->>'region',p_location->>'city');
 perform public.complete_onboarding_before_fellowship(p_profile,p_theme,p_location);
end $$;
revoke all on function public.complete_onboarding(jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.complete_onboarding(jsonb,jsonb,jsonb) to authenticated;

create function public.fellowship_gate() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 return jsonb_build_object('surveys',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'ends_at',c.ends_at) order by c.ends_at) from public.content c join public.registrations r on r.content_id=c.id cross join public.fellowship_settings s where r.user_id=auth.uid() and r.status<>'cancelled' and c.kind in ('event','webinar') and c.published and c.ends_at<=now() and c.ends_at>=s.started_at and not exists(select 1 from public.event_surveys v where v.content_id=c.id and v.user_id=auth.uid())),'[]'));
end $$;
create function public.submit_event_survey(p_content uuid,p_attended boolean,p_rating integer,p_recommend integer,p_comment text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active' and onboarding_completed_at is not null and fellowship_location_completed_at is not null) then raise exception 'Completa tu perfil y ubicación';end if;
 if not exists(select 1 from public.registrations r join public.content c on c.id=r.content_id where r.user_id=auth.uid() and r.content_id=p_content and r.status<>'cancelled' and c.published and c.ends_at<=now() and c.kind in ('event','webinar')) then raise exception 'Encuesta no disponible';end if;
 if p_attended is null then raise exception 'Indica si asististe';end if;
 insert into public.event_surveys(content_id,user_id,attended,rating,recommend,comment) values(p_content,auth.uid(),p_attended,case when p_attended then p_rating end,case when p_attended then p_recommend end,trim(coalesce(p_comment,''))) on conflict(content_id,user_id) do update set attended=excluded.attended,rating=excluded.rating,recommend=excluded.recommend,comment=excluded.comment;
 perform public.append_activity(p_content,auth.uid(),'satisfaction_submitted',jsonb_build_object('attended',p_attended,'rating',p_rating));
end $$;
create function public.confirm_event(p_content uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();
 if not exists(select 1 from public.content where id=p_content and published and ends_at>now() and kind in ('event','webinar')) then raise exception 'Evento no disponible';end if;
 update public.registrations set confirmed_at=now() where content_id=p_content and user_id=auth.uid() and status='registered' and confirmed_at is null;
 if found then perform public.append_activity(p_content,auth.uid(),'participation_confirmed');end if;
end $$;
create function public.reset_event_confirmation() returns trigger language plpgsql set search_path='' as $$
begin if new.status='cancelled' or (old.status='cancelled' and new.status='registered') then new.confirmed_at:=null;end if;return new;end $$;
create trigger event_confirmation_reset before update of status on public.registrations for each row execute function public.reset_event_confirmation();

-- Explicit, visible content interactions only; no keystrokes, message bodies or external browsing.
create function public.record_content_view(p_content uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();
 if not public.can_read_content(p_content) then raise exception 'Contenido no disponible';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text),hashtext(p_content::text));
 if not exists(select 1 from public.activity_history where user_id=auth.uid() and content_id=p_content and event='content_viewed' and occurred_at>now()-interval '15 minutes') then perform public.append_activity(p_content,auth.uid(),'content_viewed');end if;
end $$;
create function public.admin_member_activity(p_user uuid,p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'member_activity_consulted',p_user,'Consulta de trazabilidad individual');
 return jsonb_build_object('total',(select count(*) from public.activity_history where user_id=p_user),'events',coalesce((select jsonb_agg(to_jsonb(x) order by x.occurred_at desc,x.id desc) from(select a.id,a.event,a.occurred_at,a.details,c.title,c.kind from public.activity_history a left join public.content c on c.id=a.content_id where a.user_id=p_user order by a.occurred_at desc,a.id desc offset greatest(0,p_offset) limit 50)x),'[]'),'registrations',coalesce((select jsonb_agg(to_jsonb(x)) from(select c.title,r.status,r.created_at,r.confirmed_at,r.joined_at from public.registrations r join public.content c on c.id=r.content_id where r.user_id=p_user order by r.created_at desc limit 100)x),'[]'),'location',(select to_jsonb(l)-'user_id' from public.member_location l where user_id=p_user));
end $$;
create function public.event_attendance_roster(p_content uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() and not exists(select 1 from public.content where id=p_content and owner_id=auth.uid() and public.active_member()) then raise exception 'Solo responsable o administración';end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from(select p.id,p.name,r.status,r.created_at,r.confirmed_at,r.joined_at,exists(select 1 from public.event_surveys s where s.user_id=r.user_id and s.content_id=r.content_id) surveyed from public.registrations r join public.profiles p on p.id=r.user_id where r.content_id=p_content)x),'[]');
end $$;
create function public.fellowship_analytics(p_days integer default 30) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare since timestamptz:=now()-make_interval(days=>greatest(1,least(365,p_days)));
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 return jsonb_build_object('since',since,'generated_at',now(),
 'members',(select count(*) from public.profiles where status='active'),'new_members',(select count(*) from public.profiles where created_at>=since),
 'participants',(select count(distinct user_id) from public.activity_history where occurred_at>=since),
 'actions',(select count(*) from public.activity_history where occurred_at>=since),
 'funnel',(select jsonb_build_object('registered',count(*),'confirmed',count(*) filter(where confirmed_at is not null),'access',count(*) filter(where joined_at is not null),'attended',count(*) filter(where status='attended')) from public.registrations where status<>'cancelled' and created_at>=since),
 'satisfaction',(select jsonb_build_object('responses',count(*),'attended',count(*) filter(where attended),'average',avg(rating),'nps',case when count(recommend)>0 then round(100.0*(count(*) filter(where recommend>=9)-count(*) filter(where recommend<=6))/count(recommend),1) end) from public.event_surveys where created_at>=since),
 'daily',coalesce((select jsonb_agg(to_jsonb(x) order by x.day) from(select (d at time zone 'America/Bogota')::date as day,(select count(*) from public.activity_history a where a.occurred_at>=greatest(d,since) and a.occurred_at<least(d+interval '1 day',now())) actions from generate_series(date_trunc('day',since at time zone 'America/Bogota') at time zone 'America/Bogota',date_trunc('day',now() at time zone 'America/Bogota') at time zone 'America/Bogota',interval '1 day') d)x),'[]'),
 'kinds',coalesce((select jsonb_agg(to_jsonb(x)) from(select c.kind,count(*) actions from public.activity_history a join public.content c on c.id=a.content_id where a.occurred_at>=since group by c.kind order by count(*) desc)x),'[]'));
end $$;
revoke all on function public.fellowship_gate(),public.submit_event_survey(uuid,boolean,integer,integer,text),public.confirm_event(uuid),public.record_content_view(uuid),public.admin_member_activity(uuid,integer),public.event_attendance_roster(uuid),public.fellowship_analytics(integer) from public,anon;
grant execute on function public.fellowship_gate(),public.submit_event_survey(uuid,boolean,integer,integer,text),public.confirm_event(uuid),public.record_content_view(uuid),public.admin_member_activity(uuid,integer),public.event_attendance_roster(uuid),public.fellowship_analytics(integer) to authenticated;
commit;
