-- nextONE 1.6: additive launch access. Apply after 022. No payment activation or external connection.
begin;
alter table public.profiles add column if not exists username text unique check(username is null or username ~ '^[a-z0-9_]{3,30}$');
alter table public.content add column if not exists access_scope text not null default 'makers' check(access_scope in ('makers','community'));
-- Preserve shared mentorships installed by 022.
update public.content c set access_scope='community' from public.mentorship_sessions s where c.id=s.content_id and s.audience='makers_subscribers';
create table if not exists public.maker_registry(
 id uuid primary key default gen_random_uuid(),email text not null unique check(email=lower(trim(email))),phone text unique,
 access_code text not null unique check(length(access_code) between 8 and 100),referral_code text not null unique,
 enabled boolean not null default true,claimed_by uuid unique references public.profiles(id),claimed_at timestamptz
);
create table if not exists public.launch_settings(id boolean primary key default true check(id),registry_enabled boolean not null default false,nodi_url text check(nodi_url is null or nodi_url ~ '^https://'),payments_enabled boolean not null default false check(not payments_enabled));
insert into public.launch_settings(id) values(true) on conflict do nothing;
create table if not exists public.subscription_applications(user_id uuid primary key references public.profiles(id),stage text not null default 'awaiting_selection' check(stage in ('awaiting_selection','selection_started','accepted','rejected')),referral_code text not null default '',updated_at timestamptz not null default now());
create table if not exists public.maker_lookups(id uuid primary key,contact_key text not null,client_key text not null,registry_id uuid references public.maker_registry(id),otp_hash text not null,attempts integer not null default 0,expires_at timestamptz not null default now()+interval '10 minutes',used boolean not null default false,created_at timestamptz not null default now());
create index if not exists maker_lookup_contact_idx on public.maker_lookups(contact_key,created_at desc);
create table if not exists public.sponsor_benefits(id uuid primary key default gen_random_uuid(),sponsor text not null check(length(sponsor) between 2 and 120),title text not null check(length(title) between 3 and 180),description text not null check(length(description)<=2000),url text not null check(url ~ '^https://' and length(url)<=500),code text not null default '',published boolean not null default false,expires_at timestamptz,created_at timestamptz not null default now());
alter table public.maker_registry enable row level security;alter table public.launch_settings enable row level security;alter table public.maker_lookups enable row level security;alter table public.subscription_applications enable row level security;alter table public.sponsor_benefits enable row level security;
revoke all on public.maker_registry,public.launch_settings,public.maker_lookups,public.subscription_applications,public.sponsor_benefits from public,anon,authenticated;
grant all on public.maker_registry,public.launch_settings,public.maker_lookups to service_role;
grant select on public.sponsor_benefits to authenticated;
drop policy if exists benefit_read on public.sponsor_benefits;
create policy benefit_read on public.sponsor_benefits for select to authenticated using(public.is_admin() or (public.participant() and exists(select 1 from public.profiles where id=auth.uid() and access_tier='maker') and published and (expires_at is null or expires_at>now())));
create or replace function public.launch_config() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('registry_enabled',registry_enabled,'nodi_url',nodi_url,'payments_enabled',false) from public.launch_settings where id$$;
-- Signup metadata records intent only. It never grants access.
create or replace function public.check_referral(p_code text) returns text language sql stable security definer set search_path='' as $$select case when not exists(select 1 from public.launch_settings where registry_enabled) then 'pending' when exists(select 1 from public.maker_registry where referral_code=trim(p_code) and enabled) then 'valid' else 'invalid' end$$;
revoke all on function public.check_referral(text) from public;grant execute on function public.check_referral(text) to anon,authenticated;
create or replace function public.on_signup() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.profiles(id,name,access_tier,username) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1),'Miembro'),120),case when new.raw_user_meta_data->>'entry_path'='subscriber' then 'subscriber' else 'maker' end,nullif(lower(new.raw_user_meta_data->>'username'),''));
 if new.raw_user_meta_data->>'entry_path'='subscriber' and coalesce(new.raw_user_meta_data->>'referral_code','')<>'' and public.check_referral(new.raw_user_meta_data->>'referral_code')='invalid' then raise exception 'Código de referido no válido';end if;
 if new.raw_user_meta_data->>'entry_path'='subscriber' then insert into public.subscription_applications(user_id,referral_code) values(new.id,left(coalesce(new.raw_user_meta_data->>'referral_code',''),100));end if;
 return new;end $$;
