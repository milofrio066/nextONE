begin;
-- Administrative statistics are protected at the database boundary, including legacy RPCs.
create or replace function public.content_metrics() returns table(id uuid,title text,kind text,registrations bigint,attendance bigint,access_clicks bigint,likes bigint,dislikes bigint,rating_count bigint,average numeric,comments bigint,participants bigint,submissions bigint,average_minutes numeric)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración puede consultar indicadores';end if;
 return query
 with regs as(select r.content_id,count(*) filter(where r.status<>'cancelled') n,count(*) filter(where r.status='attended') attended,count(*) filter(where r.joined_at is not null) access from public.registrations r group by r.content_id),
 feed as(select f.content_id,count(*) filter(where f.reaction=1) likes,count(*) filter(where f.reaction=-1) dislikes,count(f.rating) n,avg(f.rating)::numeric average from public.feedback f group by f.content_id),
 comm as(select x.content_id,count(*) n from public.comments x group by x.content_id),
 participants as(select x.content_id,count(distinct x.user_id) n from (select f.content_id,f.user_id from public.feedback f where f.rating is not null or f.reaction is not null union all select m.content_id,m.author_id from public.comments m) x group by x.content_id),
 deliveries as(select a.case_id,count(*) n,avg(extract(epoch from(a.submitted_at-a.started_at))/60)::numeric minutes from public.attempts a join public.content s on s.id=a.solution_id and s.deleted_at is null where a.submitted_at is not null group by a.case_id)
 select c.id,c.title,c.kind,coalesce(r.n,0),coalesce(r.attended,0),coalesce(r.access,0),coalesce(f.likes,0),coalesce(f.dislikes,0),coalesce(f.n,0),f.average,coalesce(m.n,0),coalesce(p.n,0),coalesce(d.n,0),d.minutes
 from public.content c left join regs r on r.content_id=c.id left join feed f on f.content_id=c.id left join comm m on m.content_id=c.id left join participants p on p.content_id=c.id left join deliveries d on d.case_id=c.id where c.deleted_at is null;
