-- nextONE 1.9 · 025: vista bloqueada entre makers y peers, encuesta de satisfacción 3 h después del evento
-- (solo para quien confirmó o asistió), feedback definitivo privado y panel del organizador.
-- Aditiva y repetible. Aplicar después de 024. Reversión: supabase/rollback/025_revert.sql.
begin;

-- 1 · Vista bloqueada ------------------------------------------------------------------------------------
-- teaser=true: el otro grupo ve que el contenido existe (título, resumen, fecha, portada) pero no entra.
-- Solo la primera vez: conserva lo que hacía locked_event_catalog (023), que mostraba bloqueados a peers los eventos «solo makers».
do $$begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='content' and column_name='teaser') then
  alter table public.content add column teaser boolean not null default false;
  update public.content set teaser=true where access_scope='makers' and kind in ('event','webinar');
 end if;
end$$;

create or replace function public.publish_scoped_content_v2(p_content jsonb,p_cover jsonb,p_rules jsonb default null,p_session jsonb default null,p_scope text default 'makers',p_teaser boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;begin
 if coalesce(p_teaser,false) and p_scope='community' then raise exception 'La vista bloqueada solo aplica a contenido de makers o de peers';end if;
 target:=public.publish_scoped_content(p_content,p_cover,p_rules,p_session,p_scope);
 update public.content set teaser=coalesce(p_teaser,false) where id=target;
 return target;end $$;

-- Lo que el otro grupo puede ver de un contenido bloqueado. Nunca devuelve enlaces, cupos, inscritos ni el cuerpo completo.
create or replace function public.locked_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'kind',c.kind,'title',c.title,'excerpt',left(c.body,600),'starts_at',c.starts_at,'ends_at',c.ends_at,
  'topics',c.topics,'access_scope',c.access_scope,'cover_alt',c.cover_alt,'created_at',c.created_at) order by coalesce(c.starts_at,c.created_at) desc),'[]'::jsonb)
 from public.content c join public.profiles me on me.id=auth.uid()
 where public.participant() and c.teaser and c.published and c.deleted_at is null and c.parent_id is null and (c.ends_at is null or c.ends_at>now())
  and ((c.access_scope='makers' and me.access_tier='subscriber') or (c.access_scope='peers' and me.access_tier='maker'))
  and not public.can_read_content(c.id)
$$;
create or replace function public.locked_event_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','title',x->>'title','kind',x->>'kind','starts_at',x->>'starts_at')),'[]'::jsonb) from jsonb_array_elements(public.locked_catalog()) x where x->>'kind' in ('event','webinar')
$$;

-- 2 · Encuesta de satisfacción: 3 horas después del final, solo para quien confirmó o asistió ----------------
create or replace function public.survey_due(p_content uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.registrations r join public.content c on c.id=r.content_id cross join public.fellowship_settings s
  where r.content_id=p_content and r.user_id=p_user and r.status<>'cancelled' and (r.confirmed_at is not null or r.status='attended')
   and c.kind in ('event','webinar') and c.published and c.deleted_at is null and c.ends_at<=now()-interval '3 hours' and c.ends_at>=s.started_at)
$$;
create or replace function public.participant() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active' and onboarding_completed_at is not null and fellowship_location_completed_at is not null)
 and not exists(select 1 from public.registrations r where r.user_id=auth.uid() and public.survey_due(r.content_id,r.user_id) and not exists(select 1 from public.event_surveys v where v.content_id=r.content_id and v.user_id=auth.uid()))
$$;
create or replace function public.fellowship_gate() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 return jsonb_build_object('surveys',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'ends_at',c.ends_at,'starts_at',c.starts_at,'kind',c.kind,'cover_alt',c.cover_alt) order by c.ends_at)
  from public.content c join public.registrations r on r.content_id=c.id where r.user_id=auth.uid() and public.survey_due(c.id,auth.uid()) and not exists(select 1 from public.event_surveys v where v.content_id=c.id and v.user_id=auth.uid())),'[]'));