create or replace function public.claim_maker_code(p_code text) returns void language plpgsql security definer set search_path='' as $$
declare person public.maker_registry;address text;begin
 if auth.uid() is null then raise exception 'Inicia sesión y confirma tu correo';end if;
 if not exists(select 1 from public.launch_settings where registry_enabled) then raise exception 'La validación de Makers aún no está conectada';end if;
 select lower(email) into address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into person from public.maker_registry where access_code=trim(p_code) and email=address and enabled for update;
 if person.id is null or (person.claimed_by is not null and person.claimed_by<>auth.uid()) then raise exception 'No se pudo validar el código para este correo verificado';end if;
 if exists(select 1 from public.profiles where id=auth.uid() and status='suspended') then raise exception 'Acceso suspendido';end if;
 update public.maker_registry set claimed_by=auth.uid(),claimed_at=coalesce(claimed_at,now()) where id=person.id;
 update public.profiles set status='active',access_tier='maker' where id=auth.uid();
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'maker_code_claimed',auth.uid(),'Vinculación verificada; sin publicar código');
end $$;
-- Only the server can initiate/verify lookups. No raw contact or code is returned to anonymous RPC clients.
create or replace function public.start_maker_lookup(p_id uuid,p_contact text,p_key text,p_hash text,p_client text) returns text language plpgsql security definer set search_path='' as $$
declare target public.maker_registry;begin
 if not exists(select 1 from public.launch_settings where registry_enabled) then raise exception 'Consulta todavía no disponible';end if;
 perform pg_advisory_xact_lock(1,hashtext(p_client));perform pg_advisory_xact_lock(2,hashtext(p_key));
 if (select count(*) from public.maker_lookups where client_key=p_client and created_at>now()-interval '1 hour')>=10 then raise exception 'Espera antes de volver a consultar';end if;
 if (select count(*) from public.maker_lookups where contact_key=p_key and created_at>now()-interval '1 hour')>=3 then raise exception 'Espera antes de volver a consultar';end if;
 select * into target from public.maker_registry where enabled and (email=lower(trim(p_contact)) or phone=p_contact);
 insert into public.maker_lookups(id,contact_key,client_key,registry_id,otp_hash) values(p_id,p_key,p_client,target.id,p_hash);
 delete from public.maker_lookups where created_at<now()-interval '1 day';
 return target.email;end $$;
