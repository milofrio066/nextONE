-- nextONE 1.8 · 024: audiencias de tres niveles (makers, peers, makers + peers), seguimiento de lo que busca
-- cada persona con segmentos, encuestas de comunidad y avatar v4. Aplicar después de 023.
-- Aditiva y repetible: no borra datos. Reversión: supabase/rollback/024_revert.sql.
-- En la base, los peers siguen siendo access_tier='subscriber'; «peers» es el nombre visible.
begin;

-- 1 · Audiencias -----------------------------------------------------------------------------------------
alter table public.content drop constraint if exists content_access_scope_check;
alter table public.content add constraint content_access_scope_check check(access_scope in ('makers','peers','community'));
alter table public.mentorship_sessions drop constraint if exists mentorship_sessions_audience_check;
alter table public.mentorship_sessions add constraint mentorship_sessions_audience_check check(audience in ('makers','peers','makers_subscribers'));

-- Personal de la plataforma (admin, organización, mentores) ve todas las audiencias para poder gestionarlas.
create or replace function public.scope_allows(p_scope text) returns boolean language sql stable security definer set search_path='' as $$
 select p_scope='community' or public.is_editor() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.access_tier=case p_scope when 'makers' then 'maker' when 'peers' then 'subscriber' end)
$$;

-- Igual que 023, con el nivel «peers» y acceso del mentor u organizador asignado a su propia sesión y materiales.
create or replace function public.can_read_content(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or (public.participant() and exists(select 1 from public.content item where item.id=target and item.deleted_at is null and (item.owner_id=auth.uid() or (
  with recursive ancestry as (
   select c.id,c.parent_id,c.published,c.access_scope,c.deleted_at,array[c.id] path from public.content c where c.id=target
   union all select c.id,c.parent_id,c.published,c.access_scope,c.deleted_at,a.path||c.id from public.content c join ancestry a on c.id=a.parent_id where not c.id=any(a.path)
  ) select bool_and(a.published and a.deleted_at is null) and (bool_and(public.scope_allows(a.access_scope)) or bool_or(exists(select 1 from public.event_organizers o where o.event_id=a.id and o.user_id=auth.uid()))) from ancestry a
 ))))
$$;

create or replace function public.publish_scoped_content(p_content jsonb,p_cover jsonb,p_rules jsonb default null,p_session jsonb default null,p_scope text default 'makers') returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;tier text;begin
 if p_scope not in ('makers','peers','community') then raise exception 'Audiencia no válida';end if;
 if not public.is_editor() and p_content->>'p_kind' not in ('post','project','update','builder') then raise exception 'Sin permiso para publicar';end if;
 select access_tier into tier from public.profiles where id=auth.uid();
 if not public.is_editor() and tier='subscriber' and p_scope='makers' then raise exception 'Elige peers o toda la comunidad';end if;
 if not public.is_editor() and tier='maker' and p_scope='peers' then raise exception 'Elige makers o toda la comunidad';end if;
 if p_session is null then target:=public.publish_content_with_cover(p_content,p_cover,p_rules);
 else target:=public.publish_mentorship(p_content,p_cover,p_session||jsonb_build_object('audience',case p_scope when 'community' then 'makers_subscribers' when 'peers' then 'peers' else 'makers' end));end if;
 update public.content set access_scope=p_scope where id=target;
 return target;end $$;

-- publish_mentorship de 022 solo aceptaba dos audiencias; se amplía sin cambiar el resto de reglas.
create or replace function public.publish_mentorship(p_content jsonb,p_cover jsonb,p_session jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid;previous uuid;existing uuid:=nullif(p_content->>'p_id','')::uuid;mentor uuid:=nullif(p_session->>'mentor','')::uuid;who text:=coalesce(p_session->>'audience','makers');mode text:=coalesce(p_session->>'modality','zoom');
begin
 if not public.is_editor() then raise exception 'Solo el equipo organizador gestiona mentorías';end if;
 if p_content->>'p_kind' is distinct from 'event' then raise exception 'Una mentoría grupal se publica como evento';end if;
 if coalesce((p_content->>'p_capacity')::integer,0)<1 then raise exception 'Define los cupos de la mentoría';end if;
 if who not in ('makers','peers','makers_subscribers') or mode not in ('zoom','meet') then raise exception 'Audiencia o modalidad no válida';end if;
 if not exists(select 1 from public.profiles where id=mentor and status='active' and access_tier='maker') then raise exception 'Asigna un mentor activo';end if;
 if existing is not null and not exists(select 1 from public.mentorship_sessions where content_id=existing) then raise exception 'Este contenido no es una mentoría';end if;
 select mentor_id into previous from public.mentorship_sessions where content_id=existing;
 target:=public.publish_content_with_cover(p_content||'{"p_methodology":"Mentoría grupal"}'::jsonb,p_cover,null);
 insert into public.mentorship_sessions(content_id,mentor_id,audience,modality) values(target,mentor,who,mode) on conflict(content_id) do update set mentor_id=excluded.mentor_id,audience=excluded.audience,modality=excluded.modality;
 if previous is distinct from mentor then delete from public.event_organizers where event_id=target and user_id=previous;end if;
 insert into public.event_organizers(event_id,user_id) values(target,mentor) on conflict do nothing;
 return target;
end $$;

-- 2 · Qué busca cada persona y segmentos -----------------------------------------------------------------
create table if not exists public.member_intents(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 goals text[] not null default '{}',challenges text[] not null default '{}',formats text[] not null default '{}',availability text[] not null default '{}',
 stage text not null default '',note text not null default '' check(length(note)<=600),
 segment text check(segment is null or length(segment) between 2 and 60),segment_by uuid references public.profiles(id),segment_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.member_intents enable row level security;
revoke all on public.member_intents from public,anon,authenticated;
grant select on public.member_intents to authenticated;
drop policy if exists intents_read on public.member_intents;
create policy intents_read on public.member_intents for select to authenticated using(user_id=auth.uid() or public.is_admin());

-- Catálogos cerrados: deben coincidir con src/pilot/intentModel.ts.
create or replace function public.intent_catalog_ok(p_values text[],p_allowed text[],p_max integer) returns boolean language sql immutable set search_path='' as $$
 select coalesce(cardinality(p_values),0)<=p_max and coalesce(p_values<@p_allowed,true)
$$;
create or replace function public.save_member_intent(p_intent jsonb) returns void language plpgsql security definer set search_path='' as $$
declare g text[];c text[];f text[];a text[];s text:=coalesce(p_intent->>'stage','');n text:=trim(coalesce(p_intent->>'note',''));
begin
 perform public.require_participant();
 if p_intent is null or jsonb_typeof(p_intent) is distinct from 'object' then raise exception 'Respuesta no válida';end if;
 g:=array(select distinct jsonb_array_elements_text(coalesce(p_intent->'goals','[]')));c:=array(select distinct jsonb_array_elements_text(coalesce(p_intent->'challenges','[]')));
 f:=array(select distinct jsonb_array_elements_text(coalesce(p_intent->'formats','[]')));a:=array(select distinct jsonb_array_elements_text(coalesce(p_intent->'availability','[]')));
 if not public.intent_catalog_ok(g,array['empleo','emprender','freelance','aprender_ia','aprender_datos','aprender_producto','aprender_diseno','portafolio','networking','liderazgo','ingles','comunidad'],4)
  or not public.intent_catalog_ok(c,array['sin_idea','validar_idea','habilidades_tecnicas','conseguir_clientes','financiacion','armar_equipo','tiempo','visibilidad','buscar_empleo','constancia'],4)
  or not public.intent_catalog_ok(f,array['mentoria_grupal','taller','webinar','reto','networking','contenido','proyecto_equipo'],4)
  or not public.intent_catalog_ok(a,array['manana','tarde','noche','fin_de_semana'],4)
  or s not in ('','explorando','idea','construyendo','lanzado','empleo') then raise exception 'Elige opciones de la lista';end if;
 if cardinality(g)=0 then raise exception 'Elige al menos un objetivo';end if;
 if length(n)>600 then raise exception 'La nota admite hasta 600 caracteres';end if;
 insert into public.member_intents(user_id,goals,challenges,formats,availability,stage,note) values(auth.uid(),g,c,f,a,s,n)
 on conflict(user_id) do update set goals=excluded.goals,challenges=excluded.challenges,formats=excluded.formats,availability=excluded.availability,stage=excluded.stage,note=excluded.note,updated_at=now();
end $$;
create or replace function public.my_member_intent() returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(i)-'segment_by' from public.member_intents i where i.user_id=auth.uid()
$$;
create or replace function public.admin_member_intents() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',p.id,'name',p.name,'access_tier',p.access_tier,'cohort',p.cohort,'skills',p.skills,'interests',p.interests,
  'goals',coalesce(i.goals,'{}'),'challenges',coalesce(i.challenges,'{}'),'formats',coalesce(i.formats,'{}'),'availability',coalesce(i.availability,'{}'),'stage',coalesce(i.stage,''),'note',coalesce(i.note,''),
  'segment',i.segment,'updated_at',i.updated_at) order by p.name) from public.profiles p left join public.member_intents i on i.user_id=p.id where p.status='active'),'[]'::jsonb);
