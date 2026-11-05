-- Reversión de 024_peers_segments_polls.sql. Solo si hay que volver a la 1.7.
-- ATENCIÓN: borra las encuestas, sus respuestas y el seguimiento de intereses y segmentos.
-- El contenido «solo peers» pasa a «solo makers» (la opción más restrictiva de la 1.7). Los avatares conservan
-- los valores nuevos en el JSON, pero la 1.7 los dibuja con su equivalente por defecto.
begin;
update public.content set access_scope='makers' where access_scope='peers';
update public.mentorship_sessions set audience='makers' where audience='peers';
alter table public.content drop constraint if exists content_access_scope_check;
alter table public.content add constraint content_access_scope_check check(access_scope in ('makers','community'));
alter table public.mentorship_sessions drop constraint if exists mentorship_sessions_audience_check;
alter table public.mentorship_sessions add constraint mentorship_sessions_audience_check check(audience in ('makers','makers_subscribers'));

-- Funciones de 023 y 022, tal como estaban.
create or replace function public.can_read_content(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or (public.participant() and exists(select 1 from public.content item where item.id=target and item.deleted_at is null and (item.owner_id=auth.uid() or (
  with recursive ancestry as (
   select c.id,c.parent_id,c.published,c.access_scope,c.deleted_at,array[c.id] path from public.content c where c.id=target
   union all select c.id,c.parent_id,c.published,c.access_scope,c.deleted_at,a.path||c.id from public.content c join ancestry a on c.id=a.parent_id where not c.id=any(a.path)
  ) select bool_and(a.published and a.deleted_at is null and (a.access_scope='community' or exists(select 1 from public.profiles p where p.id=auth.uid() and p.access_tier='maker'))) from ancestry a
 ))))
$$;
create or replace function public.publish_scoped_content(p_content jsonb,p_cover jsonb,p_rules jsonb default null,p_session jsonb default null,p_scope text default 'makers') returns uuid language plpgsql security definer set search_path='' as $$declare target uuid;begin
 if p_scope not in ('makers','community') then raise exception 'Audiencia no válida';end if;
 if not public.is_editor() and p_content->>'p_kind' not in ('post','project','update','builder') then raise exception 'Sin permiso para publicar';end if;
 if not public.is_editor() and p_scope='makers' and exists(select 1 from public.profiles where id=auth.uid() and access_tier='subscriber') then raise exception 'Elige toda la comunidad';end if;
 if p_session is null then target:=public.publish_content_with_cover(p_content,p_cover,p_rules);else target:=public.publish_mentorship(p_content,p_cover,p_session||jsonb_build_object('audience',case when p_scope='community' then 'makers_subscribers' else 'makers' end));end if;
 update public.content set access_scope=p_scope where id=target;
 return target;end $$;
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
 target:=public.publish_content_with_cover(p_content||'{"p_methodology":"Mentoría grupal"}'::jsonb,p_cover,null);
 insert into public.mentorship_sessions(content_id,mentor_id,audience,modality) values(target,mentor,who,mode) on conflict(content_id) do update set mentor_id=excluded.mentor_id,audience=excluded.audience,modality=excluded.modality;
 if previous is distinct from mentor then delete from public.event_organizers where event_id=target and user_id=previous;end if;
 insert into public.event_organizers(event_id,user_id) values(target,mentor) on conflict do nothing;
 return target;
end $$;

drop function if exists public.answer_poll(uuid,jsonb),public.poll_feed(),public.poll_results(uuid),public.delete_poll(uuid),public.save_poll(uuid,jsonb),public.poll_visible(public.community_polls),public.can_manage_polls();
drop table if exists public.poll_responses,public.community_polls;
drop function if exists public.set_member_segment(uuid[],text),public.admin_member_intents(),public.my_member_intent(),public.save_member_intent(jsonb),public.intent_catalog_ok(text[],text[],integer);
drop table if exists public.member_intents;
drop function if exists public.save_profile_avatar_v4(jsonb),public.scope_allows(text);
commit;
