begin;
create table public.community_countries(code text primary key check(code ~ '^[A-Z]{2}$'));
insert into public.community_countries select unnest(string_to_array('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW',' '));
alter table public.community_countries enable row level security;
create policy country_read on public.community_countries for select to authenticated using(true);
revoke all on public.community_countries from public,anon,authenticated;grant select on public.community_countries to authenticated;
create table public.member_location(user_id uuid primary key references public.profiles(id) on delete cascade,country text references public.community_countries(code),region text not null default '' check(length(region)<=80),city text not null default '' check(length(city)<=80),updated_at timestamptz not null default now());
alter table public.member_location enable row level security;
create policy location_read on public.member_location for select to authenticated using(user_id=auth.uid() or public.is_admin());
revoke all on public.member_location from public,anon,authenticated;grant select on public.member_location to authenticated;
create index member_country_idx on public.member_location(country,region,city);
create function public.save_member_location(p_country text,p_region text default '',p_city text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status<>'suspended') then raise exception 'Acceso no disponible';end if;
 if length(coalesce(p_region,''))>80 or length(coalesce(p_city,''))>80 or coalesce(p_region,'') ~ '[<>[:cntrl:]]' or coalesce(p_city,'') ~ '[<>[:cntrl:]]' then raise exception 'Ubicación no válida';end if;
 if nullif(p_country,'') is null then delete from public.member_location where user_id=auth.uid();return;end if;
 if not exists(select 1 from public.community_countries where code=p_country) then raise exception 'Selecciona un país válido';end if;
 insert into public.member_location(user_id,country,region,city) values(auth.uid(),p_country,trim(coalesce(p_region,'')),trim(coalesce(p_city,''))) on conflict(user_id) do update set country=excluded.country,region=excluded.region,city=excluded.city,updated_at=now();
end $$;
create table public.admin_notifications(id bigint generated always as identity primary key,kind text not null check(kind in ('membership','name','report')),target_id uuid not null,created_at timestamptz not null default now());
alter table public.admin_notifications enable row level security;revoke all on public.admin_notifications from public,anon,authenticated;
create table public.admin_alert_state(user_id uuid primary key references public.profiles(id) on delete cascade,seen_id bigint not null default 0);
alter table public.admin_alert_state enable row level security;revoke all on public.admin_alert_state from public,anon,authenticated;
create function public.queue_admin_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='profiles' then
 if new.status='pending' and exists(select 1 from auth.users where id=new.id and email_confirmed_at is not null) then insert into public.admin_notifications(kind,target_id) values('membership',new.id);end if;
 elsif tg_table_name='name_requests' then insert into public.admin_notifications(kind,target_id) values('name',new.id);
 else insert into public.admin_notifications(kind,target_id) values('report',new.id);end if;
 return new;
end $$;
create trigger membership_notification after insert on public.profiles for each row execute function public.queue_admin_notification();
create trigger name_notification after insert on public.name_requests for each row execute function public.queue_admin_notification();
create trigger report_notification after insert on public.reports for each row execute function public.queue_admin_notification();
create function public.notify_verified_membership() returns trigger language plpgsql security definer set search_path='' as $$
begin if old.email_confirmed_at is null and new.email_confirmed_at is not null and exists(select 1 from public.profiles where id=new.id and status='pending') and not exists(select 1 from public.admin_notifications where kind='membership' and target_id=new.id) then insert into public.admin_notifications(kind,target_id) values('membership',new.id);end if;return new;end $$;
create trigger nextone_verified_membership after update of email_confirmed_at on auth.users for each row execute function public.notify_verified_membership();
revoke all on function public.notify_verified_membership() from public,anon,authenticated;

create index profiles_queue_idx on public.profiles(status,created_at);
create index admin_notifications_date_idx on public.admin_notifications(created_at desc);
create function public.admin_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Solo administración';end if;
 return jsonb_build_object('pending',(select count(*) from public.profiles where status='pending'),'names',(select count(*) from public.name_requests where status='pending'),'reports',(select count(*) from public.reports where not resolved),'unread',(select count(*) from public.admin_notifications where id>coalesce((select seen_id from public.admin_alert_state where user_id=auth.uid()),0)),'latest_id',(select coalesce(max(id),0) from public.admin_notifications),'latest',coalesce((select jsonb_agg(row_to_json(n)) from(select id,kind,target_id,created_at from public.admin_notifications order by id desc limit 8)n),'[]'));
