-- nextONE pilot. Run once in a NEW Supabase project's SQL Editor.
-- All writes are RPCs. No service-role key is shipped to the browser.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 120),bio text not null default '',skills text not null default '',
 role text not null default 'member' check(role in ('admin','organizer','mentor','member')),
 status text not null default 'pending' check(status in ('pending','active','suspended')),
 source text not null default 'Solicitud',created_at timestamptz not null default now()
);
create table public.content (
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('event','webinar','resource','speaker','case','solution','project','update','post')),
 title text not null check(length(title) between 3 and 180),body text not null check(length(body) between 1 and 12000),
 url text check(url is null or url ~ '^https://'),owner_id uuid not null references public.profiles(id),
 parent_id uuid references public.content(id) on delete restrict,starts_at timestamptz,ends_at timestamptz,
 capacity integer check(capacity between 1 and 10000),published boolean not null default false,created_at timestamptz not null default now(),
 check(ends_at is null or starts_at is null or ends_at>starts_at)
);
create index content_kind_idx on public.content(kind,published,created_at desc);
create index content_parent_idx on public.content(parent_id);
create table public.event_access (content_id uuid primary key references public.content(id) on delete cascade,join_url text not null check(join_url ~ '^https://'));
create table public.feedback (
 content_id uuid references public.content(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,
 reaction integer check(reaction in (-1,1)),rating integer check(rating between 1 and 5),updated_at timestamptz not null default now(),
 primary key(content_id,user_id)
);
create table public.comments (
 id uuid primary key default gen_random_uuid(),content_id uuid not null references public.content(id) on delete cascade,
 author_id uuid not null references public.profiles(id),body text not null check(length(body) between 1 and 2000),created_at timestamptz not null default now()
);
create index comments_content_idx on public.comments(content_id,created_at);
create table public.registrations (
 content_id uuid references public.content(id) on delete cascade,user_id uuid references public.profiles(id),
 status text not null default 'registered' check(status in ('registered','attended','cancelled')),
 joined_at timestamptz,created_at timestamptz not null default now(),primary key(content_id,user_id)
);
create table public.attempts (
 case_id uuid references public.content(id),user_id uuid references public.profiles(id),started_at timestamptz not null default now(),
 submitted_at timestamptz,solution_id uuid references public.content(id),primary key(case_id,user_id)
);
create table public.invitations (
 id uuid primary key default gen_random_uuid(),token uuid not null unique default gen_random_uuid(),label text not null check(length(label) between 1 and 150),
 recipient_email text,max_uses integer not null check(max_uses between 1 and 1000),used integer not null default 0 check(used>=0),
 expires_at timestamptz not null,revoked boolean not null default false,direct boolean not null default true,created_by uuid not null references public.profiles(id),
 check(recipient_email is null or max_uses=1)
);
create table public.invitation_claims (invitation_id uuid references public.invitations(id),user_id uuid references public.profiles(id),claimed_at timestamptz not null default now(),primary key(invitation_id,user_id));
create table public.reports (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),content_id uuid references public.content(id),comment_id uuid references public.comments(id) on delete set null,
 reason text not null check(length(reason) between 10 and 2000),resolved boolean not null default false,decision text not null default '',created_at timestamptz not null default now()
);
create table public.audit_log (id bigint generated always as identity primary key,actor_id uuid references public.profiles(id),action text not null,target_id uuid,details text not null default '',created_at timestamptz not null default now());

create function public.active_member() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and status='active') $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and status='active' and role='admin') $$;
create function public.is_editor() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and status='active' and role in ('admin','organizer','mentor')) $$;
create function public.can_read_content(target uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.content c where c.id=target and ((c.published and public.active_member()) or public.is_admin() or (public.active_member() and c.owner_id=auth.uid()))) $$;
create function public.require_active() returns void language plpgsql security definer set search_path='' as $$ begin if not public.active_member() then raise exception 'Acceso pendiente o suspendido'; end if; end $$;

create function public.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,name) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1),'Miembro'),120));return new;end $$;
create trigger nextone_signup after insert on auth.users for each row execute function public.on_signup();

