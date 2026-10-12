begin;
alter table public.content add constraint content_not_own_parent check(parent_id is null or parent_id<>id);
-- Avoid cycles and maintain the hierarchy when content is edited.
create function public.validate_content_parent() returns trigger language plpgsql security definer set search_path='' as $$
declare parent_kind text;
begin
 if new.parent_id is not null then
  select kind into parent_kind from public.content where id=new.parent_id;
  if new.kind='solution' and parent_kind<>'case' then raise exception 'La solución pertenece a un builder case';end if;
  if new.kind='update' and parent_kind<>'project' then raise exception 'El avance pertenece a un proyecto';end if;
  if exists(with recursive ancestors as (
    select c.id,c.parent_id from public.content c where c.id=new.parent_id
    union select c.id,c.parent_id from public.content c join ancestors a on c.id=a.parent_id
   ) select 1 from ancestors where id=new.id) then raise exception 'La vinculación crea un ciclo';end if;
 end if;
 return new;
end $$;
revoke all on function public.validate_content_parent() from public,anon,authenticated;
create trigger nextone_parent_guard before insert or update on public.content for each row execute function public.validate_content_parent();
create index registrations_user_idx on public.registrations(user_id);
create index comments_author_idx on public.comments(author_id,created_at);
create index content_owner_idx on public.content(owner_id,created_at);
create index feedback_user_idx on public.feedback(user_id);
create index reports_user_idx on public.reports(user_id,created_at);
commit;