end $$;
create function public.mark_admin_alerts(p_through bigint) returns void language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Solo administración';end if;
 insert into public.admin_alert_state(user_id,seen_id) values(auth.uid(),least(greatest(coalesce(p_through,0),0),(select coalesce(max(id),0) from public.admin_notifications))) on conflict(user_id) do update set seen_id=greatest(public.admin_alert_state.seen_id,excluded.seen_id);
end $$;
-- Verified identities are required even when approving a request through the legacy RPC.
alter function public.admin_member(uuid,text,text,text) rename to admin_member_before_verification;
revoke all on function public.admin_member_before_verification(uuid,text,text,text) from public,anon,authenticated;
create function public.admin_member(p_user uuid,p_status text,p_role text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if p_status='active' and not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'El correo de la persona todavía no está verificado';end if;
 perform public.admin_member_before_verification(p_user,p_status,p_role,p_reason);
end $$;
create table public.invitation_checks(id bigint generated always as identity primary key,invitation_id uuid references public.invitations(id),user_id uuid not null references public.profiles(id),result text not null,created_at timestamptz not null default now());
alter table public.invitation_checks enable row level security;revoke all on public.invitation_checks from public,anon,authenticated;
create index invitation_check_idx on public.invitation_checks(invitation_id,created_at);
create index invitation_check_user_idx on public.invitation_checks(user_id,created_at);
create function public.inspect_invitation(p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare inv public.invitations; email_address text;result text:='valid';
begin
 if auth.uid() is null then raise exception 'Inicia sesión para verificar la invitación';end if;
 if(select count(*) from public.invitation_checks where user_id=auth.uid() and created_at>now()-interval '5 minutes')>=20 then raise exception 'Espera unos minutos antes de verificar de nuevo';end if;
 select * into inv from public.invitations where token=p_token;
 select lower(email) into email_address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if inv.id is null then result:='invalid';elsif inv.revoked then result:='revoked';elsif inv.expires_at<=now() then result:='expired';elsif exists(select 1 from public.profiles where id=auth.uid() and status='suspended') then result:='suspended';elsif email_address is null then result:='unverified';elsif inv.recipient_email is not null and inv.recipient_email<>email_address then result:='wrong_email';elsif exists(select 1 from public.invitation_claims where invitation_id=inv.id and user_id=auth.uid()) then result:='claimed';elsif inv.used>=inv.max_uses then result:='full';end if;
 insert into public.invitation_checks(invitation_id,user_id,result) values(inv.id,auth.uid(),result);
 return jsonb_build_object('result',result,'label',case when result in('valid','claimed') then inv.label else '' end,'approval_required',inv.recipient_email is null or not inv.direct);
end $$;
create or replace function public.claim_invitation(p_token uuid) returns text language plpgsql security definer set search_path='' as $$
declare inv public.invitations;member public.profiles;email_address text;new_status text;
begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 select * into member from public.profiles where id=auth.uid() for update;
 if member.id is null or member.status='suspended' then raise exception 'La invitación no puede reactivar una cuenta suspendida';end if;
 select * into inv from public.invitations where token=p_token for update;
 if inv.id is null or inv.revoked or inv.expires_at<=now() then raise exception 'Invitación inválida o vencida';end if;
 select lower(email) into email_address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if email_address is null or(inv.recipient_email is not null and inv.recipient_email<>email_address) then raise exception 'Usa el correo verificado al que se dirigió la invitación';end if;
 if exists(select 1 from public.invitation_claims where invitation_id=inv.id and user_id=auth.uid()) then return member.status;end if;
 if inv.used>=inv.max_uses then raise exception 'No quedan invitaciones';end if;
 insert into public.invitation_claims(invitation_id,user_id) values(inv.id,auth.uid());update public.invitations set used=used+1 where id=inv.id;
 -- Shared links always require an administrative decision, including older shared links.
 new_status:=case when member.status='active' or(inv.recipient_email is not null and inv.direct) then 'active' else 'pending' end;
 update public.profiles set source=inv.label,status=new_status where id=auth.uid();
 insert into public.invitation_checks(invitation_id,user_id,result) values(inv.id,auth.uid(),'claimed');
 return new_status;
end $$;
create function public.create_managed_invitation(p_label text,p_email text,p_limit integer,p_expires timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if p_expires<=now() or p_expires>now()+interval '90 days' or length(trim(coalesce(p_label,''))) not between 3 and 150 or(nullif(trim(p_email),'') is not null and (p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_limit<>1)) then raise exception 'Revisa nombre, correo, cupo y vencimiento (máximo 90 días)';end if;
 return public.create_invitation(p_label,trim(p_email),p_limit,p_expires,false);
end $$;
alter table public.reports add column workflow text not null default 'open' check(workflow in ('open','in_review','resolved','dismissed')),add column priority text not null default 'normal' check(priority in ('normal','high','urgent')),add column assigned_to uuid references public.profiles(id),add column reviewed_at timestamptz;
update public.reports set workflow='resolved' where resolved;
create index reports_queue_idx on public.reports(workflow,priority,created_at);
create table public.report_history(id bigint generated always as identity primary key,report_id uuid not null references public.reports(id),actor_id uuid not null references public.profiles(id),workflow text not null,priority text not null,note text not null,created_at timestamptz not null default now());
alter table public.report_history enable row level security;revoke all on public.report_history from public,anon,authenticated;
create function public.manage_report(p_id uuid,p_workflow text,p_priority text,p_assignee uuid,p_note text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if p_workflow is null or p_workflow not in('open','in_review','resolved','dismissed') or p_priority is null or p_priority not in('normal','high','urgent') or length(trim(coalesce(p_note,''))) not between 5 and 2000 then raise exception 'Selecciona estado, prioridad y una nota de al menos 5 caracteres';end if;
 if p_assignee is not null and not exists(select 1 from public.profiles where id=p_assignee and status='active' and role='admin') then raise exception 'Asigna un administrador activo';end if;
 perform 1 from public.reports where id=p_id for update;if not found then raise exception 'Reporte no disponible';end if;
 update public.reports set workflow=p_workflow,priority=p_priority,assigned_to=p_assignee,resolved=p_workflow in('resolved','dismissed'),decision=case when p_workflow in('resolved','dismissed') then trim(p_note) else '' end,reviewed_at=now() where id=p_id;
 insert into public.report_history(report_id,actor_id,workflow,priority,note) values(p_id,auth.uid(),p_workflow,p_priority,trim(p_note));
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'report_workflow',p_id,p_workflow||': '||trim(p_note));
end $$;
create or replace function public.resolve_report(p_id uuid,p_decision text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.manage_report(p_id,'resolved','normal',auth.uid(),p_decision);end $$;
create function public.admin_inbox(p_section text,p_status text default '',p_query text default '',p_offset integer default 0,p_limit integer default 20) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rows jsonb;total bigint;
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if p_section not in('members','names','invitations','reports') or p_offset is null or p_offset<0 or p_limit is null or p_limit not between 1 and 50 or length(coalesce(p_query,''))>180 then raise exception 'Filtros inválidos';end if;
 if p_section='members' then
 select count(*) into total from public.profiles p join auth.users u on u.id=p.id where(p_status='' or p.status=p_status) and(p.name ilike '%'||p_query||'%' or coalesce(u.email,'') ilike '%'||p_query||'%');
 select coalesce(jsonb_agg(row_to_json(r)),'[]') into rows from(select p.id,p.name,p.nickname,p.bio,p.skills,p.status,p.role,p.source,p.cohort,p.created_at,u.email,u.email_confirmed_at is not null verified from public.profiles p join auth.users u on u.id=p.id where(p_status='' or p.status=p_status) and(p.name ilike '%'||p_query||'%' or coalesce(u.email,'') ilike '%'||p_query||'%') order by p.created_at,p.id offset p_offset limit p_limit)r;
 elsif p_section='names' then
 select count(*) into total from public.name_requests n where(p_status='' or n.status=p_status) and n.requested_name ilike '%'||p_query||'%';
 select coalesce(jsonb_agg(row_to_json(r)),'[]') into rows from(select n.*,p.name from public.name_requests n join public.profiles p on p.id=n.user_id where(p_status='' or n.status=p_status) and n.requested_name ilike '%'||p_query||'%' order by n.created_at,n.id offset p_offset limit p_limit)r;
 elsif p_section='invitations' then
 select count(*) into total from public.invitations i where i.label ilike '%'||p_query||'%' and(p_status='' or(p_status='active' and not i.revoked and i.expires_at>now() and i.used<i.max_uses) or(p_status='revoked' and i.revoked) or(p_status='expired' and not i.revoked and i.expires_at<=now()) or(p_status='full' and not i.revoked and i.expires_at>now() and i.used>=i.max_uses));
 select coalesce(jsonb_agg(row_to_json(r)),'[]') into rows from(select i.*,(select count(*) from public.invitation_checks v where v.invitation_id=i.id) checks,(select count(*) from public.invitation_claims c join public.profiles p on p.id=c.user_id where c.invitation_id=i.id and p.status='active') approved from public.invitations i where i.label ilike '%'||p_query||'%' and(p_status='' or(p_status='active' and not i.revoked and i.expires_at>now() and i.used<i.max_uses) or(p_status='revoked' and i.revoked) or(p_status='expired' and not i.revoked and i.expires_at<=now()) or(p_status='full' and not i.revoked and i.expires_at>now() and i.used>=i.max_uses)) order by i.expires_at desc,i.id offset p_offset limit p_limit)r;
 else
 select count(*) into total from public.reports r where(p_status='' or(p_status='pending' and not r.resolved) or r.workflow=p_status) and r.reason ilike '%'||p_query||'%';
 select coalesce(jsonb_agg(row_to_json(x)),'[]') into rows from(select r.*,p.name,c.title,c.kind from public.reports r join public.profiles p on p.id=r.user_id left join public.content c on c.id=r.content_id where(p_status='' or(p_status='pending' and not r.resolved) or r.workflow=p_status) and r.reason ilike '%'||p_query||'%' order by r.resolved,case r.priority when 'urgent' then 0 when 'high' then 1 else 2 end,r.created_at,r.id offset p_offset limit p_limit)x;
 end if;return jsonb_build_object('rows',rows,'total',total);
end $$;
create function public.admin_record(p_section text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Solo administración';end if;
 if p_section='invitations' then return jsonb_build_object('claims',coalesce((select jsonb_agg(row_to_json(x)) from(select p.name,p.status,u.email,c.claimed_at from public.invitation_claims c join public.profiles p on p.id=c.user_id join auth.users u on u.id=p.id where c.invitation_id=p_id order by c.claimed_at desc limit 100)x),'[]'),'checks',coalesce((select jsonb_agg(row_to_json(x)) from(select p.name,c.result,c.created_at from public.invitation_checks c join public.profiles p on p.id=c.user_id where c.invitation_id=p_id order by c.created_at desc limit 100)x),'[]'));
 elsif p_section='reports' then return jsonb_build_object('comment',(select c.body from public.comments c join public.reports r on r.comment_id=c.id where r.id=p_id),'history',coalesce((select jsonb_agg(row_to_json(x)) from(select h.*,p.name from public.report_history h join public.profiles p on p.id=h.actor_id where h.report_id=p_id order by h.created_at,h.id)x),'[]'));
 end if;raise exception 'Registro no válido';
end $$;
create function public.community_geography(p_from timestamptz,p_until timestamptz,p_country text default '',p_region text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if p_from is null or p_until is null or p_until<=p_from or p_until-p_from>interval '366 days' or length(p_region)>80 or(p_country<>'' and not exists(select 1 from public.community_countries where code=p_country)) then raise exception 'Revisa período y ubicación';end if;
 with members as materialized(select p.id,p.created_at,l.country,nullif(l.region,'') region,nullif(l.city,'') city from public.profiles p left join public.member_location l on l.user_id=p.id where p.status='active'),selected as materialized(select * from members where(p_country='' or country=p_country) and(p_region='' or lower(region)=lower(p_region))),activity as materialized(select user_id,count(*) actions from public.activity_history where occurred_at>=p_from and occurred_at<p_until group by user_id),groups as(select s.country,case when p_country<>'' then s.region end region,case when p_country<>'' and p_region<>'' then s.city end city,count(*) members,count(*) filter(where coalesce(a.actions,0)>0) participants,coalesce(sum(a.actions),0) actions,count(*) filter(where s.created_at>=p_from and s.created_at<p_until) joined from selected s left join activity a on a.user_id=s.id group by 1,2,3)
 select jsonb_build_object('total_members',(select count(*) from members),'declared',(select count(*) from members where country is not null),'filtered_members',(select count(*) from selected),'rows',coalesce((select jsonb_agg(row_to_json(g) order by members desc,country,region,city) from groups g),'[]')) into result;return result;
end $$;
-- Compact catalogue payload: full bodies and full portfolios are loaded only when opened.
create function public.content_catalog() returns setof public.content language sql stable security invoker set search_path='' as $$
 select (jsonb_populate_record(null::public.content,to_jsonb(c)||jsonb_build_object('body',left(c.body,600),'project_plan','{}'::jsonb))).* from public.content c
$$;
revoke all on function public.queue_admin_notification() from public,anon,authenticated;
revoke all on function public.save_member_location(text,text,text),public.admin_overview(),public.mark_admin_alerts(bigint),public.admin_member(uuid,text,text,text),public.inspect_invitation(uuid),public.create_managed_invitation(text,text,integer,timestamptz),public.manage_report(uuid,text,text,uuid,text),public.admin_inbox(text,text,text,integer,integer),public.admin_record(text,uuid),public.community_geography(timestamptz,timestamptz,text,text),public.content_catalog() from public,anon;
grant execute on function public.save_member_location(text,text,text),public.admin_overview(),public.mark_admin_alerts(bigint),public.admin_member(uuid,text,text,text),public.inspect_invitation(uuid),public.create_managed_invitation(text,text,integer,timestamptz),public.manage_report(uuid,text,text,uuid,text),public.admin_inbox(text,text,text,integer,integer),public.admin_record(text,uuid),public.community_geography(timestamptz,timestamptz,text,text),public.content_catalog() to authenticated;

create function public.admin_operations_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_day date:=(now() at time zone 'America/Bogota')::date-13;end_day date:=(now() at time zone 'America/Bogota')::date;
begin if not public.is_admin() then raise exception 'Solo administración';end if;
 return jsonb_build_object('states',(select jsonb_build_object('active',count(*) filter(where status='active'),'pending',count(*) filter(where status='pending'),'suspended',count(*) filter(where status='suspended')) from public.profiles),'daily',(select jsonb_agg(row_to_json(x) order by day) from(select d::date as day,(select count(*) from public.profiles p join auth.users u on u.id=p.id where u.email_confirmed_at is not null and p.created_at>=(d::date::timestamp at time zone 'America/Bogota') and p.created_at<((d::date+1)::timestamp at time zone 'America/Bogota')) count from generate_series(start_day,end_day,interval '1 day') d)x),'countries',coalesce((select jsonb_agg(row_to_json(x)) from(select l.country,count(*) members from public.member_location l join public.profiles p on p.id=l.user_id where p.status='active' and l.country is not null group by l.country order by count(*) desc,l.country limit 5)x),'[]'),'declared',(select count(*) from public.member_location l join public.profiles p on p.id=l.user_id where p.status='active' and l.country is not null));
end $$;
revoke all on function public.admin_operations_metrics() from public,anon;grant execute on function public.admin_operations_metrics() to authenticated;
commit;
