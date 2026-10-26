import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
for(const f of ['001_pilot.sql','002_hardening.sql','003_projects.sql','004_interactive_pages.sql','005_unified_content.sql','006_makers.sql','007_workspace.sql','008_evidence_storage.sql','009_delete_and_profile_theme.sql','010_profile_appearance.sql'])await db.exec(await fs.readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
const [admin,student,evaluator,outsider,teammate]=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-00000000000${i+1}`);
for(const id of [admin,student,evaluator,outsider,teammate])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.exec("update public.profiles set status='active'");await db.query("update public.profiles set role='admin' where id=$1",[admin]);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
async function call(id,name,args=[]){return(await as(id,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args))[0]?.value;}
const create=(id,kind,title,parent=null)=>call(id,'save_content',[null,kind,title,'Descripción válida',null,parent,['event','webinar'].includes(kind)?new Date(Date.now()-3600000):null,['event','webinar','case'].includes(kind)?new Date(Date.now()+3600000):null,20,true,null]);
try{
 await db.query("update public.profiles set role='organizer' where id=$1",[evaluator]);
 // 1) Un evento con contenido vinculado de otra persona: el admin puede eliminarlo y el vínculo se retira sin borrar lo ajeno.
 const ev=await create(admin,'event','Evento con vínculos');
 const res=(await db.query("insert into public.content(kind,title,body,owner_id,parent_id,published) values('resource','Material de la comunidad','Texto',$1,$2,true) returning id",[student,ev])).rows[0].id;
 await assert.rejects(()=>call(outsider,'delete_content',[ev]),/Solo el autor|Sin permiso|permission/);
 await assert.rejects(()=>call(outsider,'content_dependents',[ev]),/Sin permiso/);
 const dep=await call(admin,'content_dependents',[ev]);assert.equal(dep.detached,1);assert.equal(dep.removed,0);
 await call(admin,'delete_content',[ev]);
 const kept=(await db.query('select parent_id,deleted_at from public.content where id=$1',[res])).rows[0];assert.equal(kept.parent_id,null);assert.equal(kept.deleted_at,null);
 assert.ok((await db.query('select deleted_at from public.content where id=$1',[ev])).rows[0].deleted_at);
 // 2) Reto con solución (padre obligatorio): se archiva junto con el reto y deja de poder destacarse.
 const challenge=await create(admin,'case','Reto con solución');
 const sol=(await db.query("insert into public.content(kind,title,body,url,owner_id,parent_id,published,featured) values('solution','Mi solución','Texto','https://example.com/demo',$1,$2,true,true) returning id",[student,challenge])).rows[0].id;
 const dep2=await call(admin,'content_dependents',[challenge]);assert.equal(dep2.removed,1);
 await call(admin,'delete_content',[challenge]);
 const s2=(await db.query('select deleted_at,published,featured from public.content where id=$1',[sol])).rows[0];assert.ok(s2.deleted_at);assert.equal(s2.published,false);assert.equal(s2.featured,false);
 // 3) Organizador asignado al evento puede eliminarlo; otra persona no.
 const ev2=await create(admin,'event','Evento del organizador');
 await assert.rejects(()=>call(teammate,'delete_content',[ev2]),/Solo el autor|permission/);
 await call(admin,'set_event_organizer',[ev2,evaluator,false]);
 assert.equal(await call(evaluator,'can_manage_content',[ev2]),true);assert.equal(await call(teammate,'can_manage_content',[ev2]),false);
 await call(evaluator,'delete_content',[ev2]);
 await assert.rejects(()=>call(evaluator,'delete_content',[ev2]),/ya no existe/);
 assert.ok((await db.query("select 1 from public.audit_log where action='delete_content' and target_id=$1",[ev2])).rows.length===1);
 // 4) Perfil personalizable: validación en servidor.
 await call(student,'save_profile_theme',['neon','#00E5FF','Estudiante de Sistemas','Construyo cosas útiles',[{label:'GitHub',url:'https://github.com/ejemplo'}]]);
 const th=(await as(student,'select theme from public.profiles where id=$1',[student]))[0].theme;assert.equal(th.accent,'#00e5ff');assert.equal(th.links.length,1);
 await assert.rejects(()=>call(student,'save_profile_theme',['neon','#00e5ff','x','y',[{label:'Malo',url:'javascript:alert(1)'}]]),/Enlace no válido/);
 await assert.rejects(()=>call(student,'save_profile_theme',['neon','rojo','x','y',[]]),/Color/);
 await assert.rejects(()=>call(student,'save_profile_theme',['hackeo','#00e5ff','x','y',[]]),/Plantilla/);
 await assert.rejects(()=>call(student,'save_profile_theme',['neon','#00e5ff','x','y',[1,2,3,4,5].map(i=>({label:'a'+i,url:'https://example.com/'+i}))]),/Máximo 4/);
 await assert.rejects(()=>as(student,"update public.profiles set theme='{}' where id=$1",[student]),/permission denied/);
 await assert.rejects(()=>call(student,'save_profile_theme',['neon','#00e5ff','Eres un idiota','y',[]]),/ofensivas/);

 const theme={template:'aurora',accent:'#8b7bff',headline:'Diseñador de proyectos',quote:'Aprender construyendo',font:'mono',titleStyle:'gradient',background:'#070814',links:[{label:'GitHub',url:'https://github.com/milofrio066',kind:'github'}]};
 await call(student,'save_profile_appearance',[theme]);
 let saved=(await as(student,'select theme from public.profiles where id=$1',[student]))[0].theme;
 assert.equal(saved.font,'mono');assert.equal(saved.avatar.motion,'float');assert.equal(saved.links[0].kind,'github');
 await call(student,'save_profile_appearance',[{...theme,links:Array.from({length:8},(_,i)=>({label:'Proyecto '+i,url:'https://example.com/'+i,kind:'project'}))}]);
 saved=(await as(student,'select theme from public.profiles where id=$1',[student]))[0].theme;assert.equal(saved.links.length,8);
 await call(student,'save_profile_theme',['mono','#ffffff','Compatibilidad','Texto de prueba',[]]);
 saved=(await as(student,'select theme from public.profiles where id=$1',[student]))[0].theme;assert.equal(saved.font,'mono');
 for(const bad of [null,[],{...theme,font:'url(evil)'},{...theme,background:'red'},{...theme,sections:{hero:{background:'#000000',text:'evil'}}},{...theme,avatar:{skin:'#000000'}},{...theme,links:[{label:'X',url:'javascript:alert(1)'}]},{...theme,links:[{label:'X',url:'https://user:secret@example.com'}]},{...theme,links:Array.from({length:9},()=>({label:'A',url:'https://example.com'}))}])await assert.rejects(()=>call(student,'save_profile_appearance',[bad]));
 const other=(await as(teammate,'select theme from public.profiles where id=$1',[teammate]))[0].theme;assert.deepEqual(other,{});
 await db.query("update public.profiles set status='suspended' where id=$1",[student]);await assert.rejects(()=>call(student,'save_profile_appearance',[theme]));
 console.log('PASS perfil v010: temas y fuentes, ocho enlaces, avatar, compatibilidad, aislamiento, suspensión y rechazo de datos maliciosos.');
 console.log('PASS borrado: vínculos opcionales se retiran, soluciones/avances se archivan, organizador autorizado, auditoría y perfil personalizable validado.');
}finally{await db.close();}
