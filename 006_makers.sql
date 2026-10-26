begin;
-- Additive upgrade. Never replay installers against an existing database.
alter table public.content add column topics text[] not null default '{}', add column methodology text not null default '', add column audience text not null default '';
alter table public.profiles add column interests text[] not null default '{}', add column cohort text not null default '';
alter table public.content_pages add column revision integer not null default 1;
create index content_topics_idx on public.content using gin(topics);
create index profiles_cohort_idx on public.profiles(cohort);

create function public.bump_page_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision:=old.revision+1;return new;end $$;
create trigger page_revision before update of data on public.content_pages for each row when(old.data is distinct from new.data) execute function public.bump_page_revision();

create function public.publish_makers_content(p_id uuid,p_kind text,p_title text,p_body text,p_url text,p_parent uuid,p_start timestamptz,p_end timestamptz,p_capacity integer,p_published boolean,p_join_url text,p_template text,p_data jsonb,p_topics text[],p_methodology text,p_audience text) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if coalesce(cardinality(p_topics),0)>12 or exists(select 1 from unnest(p_topics) t where length(t)>60) or length(p_methodology)>80 or length(p_audience)>120 then raise exception 'Clasificación demasiado extensa';end if;
 target:=public.publish_interactive_content(p_id,p_kind,p_title,p_body,p_url,p_parent,p_start,p_end,p_capacity,p_published,p_join_url,p_template,p_data);
 update public.content set topics=array(select distinct trim(t) from unnest(coalesce(p_topics,'{}')) t where trim(t)<>''),methodology=trim(coalesce(p_methodology,'')),audience=trim(coalesce(p_audience,'')) where id=target;
 return target;