end $$;
create or replace function public.makers_insights(p_from timestamptz,p_until timestamptz,p_topic text default '',p_methodology text default '',p_cohort text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
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

create table public.challenge_rules(
 content_id uuid primary key references public.content(id),instructions text not null default '' check(length(instructions)<=6000),
 deliverables text not null default '' check(length(deliverables)<=3000),criteria jsonb not null default '[{"label":"Solución al problema","weight":40},{"label":"Evidencia y validación","weight":30},{"label":"Calidad de la demostración","weight":30}]',
 phase text not null default 'accepting' check(phase in ('accepting','review','completed')),participant_limit integer check(participant_limit between 1 and 10000),allow_updates boolean not null default true,updated_at timestamptz not null default now()
);
alter table public.challenge_rules enable row level security;
create policy challenge_rules_read on public.challenge_rules for select to authenticated using(public.can_read_content(content_id));
revoke all on public.challenge_rules from public,anon,authenticated;grant select on public.challenge_rules to authenticated;
create function public.challenge_open(p_case uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.active_member() and exists(select 1 from public.content c left join public.challenge_rules r on r.content_id=c.id where c.id=p_case and c.kind='case' and c.deleted_at is null and c.published and (c.starts_at is null or c.starts_at<=now()) and c.ends_at>now() and coalesce(r.phase,'accepting')='accepting')
$$;
create function public.configure_challenge(p_case uuid,p_instructions text,p_deliverables text,p_criteria jsonb,p_limit integer,p_allow_updates boolean) returns void language plpgsql security definer set search_path='' as $$
declare criterion jsonb; total integer:=0;oldcriteria jsonb;
begin
 perform public.require_active();
 perform 1 from public.content where id=p_case and kind='case' and deleted_at is null and(owner_id=auth.uid() or public.is_admin()) for update;
 if not found then raise exception 'Solo el responsable del reto o administración';end if;
 if length(coalesce(p_instructions,''))>6000 or length(coalesce(p_deliverables,''))>3000 or p_allow_updates is null or (p_limit is not null and p_limit not between 1 and 10000) then raise exception 'Configuración no válida';end if;
 if jsonb_typeof(p_criteria) is distinct from 'array' or jsonb_array_length(p_criteria) not between 1 and 8 then raise exception 'Define de uno a ocho criterios';end if;
 for criterion in select * from jsonb_array_elements(p_criteria) loop
  if jsonb_typeof(criterion->'label') is distinct from 'string' or length(trim(criterion->>'label')) not between 3 and 100 or coalesce(criterion->>'weight','') !~ '^[0-9]{1,3}$' then raise exception 'Criterio no válido';end if;
  if (criterion->>'weight')::integer not between 1 and 100 then raise exception 'Cada peso debe estar entre 1 y 100';end if;perform public.check_language(criterion->>'label');total:=total+(criterion->>'weight')::integer;
 end loop;
 if total<>100 then raise exception 'Los pesos deben sumar 100';end if;
 select criteria into oldcriteria from public.challenge_rules where content_id=p_case;
 if exists(select 1 from public.attempts where case_id=p_case and submitted_at is not null) and p_criteria is distinct from coalesce(oldcriteria,'[{"label":"Solución al problema","weight":40},{"label":"Evidencia y validación","weight":30},{"label":"Calidad de la demostración","weight":30}]'::jsonb) then raise exception 'No cambies los criterios después de recibir entregas';end if;
 if p_limit is not null and p_limit<(select count(*) from public.attempts where case_id=p_case) then raise exception 'El cupo no puede ser menor que los participantes actuales';end if;
 perform public.check_language(coalesce(p_instructions,'')||' '||coalesce(p_deliverables,''));
 insert into public.challenge_rules(content_id,instructions,deliverables,criteria,participant_limit,allow_updates) values(p_case,trim(coalesce(p_instructions,'')),trim(coalesce(p_deliverables,'')),p_criteria,p_limit,p_allow_updates)
 on conflict(content_id) do update set instructions=excluded.instructions,deliverables=excluded.deliverables,criteria=excluded.criteria,participant_limit=excluded.participant_limit,allow_updates=excluded.allow_updates,updated_at=now();
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'challenge_configuration',p_case,p_criteria::text);
end $$;
create function public.set_challenge_phase(p_case uuid,p_phase text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();perform 1 from public.content where id=p_case and kind='case' and deleted_at is null and(owner_id=auth.uid() or public.is_admin()) for update;
 if not found then raise exception 'Solo el responsable del reto o administración';end if;
 if p_phase is null or p_phase not in ('accepting','review','completed') then raise exception 'Fase no válida';end if;
 if p_phase='completed' and exists(select 1 from public.content s where s.parent_id=p_case and s.kind='solution' and s.deleted_at is null and not exists(select 1 from public.final_reviews f where f.content_id=s.id)) then raise exception 'Completa el feedback definitivo de todas las soluciones antes de finalizar';end if;
 insert into public.challenge_rules(content_id,phase) values(p_case,p_phase) on conflict(content_id) do update set phase=p_phase,updated_at=now();
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'challenge_phase',p_case,p_phase);
end $$;
create or replace function public.start_case(p_case uuid) returns void language plpgsql security definer set search_path='' as $$
declare cap integer;
begin
 perform public.require_active();perform 1 from public.content where id=p_case for update;
 if not public.challenge_open(p_case) then raise exception 'El reto no está abierto para participar';end if;
 if exists(select 1 from public.attempts where case_id=p_case and user_id=auth.uid()) then return;end if;
 select participant_limit into cap from public.challenge_rules where content_id=p_case;
 if cap is not null and (select count(*) from public.attempts where case_id=p_case)>=cap then raise exception 'El reto alcanzó su cupo de participantes';end if;
 insert into public.attempts(case_id,user_id) values(p_case,auth.uid());
end $$;
create or replace function public.submit_solution(p_case uuid,p_title text,p_body text,p_url text) returns uuid language plpgsql security definer set search_path='' as $$
declare attempt public.attempts;result uuid;
begin
 perform public.require_active();perform 1 from public.content where id=p_case for update;
 if not public.challenge_open(p_case) then raise exception 'El reto ya no admite entregas';end if;
 select * into attempt from public.attempts where case_id=p_case and user_id=auth.uid() for update;
 if attempt.case_id is null then raise exception 'Inicia el reto antes de entregar';end if;
 if attempt.solution_id is not null then raise exception 'Ya entregaste una solución; edita la entrega existente';end if;
 if p_url is null or length(trim(p_url))<9 or p_url !~ '^https://' then raise exception 'Usa un enlace HTTPS al prototipo funcional';end if;
 insert into public.content(kind,title,body,url,owner_id,parent_id,published) values('solution',p_title,p_body,p_url,auth.uid(),p_case,true) returning id into result;
 update public.attempts set solution_id=result,submitted_at=now() where case_id=p_case and user_id=auth.uid();return result;
end $$;
-- Deadlines and finalized assessments are enforced even through legacy editing RPCs.
create function public.solution_edit_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;item public.content;
begin
 if tg_table_name='content_pages' then target:=new.content_id;else target:=new.id;end if;
 select * into item from public.content where id=target;
 if item.kind='solution' and not public.is_admin() then
  if item.owner_id<>auth.uid() then raise exception 'Solo el autor puede editar su solución';end if;
  if tg_table_name='content' then if new.deleted_at is not null then return new;end if;end if;
  if not public.challenge_open(item.parent_id) or exists(select 1 from public.final_reviews where content_id=target) or (exists(select 1 from public.content_pages where content_id=target) and exists(select 1 from public.challenge_rules where content_id=item.parent_id and not allow_updates)) then raise exception 'La solución está cerrada para cambios';end if;
 end if;
 return new;
end $$;
create trigger solution_content_guard before update of title,body,url on public.content for each row execute function public.solution_edit_guard();
create trigger solution_page_guard before insert or update on public.content_pages for each row execute function public.solution_edit_guard();
create table public.solution_versions(
 id bigint generated always as identity primary key,solution_id uuid not null references public.content(id),version integer not null,author_id uuid references public.profiles(id),snapshot jsonb not null,created_at timestamptz not null default now(),unique(solution_id,version)
);
alter table public.solution_versions enable row level security;
create policy solution_versions_read on public.solution_versions for select to authenticated using(exists(select 1 from public.content where id=solution_id and deleted_at is null and(owner_id=auth.uid() or public.can_finalize_content(solution_id))));
revoke all on public.solution_versions from public,anon,authenticated;grant select on public.solution_versions to authenticated;
create function public.capture_solution_version() returns trigger language plpgsql security definer set search_path='' as $$
declare item public.content;v integer;previous jsonb;snap jsonb;
begin select * into item from public.content where id=new.content_id;
 if item.kind='solution' then
 snap:=jsonb_build_object('title',item.title,'body',item.body,'url',item.url,'design',new.data);
 select version,snapshot into v,previous from public.solution_versions where solution_id=item.id order by version desc limit 1;
 if snap is distinct from previous then insert into public.solution_versions(solution_id,version,author_id,snapshot) values(item.id,coalesce(v,0)+1,auth.uid(),snap);end if;
 end if;return new;end $$;
create trigger solution_version_after after insert or update on public.content_pages for each row execute function public.capture_solution_version();
create function public.withdraw_solution(p_solution uuid) returns void language plpgsql security definer set search_path='' as $$
declare item public.content;
begin
 perform public.require_active();select * into item from public.content where id=p_solution and kind='solution' and deleted_at is null for update;
 if item.id is null or item.owner_id<>auth.uid() then raise exception 'Solo el autor puede retirar esta entrega';end if;
 if not public.challenge_open(item.parent_id) or exists(select 1 from public.final_reviews where content_id=item.id) then raise exception 'No puedes retirar una solución cerrada o evaluada';end if;
 update public.content set deleted_at=now(),published=false,featured=false where id=item.id;
 update public.attempts set solution_id=null,submitted_at=null where case_id=item.parent_id and user_id=auth.uid();
 insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'withdraw_solution',item.id);
