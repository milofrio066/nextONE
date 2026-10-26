-- Supabase Storage only: apply after 007. This schema is supplied by Supabase.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-evidence','project-evidence',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function public.evidence_project(path text) returns uuid language plpgsql immutable set search_path='' as $$
begin if path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]+\.(pdf|docx|txt)$' then return split_part(path,'/',1)::uuid;end if;return null;exception when invalid_text_representation then return null;end $$;
revoke all on function public.evidence_project(text) from public,anon;grant execute on function public.evidence_project(text) to authenticated;
create policy evidence_download on storage.objects for select to authenticated using(bucket_id='project-evidence' and public.project_access(public.evidence_project(name)));
create policy evidence_upload on storage.objects for insert to authenticated with check(bucket_id='project-evidence' and public.in_project(public.evidence_project(name)) and split_part(name,'/',2)=auth.uid()::text);
create policy evidence_remove on storage.objects for delete to authenticated using(bucket_id='project-evidence' and public.in_project(public.evidence_project(name)) and(split_part(name,'/',2)=auth.uid()::text or public.is_admin()));
commit;
