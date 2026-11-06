-- Reversión de 025_teaser_survey_reviews.sql. Vuelve a las reglas de 019, 022 y 023.
-- Las respuestas de encuestas se conservan. Se pierde la marca de vista bloqueada.
begin;
create or replace function public.participant() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active' and onboarding_completed_at is not null and fellowship_location_completed_at is not null)
 and not exists(select 1 from public.registrations r join public.content c on c.id=r.content_id cross join public.fellowship_settings s where r.user_id=auth.uid() and r.status<>'cancelled' and c.kind in ('event','webinar') and c.published and c.ends_at<=now() and c.ends_at>=s.started_at and not exists(select 1 from public.event_surveys v where v.content_id=c.id and v.user_id=auth.uid()))
$$;
create or replace function public.fellowship_gate() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 return jsonb_build_object('surveys',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'ends_at',c.ends_at) order by c.ends_at) from public.content c join public.registrations r on r.content_id=c.id cross join public.fellowship_settings s where r.user_id=auth.uid() and r.status<>'cancelled' and c.kind in ('event','webinar') and c.published and c.ends_at<=now() and c.ends_at>=s.started_at and not exists(select 1 from public.event_surveys v where v.content_id=c.id and v.user_id=auth.uid())),'[]'));
end $$;
create or replace function public.submit_event_survey(p_content uuid,p_attended boolean,p_rating integer,p_recommend integer,p_comment text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active' and onboarding_completed_at is not null and fellowship_location_completed_at is not null) then raise exception 'Completa tu perfil y ubicación';end if;
 if not exists(select 1 from public.registrations r join public.content c on c.id=r.content_id where r.user_id=auth.uid() and r.content_id=p_content and r.status<>'cancelled' and c.published and c.ends_at<=now() and c.kind in ('event','webinar')) then raise exception 'Encuesta no disponible';end if;
 if p_attended is null then raise exception 'Indica si asististe';end if;
 insert into public.event_surveys(content_id,user_id,attended,rating,recommend,comment) values(p_content,auth.uid(),p_attended,case when p_attended then p_rating end,case when p_attended then p_recommend end,trim(coalesce(p_comment,''))) on conflict(content_id,user_id) do update set attended=excluded.attended,rating=excluded.rating,recommend=excluded.recommend,comment=excluded.comment;
 perform public.append_activity(p_content,auth.uid(),'satisfaction_submitted',jsonb_build_object('attended',p_attended,'rating',p_rating));
end $$;
create or replace function public.locked_event_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'kind',c.kind,'starts_at',c.starts_at)),'[]') from public.content c where public.participant() and exists(select 1 from public.profiles where id=auth.uid() and access_tier='subscriber') and c.kind in ('event','webinar') and c.access_scope='makers' and c.published and c.deleted_at is null and c.ends_at>now()
$$;
drop policy if exists final_reviews_read on public.final_reviews;
create policy final_reviews_read on public.final_reviews for select to authenticated using(public.can_read_content(content_id) and(not exists(select 1 from public.content where id=content_id and kind='project') or public.project_access(content_id)));
create or replace function public.event_attendance_roster(p_content uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() and not exists(select 1 from public.content where id=p_content and owner_id=auth.uid() and public.active_member()) then raise exception 'Solo responsable o administración';end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from(select p.id,p.name,r.status,r.created_at,r.confirmed_at,r.joined_at,exists(select 1 from public.event_surveys s where s.user_id=r.user_id and s.content_id=r.content_id) surveyed from public.registrations r join public.profiles p on p.id=r.user_id where r.content_id=p_content)x),'[]');
end $$;
create or replace function public.mark_attendance(p_content uuid,p_user uuid,p_attended boolean) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();if not(public.is_admin() or exists(select 1 from public.content where id=p_content and owner_id=auth.uid()) or (exists(select 1 from public.mentorship_sessions where content_id=p_content) and public.can_manage_content(p_content))) then raise exception 'Sin permiso';end if;
update public.registrations set status=case when p_attended then 'attended' else 'registered' end where content_id=p_content and user_id=p_user and status<>'cancelled';
insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'attendance',p_content,p_user::text);end $$;
drop function if exists public.event_survey_summary(uuid),public.can_run_event(uuid),public.can_view_final_review(uuid),public.survey_due(uuid,uuid),public.locked_catalog(),public.publish_scoped_content_v2(jsonb,jsonb,jsonb,jsonb,text,boolean);
alter table public.content drop column if exists teaser;
commit;