end $$;
create index content_active_kind_idx on public.content(kind,created_at desc) where deleted_at is null;
create index solution_parent_active_idx on public.content(parent_id) where kind='solution' and deleted_at is null;
create index activity_content_period_idx on public.activity_history(content_id,occurred_at);
create index attempts_submitted_idx on public.attempts(submitted_at) where submitted_at is not null;

revoke all on function public.solution_edit_guard(),public.capture_solution_version() from public,anon,authenticated;
revoke all on function public.challenge_open(uuid),public.configure_challenge(uuid,text,text,jsonb,integer,boolean),public.set_challenge_phase(uuid,text),public.withdraw_solution(uuid) from public,anon;
grant execute on function public.challenge_open(uuid),public.configure_challenge(uuid,text,text,jsonb,integer,boolean),public.set_challenge_phase(uuid,text),public.withdraw_solution(uuid) to authenticated;

create function public.admin_dashboard(p_from timestamptz,p_until timestamptz,p_kind text default '',p_query text default '',p_offset integer default 0,p_limit integer default 25) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Solo administración puede consultar indicadores';end if;
 if p_from is null or p_until is null or p_until<=p_from or p_until-p_from>interval '366 days' or p_offset is null or p_offset<0 or p_limit is null or p_limit not between 1 and 100 or length(coalesce(p_query,''))>180 then raise exception 'Filtros no válidos; el período máximo es de un año';end if;
 if coalesce(p_kind,'') not in ('','event','webinar','resource','speaker','case','solution','project','update','post') then raise exception 'Sección no válida';end if;
 with selected as materialized(select c.* from public.content c where c.deleted_at is null and(coalesce(p_kind,'')='' or c.kind=p_kind) and(coalesce(p_query,'')='' or c.title ilike '%'||p_query||'%')),
 metrics as materialized(select m.* from public.content_metrics() m join selected c on c.id=m.id),
 history as materialized(select h.* from public.activity_history h join selected c on c.id=h.content_id where h.occurred_at>=p_from-(p_until-p_from) and h.occurred_at<p_until),
 period as materialized(select * from history where occurred_at>=p_from),
 rated as(select distinct on(content_id,user_id) * from period where event='feedback' order by content_id,user_id,occurred_at desc,id desc),
 days as(select d::date as day from generate_series((p_from at time zone 'America/Bogota')::date,((p_until-interval '1 microsecond') at time zone 'America/Bogota')::date,'1 day'::interval) d),
 daily as(select d.day,count(h.id) actions,count(distinct h.user_id) people from days d left join period h on (h.occurred_at at time zone 'America/Bogota')::date=d.day group by d.day),
 start_cohort as(select a.* from public.attempts a join selected c on c.id=a.case_id where a.started_at>=p_from and a.started_at<p_until),
 review_queue as(select s.id,s.title,s.parent_id,s.owner_id from public.content s join selected c on c.id=s.id where s.kind='solution' and s.deleted_at is null and not exists(select 1 from public.final_reviews f where f.content_id=s.id)),
 snapshot as(select count(*) contents,coalesce(sum(registrations),0) registrations,coalesce(sum(attendance),0) attendance,coalesce(sum(rating_count),0) ratings,case when sum(rating_count)>0 then sum(average*rating_count)/sum(rating_count) end usefulness,coalesce(sum(comments),0) comments,coalesce(sum(submissions),0) submissions from metrics)
 select jsonb_build_object('generated_at',now(),'from',p_from,'until',p_until,'recording_since',(select min(h.occurred_at) from public.activity_history h join selected c on c.id=h.content_id),
 'snapshot',(select row_to_json(s) from snapshot s),'rows',coalesce((select jsonb_agg(row_to_json(m)) from(select * from metrics order by title,id offset p_offset limit p_limit)m),'[]'),
 'period',jsonb_build_object('people',(select count(distinct user_id) from period),'actions',(select count(*) from period),'previous_people',(select count(distinct user_id) from history where occurred_at<p_from),'previous_actions',(select count(*) from history where occurred_at<p_from),
 'ratings',(select count(*) from rated where details->>'rating' is not null),'average',(select avg((details->>'rating')::numeric) from rated where details->>'rating' is not null),'median',(select percentile_cont(.5) within group(order by (details->>'rating')::numeric) from rated where details->>'rating' is not null),
 'quizzes',(select count(*) from period where event='quiz_completed'),'checklists',(select count(*) from period where event='checklist_completed'),
 'starters',(select count(*) from start_cohort),'submitted_starters',(select count(*) from start_cohort a join public.content s on s.id=a.solution_id and s.deleted_at is null where a.submitted_at<p_until),
 'distribution',(select jsonb_agg(jsonb_build_object('rating',n,'count',(select count(*) from rated where (details->>'rating')::integer=n))) from generate_series(1,5)n)),
 'daily',coalesce((select jsonb_agg(row_to_json(d) order by day) from daily d),'[]'),'events',coalesce((select jsonb_agg(row_to_json(e)) from(select event,count(*) actions,count(distinct user_id) people from period group by event order by count(*) desc)e),'[]'),
 'review_queue',coalesce((select jsonb_agg(row_to_json(q)) from(select * from review_queue order by title limit 20)q),'[]'),'review_pending',(select count(*) from review_queue)) into result;
 return result;
