begin;
create function public.save_profile_avatar_v2(p_theme jsonb) returns void language plpgsql security definer set search_path='' as $$
declare a jsonb;legacy jsonb;clean jsonb;
begin
 perform public.require_active();if p_theme is null or jsonb_typeof(p_theme) is distinct from 'object' then raise exception 'Configuración no válida';end if;
 a:=p_theme->'avatar';
 if jsonb_typeof(a) is distinct from 'object' or coalesce(a->>'presentation','neutral') not in ('neutral','feminine','masculine') or coalesce(a->>'face','oval') not in ('oval','round','square') or coalesce(a->>'body','classic') not in ('classic','soft','athletic') or coalesce(a->>'facialHair','none') not in ('none','stubble','beard','mustache') or coalesce(a->>'eyeColor','#3b2a25') !~ '^#[0-9a-fA-F]{6}$' or coalesce(a->>'hair','') not in ('crop','wave','curls','long','bald','bob','ponytail','braids','bun','afro','undercut') or coalesce(a->>'outfit','') not in ('hoodie','jacket','tee','dress','blazer','sport') or coalesce(a->>'motion','') not in ('float','wave','none','dance','walk') then raise exception 'Avatar no válido';end if;
 legacy:=a||jsonb_build_object('hair',case when a->>'hair' in ('bob','ponytail','braids','bun') then 'long' when a->>'hair' in ('afro','undercut') then 'curls' else a->>'hair' end,'outfit',case when a->>'outfit' in ('dress','blazer','sport') then 'jacket' else a->>'outfit' end,'motion',case when a->>'motion' in ('dance','walk') then 'float' else a->>'motion' end);
 perform public.save_profile_appearance(jsonb_set(p_theme,'{avatar}',legacy));
 select theme->'avatar' into clean from public.profiles where id=auth.uid();
 clean:=clean||jsonb_build_object('hair',a->>'hair','outfit',a->>'outfit','motion',a->>'motion','presentation',coalesce(a->>'presentation','neutral'),'face',coalesce(a->>'face','oval'),'body',coalesce(a->>'body','classic'),'facialHair',coalesce(a->>'facialHair','none'),'eyeColor',coalesce(a->>'eyeColor','#3b2a25'));
 update public.profiles set theme=jsonb_set(theme,'{avatar}',clean) where id=auth.uid();
end $$;
revoke all on function public.save_profile_avatar_v2(jsonb) from public,anon;grant execute on function public.save_profile_avatar_v2(jsonb) to authenticated;
commit;
