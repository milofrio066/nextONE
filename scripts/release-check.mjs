import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
for(const f of ['001_pilot.sql','002_hardening.sql','003_projects.sql','004_interactive_pages.sql','005_unified_content.sql','006_makers.sql','007_workspace.sql','008_evidence_storage.sql','009_delete_and_profile_theme.sql','010_profile_appearance.sql','011_challenges_admin_analytics.sql','012_avatar_studio.sql'])await db.exec(await fs.readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
const [admin,student,evaluator,outsider,teammate]=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-00000000000${i+1}`);
for(const id of [admin,student,evaluator,outsider,teammate])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.exec("update public.profiles set status='active'");await db.query("update public.profiles set role='admin' where id=$1",[admin]);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
async function call(id,name,args=[]){return(await as(id,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args))[0]?.value;}
const create=(id,kind,title,parent=null)=>call(id,'save_content',[null,kind,title,'Descripción válida',null,parent,['event','webinar'].includes(kind)?new Date(Date.now()-3600000):null,['event','webinar','case'].includes(kind)?new Date(Date.now()+3600000):null,20,true,null]);
try {
 await db.query("update public.profiles set role='organizer' where id=$1",[evaluator]);
 for(const id of [student,evaluator,outsider]){
  await assert.rejects(()=>call(id,'content_metrics'));
  await assert.rejects(()=>call(id,'makers_insights',[new Date(Date.now()-86400000),new Date(),'', '', '']));
  await assert.rejects(()=>call(id,'admin_dashboard',[new Date(Date.now()-86400000),new Date()]));
  await assert.rejects(()=>call(id,'admin_export_metrics',['','']));
 }
 const challenge=await create(evaluator,'case','Reto integral');
 const criteria=[{label:'Impacto',weight:50},{label:'Demostración',weight:50}];
 await call(evaluator,'configure_challenge',[challenge,'Instrucciones claras para la comunidad','Una demostración y evidencia',criteria,1,true]);
 await call(student,'start_case',[challenge]);await call(student,'start_case',[challenge]);
 await assert.rejects(()=>call(outsider,'start_case',[challenge]),/cupo/);
 await call(student,'leave_challenge',[challenge]);await call(outsider,'start_case',[challenge]);await call(outsider,'leave_challenge',[challenge]);await call(student,'start_case',[challenge]);
 const data={v:1,accent:'#22d3ee',blocks:[{id:'a',type:'hero',props:{title:'Mi solución'}}]};
 const publish=(id,solution,title='Solución integral')=>call(id,'publish_workspace_content',[solution,'solution',title,'Una descripción detallada','https://example.com/demo',challenge,null,null,null,true,null,'blank',data,[],'','',null]);
 const solution=await publish(student,null);assert.equal(await call(student,'can_edit_solution',[solution]),true);assert.equal(await call(outsider,'can_edit_solution',[solution]),false);assert.equal(await call(admin,'can_edit_solution',[solution]),true);
 assert.equal((await as(student,'select * from public.solution_versions where solution_id=$1',[solution])).length,1);
 await publish(student,solution,'Solución revisada');
 assert.equal((await as(student,'select * from public.solution_versions where solution_id=$1',[solution])).length,2);
 await assert.rejects(()=>call(evaluator,'configure_challenge',[challenge,'Instrucciones claras','Una demostración', [{label:'Cambio',weight:100}],1,true]),/criterios/);
 await call(evaluator,'set_challenge_phase',[challenge,'review']);
 await assert.rejects(()=>publish(student,solution),/cerrada/);
 await assert.rejects(()=>call(student,'withdraw_solution',[solution]));
 await assert.rejects(()=>call(evaluator,'set_challenge_phase',[challenge,'completed']),/feedback/);
 await call(admin,'set_feedback',[solution,1,5]);await assert.rejects(()=>call(outsider,'review_challenge_solution',[solution,[4,5],'Prototipo bien construido','Ampliar las validaciones','La solución cumple el objetivo']));await assert.rejects(()=>call(evaluator,'review_challenge_solution',[solution,[6,5],'Prototipo bien construido','Ampliar las validaciones','La solución cumple el objetivo']));await call(evaluator,'review_challenge_solution',[solution,[4,5],'Prototipo bien construido','Ampliar las validaciones','La solución cumple el objetivo']);const assessed=(await as(student,'select * from public.challenge_assessments where solution_id=$1',[solution]))[0];assert.equal(Number(assessed.weighted_score),4.5);assert.equal(assessed.scores[0].weight,50);
 assert.equal(await call(student,'can_edit_solution',[solution]),false);assert.equal(await call(admin,'can_edit_solution',[solution]),true);await call(evaluator,'set_challenge_phase',[challenge,'completed']);
 await call(evaluator,'set_challenge_phase',[challenge,'accepting']);await assert.rejects(()=>publish(student,solution),/cerrada/);
 const report=await call(admin,'admin_dashboard',[new Date(Date.now()-86400000),new Date(Date.now()+86400000),'','',0,25]);
 assert.equal(report.period.starters,1);assert.equal(report.period.submitted_starters,1);assert.equal(report.period.ratings,1);assert.equal(Number(report.period.average),5);assert.equal(report.daily.length,3);assert.ok(report.snapshot.contents>=2);
 const filtered=await call(admin,'admin_dashboard',[new Date(Date.now()-86400000),new Date(Date.now()+86400000),'solution','Solución',0,1]);assert.equal(filtered.rows.length,1);assert.equal(filtered.snapshot.contents,1);
 await assert.rejects(()=>call(admin,'admin_dashboard',[new Date(),new Date(Date.now()-1)]));
 const next=await create(evaluator,'case','Reto para retiro');await call(student,'start_case',[next]);
 const s2=await call(student,'publish_interactive_content',[null,'solution','Solución retirable','Descripción','https://example.com',next,null,null,null,true,null,'blank',data]);
 await call(student,'withdraw_solution',[s2]);assert.equal((await as(student,'select * from public.attempts where case_id=$1',[next]))[0].solution_id,null);
 const s3=await call(student,'publish_interactive_content',[null,'solution','Segunda entrega','Descripción','https://example.com',next,null,null,null,true,null,'blank',data]);
 await db.query("update public.content set ends_at=now()-interval '1 second' where id=$1",[next]);
 await assert.rejects(()=>call(student,'publish_interactive_content',[s3,'solution','Edición tardía','Descripción','https://example.com',next,null,null,null,true,null,'blank',data]));
 await assert.rejects(()=>call(student,'save_content_page',[s3,'blank',data]));
 assert.equal((await as(outsider,'select * from public.solution_versions where solution_id=$1',[solution])).length,0);
 // Disabling later revisions must still allow the initial designed submission.
 const locked=await create(evaluator,'case','Entrega sin revisiones');await call(evaluator,'configure_challenge',[locked,'Instrucciones claras','Una demostración',criteria,null,false]);await call(outsider,'start_case',[locked]);
 const once=await call(outsider,'publish_interactive_content',[null,'solution','Entrega única','Una solución sin revisiones','https://example.com',locked,null,null,null,true,null,'blank',data]);
 await assert.rejects(()=>call(outsider,'save_content_page',[once,'blank',data]));
 // Atomic publish: invalid rules roll back content and page as well.
 const payload={p_kind:'case',p_title:'Publicación atómica',p_body:'Instrucciones válidas',p_end:new Date(Date.now()+86400000).toISOString(),p_published:true,p_template:'blank',p_data:data,p_topics:['Validación'],p_methodology:'Reto',p_audience:'Comunidad'};
 const rules={instructions:'Construir una solución demostrable',deliverables:'Un prototipo navegable',criteria,allow_updates:true,participant_limit:3};
 await assert.rejects(()=>call(evaluator,'publish_challenge',[payload,{...rules,criteria:[{label:'Impacto',weight:80}]}]));
 assert.equal((await db.query("select id from public.content where title='Publicación atómica'")).rows.length,0);
 const published=await call(evaluator,'publish_challenge',[payload,rules]);assert.equal((await as(student,'select * from public.challenge_rules where content_id=$1',[published]))[0].participant_limit,3);
 const baseAvatar={skin:'#cf9569',hairColor:'#262033',shirtColor:'#8b5cf6',hair:'braids',outfit:'dress',accessory:'glasses',expression:'smile',motion:'dance',presentation:'feminine',face:'round',body:'soft',facialHair:'none',eyeColor:'#4686aa'};
 const theme={template:'aurora',accent:'#8b7bff',avatar:baseAvatar,links:[{label:'Portfolio',url:'https://example.com',kind:'portfolio'}]};
 await call(student,'save_profile_avatar_v2',[theme]);let avatar=(await as(student,'select theme from public.profiles where id=$1',[student]))[0].theme.avatar;assert.equal(avatar.hair,'braids');assert.equal(avatar.eyeColor,'#4686aa');assert.equal(avatar.motion,'dance');
 for(const changed of [{motion:'hack'},{skin:'url(evil)'},{eyeColor:'red'},{body:'injection'},{presentation:'invalid'},{hair:'unknown'}])await assert.rejects(()=>call(student,'save_profile_avatar_v2',[{...theme,avatar:{...baseAvatar,...changed}}]));
 await call(student,'save_profile_avatar_v2',[{...theme,avatar:{...baseAvatar,presentation:'masculine',face:'square',hair:'undercut',outfit:'sport',facialHair:'beard',motion:'walk'}}]);
 assert.deepEqual((await as(teammate,'select theme from public.profiles where id=$1',[teammate]))[0].theme,{});
 await db.query("update public.profiles set status='suspended' where id=$1",[student]);await assert.rejects(()=>call(student,'save_profile_avatar_v2',[theme]));
 console.log('PASS versión 1: indicadores solo admin, métricas verificadas, cupos, salida, entrega/revisión/versiones, bloqueo de criterios/plazos, retiro y cierre con feedback.');
}finally{await db.close();}