alter table public.profiles enable row level security;
alter table public.content enable row level security;
alter table public.event_access enable row level security;
alter table public.feedback enable row level security;
alter table public.comments enable row level security;
alter table public.registrations enable row level security;
alter table public.attempts enable row level security;
alter table public.invitations enable row level security;
alter table public.invitation_claims enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin() or (public.active_member() and status='active'));
create policy content_read on public.content for select to authenticated using(public.can_read_content(id));
create policy own_feedback on public.feedback for select to authenticated using(user_id=auth.uid() and public.can_read_content(content_id));
create policy comments_read on public.comments for select to authenticated using(public.can_read_content(content_id));
create policy registrations_read on public.registrations for select to authenticated using(user_id=auth.uid() or public.is_admin() or (public.active_member() and exists(select 1 from public.content where id=content_id and owner_id=auth.uid())));
create policy attempts_read on public.attempts for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy invitations_read on public.invitations for select to authenticated using(public.is_admin());
create policy claims_read on public.invitation_claims for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy reports_read on public.reports for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy audit_read on public.audit_log for select to authenticated using(public.is_admin());

create function public.save_profile(p_name text,p_bio text,p_skills text) returns void language plpgsql security definer set search_path='' as $$
begin if auth.uid() is null then raise exception 'Inicia sesión';end if;
update public.profiles set name=p_name,bio=left(p_bio,2000),skills=left(p_skills,500) where id=auth.uid();end $$;

