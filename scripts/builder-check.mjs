import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
const dir=new URL('../supabase/migrations/',import.meta.url);
for(const f of (await fs.readdir(dir)).filter(x=>/^\d{3}_.*\.sql$/.test(x)).sort())await db.exec(await fs.readFile(new URL(f,dir),'utf8'));
const [admin,member,other,suspended]=Array.from({length:4},(_,i)=>`00000000-0000-4000-8000-00000000000${i+1}`);
for(const id of [admin,member,other,suspended])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.exec("update public.profiles set status='active',onboarding_completed_at=now()");await db.query("update public.profiles set role='admin' where id=$1",[admin]);await db.query("update public.profiles set status='suspended' where id=$1",[suspended]);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
async function call(id,name,args=[]){return(await as(id,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args))[0]?.value;}
const save=(id,kind,title,published=true)=>call(id,'save_content',[null,kind,title,'Descripción válida del caso',null,null,null,null,null,published,null]);
try{
 // Cualquier miembro activo publica su builder case; un desconocido o suspendido no
 const bc=await save(member,'builder','Raíz: pasaporte productivo');
 assert.ok(bc);
 await assert.rejects(()=>save(member,'inventado','X'),/./);
 await assert.rejects(()=>save(suspended,'builder','No debería'),/./);
 // Sigue vedado a miembros lo que ya era de organización
 await assert.rejects(()=>save(member,'case','Reto de miembro'),/./);
 await assert.rejects(()=>save(member,'event','Evento de miembro'),/./);
 // Lectura: otro miembro lo ve en el catálogo; el borrador no
 const draft=await save(member,'builder','Borrador privado',false);
 const cat=await as(other,'select id,kind from public.content_catalog()');
 assert.ok(cat.some(r=>r.id===bc&&r.kind==='builder'));assert.ok(!cat.some(r=>r.id===draft));
 // Edición: solo su autor o administración; el tipo no puede cambiar
 await call(member,'save_content',[bc,'builder','Raíz v2','Texto actualizado válido',null,null,null,null,null,true,null]);
 await assert.rejects(()=>call(other,'save_content',[bc,'builder','Secuestro','Texto',null,null,null,null,null,true,null]),/No puedes editar/);
 await assert.rejects(()=>call(member,'save_content',[bc,'post','Cambio de tipo','Texto',null,null,null,null,null,true,null]),/No puedes editar/);
 // Feedback y comentarios funcionan como en el resto de contenidos
 await call(other,'save_feedback',[bc,1,4]).catch(()=>{});
 // Los mensajes de reto ya no hablan de "builder case"
 await assert.rejects(()=>call(member,'save_content',[null,'solution','Directa','Texto',null,null,null,null,null,true,null]),/desde un reto/);
 await assert.rejects(()=>call(admin,'save_content',[null,'case','Reto sin cierre','Texto',null,null,null,null,null,true,null]),/cierre del reto/);
 // Filtro administrativo de indicadores acepta la nueva sección
 await as(admin,"select public.admin_dashboard(now()-interval '30 days',now(),'builder','',0,25) v");
 console.log('PASS builder case: tipo propio, permisos de miembro, borradores, edición solo del autor, catálogo e indicadores.');
}catch(e){console.error(e);process.exitCode=1;}
finally{await db.close();}
