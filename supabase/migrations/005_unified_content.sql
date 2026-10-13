begin;
alter table public.content add column deleted_at timestamptz;
create or replace function public.can_read_content(target uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.content c where c.id=target and c.deleted_at is null and ((c.published and public.active_member()) or public.is_admin() or (public.active_member() and c.owner_id=auth.uid()))) $$;

create table public.event_organizers (
 event_id uuid not null references public.content(id), user_id uuid not null references public.profiles(id),
 primary key(event_id,user_id)
);
alter table public.event_organizers enable row level security;
create policy organizers_read on public.event_organizers for select to authenticated using(public.can_read_content(event_id));
revoke all on public.event_organizers from anon,authenticated;
grant select on public.event_organizers to authenticated;

create function public.can_finalize_content(p_content uuid) returns boolean language sql stable security definer set search_path='' as $$
 with recursive chain as (
 select id,parent_id,owner_id,kind from public.content where id=p_content and deleted_at is null
 union select c.id,c.parent_id,c.owner_id,c.kind from public.content c join chain x on c.id=x.parent_id where c.deleted_at is null
 ), meetings as (select * from chain where kind in ('event','webinar'))
 select public.active_member() and public.can_read_content(p_content) and (
 public.is_admin() or exists(select 1 from meetings m where m.owner_id=auth.uid() or exists(select 1 from public.event_organizers o where o.event_id=m.id and o.user_id=auth.uid()))
 or (not exists(select 1 from meetings) and exists(select 1 from chain c join public.profiles p on p.id=c.owner_id where p.id=auth.uid() and p.role='organizer'))
 )
$$;
create function public.set_event_organizer(p_event uuid,p_user uuid,p_remove boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();
 perform 1 from public.content where id=p_event and kind in ('event','webinar') and deleted_at is null and (owner_id=auth.uid() or public.is_admin()) for update;
 if not found then raise exception 'Solo el responsable del evento o administración puede asignar organizadores';end if;
 if p_remove then delete from public.event_organizers where event_id=p_event and user_id=p_user;
 else
 if not exists(select 1 from public.profiles where id=p_user and status='active' and role='organizer') then raise exception 'Selecciona un organizador activo';end if;
 insert into public.event_organizers values(p_event,p_user) on conflict do nothing;
 end if;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'event_organizer',p_event,p_user::text);
end $$;

create table public.final_reviews (
 content_id uuid primary key references public.content(id), score integer not null check(score between 1 and 5),
 strengths text not null check(length(trim(strengths)) between 10 and 2000),
 improvements text not null check(length(trim(improvements)) between 10 and 2000),
 verdict text not null check(length(trim(verdict)) between 10 and 2000),
 reviewer_id uuid not null references public.profiles(id), updated_at timestamptz not null default now(), revision integer not null default 1
);
alter table public.final_reviews enable row level security;
create policy final_reviews_read on public.final_reviews for select to authenticated using(public.can_read_content(content_id));
revoke all on public.final_reviews from anon,authenticated;
grant select on public.final_reviews to authenticated;
create function public.save_final_review(p_content uuid,p_score integer,p_strengths text,p_improvements text,p_verdict text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();
 perform 1 from public.content where id=p_content and deleted_at is null for update;
 if not found or not public.can_finalize_content(p_content) then raise exception 'Solo los organizadores responsables o administración pueden emitir el feedback definitivo';end if;
 if not exists(select 1 from public.feedback where content_id=p_content and rating is not null) then raise exception 'Primero se necesita una calificación de la comunidad';end if;
 insert into public.final_reviews(content_id,score,strengths,improvements,verdict,reviewer_id)
 values(p_content,p_score,trim(p_strengths),trim(p_improvements),trim(p_verdict),auth.uid())
 on conflict(content_id) do update set score=excluded.score,strengths=excluded.strengths,improvements=excluded.improvements,verdict=excluded.verdict,reviewer_id=excluded.reviewer_id,updated_at=now(),revision=public.final_reviews.revision+1;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'final_review',p_content,jsonb_build_object('score',p_score,'strengths',p_strengths,'improvements',p_improvements,'verdict',p_verdict)::text);
