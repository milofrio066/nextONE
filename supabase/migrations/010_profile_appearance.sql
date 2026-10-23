-- 010 · Validated portfolio appearance, avatar and independent social buttons.
begin;
alter table public.profiles drop constraint if exists profiles_theme_size;
alter table public.profiles add constraint profiles_theme_size check(pg_column_size(theme)<=8192);
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
 update public.profiles set theme=theme||jsonb_build_object('template',p_template,'accent',lower(p_accent),'headline',trim(coalesce(p_headline,'')),'quote',trim(coalesce(p_quote,'')),'links',clean_links) where id=auth.uid();
end $$;

create function public.save_profile_appearance(p_theme jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare
 link jsonb; clean_links jsonb:='[]'; sections jsonb:='{}'; sec jsonb; key text;
 a jsonb; template text:=p_theme->>'template';font text:=coalesce(p_theme->>'font','modern');title_style text:=coalesce(p_theme->>'titleStyle','outline');
 bg text:=coalesce(p_theme->>'background','#05060d'); base jsonb;
begin
 perform public.require_active();
 if p_theme is null or jsonb_typeof(p_theme) is distinct from 'object' or pg_column_size(p_theme)>16000 then raise exception 'Configuración de perfil no válida';end if;
 if template is null or template not in ('neon','aurora','ember','mono','custom') or coalesce(p_theme->>'accent','') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Tema o acento no válido';end if;
 if font not in ('modern','geometric','rounded','mono','editorial','display') or title_style not in ('outline','solid','gradient') or bg !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Fuente o fondo no válido';end if;
 if jsonb_typeof(coalesce(p_theme->'links','[]')) is distinct from 'array' then raise exception 'Enlaces no válidos';end if;
 if jsonb_array_length(coalesce(p_theme->'links','[]'))>8 then raise exception 'Máximo 8 enlaces';end if;
 for link in select * from jsonb_array_elements(coalesce(p_theme->'links','[]')) loop
  if jsonb_typeof(link) is distinct from 'object' or jsonb_typeof(link->'label') is distinct from 'string' or jsonb_typeof(link->'url') is distinct from 'string'
   or length(trim(coalesce(link->>'label',''))) not between 1 and 30 or length(coalesce(link->>'url',''))>300
   or coalesce(link->>'url','') !~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+([/?#][^[:space:]]*)?$'
   or position(chr(92) in link->>'url')>0 or (link->>'url') ~ '[<>]'
   or coalesce(link->>'kind','other') not in ('linkedin','github','portfolio','website','project','other') then raise exception 'Enlace no válido';end if;
  perform public.check_language(link->>'label');
  clean_links:=clean_links||jsonb_build_array(jsonb_build_object('label',trim(link->>'label'),'url',link->>'url','kind',coalesce(link->>'kind','other')));
 end loop;
 if p_theme ? 'sections' and jsonb_typeof(p_theme->'sections') is distinct from 'object' then raise exception 'Secciones no válidas';end if;
 foreach key in array array['hero','skills','interests','about','links'] loop
  sec:=coalesce(p_theme->'sections'->key,jsonb_build_object('background','#171523','text','#f3f4ff'));
  if jsonb_typeof(sec) is distinct from 'object' or coalesce(sec->>'background','') !~ '^#[0-9a-fA-F]{6}$' or coalesce(sec->>'text','') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Color de sección no válido';end if;
  sections:=sections||jsonb_build_object(key,jsonb_build_object('background',sec->>'background','text',sec->>'text'));
 end loop;
 a:=coalesce(p_theme->'avatar','{"skin":"#cf9569","hairColor":"#262033","shirtColor":"#8b5cf6","hair":"wave","outfit":"hoodie","accessory":"none","expression":"smile","motion":"float"}'::jsonb);
 if jsonb_typeof(a) is distinct from 'object' or coalesce(a->>'skin','') !~ '^#[0-9a-fA-F]{6}$' or coalesce(a->>'hairColor','') !~ '^#[0-9a-fA-F]{6}$' or coalesce(a->>'shirtColor','') !~ '^#[0-9a-fA-F]{6}$'
  or coalesce(a->>'hair','') not in ('crop','wave','curls','long','bald') or coalesce(a->>'outfit','') not in ('hoodie','jacket','tee') or coalesce(a->>'accessory','') not in ('none','glasses','headphones','cap') or coalesce(a->>'expression','') not in ('smile','calm','happy') or coalesce(a->>'motion','') not in ('float','wave','none') then raise exception 'Avatar no válido';end if;
 a:=jsonb_build_object('skin',a->>'skin','hairColor',a->>'hairColor','shirtColor',a->>'shirtColor','hair',a->>'hair','outfit',a->>'outfit','accessory',a->>'accessory','expression',a->>'expression','motion',a->>'motion');
 -- Reuse the existing identity/text safeguards; then extend the validated links and appearance.
 select coalesce(jsonb_agg(value),'[]'::jsonb) into base from (select value from jsonb_array_elements(clean_links) limit 4) first_links;
 perform public.save_profile_theme(template,p_theme->>'accent',coalesce(p_theme->>'headline',''),coalesce(p_theme->>'quote',''),base);
 update public.profiles set theme=theme||jsonb_build_object('links',clean_links,'font',font,'titleStyle',title_style,'background',bg,'sections',sections,'avatar',a) where id=auth.uid();
end $$;
revoke all on function public.save_profile_appearance(jsonb) from public,anon;
grant execute on function public.save_profile_appearance(jsonb) to authenticated;
commit;