end $$;
create or replace function public.submit_event_survey(p_content uuid,p_attended boolean,p_rating integer,p_recommend integer,p_comment text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active' and onboarding_completed_at is not null and fellowship_location_completed_at is not null) then raise exception 'Completa tu perfil y ubicación';end if;
 if not public.survey_due(p_content,auth.uid()) then raise exception 'Encuesta no disponible';end if;
 if p_attended is null then raise exception 'Indica si asististe';end if;
 if p_attended and (p_rating is null or p_rating not between 1 and 5 or p_recommend is null or p_recommend not between 0 and 10) then raise exception 'Califica el evento y la recomendación';end if;
 if length(coalesce(p_comment,''))>1000 then raise exception 'El comentario admite hasta 1000 caracteres';end if;
 insert into public.event_surveys(content_id,user_id,attended,rating,recommend,comment) values(p_content,auth.uid(),p_attended,case when p_attended then p_rating end,case when p_attended then p_recommend end,trim(coalesce(p_comment,''))) on conflict(content_id,user_id) do update set attended=excluded.attended,rating=excluded.rating,recommend=excluded.recommend,comment=excluded.comment;
 perform public.append_activity(p_content,auth.uid(),'satisfaction_submitted',jsonb_build_object('attended',p_attended,'rating',p_rating));
end $$;

-- 3 · Feedback definitivo privado -------------------------------------------------------------------------
-- Administración, organizadores responsables (can_finalize_content) y la persona evaluada (autora del contenido).
drop policy if exists final_reviews_read on public.final_reviews;
create policy final_reviews_read on public.final_reviews for select to authenticated using(
 public.is_admin() or public.can_finalize_content(content_id)
 or exists(select 1 from public.content c where c.id=content_id and c.owner_id=auth.uid() and c.deleted_at is null and public.active_member()));
create or replace function public.can_view_final_review(p_content uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or public.can_finalize_content(p_content) or exists(select 1 from public.content c where c.id=p_content and c.owner_id=auth.uid() and c.deleted_at is null and public.active_member())
$$;

-- 4 · Panel del organizador -------------------------------------------------------------------------------
-- Responsable, organizadores asignados y administración gestionan inscritos y asistencia.
create or replace function public.can_run_event(p_content uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or (public.active_member() and exists(select 1 from public.content c where c.id=p_content and c.deleted_at is null and c.kind in ('event','webinar')
  and (c.owner_id=auth.uid() or exists(select 1 from public.event_organizers o join public.profiles p on p.id=o.user_id where o.event_id=c.id and o.user_id=auth.uid() and p.status='active'))))
$$;
create or replace function public.event_attendance_roster(p_content uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.can_run_event(p_content) then raise exception 'Solo responsable, organizadores asignados o administración';end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from(select p.id,p.name,p.access_tier,r.status,r.created_at,r.confirmed_at,r.joined_at,
  exists(select 1 from public.event_surveys s where s.user_id=r.user_id and s.content_id=r.content_id) surveyed from public.registrations r join public.profiles p on p.id=r.user_id where r.content_id=p_content)x),'[]');
end $$;
create or replace function public.mark_attendance(p_content uuid,p_user uuid,p_attended boolean) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();
 if not(public.can_run_event(p_content) or (exists(select 1 from public.mentorship_sessions where content_id=p_content) and public.can_manage_content(p_content))) then raise exception 'Sin permiso';end if;
 update public.registrations set status=case when p_attended then 'attended' else 'registered' end where content_id=p_content and user_id=p_user and status<>'cancelled';
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'attendance',p_content,p_user::text);end $$;
-- Resumen de la encuesta para quien gestiona el evento. Comentarios sin nombre.
create or replace function public.event_survey_summary(p_content uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.can_run_event(p_content) then raise exception 'Solo responsable, organizadores asignados o administración';end if;
 return (select jsonb_build_object('responses',count(*),'attended',count(*) filter(where attended),'average',round(avg(rating),2),
  'nps',case when count(recommend)>0 then round(100.0*(count(*) filter(where recommend>=9)-count(*) filter(where recommend<=6))/count(recommend)) end,
  'distribution',jsonb_build_array(count(*) filter(where rating=1),count(*) filter(where rating=2),count(*) filter(where rating=3),count(*) filter(where rating=4),count(*) filter(where rating=5)),
  'comments',coalesce((select jsonb_agg(v.comment order by v.content_id) from (select comment,content_id from public.event_surveys where content_id=p_content and comment<>'' limit 50) v),'[]'::jsonb))
  from public.event_surveys where content_id=p_content);
end $$;

revoke all on function public.publish_scoped_content_v2(jsonb,jsonb,jsonb,jsonb,text,boolean),public.locked_catalog(),public.survey_due(uuid,uuid),public.can_view_final_review(uuid),public.can_run_event(uuid),public.event_survey_summary(uuid) from public,anon;
grant execute on function public.publish_scoped_content_v2(jsonb,jsonb,jsonb,jsonb,text,boolean),public.locked_catalog(),public.can_view_final_review(uuid),public.can_run_event(uuid),public.event_survey_summary(uuid) to authenticated;
commit;
