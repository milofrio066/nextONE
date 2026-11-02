-- Apply after 021. Group mentorships reuse events: registration, access, attendance and surveys stay the same.
-- Repeatable. Revert: restore active_member, can_read_content, register_event, get_join_link, confirm_event,
-- mark_attendance and covers_read from earlier migrations, then drop mentorship_* and profiles.access_tier.
begin;
alter table public.profiles add column if not exists access_tier text not null default 'maker';
do $$begin
 if not exists(select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_access_tier_check') then alter table public.profiles add constraint profiles_access_tier_check check(access_tier in ('maker','subscriber'));end if;
 if not exists(select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_tier_role_check') then alter table public.profiles add constraint profiles_tier_role_check check(access_tier='maker' or role='member');end if;
end $$;
create table if not exists public.mentorship_sessions(
 content_id uuid primary key references public.content(id) on delete cascade,mentor_id uuid not null references public.profiles(id),
 audience text not null default 'makers' check(audience in ('makers','makers_subscribers')),modality text not null default 'zoom' check(modality in ('zoom','meet')),
 recording_url text check(recording_url is null or (recording_url ~ '^https://' and length(recording_url)<=500)),created_at timestamptz not null default now()
);
alter table public.mentorship_sessions enable row level security;
revoke all on public.mentorship_sessions from public,anon,authenticated;

-- Every approved account passes the same gates; active_member() keeps the wider community to makers.
create or replace function public.participant() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active' and onboarding_completed_at is not null and fellowship_location_completed_at is not null)
 and not exists(select 1 from public.registrations r join public.content c on c.id=r.content_id cross join public.fellowship_settings s where r.user_id=auth.uid() and r.status<>'cancelled' and c.kind in ('event','webinar') and c.published and c.ends_at<=now() and c.ends_at>=s.started_at and not exists(select 1 from public.event_surveys v where v.content_id=c.id and v.user_id=auth.uid()))
$$;
create or replace function public.active_member() returns boolean language sql stable security definer set search_path='' as $$
 select public.participant() and exists(select 1 from public.profiles where id=auth.uid() and access_tier='maker')
$$;
create or replace function public.require_participant() returns void language plpgsql security definer set search_path='' as $$
begin if not public.participant() then raise exception 'Acceso pendiente o suspendido';end if;end $$;
-- Subscribers reach only sessions opened to them and the materials published under those sessions.
create or replace function public.mentorship_open(p_content uuid,p_parent uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.participant() and exists(select 1 from public.mentorship_sessions s join public.content c on c.id=s.content_id where s.content_id in (p_content,p_parent) and s.audience='makers_subscribers' and c.published and c.deleted_at is null)
$$;
create or replace function public.can_read_content(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.content c where c.id=target and c.deleted_at is null and ((c.published and (public.active_member() or public.mentorship_open(c.id,c.parent_id))) or public.is_admin() or (public.active_member() and c.owner_id=auth.uid())))
$$;
drop policy if exists covers_read on storage.objects;
create policy covers_read on storage.objects for select to authenticated using(
 bucket_id='content-covers' and public.participant() and
 (split_part(name,'/',1)=auth.uid()::text or public.is_admin() or exists(select 1 from public.content c where c.cover_path=name and public.can_read_content(c.id))));

create or replace function public.register_event(p_content uuid,p_cancel boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare item public.content;begin perform public.require_participant();select * into item from public.content where id=p_content for update;
if item.kind not in ('event','webinar') or not public.can_read_content(p_content) then raise exception 'Evento no disponible';end if;
if p_cancel then update public.registrations set status='cancelled' where content_id=p_content and user_id=auth.uid();return;end if;
if item.ends_at<now() then raise exception 'El evento finalizó';end if;
if exists(select 1 from public.registrations where content_id=p_content and user_id=auth.uid() and status<>'cancelled') then return;end if;
if item.capacity is not null and (select count(*) from public.registrations where content_id=p_content and status<>'cancelled')>=item.capacity then raise exception 'No quedan cupos';end if;
insert into public.registrations(content_id,user_id) values(p_content,auth.uid()) on conflict(content_id,user_id) do update set status='registered';end $$;
create or replace function public.get_join_link(p_content uuid) returns text language plpgsql security definer set search_path='' as $$
declare item public.content;result text;begin perform public.require_participant();select * into item from public.content where id=p_content;
if item.kind not in ('event','webinar') or not public.can_read_content(p_content) then raise exception 'Evento no disponible';end if;
if not(public.is_admin() or item.owner_id=auth.uid()) then
 if not exists(select 1 from public.registrations where content_id=p_content and user_id=auth.uid() and status<>'cancelled') then raise exception 'Primero inscríbete';end if;
 if now()<item.starts_at-interval '5 minutes' then raise exception 'El acceso se habilita cinco minutos antes';end if;
 if now()>item.ends_at then raise exception 'El evento finalizó';end if;
 update public.registrations set joined_at=coalesce(joined_at,now()) where content_id=p_content and user_id=auth.uid();
end if;
select join_url into result from public.event_access where content_id=p_content;if result is null then raise exception 'El organizador aún no configuró el acceso';end if;return result;end $$;
create or replace function public.confirm_event(p_content uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_participant();
 if not public.can_read_content(p_content) or not exists(select 1 from public.content where id=p_content and published and ends_at>now() and kind in ('event','webinar')) then raise exception 'Evento no disponible';end if;
 update public.registrations set confirmed_at=now() where content_id=p_content and user_id=auth.uid() and status='registered' and confirmed_at is null;
 if found then perform public.append_activity(p_content,auth.uid(),'participation_confirmed');end if;
end $$;
-- Checklists and views inside an authorized session work for every participant. Both functions keep their can_read_content check.
do $$declare f record;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_interaction','record_content_view') loop
  execute replace(pg_get_functiondef(f.oid),'public.require_active()','public.require_participant()');
 end loop;
end $$;
-- The assigned mentor and organizers verify attendance only for mentorships; other events stay with their owner.
create or replace function public.mark_attendance(p_content uuid,p_user uuid,p_attended boolean) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();if not(public.is_admin() or exists(select 1 from public.content where id=p_content and owner_id=auth.uid()) or (exists(select 1 from public.mentorship_sessions where content_id=p_content) and public.can_manage_content(p_content))) then raise exception 'Sin permiso';end if;
update public.registrations set status=case when p_attended then 'attended' else 'registered' end where content_id=p_content and user_id=p_user and status<>'cancelled';
insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'attendance',p_content,p_user::text);end $$;

create or replace function public.publish_mentorship(p_content jsonb,p_cover jsonb,p_session jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;previous uuid;existing uuid:=nullif(p_content->>'p_id','')::uuid;mentor uuid:=nullif(p_session->>'mentor','')::uuid;who text:=coalesce(p_session->>'audience','makers');mode text:=coalesce(p_session->>'modality','zoom');
begin
 if not public.is_editor() then raise exception 'Solo el equipo organizador gestiona mentorías';end if;
 if p_content->>'p_kind' is distinct from 'event' then raise exception 'Una mentoría grupal se publica como evento';end if;
 if coalesce((p_content->>'p_capacity')::integer,0)<1 then raise exception 'Define los cupos de la mentoría';end if;
 if who not in ('makers','makers_subscribers') or mode not in ('zoom','meet') then raise exception 'Audiencia o modalidad no válida';end if;
 if not exists(select 1 from public.profiles where id=mentor and status='active' and access_tier='maker') then raise exception 'Asigna un mentor activo';end if;
 if existing is not null and not exists(select 1 from public.mentorship_sessions where content_id=existing) then raise exception 'Este contenido no es una mentoría';end if;
 select mentor_id into previous from public.mentorship_sessions where content_id=existing;
 -- publish_content_with_cover keeps enforcing ownership, dates and cover rules.
 target:=public.publish_content_with_cover(p_content||'{"p_methodology":"Mentoría grupal"}'::jsonb,p_cover,null);
 insert into public.mentorship_sessions(content_id,mentor_id,audience,modality) values(target,mentor,who,mode) on conflict(content_id) do update set mentor_id=excluded.mentor_id,audience=excluded.audience,modality=excluded.modality;
 if previous is distinct from mentor then delete from public.event_organizers where event_id=target and user_id=previous;end if;
 insert into public.event_organizers(event_id,user_id) values(target,mentor) on conflict do nothing;
 return target;
end $$;
-- Available seats without exposing who registered. Mentor fields are public to the session's audience.
create or replace function public.mentorship_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('content_id',s.content_id,'audience',s.audience,'modality',s.modality,'has_recording',s.recording_url is not null,
  'mentor',jsonb_build_object('id',m.id,'name',m.name,'nickname',m.nickname,'skills',m.skills,'bio',m.bio,'role',m.role,'status',m.status,'theme',m.theme,'created_at',m.created_at),
  'seats_left',greatest(0,coalesce(c.capacity,0)-(select count(*) from public.registrations r where r.content_id=c.id and r.status<>'cancelled')),
  'materials',(select count(*) from public.content k where k.parent_id=c.id and k.kind='resource' and k.published and k.deleted_at is null),
  'mine',(select jsonb_build_object('status',r.status,'confirmed_at',r.confirmed_at) from public.registrations r where r.content_id=c.id and r.user_id=auth.uid() and r.status<>'cancelled'),
  'can_manage',public.can_manage_content(c.id))),'[]'::jsonb)
 from public.mentorship_sessions s join public.content c on c.id=s.content_id join public.profiles m on m.id=s.mentor_id
 where c.deleted_at is null and (public.can_read_content(c.id) or (public.active_member() and public.can_manage_content(c.id)))
$$;
create or replace function public.mentorship_recording(p_content uuid) returns text language plpgsql stable security definer set search_path='' as $$
begin
 if not public.can_read_content(p_content) then raise exception 'Mentoría no disponible';end if;
 return (select recording_url from public.mentorship_sessions where content_id=p_content);
end $$;
create or replace function public.set_mentorship_recording(p_content uuid,p_url text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();
 if not public.can_manage_content(p_content) then raise exception 'Solo responsable o administración';end if;
 update public.mentorship_sessions set recording_url=nullif(trim(p_url),'') where content_id=p_content;
 if not found then raise exception 'Mentoría no disponible';end if;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'mentorship_recording',p_content,'');
end $$;
-- Managers see the roster; survey comments are returned without their authors.
create or replace function public.mentorship_report(p_content uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.active_member() or not public.can_manage_content(p_content) or not exists(select 1 from public.mentorship_sessions where content_id=p_content) then raise exception 'Solo responsable o administración';end if;
 return jsonb_build_object(
  'roster',coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from(select p.id,p.name,r.status,r.confirmed_at,r.joined_at,exists(select 1 from public.event_surveys s where s.user_id=r.user_id and s.content_id=r.content_id) surveyed from public.registrations r join public.profiles p on p.id=r.user_id where r.content_id=p_content and r.status<>'cancelled')x),'[]'::jsonb),
  'survey',(select jsonb_build_object('responses',count(*),'attended',count(*) filter(where attended),'average',round(avg(rating),2),'nps',case when count(recommend)>0 then round(100.0*(count(*) filter(where recommend>=9)-count(*) filter(where recommend<=6))/count(recommend),1) end,'comments',coalesce(jsonb_agg(comment order by created_at) filter(where comment<>''),'[]'::jsonb)) from public.event_surveys where content_id=p_content));
end $$;
create or replace function public.admin_set_access_tier(p_user uuid,p_tier text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if p_tier not in ('maker','subscriber') then raise exception 'Tipo de acceso no válido';end if;
 if p_tier='subscriber' and not exists(select 1 from public.profiles where id=p_user and role='member') then raise exception 'Solo un miembro puede ser suscriptor';end if;
 update public.profiles set access_tier=p_tier where id=p_user;
 if not found then raise exception 'Persona no encontrada';end if;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'access_tier',p_user,p_tier);
end $$;
revoke all on function public.participant(),public.require_participant(),public.mentorship_open(uuid,uuid),public.publish_mentorship(jsonb,jsonb,jsonb),public.mentorship_catalog(),public.mentorship_recording(uuid),public.set_mentorship_recording(uuid,text),public.mentorship_report(uuid),public.admin_set_access_tier(uuid,text) from public,anon;
grant execute on function public.participant(),public.mentorship_open(uuid,uuid),public.publish_mentorship(jsonb,jsonb,jsonb),public.mentorship_catalog(),public.mentorship_recording(uuid),public.set_mentorship_recording(uuid,text),public.mentorship_report(uuid),public.admin_set_access_tier(uuid,text) to authenticated;
commit;