end $$;
create function public.delete_content(p_content uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();
 perform 1 from public.content where id=p_content and deleted_at is null and(owner_id=auth.uid() or public.is_admin()) for update;
 if not found then raise exception 'Solo el autor o administración puede eliminar este contenido';end if;
 if exists(select 1 from public.content where parent_id=p_content and deleted_at is null) then raise exception 'Este contenido tiene publicaciones vinculadas. Elimina o desvincula primero los contenidos relacionados; no se borrarán publicaciones de otras personas automáticamente';end if;
 update public.content set deleted_at=now(),published=false where id=p_content;
 insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'delete_content',p_content);
end $$;

create function public.publish_interactive_content(p_id uuid,p_kind text,p_title text,p_body text,p_url text,p_parent uuid,p_start timestamptz,p_end timestamptz,p_capacity integer,p_published boolean,p_join_url text,p_template text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform public.require_active();
 if p_id is not null then
 perform 1 from public.content where id=p_id and deleted_at is null for update;
 if not found then raise exception 'Contenido no disponible';end if;
 end if;
 if p_kind='solution' then
 if p_id is null then target:=public.submit_solution(p_parent,p_title,p_body,p_url);
 else
 if p_url is null or p_url !~ '^https://' then raise exception 'Usa un enlace HTTPS al prototipo';end if;
 update public.content set title=trim(p_title),body=trim(p_body),url=p_url where id=p_id and kind='solution' and (owner_id=auth.uid() or public.is_admin());
 if not found then raise exception 'Solo el autor o administración puede editar esta solución';end if;
 target:=p_id;
 end if;
 else target:=public.save_content(p_id,p_kind,p_title,p_body,p_url,p_parent,p_start,p_end,p_capacity,p_published,p_join_url);
 end if;
 perform public.save_content_page(target,p_template,p_data);
 return target;
end $$;

-- Guard existing RPCs against editing removed content or publishing into removed parents.
create or replace function public.save_content(p_id uuid,p_kind text,p_title text,p_body text,p_url text default null,p_parent uuid default null,p_start timestamptz default null,p_end timestamptz default null,p_capacity integer default null,p_published boolean default true,p_join_url text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid; existing public.content; allowed boolean;
begin perform public.require_active();if p_id is not null and exists(select 1 from public.content where id=p_id and deleted_at is not null) then raise exception 'Contenido eliminado';end if;
if p_kind='solution' then raise exception 'Entrega soluciones mediante el builder case';end if;
allowed:=public.is_editor() or p_kind in ('post','project','update');
if not allowed then raise exception 'Solo organizadores o mentores pueden publicar este contenido';end if;
if p_parent is not null then perform 1 from public.content where id=p_parent and deleted_at is null for update;if not found or not public.can_read_content(p_parent) then raise exception 'Contenido padre no disponible';end if;end if;
if p_kind='update' and not exists(select 1 from public.content where id=p_parent and kind='project' and (owner_id=auth.uid() or public.is_editor())) then raise exception 'Solo responsable o mentor puede publicar avances';end if;
if p_kind in ('event','webinar') and (p_start is null or p_end is null or p_end<=p_start) then raise exception 'Define inicio y fin válidos';end if;
if p_kind='case' and (p_end is null) then raise exception 'Define el cierre del builder case';end if;
if p_id is null then
 if (select count(*) from public.content where owner_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'Espera antes de crear más contenido';end if;
 insert into public.content(kind,title,body,url,owner_id,parent_id,starts_at,ends_at,capacity,published) values(p_kind,p_title,p_body,nullif(p_url,''),auth.uid(),p_parent,p_start,p_end,p_capacity,p_published) returning id into target;
else
 select * into existing from public.content where id=p_id for update;
 if existing.id is null or not(public.is_admin() or existing.owner_id=auth.uid()) or existing.kind<>p_kind then raise exception 'No puedes editar este contenido';end if;
 update public.content set title=p_title,body=p_body,url=nullif(p_url,''),parent_id=p_parent,starts_at=p_start,ends_at=p_end,capacity=p_capacity,published=p_published where id=p_id;target:=p_id;
end if;
if p_join_url is not null and p_join_url<>'' then
 if p_kind not in ('event','webinar') then raise exception 'El enlace de acceso solo aplica a eventos';end if;
 insert into public.event_access(content_id,join_url) values(target,p_join_url) on conflict(content_id) do update set join_url=excluded.join_url;
end if;
insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'save_content',target);return target;end $$;
create or replace function public.content_metrics() returns table(id uuid,title text,kind text,registrations bigint,attendance bigint,access_clicks bigint,likes bigint,dislikes bigint,rating_count bigint,average numeric,comments bigint,participants bigint,submissions bigint,average_minutes numeric) language plpgsql stable security definer set search_path='' as $$
begin if not public.is_editor() then raise exception 'Solo equipo organizador';end if;
return query select c.id,c.title,c.kind,
(select count(*) from public.registrations r where r.content_id=c.id and r.status<>'cancelled'),
(select count(*) from public.registrations r where r.content_id=c.id and r.status='attended'),
(select count(*) from public.registrations r where r.content_id=c.id and r.joined_at is not null),
(select count(*) from public.feedback f where f.content_id=c.id and f.reaction=1),
(select count(*) from public.feedback f where f.content_id=c.id and f.reaction=-1),
(select count(f.rating) from public.feedback f where f.content_id=c.id),
(select avg(f.rating) from public.feedback f where f.content_id=c.id),
(select count(*) from public.comments m where m.content_id=c.id),
(select count(*) from(select f.user_id from public.feedback f where f.content_id=c.id and(f.rating is not null or f.reaction is not null) union select m.author_id from public.comments m where m.content_id=c.id) u),
(select count(*) from public.attempts a where a.case_id=c.id and a.submitted_at is not null),
(select avg(extract(epoch from(a.submitted_at-a.started_at))/60) from public.attempts a where a.case_id=c.id and a.submitted_at is not null)
from public.content c where c.deleted_at is null and (public.is_admin() or c.owner_id=auth.uid());end $$;
create or replace function public.leads_project(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.active_member() and exists(select 1 from public.content where id=p_project and kind='project' and deleted_at is null and(owner_id=auth.uid() or public.is_admin())) $$;
create or replace function public.in_project(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.can_read_content(p_project) and (public.leads_project(p_project) or(public.active_member() and exists(select 1 from public.project_members where project_id=p_project and user_id=auth.uid() and status='active')) ) $$;

revoke all on function public.can_finalize_content(uuid),public.set_event_organizer(uuid,uuid,boolean),public.save_final_review(uuid,integer,text,text,text),public.delete_content(uuid),public.publish_interactive_content(uuid,text,text,text,text,uuid,timestamptz,timestamptz,integer,boolean,text,text,jsonb) from public,anon;
grant execute on function public.can_finalize_content(uuid),public.set_event_organizer(uuid,uuid,boolean),public.save_final_review(uuid,integer,text,text,text),public.delete_content(uuid),public.publish_interactive_content(uuid,text,text,text,text,uuid,timestamptz,timestamptz,integer,boolean,text,text,jsonb) to authenticated;
create or replace function public.save_content_page(p_content uuid, p_template text, p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.content;
begin
  perform public.require_active();
  select * into item from public.content where id = p_content and deleted_at is null for update;
  if item.id is null then raise exception 'Contenido no disponible'; end if;
  if not (item.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'Solo el responsable o administración puede diseñar esta página';
  end if;
  insert into public.content_pages(content_id, template_id, data, updated_by, updated_at)
  values (p_content, p_template, p_data, auth.uid(), now())
  on conflict (content_id) do update
    set template_id = excluded.template_id, data = excluded.data, updated_by = auth.uid(), updated_at = now();
  insert into public.audit_log(actor_id, action, target_id) values (auth.uid(), 'save_content_page', p_content);
end $$;
create or replace function public.delete_content_page(p_content uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.content;
begin
  perform public.require_active();
  select * into item from public.content where id = p_content and deleted_at is null for update;
  if item.id is null then raise exception 'Contenido no disponible'; end if;
  if not (item.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'Solo el responsable o administración puede quitar esta página';
  end if;
  delete from public.content_pages where content_id = p_content;
  insert into public.audit_log(actor_id, action, target_id) values (auth.uid(), 'delete_content_page', p_content);
end $$;
commit;