create or replace function public.verify_maker_lookup(p_id uuid,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare attempt public.maker_lookups;result jsonb;begin
 select * into attempt from public.maker_lookups where id=p_id for update;
 if attempt.id is null or attempt.used or attempt.expires_at<now() or attempt.attempts>=5 then return null;end if;
 update public.maker_lookups set attempts=attempts+1 where id=p_id;
 if attempt.otp_hash<>p_hash then return null;end if;
 update public.maker_lookups set used=true where id=p_id;
 select jsonb_build_object('access_code',access_code,'referral_code',referral_code) into result from public.maker_registry where id=attempt.registry_id and enabled;
 return result;end $$;
create or replace function public.my_launch_status() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('application',(select jsonb_build_object('stage',stage) from public.subscription_applications where user_id=auth.uid()),'referral_code',(select referral_code from public.maker_registry where claimed_by=auth.uid() and enabled),'payments_enabled',false)$$;
create or replace function public.begin_selection() returns text language plpgsql security definer set search_path='' as $$declare link text;begin
 if auth.uid() is null then raise exception 'Inicia sesión';end if;
 select nodi_url into link from public.launch_settings where id;
 if link is null then raise exception 'RRHH aún no ha publicado el enlace de selección';end if;
 insert into public.subscription_applications(user_id,stage) values(auth.uid(),'selection_started') on conflict(user_id) do update set stage=case when public.subscription_applications.stage='awaiting_selection' then 'selection_started' else public.subscription_applications.stage end,updated_at=now();return link;end $$;
-- Active subscribers may use shared community features; every content read still checks its audience.
create or replace function public.active_member() returns boolean language sql stable security definer set search_path='' as $$select public.participant()$$;
create or replace function public.can_read_content(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or (public.participant() and exists(select 1 from public.content item where item.id=target and item.deleted_at is null and (item.owner_id=auth.uid() or (
  with recursive ancestry as (
   select c.id,c.parent_id,c.published,c.access_scope,c.deleted_at,array[c.id] path from public.content c where c.id=target
   union all select c.id,c.parent_id,c.published,c.access_scope,c.deleted_at,a.path||c.id from public.content c join ancestry a on c.id=a.parent_id where not c.id=any(a.path)
  ) select bool_and(a.published and a.deleted_at is null and (a.access_scope='community' or exists(select 1 from public.profiles p where p.id=auth.uid() and p.access_tier='maker'))) from ancestry a
 ))))
$$;
-- A wrapper keeps publication and audience changes atomic. Old clients default safely to makers-only.
create or replace function public.publish_scoped_content(p_content jsonb,p_cover jsonb,p_rules jsonb default null,p_session jsonb default null,p_scope text default 'makers') returns uuid language plpgsql security definer set search_path='' as $$declare target uuid;begin
 if p_scope not in ('makers','community') then raise exception 'Audiencia no válida';end if;
 if not public.is_editor() and p_content->>'p_kind' not in ('post','project','update','builder') then raise exception 'Sin permiso para publicar';end if;
 if not public.is_editor() and p_scope='makers' and exists(select 1 from public.profiles where id=auth.uid() and access_tier='subscriber') then raise exception 'Elige toda la comunidad';end if;
 if p_session is null then target:=public.publish_content_with_cover(p_content,p_cover,p_rules);else target:=public.publish_mentorship(p_content,p_cover,p_session||jsonb_build_object('audience',case when p_scope='community' then 'makers_subscribers' else 'makers' end));end if;
 update public.content set access_scope=p_scope where id=target;
 return target;end $$;
create or replace function public.locked_event_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'kind',c.kind,'starts_at',c.starts_at)),'[]') from public.content c where public.participant() and exists(select 1 from public.profiles where id=auth.uid() and access_tier='subscriber') and c.kind in ('event','webinar') and c.access_scope='makers' and c.published and c.deleted_at is null and c.ends_at>now()
$$;
create or replace function public.save_sponsor_benefit(p_id uuid,p_sponsor text,p_title text,p_description text,p_url text,p_code text,p_published boolean,p_expires timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$declare target uuid:=coalesce(p_id,gen_random_uuid());begin
 if not public.is_admin() then raise exception 'Solo administración';end if;
 if p_url !~ '^https://' or p_url ~ '^https://[^/]*@' then raise exception 'Usa una dirección HTTPS válida sin credenciales';end if;
 insert into public.sponsor_benefits(id,sponsor,title,description,url,code,published,expires_at) values(target,p_sponsor,p_title,p_description,p_url,p_code,p_published,p_expires) on conflict(id) do update set sponsor=excluded.sponsor,title=excluded.title,description=excluded.description,url=excluded.url,code=excluded.code,published=excluded.published,expires_at=excluded.expires_at;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'benefit_saved',target,p_title);return target;end $$;
create or replace function public.delete_sponsor_benefit(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'Solo administración';end if;delete from public.sponsor_benefits where id=p_id;insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'benefit_deleted',p_id);end $$;
revoke all on function public.start_maker_lookup(uuid,text,text,text,text),public.verify_maker_lookup(uuid,text) from public,anon,authenticated;
grant execute on function public.start_maker_lookup(uuid,text,text,text,text),public.verify_maker_lookup(uuid,text) to service_role;
revoke all on function public.claim_maker_code(text),public.my_launch_status(),public.begin_selection(),public.publish_scoped_content(jsonb,jsonb,jsonb,jsonb,text),public.locked_event_catalog(),public.save_sponsor_benefit(uuid,text,text,text,text,text,boolean,timestamptz),public.delete_sponsor_benefit(uuid) from public,anon;
grant execute on function public.claim_maker_code(text),public.my_launch_status(),public.begin_selection(),public.publish_scoped_content(jsonb,jsonb,jsonb,jsonb,text),public.locked_event_catalog(),public.save_sponsor_benefit(uuid,text,text,text,text,text,boolean,timestamptz),public.delete_sponsor_benefit(uuid) to authenticated;
revoke all on function public.launch_config() from public;grant execute on function public.launch_config() to anon,authenticated;
commit;
