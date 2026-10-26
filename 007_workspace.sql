begin;
alter table public.profiles add column nickname text not null default '' check(length(nickname)<=40),add column name_changes integer not null default 0;
alter table public.content add column evaluator_id uuid references public.profiles(id),add column project_type text not null default 'project' check(project_type in ('project','semillero')),add column project_plan jsonb not null default '{}' check(octet_length(project_plan::text)<=16000),add column featured boolean not null default false;
create unique index one_featured_solution on public.content(parent_id) where kind='solution' and featured and deleted_at is null;

create table public.name_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),requested_name text not null check(length(trim(requested_name)) between 1 and 120),reason text not null check(length(trim(reason)) between 10 and 1000),status text not null default 'pending' check(status in ('pending','approved','rejected')),reviewer_id uuid references public.profiles(id),created_at timestamptz not null default now(),applied_at timestamptz);
create unique index one_pending_name on public.name_requests(user_id) where status='pending';
alter table public.name_requests enable row level security;
create policy name_read on public.name_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
revoke all on public.name_requests from public,anon,authenticated;grant select on public.name_requests to authenticated;
create function public.guard_name() returns trigger language plpgsql security definer set search_path='' as $$
declare approval uuid;
begin
 if new.name is distinct from old.name then
  if old.name_changes>=1 then
   select id into approval from public.name_requests where user_id=old.id and requested_name=new.name and status='approved' and applied_at is null and public.is_admin() for update;
   if approval is null then raise exception 'Ya utilizaste tu cambio de nombre. Envía una solicitud';end if;
   update public.name_requests set applied_at=now() where id=approval;
  end if;
  new.name_changes:=old.name_changes+1;
 end if;
 return new;