end $$;
create function public.save_makers_profile(p_interests text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 if coalesce(cardinality(p_interests),0)>12 or exists(select 1 from unnest(p_interests) t where length(t)>60) then raise exception 'Máximo 12 intereses de 60 caracteres';end if;
 update public.profiles set interests=array(select distinct trim(t) from unnest(coalesce(p_interests,'{}')) t where trim(t)<>'') where id=auth.uid();
end $$;
create function public.set_member_cohort(p_user uuid,p_cohort text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if length(p_cohort)>80 then raise exception 'Cohorte demasiado extensa';end if;
 update public.profiles set cohort=trim(coalesce(p_cohort,'')) where id=p_user;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'member_cohort',p_user,p_cohort);
end $$;

create table public.activity_history(
 id bigint generated always as identity primary key,
 content_id uuid not null references public.content(id),user_id uuid not null references public.profiles(id),
 event text not null,details jsonb not null default '{}',topics text[] not null,methodology text not null,cohort text not null,
 occurred_at timestamptz not null default now()
);
create index activity_period_idx on public.activity_history(occurred_at,content_id);
create index activity_user_idx on public.activity_history(user_id,occurred_at);
alter table public.activity_history enable row level security;
-- History is only exposed as permission-filtered aggregates, never raw identities.
revoke all on public.activity_history from public,anon,authenticated;
create function public.append_activity(p_content uuid,p_user uuid,p_event text,p_details jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.activity_history(content_id,user_id,event,details,topics,methodology,cohort)
 select c.id,p_user,p_event,p_details,c.topics,c.methodology,p.cohort from public.content c join public.profiles p on p.id=p_user where c.id=p_content;
end $$;
create function public.capture_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='registrations' then
  if tg_op='INSERT' then perform public.append_activity(new.content_id,new.user_id,'registered');
  else
   if new.status is distinct from old.status then perform public.append_activity(new.content_id,new.user_id,new.status);end if;
   if new.joined_at is not null and old.joined_at is null then perform public.append_activity(new.content_id,new.user_id,'access_obtained');end if;
  end if;
 elsif tg_table_name='feedback' then perform public.append_activity(new.content_id,new.user_id,'feedback',jsonb_build_object('rating',new.rating,'reaction',new.reaction));
 elsif tg_table_name='comments' then perform public.append_activity(new.content_id,new.author_id,'comment');
 elsif tg_table_name='attempts' then
  if tg_op='INSERT' then perform public.append_activity(new.case_id,new.user_id,'case_started');
  elsif old.submitted_at is null and new.submitted_at is not null then perform public.append_activity(new.case_id,new.user_id,'submitted');end if;
 end if;
 return new;
end $$;
create trigger registrations_history after insert or update on public.registrations for each row execute function public.capture_activity();
create trigger feedback_history after insert or update on public.feedback for each row execute function public.capture_activity();
create trigger comments_history after insert on public.comments for each row execute function public.capture_activity();
create trigger attempts_history after insert or update on public.attempts for each row execute function public.capture_activity();

create table public.interaction_progress(
 content_id uuid not null references public.content(id),user_id uuid not null references public.profiles(id),revision integer not null,
 block_id text not null,kind text not null check(kind in ('quiz','checklist')),payload jsonb not null,completed boolean not null default false,
 updated_at timestamptz not null default now(),primary key(content_id,user_id,revision,block_id)
);
alter table public.interaction_progress enable row level security;
create policy progress_read on public.interaction_progress for select to authenticated using(user_id=auth.uid() and public.can_read_content(content_id));
revoke all on public.interaction_progress from public,anon,authenticated;
grant select on public.interaction_progress to authenticated;
create function public.save_interaction(p_content uuid,p_revision integer,p_block text,p_kind text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare page public.content_pages;b jsonb;item jsonb;i integer;score integer:=0;total integer;complete boolean;result jsonb;was_complete boolean;
begin
 perform public.require_active();
 if not public.can_read_content(p_content) then raise exception 'Contenido no disponible';end if;
 select * into page from public.content_pages where content_id=p_content for share;
 if page.revision is distinct from p_revision then raise exception 'El contenido cambió. Vuelve a abrirlo';end if;
 select x into b from jsonb_array_elements(page.data->'blocks') x where x->>'id'=p_block and x->>'type'=p_kind;
 if b is null or p_kind not in ('quiz','checklist') then raise exception 'Bloque no disponible';end if;
 if octet_length(p_payload::text)>4000 then raise exception 'Respuesta demasiado extensa';end if;
 total:=jsonb_array_length(b->'props'->'items');
 if total<1 then raise exception 'Bloque vacío';end if;
 if p_kind='quiz' then
  if jsonb_typeof(p_payload->'answers') is distinct from 'array' or jsonb_array_length(p_payload->'answers')<>total then raise exception 'Completa todas las preguntas';end if;
  for i in 0..total-1 loop
   item:=p_payload->'answers'->i;
   if jsonb_typeof(item)<>'number' or item::text !~ '^[0-9]+$' or (item::text)::integer>=jsonb_array_length(b->'props'->'items'->i->'options') then raise exception 'Respuesta inválida';end if;
   if (item::text)::integer=coalesce((b->'props'->'items'->i->>'answer')::integer,1)-1 then score:=score+1;end if;
  end loop;
  result:=jsonb_build_object('answers',p_payload->'answers','score',score,'total',total);complete:=true;
 else
  if jsonb_typeof(p_payload->'done') is distinct from 'array' or jsonb_array_length(p_payload->'done')>total then raise exception 'Progreso inválido';end if;
  for item in select x from jsonb_array_elements(p_payload->'done') x loop
   if jsonb_typeof(item)<>'number' or item::text !~ '^[0-9]+$' or (item::text)::integer>=total then raise exception 'Progreso inválido';end if;
  end loop;
  select jsonb_build_object('done',coalesce(jsonb_agg(distinct x),'[]')) into result from jsonb_array_elements(p_payload->'done') x;
  complete:=jsonb_array_length(result->'done')=total;
 end if;
 -- Serialize concurrent requests for the same person's content; log completion once per revision/block.
 perform 1 from public.profiles where id=auth.uid() for update;
 select completed into was_complete from public.interaction_progress where content_id=p_content and user_id=auth.uid() and revision=p_revision and block_id=p_block;
 insert into public.interaction_progress values(p_content,auth.uid(),p_revision,p_block,p_kind,result,complete,now())
 on conflict(content_id,user_id,revision,block_id) do update set payload=excluded.payload,completed=public.interaction_progress.completed or excluded.completed,updated_at=now();
 if complete and not coalesce(was_complete,false) then perform public.append_activity(p_content,auth.uid(),p_kind||'_completed',jsonb_build_object('revision',p_revision,'block',p_block,'score',score,'total',total));end if;
 return result;
end $$;

create function public.makers_insights(p_from timestamptz,p_until timestamptz,p_topic text default '',p_methodology text default '',p_cohort text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_editor() then raise exception 'Solo equipo organizador';end if;
 if p_from is null or p_until is null or p_until<=p_from or p_until-p_from>interval '732 days' then raise exception 'Elige un período válido de hasta dos años';end if;
 with visible as (
  select h.* from public.activity_history h join public.content c on c.id=h.content_id
  where c.deleted_at is null and (public.is_admin() or c.owner_id=auth.uid())
  and (p_topic='' or p_topic=any(h.topics)) and (p_methodology='' or h.methodology=p_methodology) and (p_cohort='' or h.cohort=p_cohort)
 ), period as(select * from visible where occurred_at>=p_from and occurred_at<p_until),
 days as(select to_char(occurred_at at time zone 'America/Bogota','YYYY-MM-DD') as "day",count(*) actions,count(distinct user_id) people from period group by 1),
 rated as(select distinct on(content_id,user_id) * from period where event='feedback' order by content_id,user_id,occurred_at desc,id desc),
 methods as(select coalesce(nullif(p.methodology,''),'Sin clasificar') name,count(*) actions,count(distinct p.user_id) people,(select avg((r.details->>'rating')::numeric) from rated r where r.methodology=p.methodology) usefulness,(select count(*) from rated r where r.methodology=p.methodology and r.details->>'rating' is not null) responses from period p group by p.methodology),
 topics as(select t.name,count(*) actions,count(distinct p.user_id) people from period p cross join lateral unnest(case when cardinality(p.topics)=0 then array['Sin clasificar'] else p.topics end) t(name) group by 1)
 select jsonb_build_object('people',(select count(distinct user_id) from period),'returning',(select count(distinct p.user_id) from period p where exists(select 1 from visible v where v.user_id=p.user_id and v.occurred_at<p_from)),
 'days',coalesce((select jsonb_agg(d order by "day") from days d),'[]'), 'methods',coalesce((select jsonb_agg(m order by name) from methods m),'[]'),'topics',coalesce((select jsonb_agg(t order by name) from topics t),'[]'),
 'quizzes',(select count(*) from period where event='quiz_completed'),'checklists',(select count(*) from period where event='checklist_completed'),
 'interests',(select coalesce(jsonb_agg(i),'[]') from (select t.name,count(distinct p.id) people from public.profiles p cross join lateral unnest(p.interests) t(name) where p.id in(select user_id from period) group by 1 order by 1) i),
 'recording_since',(select min(occurred_at) from visible)) into result;
 return result;
end $$;

-- Least privilege: helpers/triggers must never be callable from a browser.
revoke all on function public.bump_page_revision(),public.append_activity(uuid,uuid,text,jsonb),public.capture_activity() from public,anon,authenticated;
revoke all on function public.publish_makers_content(uuid,text,text,text,text,uuid,timestamptz,timestamptz,integer,boolean,text,text,jsonb,text[],text,text),public.save_makers_profile(text[]),public.set_member_cohort(uuid,text),public.save_interaction(uuid,integer,text,text,jsonb),public.makers_insights(timestamptz,timestamptz,text,text,text) from public,anon;
grant execute on function public.publish_makers_content(uuid,text,text,text,text,uuid,timestamptz,timestamptz,integer,boolean,text,text,jsonb,text[],text,text),public.save_makers_profile(text[]),public.set_member_cohort(uuid,text),public.save_interaction(uuid,integer,text,text,jsonb),public.makers_insights(timestamptz,timestamptz,text,text,text) to authenticated;
commit;