create function public.save_content(p_id uuid,p_kind text,p_title text,p_body text,p_url text default null,p_parent uuid default null,p_start timestamptz default null,p_end timestamptz default null,p_capacity integer default null,p_published boolean default true,p_join_url text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid; existing public.content; allowed boolean;
begin perform public.require_active();
if p_kind='solution' then raise exception 'Entrega soluciones mediante el builder case';end if;
allowed:=public.is_editor() or p_kind in ('post','project','update');
if not allowed then raise exception 'Solo organizadores o mentores pueden publicar este contenido';end if;
if p_parent is not null and not public.can_read_content(p_parent) then raise exception 'Contenido padre no disponible';end if;
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

create function public.set_feedback(p_content uuid,p_reaction integer,p_rating integer) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();if not public.can_read_content(p_content) then raise exception 'Contenido no disponible';end if;
insert into public.feedback(content_id,user_id,reaction,rating) values(p_content,auth.uid(),p_reaction,p_rating) on conflict(content_id,user_id) do update set reaction=excluded.reaction,rating=excluded.rating,updated_at=now();end $$;

create function public.feedback_summary(p_content uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin if not public.can_read_content(p_content) then raise exception 'Contenido no disponible';end if;
select jsonb_build_object('likes',count(*) filter(where reaction=1),'dislikes',count(*) filter(where reaction=-1),'ratingCount',count(rating),'average',avg(rating),'distribution',jsonb_build_array(count(*) filter(where rating=1),count(*) filter(where rating=2),count(*) filter(where rating=3),count(*) filter(where rating=4),count(*) filter(where rating=5)),'comments',(select count(*) from public.comments where content_id=p_content)) into result from public.feedback where content_id=p_content;return result;end $$;

create function public.add_comment(p_content uuid,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin perform public.require_active();if not public.can_read_content(p_content) then raise exception 'Contenido no disponible';end if;
if (select count(*) from public.comments where author_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'Espera antes de publicar más comentarios';end if;
insert into public.comments(content_id,author_id,body) values(p_content,auth.uid(),trim(p_body)) returning id into result;return result;end $$;
create function public.remove_comment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();if not exists(select 1 from public.comments where id=p_id and (author_id=auth.uid() or public.is_admin())) then raise exception 'Sin permiso';end if;
insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'remove_comment',p_id);delete from public.comments where id=p_id;end $$;

create function public.register_event(p_content uuid,p_cancel boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare item public.content;begin perform public.require_active();select * into item from public.content where id=p_content for update;
if item.kind not in ('event','webinar') or not public.can_read_content(p_content) then raise exception 'Evento no disponible';end if;
if p_cancel then update public.registrations set status='cancelled' where content_id=p_content and user_id=auth.uid();return;end if;
if item.ends_at<now() then raise exception 'El evento finalizó';end if;
if exists(select 1 from public.registrations where content_id=p_content and user_id=auth.uid() and status<>'cancelled') then return;end if;
if item.capacity is not null and (select count(*) from public.registrations where content_id=p_content and status<>'cancelled')>=item.capacity then raise exception 'No quedan cupos';end if;
insert into public.registrations(content_id,user_id) values(p_content,auth.uid()) on conflict(content_id,user_id) do update set status='registered';end $$;

create function public.get_join_link(p_content uuid) returns text language plpgsql security definer set search_path='' as $$
declare item public.content;result text;begin perform public.require_active();select * into item from public.content where id=p_content;
if item.kind not in ('event','webinar') or not public.can_read_content(p_content) then raise exception 'Evento no disponible';end if;
if not(public.is_admin() or item.owner_id=auth.uid()) then
 if not exists(select 1 from public.registrations where content_id=p_content and user_id=auth.uid() and status<>'cancelled') then raise exception 'Primero inscríbete';end if;
 if now()<item.starts_at-interval '5 minutes' then raise exception 'El acceso se habilita cinco minutos antes';end if;
 if now()>item.ends_at then raise exception 'El evento finalizó';end if;
 update public.registrations set joined_at=coalesce(joined_at,now()) where content_id=p_content and user_id=auth.uid();
end if;
select join_url into result from public.event_access where content_id=p_content;if result is null then raise exception 'El organizador aún no configuró el acceso';end if;return result;end $$;

create function public.mark_attendance(p_content uuid,p_user uuid,p_attended boolean) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();if not(public.is_admin() or exists(select 1 from public.content where id=p_content and owner_id=auth.uid())) then raise exception 'Sin permiso';end if;
update public.registrations set status=case when p_attended then 'attended' else 'registered' end where content_id=p_content and user_id=p_user and status<>'cancelled';
insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'attendance',p_content,p_user::text);end $$;

create function public.start_case(p_case uuid) returns void language plpgsql security definer set search_path='' as $$
declare item public.content;begin perform public.require_active();select * into item from public.content where id=p_case;
if item.kind<>'case' or not public.can_read_content(p_case) or item.ends_at<now() or (item.starts_at is not null and item.starts_at>now()) then raise exception 'Builder case no disponible';end if;
insert into public.attempts(case_id,user_id) values(p_case,auth.uid()) on conflict do nothing;end $$;
create function public.submit_solution(p_case uuid,p_title text,p_body text,p_url text) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.content;attempt public.attempts;result uuid;begin perform public.require_active();select * into item from public.content where id=p_case;
if item.kind<>'case' or not public.can_read_content(p_case) or item.ends_at<now() then raise exception 'El plazo finalizó o el case no está disponible';end if;
select * into attempt from public.attempts where case_id=p_case and user_id=auth.uid() for update;
if attempt.case_id is null then raise exception 'Inicia el case antes de entregar';end if;
if attempt.solution_id is not null then raise exception 'Ya entregaste una solución';end if;
insert into public.content(kind,title,body,url,owner_id,parent_id,published) values('solution',p_title,p_body,p_url,auth.uid(),p_case,true) returning id into result;
update public.attempts set solution_id=result,submitted_at=now() where case_id=p_case and user_id=auth.uid();return result;end $$;

create function public.create_invitation(p_label text,p_email text,p_limit integer,p_expires timestamptz,p_direct boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin if not public.is_admin() then raise exception 'Solo administración';end if;
if p_expires<=now() then raise exception 'Fecha de vencimiento inválida';end if;
insert into public.invitations(label,recipient_email,max_uses,expires_at,direct,created_by) values(p_label,nullif(lower(trim(p_email)),''),p_limit,p_expires,p_direct,auth.uid()) returning token into result;return result;end $$;
create function public.claim_invitation(p_token uuid) returns text language plpgsql security definer set search_path='' as $$
declare item public.invitations;email_address text;member public.profiles;
begin if auth.uid() is null then raise exception 'Inicia sesión';end if;
select * into member from public.profiles where id=auth.uid();if member.status='suspended' then raise exception 'Cuenta suspendida';end if;
select * into item from public.invitations where token=p_token for update;
if item.id is null or item.revoked or item.expires_at<=now() then raise exception 'Invitación inválida o vencida';end if;
if exists(select 1 from public.invitation_claims where invitation_id=item.id and user_id=auth.uid()) then return member.status;end if;
if item.used>=item.max_uses then raise exception 'No quedan invitaciones';end if;
select lower(email) into email_address from auth.users where id=auth.uid() and email_confirmed_at is not null;
if email_address is null or (item.recipient_email is not null and item.recipient_email<>email_address) then raise exception 'Usa el correo verificado al que se dirigió la invitación';end if;
insert into public.invitation_claims(invitation_id,user_id) values(item.id,auth.uid());update public.invitations set used=used+1 where id=item.id;
update public.profiles set source=item.label,status=case when status='active' or item.direct then 'active' else 'pending' end where id=auth.uid() returning status into email_address;return email_address;end $$;
create function public.revoke_invitation(p_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'Solo administración';end if;update public.invitations set revoked=true where id=p_id;end $$;
create function public.admin_member(p_user uuid,p_status text,p_role text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Solo administración';end if;
if p_user=auth.uid() and (p_status<>'active' or p_role<>'admin') then raise exception 'No puedes quitar tu propio acceso de administración';end if;
if length(trim(p_reason))<5 then raise exception 'Explica la decisión';end if;
update public.profiles set status=p_status,role=p_role where id=p_user;insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'member_access',p_user,p_reason);end $$;
create function public.report_item(p_content uuid,p_comment uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();if not public.can_read_content(p_content) then raise exception 'Contenido no disponible';end if;
if p_comment is not null and not exists(select 1 from public.comments where id=p_comment and content_id=p_content) then raise exception 'Comentario no disponible';end if;
if (select count(*) from public.reports where user_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Límite de reportes alcanzado';end if;
insert into public.reports(user_id,content_id,comment_id,reason) values(auth.uid(),p_content,p_comment,p_reason);end $$;
create function public.resolve_report(p_id uuid,p_decision text) returns void language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Solo administración';end if;if length(trim(p_decision))<5 then raise exception 'Explica la decisión';end if;
update public.reports set resolved=true,decision=p_decision where id=p_id;insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'resolve_report',p_id,p_decision);end $$;

create function public.content_metrics() returns table(id uuid,title text,kind text,registrations bigint,attendance bigint,access_clicks bigint,likes bigint,dislikes bigint,rating_count bigint,average numeric,comments bigint,participants bigint,submissions bigint,average_minutes numeric) language plpgsql stable security definer set search_path='' as $$
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
from public.content c where public.is_admin() or c.owner_id=auth.uid();end $$;

-- Deny direct writes even if a client calls REST manually.
revoke all on public.profiles,public.content,public.event_access,public.feedback,public.comments,public.registrations,public.attempts,public.invitations,public.invitation_claims,public.reports,public.audit_log from anon,authenticated;
grant select on public.profiles,public.content,public.feedback,public.comments,public.registrations,public.attempts,public.invitations,public.invitation_claims,public.reports,public.audit_log to authenticated;
-- No SELECT grant on event_access: Zoom links are only returned by the timed RPC.
do $$ declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('active_member','is_admin','is_editor','can_read_content','require_active','on_signup','save_profile','save_content','set_feedback','feedback_summary','add_comment','remove_comment','register_event','get_join_link','mark_attendance','start_case','submit_solution','create_invitation','claim_invitation','revoke_invitation','admin_member','report_item','resolve_report','content_metrics') loop execute format('revoke all on function %s from public,anon',f.signature);if f.signature::text not like '%on_signup%' then execute format('grant execute on function %s to authenticated',f.signature);end if;end loop;end $$;
commit;

begin;
alter table public.content add constraint content_not_own_parent check(parent_id is null or parent_id<>id);
-- Avoid cycles and maintain the hierarchy when content is edited.
create function public.validate_content_parent() returns trigger language plpgsql security definer set search_path='' as $$
declare parent_kind text;
begin
 if new.parent_id is not null then
  select kind into parent_kind from public.content where id=new.parent_id;
  if new.kind='solution' and parent_kind<>'case' then raise exception 'La solución pertenece a un builder case';end if;
  if new.kind='update' and parent_kind<>'project' then raise exception 'El avance pertenece a un proyecto';end if;
  if exists(with recursive ancestors as (
    select c.id,c.parent_id from public.content c where c.id=new.parent_id
    union select c.id,c.parent_id from public.content c join ancestors a on c.id=a.parent_id
   ) select 1 from ancestors where id=new.id) then raise exception 'La vinculación crea un ciclo';end if;
 end if;
 return new;
end $$;
revoke all on function public.validate_content_parent() from public,anon,authenticated;
create trigger nextone_parent_guard before insert or update on public.content for each row execute function public.validate_content_parent();
create index registrations_user_idx on public.registrations(user_id);
create index comments_author_idx on public.comments(author_id,created_at);
create index content_owner_idx on public.content(owner_id,created_at);
create index feedback_user_idx on public.feedback(user_id);
create index reports_user_idx on public.reports(user_id,created_at);
commit;

