import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
for(const f of ['001_pilot.sql','002_hardening.sql','003_projects.sql','004_interactive_pages.sql','005_unified_content.sql','006_makers.sql'])await db.exec(await fs.readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
const ids=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-00000000000${i+1}`),[admin,member,other,organizer,pending]=ids;
for(const id of ids)await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.query("update public.profiles set status='active' where id<>$1",[pending]);await db.query("update public.profiles set role='admin' where id=$1",[admin]);await db.query("update public.profiles set role='organizer' where id=$1",[organizer]);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
async function call(id,name,args=[]){return(await as(id,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args))[0]?.value;}
const page={v:1,blocks:[{id:'q1',type:'quiz',props:{items:[{q:'Pregunta',options:['A','B'],answer:2}]}},{id:'c1',type:'checklist',props:{items:['Uno','Dos']}}]};
const publish=(actor,title,topics=['Producto'],method='Taller')=>call(actor,'publish_makers_content',[null,'event',title,'Descripción',null,null,new Date(Date.now()-60000),new Date(Date.now()+3600000),20,true,'https://example.com/join','blank',page,topics,method,'Makers']);
try{
 const event=await publish(organizer,'Evento Makers'),hidden=await publish(admin,'Evento reservado');
 await call(member,'save_makers_profile',[['Diseño','Producto','Diseño']]);assert.equal((await as(member,'select interests from public.profiles where id=$1',[member]))[0].interests.length,2);
 await assert.rejects(()=>call(member,'set_member_cohort',[other,'Enero']),/administración/);
 await call(admin,'set_member_cohort',[member,'Enero']);
 await call(member,'register_event',[event,false]);await call(other,'register_event',[event,false]);await call(member,'get_join_link',[event]);await call(organizer,'mark_attendance',[event,member,true]);
 for(const actor of [admin,member,organizer])assert.ok((await as(actor,'select * from public.registrations where user_id=$1',[actor])).every(r=>r.user_id===actor));
 await call(member,'set_feedback',[event,1,4]);await call(member,'set_feedback',[event,1,5]);
 await call(other,'register_event',[hidden,false]);
 await assert.rejects(()=>call(pending,'save_interaction',[event,1,'q1','quiz',{answers:[1]}]),/activa|activo|pendiente/i);
 const result=await call(member,'save_interaction',[event,1,'q1','quiz',{answers:[1],score:999}]);assert.equal(result.score,1);
 await call(member,'save_interaction',[event,1,'q1','quiz',{answers:[1]}]);
 await call(member,'save_interaction',[event,1,'c1','checklist',{done:[0,1,1]}]).then(()=>assert.fail('duplicates should not bypass length validation'),()=>{});
 await assert.rejects(()=>call(member,'save_interaction',[event,1,'c1','checklist',{done:[-1]}]),/inválido/);
 await call(member,'save_interaction',[event,1,'c1','checklist',{done:[0,1]}]);await call(member,'save_interaction',[event,1,'c1','checklist',{done:[0]}]);await call(member,'save_interaction',[event,1,'c1','checklist',{done:[0,1]}]);
 assert.equal((await as(other,'select * from public.interaction_progress')).length,0);
 await assert.rejects(()=>as(member,'select * from public.activity_history'),/permission denied/);
 await assert.rejects(()=>call(member,'append_activity',[event,other,'fake',{}]),/permission denied/);
 const history=(await db.query('select * from public.activity_history where content_id=$1',[event])).rows;
 assert.equal(history.filter(h=>h.event==='quiz_completed').length,1);assert.equal(history.filter(h=>h.event==='checklist_completed').length,1);assert.equal(history.find(h=>h.event==='registered'&&h.user_id===member).cohort,'Enero');
 const from=new Date(Date.now()-86400000),until=new Date(Date.now()+86400000);
 const insight=await call(organizer,'makers_insights',[from,until,'Producto','Taller','']);assert.equal(insight.people,2);assert.equal(insight.methods[0].responses,1);assert.equal(Number(insight.methods[0].usefulness),5);
 await assert.rejects(()=>call(member,'makers_insights',[from,until,'','','']),/organizador/);
 await db.query("update public.activity_history set occurred_at=now()-interval '2 days' where event='registered' and user_id=$1",[member]);
 assert.equal((await call(organizer,'makers_insights',[from,until,'','','Enero'])).returning,1);
 const revised={...page,accent:'#22d3ee'};await call(organizer,'save_content_page',[event,'blank',revised]);
 assert.equal((await as(member,'select revision from public.content_pages where content_id=$1',[event]))[0].revision,2);
 await assert.rejects(()=>call(member,'save_interaction',[event,1,'q1','quiz',{answers:[1]}]),/cambió/);
 const before=(await db.query('select count(*)::int n from public.content')).rows[0].n;
 await assert.rejects(()=>call(admin,'publish_makers_content',[null,'post','Atomicidad Makers','Descripción',null,null,null,null,null,true,null,'blank',{v:1},['Tema'],'Taller','Makers']),/check/);
 assert.equal((await db.query('select count(*)::int n from public.content')).rows[0].n,before);
 await call(admin,'delete_content',[event]);assert.equal((await call(organizer,'makers_insights',[from,until,'','',''])).people,0);assert.equal((await as(member,'select * from public.interaction_progress')).length,0);
 console.log('PASS Makers: migración incremental, clasificación atómica, intereses/cohortes, historial, RLS, precisión, retorno, sincronización, versiones y deduplicación.');
}finally{await db.close();}
