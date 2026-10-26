begin;
-- nextONE · páginas interactivas (plantillas tipo Genially) por contenido.
-- Aditiva: no modifica tablas ni funciones existentes.
create table public.content_pages (
  content_id uuid primary key references public.content(id) on delete cascade,
  template_id text not null check (template_id ~ '^[a-z0-9-]{1,60}$'),
  data jsonb not null check (
    jsonb_typeof(data) = 'object'
    and data ? 'blocks'
    and jsonb_typeof(data->'blocks') = 'array'
    and jsonb_array_length(data->'blocks') between 1 and 40
    and octet_length(data::text) <= 60000
  ),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.content_pages enable row level security;
create policy pages_read on public.content_pages for select to authenticated using (public.can_read_content(content_id));

create function public.save_content_page(p_content uuid, p_template text, p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.content;
begin
  perform public.require_active();
  select * into item from public.content where id = p_content for update;
  if item.id is null then raise exception 'Contenido no disponible'; end if;
  if not (item.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'Solo el responsable o administración puede diseñar esta página';
  end if;
  insert into public.content_pages(content_id, template_id, data, updated_by, updated_at)
  values (p_content, p_template, p_data, auth.uid(), now())
  on conflict (content_id) do update
    set template_id = excluded.template_id, data = excluded.data, updated_by = auth.uid(), updated_at = now();
  insert into public.audit_log(actor_id, action, target_id) values (auth.uid(), 'save_content_page', p_content);
end $$;

create function public.delete_content_page(p_content uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.content;
begin
  perform public.require_active();
  select * into item from public.content where id = p_content for update;
  if item.id is null then raise exception 'Contenido no disponible'; end if;
  if not (item.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'Solo el responsable o administración puede quitar esta página';
  end if;
  delete from public.content_pages where content_id = p_content;
  insert into public.audit_log(actor_id, action, target_id) values (auth.uid(), 'delete_content_page', p_content);
end $$;

revoke all on public.content_pages from anon, authenticated;
grant select on public.content_pages to authenticated;
revoke all on function public.save_content_page(uuid, text, jsonb), public.delete_content_page(uuid) from public, anon;
grant execute on function public.save_content_page(uuid, text, jsonb), public.delete_content_page(uuid) to authenticated;

commit;
