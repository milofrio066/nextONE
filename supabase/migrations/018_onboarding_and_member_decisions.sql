-- Apply after 017. Existing active members retain access; new approvals need onboarding.
begin;
do $$begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='onboarding_completed_at') then
  alter table public.profiles add column onboarding_completed_at timestamptz;
  update public.profiles set onboarding_completed_at=now() where status='active';
 end if;
end $$;

create or replace function public.active_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active' and onboarding_completed_at is not null)
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select public.active_member() and exists(select 1 from public.profiles where id=auth.uid() and role='admin')
$$;
create or replace function public.is_editor() returns boolean language sql stable security definer set search_path='' as $$
 select public.active_member() and exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','organizer','mentor'))
$$;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin() or
 (public.active_member() and status='active' and onboarding_completed_at is not null));

-- Close legacy pending-account write paths as well as hiding the UI.
create or replace function public.save_profile(p_name text,p_bio text,p_skills text) returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();update public.profiles set name=p_name,bio=left(p_bio,2000),skills=left(p_skills,500) where id=auth.uid();end $$;
create or replace function public.save_makers_profile(p_interests text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.require_active();
 if coalesce(cardinality(p_interests),0)>12 or exists(select 1 from unnest(p_interests) t where length(t)>60) then raise exception 'Máximo 12 intereses de 60 caracteres';end if;
 update public.profiles set interests=array(select distinct trim(t) from unnest(coalesce(p_interests,'{}')) t where trim(t)<>'') where id=auth.uid();
end $$;
do $$begin
 if to_regprocedure('public.save_member_location_before_onboarding(text,text,text)') is null then
  alter function public.save_member_location(text,text,text) rename to save_member_location_before_onboarding;
 end if;
end $$;
revoke all on function public.save_member_location_before_onboarding(text,text,text) from public,anon,authenticated;
create or replace function public.save_member_location(p_country text,p_region text default '',p_city text default '') returns void language plpgsql security definer set search_path='' as $$
begin perform public.require_active();perform public.save_member_location_before_onboarding(p_country,p_region,p_city);end $$;

revoke all on function public.save_member_location(text,text,text) from public,anon;grant execute on function public.save_member_location(text,text,text) to authenticated;

create or replace function public.complete_onboarding(p_profile jsonb,p_theme jsonb,p_location jsonb default null) returns void
language plpgsql security definer set search_path='' as $$
declare me public.profiles;name text;bio text;skills text;nickname text;interests text[];
begin
 select * into me from public.profiles where id=auth.uid() for update;
 if me.id is null or me.status<>'active' then raise exception 'Espera la aprobación del equipo antes de crear tu perfil';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Confirma tu correo antes de continuar';end if;
 if me.onboarding_completed_at is not null then return;end if;
 if jsonb_typeof(p_profile) is distinct from 'object' or jsonb_typeof(p_theme) is distinct from 'object' then raise exception 'Completa los datos de tu perfil';end if;
 name:=trim(coalesce(p_profile->>'name',''));bio:=trim(coalesce(p_profile->>'bio',''));skills:=trim(coalesce(p_profile->>'skills',''));nickname:=trim(coalesce(p_profile->>'nickname',''));
 if length(name) not between 1 and 120 or length(bio) not between 20 and 2000 or length(skills) not between 3 and 500 then raise exception 'Completa tu nombre, una presentación de al menos 20 caracteres y tus habilidades';end if;
 if jsonb_typeof(coalesce(p_profile->'interests','[]')) is distinct from 'array' then raise exception 'Intereses no válidos';end if;
 interests:=array(select jsonb_array_elements_text(coalesce(p_profile->'interests','[]')));
 -- The flag and all profile changes commit together. Any validation failure rolls everything back.
 update public.profiles set onboarding_completed_at=now() where id=me.id;
 perform public.save_identity(name,nickname,bio,skills,interests);
 perform public.save_profile_avatar_v3(p_theme);
 if p_location is not null and nullif(p_location->>'country','') is not null then
  perform public.save_member_location(p_location->>'country',coalesce(p_location->>'region',''),coalesce(p_location->>'city',''));
 end if;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'onboarding_completed',me.id,'Perfil inicial completado');
end $$;
revoke all on function public.complete_onboarding(jsonb,jsonb,jsonb) from public,anon;grant execute on function public.complete_onboarding(jsonb,jsonb,jsonb) to authenticated;

create table if not exists public.member_decisions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),actor_id uuid not null references public.profiles(id),
 before_values jsonb not null,after_values jsonb not null,reason text not null check(length(trim(reason)) between 10 and 2000),created_at timestamptz not null default now()
);
create index if not exists member_decisions_user_idx on public.member_decisions(user_id,created_at desc);
alter table public.member_decisions enable row level security;
revoke all on public.member_decisions from public,anon,authenticated;grant select on public.member_decisions to authenticated;
do $$begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='member_decisions' and policyname='member_decisions_admin') then
 create policy member_decisions_admin on public.member_decisions for select to authenticated using(public.is_admin());end if;end $$;

create or replace function public.admin_update_member(p_user uuid,p_status text,p_role text,p_cohort text,p_reason text,p_expected jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare target public.profiles;before_state jsonb;after_state jsonb;
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if p_status not in ('pending','active','suspended') or p_role not in ('admin','organizer','mentor','member') or length(coalesce(p_cohort,''))>80 or length(trim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Revisa los cambios y escribe un motivo de entre 10 y 2000 caracteres';end if;
 select * into target from public.profiles where id=p_user for update;
 if target.id is null then raise exception 'Miembro no disponible';end if;
 before_state:=jsonb_build_object('status',target.status,'role',target.role,'cohort',coalesce(target.cohort,''));
 if p_expected is distinct from before_state then raise exception 'Otra persona cambió esta cuenta. Carga los datos actuales antes de confirmar';end if;
 after_state:=jsonb_build_object('status',p_status,'role',p_role,'cohort',trim(coalesce(p_cohort,'')));
 if before_state=after_state then raise exception 'No hay cambios para guardar';end if;
 perform public.admin_member(p_user,p_status,p_role,trim(p_reason));
 perform public.set_member_cohort(p_user,trim(coalesce(p_cohort,'')));
 insert into public.member_decisions(user_id,actor_id,before_values,after_values,reason) values(p_user,auth.uid(),before_state,after_state,trim(p_reason));
end $$;
revoke all on function public.admin_update_member(uuid,text,text,text,text,jsonb) from public,anon;grant execute on function public.admin_update_member(uuid,text,text,text,text,jsonb) to authenticated;

create or replace function public.admin_member_history(p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 return coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at desc,h.id) from(
  select d.id::text,d.created_at,p.name as actor,d.reason,d.before_values,d.after_values,false as legacy
  from public.member_decisions d left join public.profiles p on p.id=d.actor_id where d.user_id=p_user
  union all
  select 'audit-'||a.id::text,a.created_at,p.name,case when a.action='member_cohort' then 'Cohorte registrada: '||coalesce(a.details,'') else a.details end,null::jsonb,null::jsonb,true
  from public.audit_log a left join public.profiles p on p.id=a.actor_id where a.target_id=p_user and a.action in ('member_access','member_cohort')
   and not exists(select 1 from public.member_decisions d where d.user_id=p_user and d.actor_id=a.actor_id and d.created_at=a.created_at)
  order by created_at desc,id limit 100
 ) h),'[]'::jsonb);
end $$;
revoke all on function public.admin_member_history(uuid) from public,anon;grant execute on function public.admin_member_history(uuid) to authenticated;
commit;

