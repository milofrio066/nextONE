-- 015 · Builder case como sección propia (kind 'builder').
-- "Retos y soluciones" conserva kind 'case' (reto) y 'solution'. Un builder case es el caso que una persona o equipo
-- construye y presenta (problema, cliente, solución, validación, MVP, métricas, plan), como lo piden y crean en Makers.
-- Cualquier miembro activo puede publicar el suyo; la lectura, moderación y borrado siguen las reglas de contenido existentes.
-- No modifica migraciones anteriores: reescribe, desde su propia definición, solo las funciones que listan los tipos.
begin;
do $$
declare c record;
begin
 for c in select conname from pg_constraint where conrelid='public.content'::regclass and contype='c' and pg_get_constraintdef(oid) like '%''speaker''%' loop
  execute format('alter table public.content drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.content add constraint content_kind_check check(kind in ('event','webinar','resource','speaker','case','solution','project','update','post','builder'));

do $$
declare f record; d text; n text;
begin
 for f in select p.oid from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.prokind='f' loop
  d:=pg_get_functiondef(f.oid);
  if d not like '%''update'',''post''%' and d not like '%p_kind in (''post'',''project'',''update'')%' and d not like '%builder case%' then continue;end if;
  n:=replace(d,'''update'',''post''','''update'',''post'',''builder''');
  n:=replace(n,'p_kind in (''post'',''project'',''update'')','p_kind in (''post'',''project'',''update'',''builder'')');
  n:=replace(n,'Entrega soluciones mediante el builder case','Entrega soluciones desde un reto');
  n:=replace(n,'Define el cierre del builder case','Define el cierre del reto');
  if n<>d then execute n;end if;
 end loop;
end $$;
commit;
