begin;
create table public.admin_email_outbox(id uuid primary key default gen_random_uuid(),notification_id bigint not null unique references public.admin_notifications(id),status text not null default 'pending' check(status in('pending','sending','sent','failed')),attempts integer not null default 0,lease_id uuid,locked_until timestamptz,provider_id text,last_error text not null default '',created_at timestamptz not null default now(),sent_at timestamptz);
alter table public.admin_email_outbox enable row level security;revoke all on public.admin_email_outbox from public,anon,authenticated;grant select on public.admin_email_outbox to service_role;
create index admin_mail_queue_idx on public.admin_email_outbox(status,created_at);
create function public.enqueue_admin_email() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.admin_email_outbox(notification_id) values(new.id);return new;end $$;
create trigger enqueue_admin_email after insert on public.admin_notifications for each row execute function public.enqueue_admin_email();
-- Existing historical alerts are not emailed on installation.
create function public.admin_email_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Solo administración';end if;return jsonb_build_object('pending',(select count(*) from public.admin_email_outbox where status in('pending','sending')),'failed',(select count(*) from public.admin_email_outbox where status='failed'),'sent',(select count(*) from public.admin_email_outbox where status='sent'));end $$;
create function public.claim_admin_email(p_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.admin_email_outbox;kind text;
begin
 select * into item from public.admin_email_outbox where(p_id is null or id=p_id) and attempts<5 and(status in('pending','failed') or(status='sending' and locked_until<now())) order by created_at for update skip locked limit 1;
 if item.id is null then return null;end if;
 item.lease_id:=gen_random_uuid();update public.admin_email_outbox set status='sending',attempts=attempts+1,lease_id=item.lease_id,locked_until=now()+interval '2 minutes',last_error='' where id=item.id;
 select n.kind into kind from public.admin_notifications n where n.id=item.notification_id;
 return jsonb_build_object('id',item.id,'lease',item.lease_id,'kind',kind);
end $$;
create function public.finish_admin_email(p_id uuid,p_lease uuid,p_sent boolean,p_provider text default '',p_error text default '') returns void language plpgsql security definer set search_path='' as $$
begin update public.admin_email_outbox set status=case when p_sent then 'sent' else 'failed' end,provider_id=left(p_provider,200),last_error=left(p_error,300),sent_at=case when p_sent then now() else null end,locked_until=null where id=p_id and lease_id=p_lease and status='sending';if not found then raise exception 'El intento de envío ya no está vigente';end if;end $$;
revoke all on function public.enqueue_admin_email() from public,anon,authenticated;
revoke all on function public.admin_email_status() from public,anon;grant execute on function public.admin_email_status() to authenticated;
revoke all on function public.claim_admin_email(uuid),public.finish_admin_email(uuid,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.claim_admin_email(uuid),public.finish_admin_email(uuid,uuid,boolean,text,text) to service_role;
commit;
