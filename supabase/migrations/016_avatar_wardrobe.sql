-- 016 · Avatar ampliado: más prendas, pantalón y calzado, gestos, expresiones y accesorios.
-- Compatible con 010/012: los valores nuevos se validan aquí; para el guardado heredado se degradan a su equivalente anterior.
-- No admite colores ni textos libres: solo catálogos cerrados y hexadecimales de 6 dígitos.
begin;
create function public.save_profile_avatar_v3(p_theme jsonb) returns void language plpgsql security definer set search_path='' as $$
declare a jsonb;down jsonb;clean jsonb;k text;
begin
 perform public.require_active();
 if p_theme is null or jsonb_typeof(p_theme) is distinct from 'object' then raise exception 'Configuración no válida';end if;
 a:=p_theme->'avatar';
 if jsonb_typeof(a) is distinct from 'object' or octet_length(a::text)>1500 then raise exception 'Avatar no válido';end if;
 if coalesce(a->>'hair','') not in ('crop','wave','curls','long','bald','bob','ponytail','braids','bun','afro','undercut','pixie','pigtails','mohawk','fade','quiff')
  or coalesce(a->>'outfit','') not in ('hoodie','jacket','tee','dress','blazer','sport','shirt','tank','suit','coat','overalls','tracksuit')
  or coalesce(a->>'gesture','idle') not in ('idle','wave','hips','victory','think','thumbs','salute')
  or coalesce(a->>'mood','smile') not in ('smile','calm','happy','grin','wink','surprised','smirk','sleepy')
  or coalesce(a->>'gear','none') not in ('none','sunglasses','round','beanie','headband','bow','crown','scarf','chain','earrings')
  or coalesce(a->>'bottom','jeans') not in ('jeans','trousers','shorts','skirt')
  or coalesce(a->>'shoes','sneakers') not in ('sneakers','boots','flats') then raise exception 'Avatar no válido';end if;
 foreach k in array array['bottomColor','shoesColor'] loop
  if coalesce(a->>k,'#334155') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Color de avatar no válido';end if;
 end loop;
 down:=a||jsonb_build_object(
  'hair',case when a->>'hair' in ('pixie','fade','quiff') then 'crop' when a->>'hair'='pigtails' then 'long' when a->>'hair'='mohawk' then 'undercut' else a->>'hair' end,
  'outfit',case when a->>'outfit' in ('shirt','tank','tracksuit','overalls') then 'tee' when a->>'outfit' in ('suit','coat') then 'blazer' else a->>'outfit' end);
 perform public.save_profile_avatar_v2(jsonb_set(p_theme,'{avatar}',down));
 select theme->'avatar' into clean from public.profiles where id=auth.uid();
 clean:=clean||jsonb_build_object('hair',a->>'hair','outfit',a->>'outfit','gesture',coalesce(a->>'gesture','idle'),'mood',coalesce(a->>'mood','smile'),'gear',coalesce(a->>'gear','none'),
  'bottom',coalesce(a->>'bottom','jeans'),'bottomColor',lower(coalesce(a->>'bottomColor','#334155')),'shoes',coalesce(a->>'shoes','sneakers'),'shoesColor',lower(coalesce(a->>'shoesColor','#f3f4ff')));
 update public.profiles set theme=jsonb_set(theme,'{avatar}',clean) where id=auth.uid();
end $$;
revoke all on function public.save_profile_avatar_v3(jsonb) from public,anon;
grant execute on function public.save_profile_avatar_v3(jsonb) to authenticated;
commit;