end $$;
revoke all on function public.admin_dashboard(timestamptz,timestamptz,text,text,integer,integer) from public,anon;
grant execute on function public.admin_dashboard(timestamptz,timestamptz,text,text,integer,integer) to authenticated;

create function public.leave_challenge(p_case uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();perform 1 from public.content where id=p_case for update;
 if not public.challenge_open(p_case) then raise exception 'El reto no está abierto';end if;
 if exists(select 1 from public.attempts where case_id=p_case and user_id=auth.uid() and solution_id is not null) then raise exception 'Retira primero tu solución';end if;
 delete from public.attempts where case_id=p_case and user_id=auth.uid();
 insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'leave_challenge',p_case);
end $$;
create function public.reconcile_deleted_solution() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.kind='solution' and old.deleted_at is null and new.deleted_at is not null then
 update public.attempts set solution_id=null,submitted_at=null where solution_id=new.id;
 end if;return new;end $$;
create trigger reconcile_solution_deleted after update of deleted_at on public.content for each row execute function public.reconcile_deleted_solution();
revoke all on function public.reconcile_deleted_solution() from public,anon,authenticated;
revoke all on function public.leave_challenge(uuid) from public,anon;grant execute on function public.leave_challenge(uuid) to authenticated;


-- Query-only export with the same administrative permission and content scope as the dashboard.
create function public.admin_export_metrics(p_kind text default '',p_query text default '') returns table(id uuid,title text,kind text,registrations bigint,attendance bigint,access_clicks bigint,likes bigint,dislikes bigint,rating_count bigint,average numeric,comments bigint,participants bigint,submissions bigint,average_minutes numeric)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if length(coalesce(p_query,''))>180 or coalesce(p_kind,'') not in ('','event','webinar','resource','speaker','case','solution','project','update','post') then raise exception 'Filtros no válidos';end if;
 if(select count(*) from public.content c where c.deleted_at is null and(coalesce(p_kind,'')='' or c.kind=p_kind) and(coalesce(p_query,'')='' or c.title ilike '%'||p_query||'%'))>10000 then raise exception 'Acota la búsqueda para exportar hasta 10000 contenidos';end if;
 return query select m.* from public.content_metrics() m where(coalesce(p_kind,'')='' or m.kind=p_kind) and(coalesce(p_query,'')='' or m.title ilike '%'||p_query||'%') order by m.title,m.id;