end $$;
create or replace function public.set_member_segment(p_users uuid[],p_segment text) returns integer language plpgsql security definer set search_path='' as $$
declare seg text:=nullif(trim(coalesce(p_segment,'')),'');changed integer;begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if seg is not null and length(seg) not between 2 and 60 then raise exception 'El segmento debe tener entre 2 y 60 caracteres';end if;
 if coalesce(cardinality(p_users),0) not between 1 and 500 then raise exception 'Elige entre 1 y 500 personas';end if;
 insert into public.member_intents(user_id) select id from public.profiles where id=any(p_users) and status='active' on conflict do nothing;
 update public.member_intents set segment=seg,segment_by=auth.uid(),segment_at=now() where user_id=any(p_users);
 get diagnostics changed=row_count;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'segment_assigned',auth.uid(),coalesce(seg,'(sin segmento)')||' · '||changed||' personas');
 return changed;end $$;

-- 3 · Encuestas de comunidad ------------------------------------------------------------------------------
create table if not exists public.community_polls(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 3 and 160),description text not null default '' check(length(description)<=1000),
 questions jsonb not null check(jsonb_typeof(questions)='array'),
 audience text not null default 'community' check(audience in ('makers','peers','community')),
 segment text check(segment is null or length(segment) between 2 and 60),
 anonymous boolean not null default true,show_results boolean not null default true,
 status text not null default 'draft' check(status in ('draft','open','closed')),closes_at timestamptz,
 created_by uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
