import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
for(const f of ['001_pilot.sql','002_hardening.sql','003_projects.sql','004_interactive_pages.sql','005_unified_content.sql','006_makers.sql','007_workspace.sql','008_evidence_storage.sql','009_delete_and_profile_theme.sql','010_profile_appearance.sql','011_challenges_admin_analytics.sql','012_avatar_studio.sql','013_admin_operations_geography.sql','014_admin_email_outbox.sql','015_builder_case.sql','016_avatar_wardrobe.sql','017_covers_and_community_sync.sql'])await db.exec(await fs.readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));

await db.exec(await fs.readFile(new URL('../supabase/migrations/017_covers_and_community_sync.sql',import.meta.url),'utf8'));
const [admin,owner,other,pending]=[1,2,3,4].map(i=>`00000000-0000-4000-8000-00000000000${i}`);
for(const id of [admin,owner,other,pending])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.query("update public.profiles set status='active' where id<>$1",[pending]);await db.query("update public.profiles set role='admin' where id=$1",[admin]);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
async function call(id,name,args){return(await as(id,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args))[0]?.value;}
const path=owner+'/00000000-0000-4000-8000-000000000100.webp';
const base={p_id:null,p_kind:'post',p_title:'Contenido con portada',p_body:'Una descripción válida.',p_url:null,p_parent:null,p_start:null,p_end:null,p_capacity:null,p_published:true,p_join_url:null,p_template:'blank',p_data:{v:1,accent:'#22d3ee',blocks:[{id:'hero-1',type:'hero',props:{title:'Hola'}}]},p_topics:[],p_methodology:'',p_audience:'',p_project_config:null};
try{
 await as(owner,'insert into storage.objects(bucket_id,name) values($1,$2)',['content-covers',path]);
 await assert.rejects(()=>as(other,'insert into storage.objects(bucket_id,name) values($1,$2)',['content-covers',owner+'/00000000-0000-4000-8000-000000000101.webp']));
 await assert.rejects(()=>as(pending,'insert into storage.objects(bucket_id,name) values($1,$2)',['content-covers',pending+'/00000000-0000-4000-8000-000000000102.webp']));
 assert.equal((await as(other,"select * from storage.objects where bucket_id='content-covers'")).length,0);
 const before=(await db.query("select version from public.community_updates where scope='content'")).rows[0].version;
 const id=await call(owner,'publish_content_with_cover',[base,{path,alt:'Una portada accesible',position:'top'},null]);
 assert.ok(id);assert.equal((await as(other,"select * from storage.objects where bucket_id='content-covers'")).length,1);
 assert.equal((await as(other,'select cover_path from public.content where id=$1',[id]))[0].cover_path,path);
 assert.ok(Number((await db.query("select version from public.community_updates where scope='content'")).rows[0].version)>Number(before));
 assert.equal((await as(other,'select * from public.community_updates')).length,3);
 assert.equal((await as(pending,'select * from public.community_updates')).length,0);
 await assert.rejects(()=>as(other,"update public.community_updates set version=100"));
 await assert.rejects(()=>call(other,'publish_content_with_cover',[{...base,p_id:id,p_title:'Cambio ajeno'},{path},null]));
 await assert.rejects(()=>call(other,'publish_content_with_cover',[{...base,p_title:'Copia de portada ajena'},{path},null]));
 await assert.rejects(()=>call(owner,'publish_content_with_cover',[{...base,p_title:'No guardar si falla'},{path:owner+'/00000000-0000-4000-8000-000000000199.webp'},null]));
 assert.equal((await db.query("select count(*)::int n from public.content where title='No guardar si falla'")).rows[0].n,0);
 assert.equal((await as(owner,'delete from storage.objects where name=$1 returning name',[path])).length,0,'Referenced cover cannot be deleted');
 await call(owner,'publish_content_with_cover',[{...base,p_id:id,p_published:false},{path,alt:'Borrador',position:'center'},null]);
 assert.equal((await as(other,"select * from storage.objects where bucket_id='content-covers'")).length,0,'Draft images are private');
 await call(owner,'publish_content_with_cover',[{...base,p_id:id},{path:'',alt:'',position:'center'},null]);
 assert.equal((await as(owner,'delete from storage.objects where name=$1 returning name',[path])).length,1,'Unlinked own upload can be deleted');
 await assert.rejects(()=>call(owner,'publish_content_with_cover',[base,{path:'https://evil.example/image.svg'},null]));
 await assert.rejects(()=>call(owner,'publish_content_with_cover',[base,{path:'',position:'left'},null]));
 const signals=await db.query("select event_object_table as table_name from information_schema.triggers where trigger_name='nextone_sync' group by event_object_table");assert.ok(signals.rows.some(r=>r.table_name==='profiles'));assert.ok(signals.rows.some(r=>r.table_name==='content_pages'));
 const publication=await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime'");assert.ok(publication.rows.some(r=>r.tablename==='community_updates'));
 console.log('PASS covers + sync: atomic publication, private Storage/RLS, author/admin permissions, drafts, invalid paths, no shared-row payloads, triggers and Realtime publication.');
}finally{await db.close();}