end $$;
revoke all on function public.admin_export_metrics(text,text) from public,anon;grant execute on function public.admin_export_metrics(text,text) to authenticated;



drop policy attempts_read on public.attempts;
create policy attempts_read on public.attempts for select to authenticated using(user_id=auth.uid() or (public.active_member() and public.can_manage_content(case_id)));
create function public.publish_challenge(p_content jsonb,p_rules jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform public.require_active();if jsonb_typeof(p_content) is distinct from 'object' or jsonb_typeof(p_rules) is distinct from 'object' then raise exception 'Datos del reto no válidos';end if;
 if p_content->>'p_kind' is distinct from 'case' then raise exception 'Este flujo solo publica retos';end if;
 if nullif(p_content->>'p_start','') is not null and (p_content->>'p_start')::timestamptz >= (p_content->>'p_end')::timestamptz then raise exception 'El cierre debe ser posterior al inicio';end if;
 target:=public.publish_workspace_content(nullif(p_content->>'p_id','')::uuid,'case',p_content->>'p_title',p_content->>'p_body',nullif(p_content->>'p_url',''),nullif(p_content->>'p_parent','')::uuid,nullif(p_content->>'p_start','')::timestamptz,nullif(p_content->>'p_end','')::timestamptz,null,coalesce((p_content->>'p_published')::boolean,true),null,p_content->>'p_template',p_content->'p_data',array(select jsonb_array_elements_text(coalesce(p_content->'p_topics','[]'))),p_content->>'p_methodology',p_content->>'p_audience',null);
 perform public.configure_challenge(target,p_rules->>'instructions',p_rules->>'deliverables',p_rules->'criteria',nullif(p_rules->>'participant_limit','')::integer,coalesce((p_rules->>'allow_updates')::boolean,true));
 return target;
end $$;
create table public.challenge_assessments(
 solution_id uuid primary key references public.content(id),scores jsonb not null,weighted_score numeric(4,2) not null check(weighted_score between 1 and 5),reviewer_id uuid not null references public.profiles(id),updated_at timestamptz not null default now()
);
alter table public.challenge_assessments enable row level security;
create policy assessment_read on public.challenge_assessments for select to authenticated using(public.can_read_content(solution_id));
revoke all on public.challenge_assessments from public,anon,authenticated;grant select on public.challenge_assessments to authenticated;
create function public.review_challenge_solution(p_solution uuid,p_scores jsonb,p_strengths text,p_improvements text,p_verdict text) returns void language plpgsql security definer set search_path='' as $$
declare rubric jsonb;criterion jsonb;entry jsonb;score numeric:=0;i integer:=0; clean jsonb:='[]';parent uuid;
begin
 perform public.require_active();select parent_id into parent from public.content where id=p_solution and kind='solution' and deleted_at is null for update;
 if parent is null or not public.can_finalize_content(p_solution) then raise exception 'Solo el organizador responsable puede evaluar';end if;
 select coalesce(r.criteria,'[{"label":"Solución al problema","weight":40},{"label":"Evidencia y validación","weight":30},{"label":"Calidad de la demostración","weight":30}]'::jsonb) into rubric from public.content c left join public.challenge_rules r on r.content_id=c.id where c.id=parent;
 if jsonb_typeof(p_scores) is distinct from 'array' or jsonb_array_length(p_scores)<>jsonb_array_length(rubric) then raise exception 'Califica todos los criterios del reto';end if;
 for criterion in select * from jsonb_array_elements(rubric) loop
 entry:=p_scores->i;
 if coalesce(entry#>>'{}','') !~ '^[1-5]$' then raise exception 'Cada criterio debe calificarse entre 1 y 5';end if;
 score:=score+(entry#>>'{}')::numeric*(criterion->>'weight')::numeric/100;
 clean:=clean||jsonb_build_array(criterion||jsonb_build_object('score',(entry#>>'{}')::integer));i:=i+1;
 end loop;
 perform public.save_final_review(p_solution,round(score)::integer,p_strengths,p_improvements,p_verdict);
 insert into public.challenge_assessments(solution_id,scores,weighted_score,reviewer_id) values(p_solution,clean,round(score,2),auth.uid()) on conflict(solution_id) do update set scores=excluded.scores,weighted_score=excluded.weighted_score,reviewer_id=auth.uid(),updated_at=now();
end $$;
revoke all on function public.publish_challenge(jsonb,jsonb),public.review_challenge_solution(uuid,jsonb,text,text,text) from public,anon;
grant execute on function public.publish_challenge(jsonb,jsonb),public.review_challenge_solution(uuid,jsonb,text,text,text) to authenticated;
create function public.can_edit_solution(p_solution uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.active_member() and exists(select 1 from public.content c where c.id=p_solution and c.kind='solution' and c.deleted_at is null and(public.is_admin() or(c.owner_id=auth.uid() and public.challenge_open(c.parent_id) and not exists(select 1 from public.final_reviews f where f.content_id=c.id) and not exists(select 1 from public.challenge_rules r where r.content_id=c.parent_id and not r.allow_updates))))
$$;
revoke all on function public.can_edit_solution(uuid) from public,anon;grant execute on function public.can_edit_solution(uuid) to authenticated;
commit;
