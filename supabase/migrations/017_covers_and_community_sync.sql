-- Apply after 016. Private covers and payload-free community invalidation.
begin;
alter table public.content add column if not exists cover_path text;
alter table public.content add column if not exists cover_alt text not null default '';
alter table public.content add column if not exists cover_position text not null default 'center';
do $$begin if not exists(select 1 from pg_constraint where conrelid='public.content'::regclass and conname='content_cover_path_check') then alter table public.content add constraint content_cover_path_check check(cover_path is null or cover_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$'); end if;end $$;
do $$begin if not exists(select 1 from pg_constraint where conrelid='public.content'::regclass and conname='content_cover_alt_check') then alter table public.content add constraint content_cover_alt_check check(length(cover_alt)<=180); end if;end $$;
do $$begin if not exists(select 1 from pg_constraint where conrelid='public.content'::regclass and conname='content_cover_position_check') then alter table public.content add constraint content_cover_position_check check(cover_position in ('top','center','bottom')); end if;end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('content-covers','content-covers',false,2097152,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
do $$begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='covers_read') then create policy covers_read on storage.objects for select to authenticated using(
 bucket_id='content-covers' and public.active_member() and
 (split_part(name,'/',1)=auth.uid()::text or public.is_admin() or exists(select 1 from public.content c where c.cover_path=name and public.can_read_content(c.id)))); end if;end $$;
do $$begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='covers_upload') then create policy covers_upload on storage.objects for insert to authenticated with check(
 bucket_id='content-covers' and public.active_member() and split_part(name,'/',1)=auth.uid()::text and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$'); end if;end $$;
-- No overwriting: each version has a unique path. Referenced covers cannot be removed.
create or replace function public.cover_in_use(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.content where cover_path=p_path and deleted_at is null)
$$;
revoke all on function public.cover_in_use(text) from public,anon;grant execute on function public.cover_in_use(text) to authenticated;
do $$begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='covers_remove') then create policy covers_remove on storage.objects for delete to authenticated using(bucket_id='content-covers' and public.active_member()
 and (split_part(name,'/',1)=auth.uid()::text or public.is_admin()) and not public.cover_in_use(name)); end if;end $$;

create or replace function public.publish_content_with_cover(p_content jsonb,p_cover jsonb,p_rules jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid;path text;previous text;alt text;position text;
begin
 perform public.require_active();
 if jsonb_typeof(p_content) is distinct from 'object' or jsonb_typeof(p_cover) is distinct from 'object' then raise exception 'Datos de publicación no válidos';end if;
 path:=nullif(p_cover->>'path','');alt:=coalesce(p_cover->>'alt','');position:=coalesce(p_cover->>'position','center');
 if length(alt)>180 or position not in ('top','center','bottom') then raise exception 'Portada no válida';end if;
 if nullif(p_content->>'p_id','') is not null then select cover_path into previous from public.content where id=(p_content->>'p_id')::uuid;end if;
 if path is not null then
  if path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$' or not exists(select 1 from storage.objects where bucket_id='content-covers' and name=path) then raise exception 'Primero sube una imagen válida';end if;
  if path is distinct from previous and split_part(path,'/',1)<>auth.uid()::text then raise exception 'La portada pertenece a otra persona';end if;
 end if;
 if p_content->>'p_kind'='case' then target:=public.publish_challenge(p_content,p_rules);
 else
  target:=public.publish_workspace_content(nullif(p_content->>'p_id','')::uuid,p_content->>'p_kind',p_content->>'p_title',p_content->>'p_body',nullif(p_content->>'p_url',''),nullif(p_content->>'p_parent','')::uuid,nullif(p_content->>'p_start','')::timestamptz,nullif(p_content->>'p_end','')::timestamptz,nullif(p_content->>'p_capacity','')::integer,coalesce((p_content->>'p_published')::boolean,true),nullif(p_content->>'p_join_url',''),p_content->>'p_template',p_content->'p_data',array(select jsonb_array_elements_text(coalesce(p_content->'p_topics','[]'))),p_content->>'p_methodology',p_content->>'p_audience',p_content->'p_project_config');
 end if;
 -- Existing publish functions enforce ownership, role, deadlines and solution rules.
 update public.content set cover_path=path,cover_alt=alt,cover_position=position where id=target;
 return target;
end $$;
revoke all on function public.publish_content_with_cover(jsonb,jsonb,jsonb) from public,anon;grant execute on function public.publish_content_with_cover(jsonb,jsonb,jsonb) to authenticated;

create table if not exists public.community_updates(scope text primary key check(scope in ('profiles','content','activity')),version bigint not null default 0,updated_at timestamptz not null default now());
insert into public.community_updates(scope) values('profiles'),('content'),('activity') on conflict(scope) do nothing;
alter table public.community_updates enable row level security;
revoke all on public.community_updates from public,anon,authenticated;grant select on public.community_updates to authenticated;
do $$begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='community_updates' and policyname='community_updates_read') then create policy community_updates_read on public.community_updates for select to authenticated using(public.active_member()); end if;end $$;
create or replace function public.signal_community_update() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.community_updates set version=version+1,updated_at=clock_timestamp() where scope=tg_argv[0];return null;end $$;
revoke all on function public.signal_community_update() from public,anon,authenticated;
do $$declare tab text;scope text;begin
 foreach tab in array array['profiles','content','content_pages','feedback','comments','registrations','attempts','project_roles','project_members','project_tasks','project_messages','final_reviews','challenge_rules','challenge_assessments','solution_versions','project_reviews','interaction_progress','name_requests','reports','invitations','invitation_claims','member_location'] loop
  scope:=case when tab='profiles' then 'profiles' when tab in ('content','content_pages','challenge_rules') then 'content' else 'activity' end;
  execute format('drop trigger if exists nextone_sync on public.%I',tab);
  execute format('create trigger nextone_sync after insert or update or delete on public.%I for each statement execute function public.signal_community_update(%L)',tab,scope);
 end loop;
end $$;
-- Add only safe invalidation signals, never profiles or private rows themselves.
do $$begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime;end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='community_updates') then alter publication supabase_realtime add table public.community_updates;end if;
end $$;
commit;