create table if not exists public.poll_responses(
 poll_id uuid not null references public.community_polls(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,
 answers jsonb not null check(jsonb_typeof(answers)='object'),created_at timestamptz not null default now(),primary key(poll_id,user_id)
);
alter table public.community_polls enable row level security;alter table public.poll_responses enable row level security;
revoke all on public.community_polls,public.poll_responses from public,anon,authenticated;

create or replace function public.can_manage_polls() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active' and role in ('admin','organizer'))
$$;
create or replace function public.poll_visible(p public.community_polls) returns boolean language sql stable security definer set search_path='' as $$
 select public.can_manage_polls() or (public.participant() and p.status<>'draft' and public.scope_allows(p.audience)
  and (p.segment is null or exists(select 1 from public.member_intents i where i.user_id=auth.uid() and i.segment=p.segment)))
$$;
create or replace function public.save_poll(p_id uuid,p_poll jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid:=coalesce(p_id,gen_random_uuid());q jsonb;ids text[]:='{}';qs jsonb:=coalesce(p_poll->'questions','[]');
begin
 if not public.can_manage_polls() then raise exception 'Solo administración u organización publica encuestas';end if;
 if jsonb_typeof(qs) is distinct from 'array' or jsonb_array_length(qs) not between 1 and 12 then raise exception 'Una encuesta tiene entre 1 y 12 preguntas';end if;
 for q in select * from jsonb_array_elements(qs) loop
  if coalesce(q->>'id','') !~ '^[a-z0-9_-]{1,40}$' or q->>'id'=any(ids) then raise exception 'Identificador de pregunta no válido';end if;
  ids:=ids||(q->>'id');
  if coalesce(q->>'type','') not in ('single','multiple','scale','text') then raise exception 'Tipo de pregunta no válido';end if;
  if length(coalesce(q->>'prompt','')) not between 3 and 240 then raise exception 'Cada pregunta necesita un enunciado de 3 a 240 caracteres';end if;
  if q->>'type' in ('single','multiple') and (jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options') not between 2 and 10
   or exists(select 1 from jsonb_array_elements(q->'options') o where jsonb_typeof(o)<>'string' or length(o#>>'{}') not between 1 and 120)
   or (select count(distinct o#>>'{}') from jsonb_array_elements(q->'options') o)<>jsonb_array_length(q->'options')) then raise exception 'Las preguntas de opción necesitan entre 2 y 10 opciones distintas';end if;
 end loop;
 if coalesce(p_poll->>'audience','community') not in ('makers','peers','community') or coalesce(p_poll->>'status','draft') not in ('draft','open','closed') then raise exception 'Audiencia o estado no válido';end if;
 if exists(select 1 from public.poll_responses where poll_id=target) and (select questions from public.community_polls where id=target) is distinct from qs then raise exception 'La encuesta ya tiene respuestas: no se pueden cambiar las preguntas';end if;
 insert into public.community_polls(id,title,description,questions,audience,segment,anonymous,show_results,status,closes_at,created_by)
 values(target,trim(p_poll->>'title'),trim(coalesce(p_poll->>'description','')),qs,coalesce(p_poll->>'audience','community'),nullif(trim(coalesce(p_poll->>'segment','')),''),
  coalesce((p_poll->>'anonymous')::boolean,true),coalesce((p_poll->>'show_results')::boolean,true),coalesce(p_poll->>'status','draft'),nullif(p_poll->>'closes_at','')::timestamptz,auth.uid())
 on conflict(id) do update set title=excluded.title,description=excluded.description,questions=excluded.questions,audience=excluded.audience,segment=excluded.segment,
  anonymous=case when exists(select 1 from public.poll_responses where poll_id=target) then public.community_polls.anonymous else excluded.anonymous end,
  show_results=excluded.show_results,status=excluded.status,closes_at=excluded.closes_at;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'poll_saved',target,left(p_poll->>'title',160));
 return target;end $$;
create or replace function public.delete_poll(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin if not public.can_manage_polls() then raise exception 'Solo administración u organización';end if;
 delete from public.community_polls where id=p_id;insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'poll_deleted',p_id);end $$;

-- Resultados agregados. Las respuestas abiertas solo llegan a quien gestiona encuestas y nunca con el nombre.
create or replace function public.poll_results(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('responses',(select count(*) from public.poll_responses where poll_id=p.id),'questions',coalesce(jsonb_agg(
  case q.item->>'type'
   when 'scale' then jsonb_build_object('id',q.item->>'id','type','scale','average',(select round(avg((r.answers->>(q.item->>'id'))::numeric),2) from public.poll_responses r where r.poll_id=p.id and r.answers ? (q.item->>'id')),
    'counts',(select jsonb_agg((select count(*) from public.poll_responses r where r.poll_id=p.id and r.answers->>(q.item->>'id')=v::text) order by v) from generate_series(1,5) v))
   when 'text' then jsonb_build_object('id',q.item->>'id','type','text','answered',(select count(*) from public.poll_responses r where r.poll_id=p.id and coalesce(r.answers->>(q.item->>'id'),'')<>''),
    'texts',case when public.can_manage_polls() then (select coalesce(jsonb_agg(r.answers->>(q.item->>'id') order by r.created_at desc),'[]') from (select * from public.poll_responses r where r.poll_id=p.id and coalesce(r.answers->>(q.item->>'id'),'')<>'' order by r.created_at desc limit 200) r) else '[]'::jsonb end)
   else jsonb_build_object('id',q.item->>'id','type',q.item->>'type','counts',(select jsonb_agg((select count(*) from public.poll_responses r where r.poll_id=p.id and (
     case when jsonb_typeof(r.answers->(q.item->>'id'))='array' then r.answers->(q.item->>'id') ? (o.value#>>'{}') else r.answers->>(q.item->>'id')=o.value#>>'{}' end)) order by o.ord) from jsonb_array_elements(q.item->'options') with ordinality o(value,ord)))
  end order by q.ord),'[]'::jsonb))
 from public.community_polls p cross join lateral jsonb_array_elements(p.questions) with ordinality q(item,ord) where p.id=p_id group by p.id
$$;
create or replace function public.poll_feed() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'description',p.description,'questions',p.questions,'audience',p.audience,'segment',p.segment,
  'anonymous',p.anonymous,'show_results',p.show_results,'status',case when p.status='open' and p.closes_at<=now() then 'closed' else p.status end,'closes_at',p.closes_at,'created_at',p.created_at,
  'answered',exists(select 1 from public.poll_responses r where r.poll_id=p.id and r.user_id=auth.uid()),'can_manage',public.can_manage_polls(),
  'results',case when public.can_manage_polls() or (p.show_results and exists(select 1 from public.poll_responses r where r.poll_id=p.id and r.user_id=auth.uid())) then public.poll_results(p.id) end)
  order by (p.status='open') desc,p.created_at desc),'[]'::jsonb)
 from public.community_polls p where public.poll_visible(p)
$$;
create or replace function public.answer_poll(p_id uuid,p_answers jsonb) returns void language plpgsql security definer set search_path='' as $$
declare poll public.community_polls;q jsonb;v jsonb;clean jsonb:='{}';
begin
 perform public.require_participant();
 select * into poll from public.community_polls where id=p_id;
 if poll.id is null or not public.poll_visible(poll) or poll.status='draft' then raise exception 'Encuesta no disponible';end if;
 if poll.status<>'open' or poll.closes_at<=now() then raise exception 'Esta encuesta ya cerró';end if;
 if p_answers is null or jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'Respuestas no válidas';end if;
 for q in select * from jsonb_array_elements(poll.questions) loop
  v:=p_answers->(q->>'id');
  if v is null or v='null'::jsonb or v='""'::jsonb or v='[]'::jsonb then
   if coalesce((q->>'required')::boolean,true) then raise exception 'Responde: %',q->>'prompt';end if;continue;end if;
  if q->>'type'='single' and not (jsonb_typeof(v)='string' and q->'options' ? (v#>>'{}')) then raise exception 'Opción no válida';end if;
  if q->>'type'='multiple' and not (jsonb_typeof(v)='array' and jsonb_array_length(v)<=jsonb_array_length(q->'options') and not exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e)<>'string' or not q->'options' ? (e#>>'{}'))) then raise exception 'Opción no válida';end if;
  if q->>'type'='scale' and not (jsonb_typeof(v)='number' and (v#>>'{}')::numeric in (1,2,3,4,5)) then raise exception 'La escala va de 1 a 5';end if;
  if q->>'type'='text' and not (jsonb_typeof(v)='string' and length(v#>>'{}')<=1000) then raise exception 'La respuesta abierta admite hasta 1000 caracteres';end if;
  clean:=clean||jsonb_build_object(q->>'id',case when q->>'type'='text' then to_jsonb(trim(v#>>'{}')) when q->>'type'='scale' then to_jsonb((v#>>'{}')::integer) else v end);
 end loop;
 insert into public.poll_responses(poll_id,user_id,answers) values(p_id,auth.uid(),clean) on conflict do nothing;
 if not found then raise exception 'Ya respondiste esta encuesta';end if;
end $$;

-- 4 · Avatar v4 -------------------------------------------------------------------------------------------
-- Valida los valores nuevos, guarda por la ruta v3 con equivalentes anteriores y luego conserva los valores completos.
create or replace function public.save_profile_avatar_v4(p_theme jsonb) returns void language plpgsql security definer set search_path='' as $$
declare a jsonb;down jsonb;clean jsonb;begin
 perform public.require_active();
 if p_theme is null or jsonb_typeof(p_theme) is distinct from 'object' then raise exception 'Configuración no válida';end if;
 a:=p_theme->'avatar';
 if jsonb_typeof(a) is distinct from 'object' or octet_length(a::text)>1500 then raise exception 'Avatar no válido';end if;
 if coalesce(a->>'hair','') not in ('crop','wave','curls','long','bald','bob','ponytail','braids','bun','afro','undercut','pixie','pigtails','mohawk','fade','quiff','locs','coily','longwavy','sidepart','buzz','highpuff')
  or coalesce(a->>'outfit','') not in ('hoodie','jacket','tee','dress','blazer','sport','shirt','tank','suit','coat','overalls','tracksuit','blouse','jumpsuit','cardigan')
  or coalesce(a->>'gear','none') not in ('none','sunglasses','round','beanie','headband','bow','crown','scarf','chain','earrings','hijab','headwrap','hoops','flower','pearls','hearing')
  or coalesce(a->>'face','oval') not in ('oval','round','square','heart')
  or coalesce(a->>'body','classic') not in ('classic','soft','athletic','curvy')
  or coalesce(a->>'makeup','none') not in ('none','lashes','lips','full')
  or coalesce(a->>'marks','none') not in ('none','freckles','mole','blush')
  or coalesce(a->>'lipColor','#b4475e') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Avatar no válido';end if;
 down:=a||jsonb_build_object(
  'hair',case a->>'hair' when 'locs' then 'braids' when 'coily' then 'afro' when 'longwavy' then 'long' when 'sidepart' then 'crop' when 'buzz' then 'fade' when 'highpuff' then 'bun' else a->>'hair' end,
  'outfit',case a->>'outfit' when 'blouse' then 'tee' when 'jumpsuit' then 'overalls' when 'cardigan' then 'jacket' else a->>'outfit' end,
  'gear',case a->>'gear' when 'hijab' then 'none' when 'headwrap' then 'none' when 'hearing' then 'none' when 'hoops' then 'earrings' when 'flower' then 'bow' when 'pearls' then 'chain' else coalesce(a->>'gear','none') end,
  'face',case a->>'face' when 'heart' then 'oval' else coalesce(a->>'face','oval') end,
  'body',case a->>'body' when 'curvy' then 'soft' else coalesce(a->>'body','classic') end)-'makeup'-'marks'-'lipColor';
 perform public.save_profile_avatar_v3(jsonb_set(p_theme,'{avatar}',down));
 select theme->'avatar' into clean from public.profiles where id=auth.uid();
 clean:=clean||jsonb_build_object('hair',a->>'hair','outfit',a->>'outfit','gear',coalesce(a->>'gear','none'),'face',coalesce(a->>'face','oval'),'body',coalesce(a->>'body','classic'),
  'makeup',coalesce(a->>'makeup','none'),'marks',coalesce(a->>'marks','none'),'lipColor',lower(coalesce(a->>'lipColor','#b4475e')));
 update public.profiles set theme=jsonb_set(theme,'{avatar}',clean) where id=auth.uid();
end $$;

revoke all on function public.scope_allows(text),public.intent_catalog_ok(text[],text[],integer),public.save_member_intent(jsonb),public.my_member_intent(),public.admin_member_intents(),public.set_member_segment(uuid[],text),
 public.can_manage_polls(),public.poll_visible(public.community_polls),public.save_poll(uuid,jsonb),public.delete_poll(uuid),public.poll_results(uuid),public.poll_feed(),public.answer_poll(uuid,jsonb),public.save_profile_avatar_v4(jsonb) from public,anon;
grant execute on function public.scope_allows(text),public.save_member_intent(jsonb),public.my_member_intent(),public.admin_member_intents(),public.set_member_segment(uuid[],text),
 public.can_manage_polls(),public.save_poll(uuid,jsonb),public.delete_poll(uuid),public.poll_feed(),public.answer_poll(uuid,jsonb),public.save_profile_avatar_v4(jsonb) to authenticated;
commit;
