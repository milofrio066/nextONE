-- 009 · Borrado fiable, permisos de gestión y perfil personalizable.
-- Ejecutar una sola vez después de 008. Todas las funciones usan search_path vacío.
begin;

-- Quién puede gestionar (editar/eliminar) un contenido: administración, autoría u organizador del evento.
create or replace function public.can_manage_content(p_content uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(public.is_admin(),false) or exists(
  select 1 from public.content c where c.id=p_content and c.deleted_at is null and (
   c.owner_id=auth.uid()
   or exists(select 1 from public.event_organizers o where o.event_id=c.id and o.user_id=auth.uid())));
$$;

-- Cuántas piezas dependen de un contenido, para avisar antes de eliminar.
create or replace function public.content_dependents(p_content uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare detach_n integer; remove_n integer;
begin
 perform public.require_active();
 if not public.can_manage_content(p_content) then raise exception 'Sin permiso para gestionar este contenido';end if;
 select count(*) filter(where kind not in ('solution','update')),count(*) filter(where kind in ('solution','update'))
  into detach_n,remove_n from public.content where parent_id=p_content and deleted_at is null;
 return jsonb_build_object('detached',detach_n,'removed',remove_n);
end $$;

-- Eliminar: ya no se bloquea por vínculos. Lo que puede existir sin padre se desvincula;
-- soluciones y avances (que exigen reto/proyecto) se archivan junto con él. Todo queda auditado y es reversible por base de datos.
create or replace function public.delete_content(p_content uuid) returns void
language plpgsql security definer set search_path='' as $$
declare removed uuid[];
begin
 perform public.require_active();
 perform 1 from public.content where id=p_content and deleted_at is null for update;
 if not found then raise exception 'El contenido ya no existe';end if;
 if not public.can_manage_content(p_content) then raise exception 'Solo el autor, el organizador del evento o administración puede eliminar este contenido';end if;
 with recursive tree as (
   select id from public.content where parent_id=p_content and kind in ('solution','update') and deleted_at is null
   union select c.id from public.content c join tree t on c.parent_id=t.id where c.kind in ('solution','update') and c.deleted_at is null)
 select coalesce(array_agg(id),'{}') into removed from tree;
 update public.content set deleted_at=now(),published=false,featured=false where id=any(removed);
 update public.content set parent_id=null where parent_id=p_content and deleted_at is null;
 update public.content set deleted_at=now(),published=false where id=p_content;
 insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'delete_content',p_content,jsonb_build_object('archived_children',removed)::text);
end $$;

-- Perfil personalizable: plantilla, acento y presentación. Solo datos validados, sin HTML.
alter table public.profiles add column if not exists theme jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_theme_size;
alter table public.profiles add constraint profiles_theme_size check(pg_column_size(theme)<=2000);

create or replace function public.save_profile_theme(p_template text,p_accent text,p_headline text,p_quote text,p_links jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare link jsonb; clean_links jsonb:='[]'::jsonb;
begin
 perform public.require_active();
 if p_template not in ('neon','aurora','ember','mono','custom') then raise exception 'Plantilla no válida';end if;
 if p_accent !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Color no válido';end if;
 if length(coalesce(p_headline,''))>80 or length(coalesce(p_quote,''))>160 then raise exception 'Texto demasiado largo';end if;
 perform public.check_language(coalesce(p_headline,'')||' '||coalesce(p_quote,''));
 if jsonb_typeof(coalesce(p_links,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_links,'[]'::jsonb))>4 then raise exception 'Máximo 4 enlaces';end if;
 for link in select * from jsonb_array_elements(coalesce(p_links,'[]'::jsonb)) loop
  if coalesce(link->>'url','') !~ '^https://[^[:space:]]+$' or length(coalesce(link->>'url',''))>300 or length(coalesce(link->>'label',''))not between 1 and 30 then raise exception 'Enlace no válido (HTTPS y etiqueta de hasta 30 caracteres)';end if;
  clean_links:=clean_links||jsonb_build_array(jsonb_build_object('label',link->>'label','url',link->>'url'));
 end loop;
 update public.profiles set theme=jsonb_build_object('template',p_template,'accent',lower(p_accent),'headline',trim(coalesce(p_headline,'')),'quote',trim(coalesce(p_quote,'')),'links',clean_links) where id=auth.uid();
end $$;

revoke all on function public.can_manage_content(uuid),public.content_dependents(uuid),public.delete_content(uuid),public.save_profile_theme(text,text,text,text,jsonb) from public,anon;
grant execute on function public.can_manage_content(uuid),public.content_dependents(uuid),public.delete_content(uuid),public.save_profile_theme(text,text,text,text,jsonb) to authenticated;
commit;