end $$;
create trigger protect_name before update of name on public.profiles for each row execute function public.guard_name();
create function public.request_name(p_name text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();insert into public.name_requests(user_id,requested_name,reason) values(auth.uid(),trim(p_name),trim(p_reason));end $$;
create function public.review_name(p_request uuid,p_approve boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.name_requests;
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 select * into r from public.name_requests where id=p_request and status='pending' for update;
 if r.id is null then raise exception 'Solicitud no disponible';end if;
 update public.name_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewer_id=auth.uid() where id=r.id;
 if p_approve then update public.profiles set name=r.requested_name where id=r.user_id;update public.name_requests set applied_at=coalesce(applied_at,now()) where id=r.id;end if;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'name_review',r.user_id,case when p_approve then 'approved' else 'rejected' end);
end $$;
create function public.save_identity(p_name text,p_nickname text,p_bio text,p_skills text,p_interests text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();
 if p_nickname ~ '[[:cntrl:]<>]' or length(p_nickname)>40 then raise exception 'Apodo inválido (máximo 40 caracteres)';end if;
 perform public.save_profile(trim(p_name),p_bio,p_skills);perform public.save_makers_profile(p_interests);
 update public.profiles set nickname=trim(p_nickname) where id=auth.uid();
end $$;

-- Apply server-side language checks to every supported publication path, including legacy RPCs.
create table public.moderation_terms(term text primary key check(length(term) between 3 and 50));
insert into public.moderation_terms values('idiota'),('imbecil'),('estupido'),('mierda'),('pendejo'),('hijueputa'),('malparido');
revoke all on public.moderation_terms from public,anon,authenticated;
create function public.check_language(value text) returns void language plpgsql security definer set search_path='' as $$
declare normalized text;
begin
 normalized:=translate(lower(coalesce(value,'')),'áéíóúüñ','aeiouun');
 normalized:=translate(normalized,'013457@','oieasta');
 normalized:=regexp_replace(normalized,'[^a-z ]',' ','g');
 normalized:=regexp_replace(normalized,' +',' ','g');
 if exists(select 1 from public.moderation_terms where (' '||normalized||' ') like '% '||term||' %') then raise exception 'Reformula el mensaje sin expresiones ofensivas';end if;
end $$;
create function public.moderate_text() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='content' then perform public.check_language(new.title||' '||new.body);
 elsif tg_table_name='content_pages' then perform public.check_language(new.data::text);
 elsif tg_table_name='profiles' then perform public.check_language(new.name||' '||new.nickname||' '||new.bio||' '||new.skills);
 else perform public.check_language(new.body);end if;return new;
end $$;
create trigger moderate_content before insert or update of title,body on public.content for each row execute function public.moderate_text();
create trigger moderate_profiles before update of nickname,bio on public.profiles for each row execute function public.moderate_text();
create trigger moderate_comments before insert or update on public.comments for each row execute function public.moderate_text();
create trigger moderate_page before insert or update of data on public.content_pages for each row execute function public.moderate_text();
create trigger moderate_project_messages before insert on public.project_messages for each row execute function public.moderate_text();

create function public.project_access(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.in_project(p_project) or(public.active_member() and exists(select 1 from public.content where id=p_project and kind='project' and deleted_at is null and evaluator_id=auth.uid()))
$$;
create table public.project_reviews(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.content(id),reviewer_id uuid not null references public.profiles(id),body text not null check(length(trim(body)) between 10 and 4000),created_at timestamptz not null default now());
alter table public.project_reviews enable row level security;
create policy private_reviews on public.project_reviews for select to authenticated using(public.project_access(project_id));
revoke all on public.project_reviews from public,anon,authenticated;grant select on public.project_reviews to authenticated;
create function public.configure_project(p_project uuid,p_type text,p_evaluator uuid,p_plan jsonb) returns void language plpgsql security definer set search_path='' as $$
declare owner uuid;
begin
 if not public.leads_project(p_project) then raise exception 'Solo el responsable o administración';end if;
 select owner_id into owner from public.content where id=p_project for update;
 if p_evaluator=owner or not exists(select 1 from public.profiles where id=p_evaluator and status='active') then raise exception 'Elige un evaluador activo diferente al responsable';end if;
 if exists(select 1 from public.project_members where project_id=p_project and user_id=p_evaluator and status in ('pending','active')) then raise exception 'El evaluador debe ser independiente del equipo';end if;
 if jsonb_typeof(p_plan) is distinct from 'object' or octet_length(p_plan::text)>16000 then raise exception 'Plan inválido';end if;
 update public.content set project_type=p_type,evaluator_id=p_evaluator,project_plan=p_plan where id=p_project;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'project_configuration',p_project,p_evaluator::text);
end $$;
create function public.guard_evaluator_membership() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.content where id=new.project_id for update;
 if new.status in ('pending','active') and exists(select 1 from public.content where id=new.project_id and evaluator_id=new.user_id) then raise exception 'El evaluador no puede incorporarse como estudiante del equipo';end if;return new;
end $$;
create trigger evaluator_independent before insert or update on public.project_members for each row execute function public.guard_evaluator_membership();
create function public.add_project_review(p_project uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();
 if not public.project_access(p_project) or not(public.is_admin() or exists(select 1 from public.content where id=p_project and evaluator_id=auth.uid())) then raise exception 'Solo el evaluador asignado o administración';end if;
 perform public.check_language(p_body);
 if(select count(*) from public.project_reviews where reviewer_id=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'Espera antes de añadir más revisiones';end if;
 insert into public.project_reviews(project_id,reviewer_id,body) values(p_project,auth.uid(),trim(p_body));
end $$;

create table public.project_evidence(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.content(id),author_id uuid not null references public.profiles(id),label text not null check(length(trim(label)) between 3 and 160),url text,object_path text,created_at timestamptz not null default now(),check((url is not null and object_path is null and url ~ '^https://[^[:space:]]+$') or(url is null and object_path is not null)));
alter table public.project_evidence enable row level security;
create policy private_evidence on public.project_evidence for select to authenticated using(public.project_access(project_id));
revoke all on public.project_evidence from public,anon,authenticated;grant select on public.project_evidence to authenticated;
create function public.add_evidence(p_project uuid,p_label text,p_url text default null,p_path text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.in_project(p_project) then raise exception 'Solo miembros aprobados del proyecto';end if;
 if(select count(*) from public.project_evidence where project_id=p_project)>=100 then raise exception 'Máximo 100 evidencias por proyecto';end if;
 if p_path is not null and(p_path !~ ('^'||p_project::text||'/'||auth.uid()::text||'/[a-f0-9-]+\.(pdf|docx|txt)$')) then raise exception 'Ruta de evidencia inválida';end if;
 if p_path is not null and not exists(select 1 from storage.objects where bucket_id='project-evidence' and name=p_path) then raise exception 'Sube el archivo antes de registrar la evidencia';end if;
 perform public.check_language(p_label);
 insert into public.project_evidence(project_id,author_id,label,url,object_path) values(p_project,auth.uid(),trim(p_label),nullif(p_url,''),p_path);
end $$;

create function public.detach_content(p_child uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.content;
begin
 perform public.require_active();select * into c from public.content where id=p_child and deleted_at is null for update;
 if c.id is null or not(c.owner_id=auth.uid() or public.is_admin()) then raise exception 'Solo el autor del contenido vinculado o administración puede desvincularlo';end if;
 if c.kind in ('solution','update') then raise exception 'Soluciones y avances necesitan su reto o proyecto. Reasigna su vínculo desde el editor';end if;
 update public.content set parent_id=null where id=c.id;
 insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'detach_content',c.id);
end $$;
create function public.highlight_solution(p_solution uuid,p_featured boolean) returns void language plpgsql security definer set search_path='' as $$
declare c public.content;challenge public.content;
begin
 perform public.require_active();select * into c from public.content where id=p_solution and kind='solution' and deleted_at is null;
 if c.id is null or not public.can_read_content(c.id) then raise exception 'Solución no disponible';end if;
 select * into challenge from public.content where id=c.parent_id and kind='case' and deleted_at is null for update;
 if challenge.id is null or not(public.is_admin() or challenge.owner_id=auth.uid() or exists(select 1 from public.content p where p.id=challenge.parent_id and p.kind='project' and p.deleted_at is null and p.evaluator_id=auth.uid())) then raise exception 'Solo responsable del reto, evaluador vinculado o administración';end if;
 if p_featured then update public.content set featured=false where parent_id=c.parent_id and kind='solution' and featured;end if;
 update public.content set featured=p_featured where id=c.id;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'highlight_solution',c.id,p_featured::text);
end $$;
create function public.require_solution_demo() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='solution' and (new.url is null or new.url !~ '^https://[^[:space:]]+$' or new.parent_id is null) then raise exception 'Incluye una demostración HTTPS y un reto válido';end if;return new;
end $$;
create trigger solution_demo before insert or update of url,parent_id on public.content for each row execute function public.require_solution_demo();

create function public.publish_workspace_content(p_id uuid,p_kind text,p_title text,p_body text,p_url text,p_parent uuid,p_start timestamptz,p_end timestamptz,p_capacity integer,p_published boolean,p_join_url text,p_template text,p_data jsonb,p_topics text[],p_methodology text,p_audience text,p_project_config jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 target:=public.publish_makers_content(p_id,p_kind,p_title,p_body,p_url,p_parent,p_start,p_end,p_capacity,p_published,p_join_url,p_template,p_data,p_topics,p_methodology,p_audience);
 if p_kind='project' then
  if p_published and nullif(p_project_config->>'evaluator','') is null then raise exception 'Selecciona un evaluador antes de publicar el proyecto';end if;
  if nullif(p_project_config->>'evaluator','') is not null then perform public.configure_project(target,coalesce(p_project_config->>'type','project'),(p_project_config->>'evaluator')::uuid,coalesce(p_project_config->'plan','{}'));end if;
 end if;
 return target;
end $$;
revoke all on function public.publish_workspace_content(uuid,text,text,text,text,uuid,timestamptz,timestamptz,integer,boolean,text,text,jsonb,text[],text,text,jsonb) from public,anon;
grant execute on function public.publish_workspace_content(uuid,text,text,text,text,uuid,timestamptz,timestamptz,integer,boolean,text,text,jsonb,text[],text,text,jsonb) to authenticated;

-- Project assessment from the legacy table must be private as well.
drop policy final_reviews_read on public.final_reviews;
create policy final_reviews_read on public.final_reviews for select to authenticated using(public.can_read_content(content_id) and(not exists(select 1 from public.content where id=content_id and kind='project') or public.project_access(content_id)));

create function public.room_open(p_content uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.active_member() and(p_content is null or exists(select 1 from public.content c where c.id=p_content and c.kind in ('event','webinar') and public.can_read_content(c.id) and now() between c.starts_at-interval '7 days' and c.ends_at+interval '24 hours'))
$$;
create table public.room_messages(id uuid primary key default gen_random_uuid(),content_id uuid references public.content(id),author_id uuid not null references public.profiles(id),body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default now(),removed boolean not null default false);
create index room_messages_recent on public.room_messages(content_id,created_at desc,id);
alter table public.room_messages enable row level security;
create policy room_read on public.room_messages for select to authenticated using(not removed and public.room_open(content_id));
revoke all on public.room_messages from public,anon,authenticated;grant select on public.room_messages to authenticated;
create function public.send_room_message(p_content uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();if not public.room_open(p_content) then raise exception 'El chat de esta actividad está cerrado';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if(select count(*) from public.room_messages where author_id=auth.uid() and created_at>now()-interval '1 minute')>=15 then raise exception 'Espera un momento antes de enviar más mensajes';end if;
 perform public.check_language(p_body);insert into public.room_messages(content_id,author_id,body) values(p_content,auth.uid(),trim(p_body));
end $$;
create function public.remove_room_message(p_message uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();update public.room_messages set removed=true where id=p_message and(author_id=auth.uid() or public.is_admin());if not found then raise exception 'Sin permiso';end if;insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'remove_room_message',p_message);end $$;
create function public.report_room_message(p_message uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();if length(trim(p_reason))<10 then raise exception 'Explica el reporte';end if;
 if(select count(*) from public.reports where user_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Límite de reportes por hora';end if;
 if not exists(select 1 from public.room_messages where id=p_message and not removed and public.room_open(content_id)) then raise exception 'Mensaje no disponible';end if;
 insert into public.reports(user_id,reason) values(auth.uid(),'Chat '||p_message::text||': '||left(p_reason,1500));
end $$;

create table public.editor_drafts(user_id uuid not null references public.profiles(id),draft_key text not null check(length(draft_key)<=160),snapshot jsonb not null check(octet_length(snapshot::text)<=150000),updated_at timestamptz not null default now(),primary key(user_id,draft_key));
alter table public.editor_drafts enable row level security;
create policy own_drafts on public.editor_drafts for select to authenticated using(user_id=auth.uid());
revoke all on public.editor_drafts from public,anon,authenticated;grant select on public.editor_drafts to authenticated;
create function public.save_editor_draft(p_key text,p_snapshot jsonb) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();if p_snapshot is null then delete from public.editor_drafts where user_id=auth.uid() and draft_key=p_key;else if not exists(select 1 from public.editor_drafts where user_id=auth.uid() and draft_key=p_key) and(select count(*) from public.editor_drafts where user_id=auth.uid())>=50 then raise exception 'Máximo 50 borradores por cuenta';end if;insert into public.editor_drafts values(auth.uid(),p_key,p_snapshot,now()) on conflict(user_id,draft_key) do update set snapshot=excluded.snapshot,updated_at=now();end if;end $$;

-- AI quota is persistent and caller-scoped, independent of serverless instance lifetime.
create function public.reserve_ai_request() returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();perform 1 from public.profiles where id=auth.uid() for update;if(select count(*) from public.audit_log where actor_id=auth.uid() and action='ai_request' and created_at>now()-interval '1 hour')>=8 then raise exception 'Límite de 8 propuestas por hora';end if;insert into public.audit_log(actor_id,action) values(auth.uid(),'ai_request');end $$;

do $$declare f record;begin for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('guard_name','request_name','review_name','save_identity','check_language','moderate_text','project_access','configure_project','guard_evaluator_membership','add_project_review','add_evidence','detach_content','highlight_solution','require_solution_demo','room_open','send_room_message','remove_room_message','report_room_message','save_editor_draft','reserve_ai_request') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);if f.proname not in('guard_name','check_language','moderate_text','guard_evaluator_membership','require_solution_demo') then execute format('grant execute on function %s to authenticated',f.signature);end if;end loop;end $$;
commit;
