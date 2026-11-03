import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create table auth.identities(user_id uuid,provider text,identity_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select 'authenticated'$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;do $$begin create publication supabase_realtime;exception when others then null;end$$;`);
const dir=new URL('../supabase/migrations/',import.meta.url),files=(await fs.readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
for(const f of files)await db.exec(await fs.readFile(new URL(f,dir),'utf8'));
const [admin,mentor,maker,subscriber,other,organizer]=[1,2,3,4,5,6].map(i=>`00000000-0000-4000-8000-00000000000${i}`);
for(const id of [admin,mentor,maker,subscriber,other,organizer])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.exec("update public.profiles set status='active',onboarding_completed_at=now(),fellowship_location_completed_at=now()");
await db.query("update public.profiles set role='admin' where id=$1",[admin]);await db.query("update public.profiles set role='mentor' where id=$1",[mentor]);await db.query("update public.profiles set role='organizer' where id=$1",[organizer]);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
const one=async(id,sql,args)=>Object.values((await as(id,sql,args))[0])[0];
const denied=(id,sql,args,pattern)=>assert.rejects(()=>as(id,sql,args),pattern);
const page={v:1,blocks:[{id:'a',type:'callout',props:{tone:'info',title:'Mentoría',body:'Texto'}}]};
const session=(title,hours,{id=null,capacity=2,join='https://zoom.us/j/1'}={})=>JSON.stringify({p_id:id,p_kind:'event',p_title:title,p_body:'Tema de la sesión',p_url:null,p_parent:null,p_start:new Date(Date.now()+hours*36e5).toISOString(),p_end:new Date(Date.now()+(hours+1)*36e5).toISOString(),p_capacity:capacity,p_published:true,p_join_url:join,p_template:'blank',p_data:page,p_topics:['Validación'],p_methodology:'',p_audience:''});
const cover=JSON.stringify({path:'',alt:'',position:'center'}),conf=(audience,m=mentor)=>JSON.stringify({mentor:m,audience,modality:'meet'});
// Misma ruta que la interfaz 1.6: la audiencia de la sesión y el alcance del contenido se guardan juntos.
const scope=audience=>audience==='makers_subscribers'?'community':'makers';
const publish=(user,title,audience,hours=24,options)=>one(user,'select public.publish_scoped_content($1,$2,null,$3,$4)',[session(title,hours,options),cover,conf(audience),scope(audience)]);
const catalog=async id=>one(id,'select public.mentorship_catalog()');
// Crear y permisos de publicación
await denied(maker,'select public.publish_mentorship($1,$2,$3)',[session('Sin rol',24),cover,conf('makers')],/equipo organizador/);
await denied(admin,'select public.publish_mentorship($1,$2,$3)',[session('Sin cupos',24,{capacity:0}),cover,conf('makers')],/cupos/);
await denied(admin,'select public.publish_mentorship($1,$2,$3)',[session('Sin mentor',24),cover,JSON.stringify({audience:'makers'})],/mentor activo/);
const makersOnly=await publish(admin,'Solo makers','makers'),shared=await publish(admin,'Compartida','makers_subscribers'),plain=(await db.query("insert into public.content(kind,title,body,owner_id,published,starts_at,ends_at) values('event','Evento normal','x',$1,true,now()+interval '1 day',now()+interval '2 day') returning id",[admin])).rows[0].id;
assert.equal((await db.query("select kind,methodology from public.content where id=$1",[shared])).rows[0].methodology,'Mentoría grupal');
await denied(admin,'select public.publish_mentorship($1,$2,$3)',[session('Convertir',24,{id:plain}),cover,conf('makers')],/no es una mentoría/);
assert.ok((await db.query('select 1 from public.event_organizers where event_id=$1 and user_id=$2',[shared,mentor])).rows.length,'el mentor queda como organizador');
// Tipo de cuenta: solo administración y nunca por escritura directa
await denied(maker,'select public.admin_set_access_tier($1,$2)',[subscriber,'subscriber'],/Solo administración/);
await denied(subscriber,"update public.profiles set access_tier='maker' where id=$1",[subscriber],/permission denied/);
await denied(admin,'select public.admin_set_access_tier($1,$2)',[mentor,'subscriber'],/Solo un miembro/);
await as(admin,'select public.admin_set_access_tier($1,$2)',[subscriber,'subscriber']);
await assert.rejects(()=>db.query("update public.profiles set role='admin' where id=$1",[subscriber]),/profiles_tier_role_check/);
// Desde la 1.6 el suscriptor es miembro de la comunidad, pero solo lee lo publicado para toda la comunidad
assert.equal(await one(subscriber,'select public.active_member()'),true);
assert.equal(await one(subscriber,'select public.participant()'),true);
assert.deepEqual((await as(subscriber,'select id from public.content order by id')).map(r=>r.id),[shared]);
assert.ok((await as(subscriber,'select id from public.profiles')).some(r=>r.id===mentor),'networking con la comunidad');
assert.deepEqual((await catalog(subscriber)).map(r=>r.content_id),[shared]);
assert.equal((await catalog(subscriber))[0].mentor.id,mentor);
assert.equal(new Set((await catalog(maker)).map(r=>r.content_id)).size,2);
await denied(subscriber,'select public.register_event($1,false)',[makersOnly],/no disponible/);
await denied(subscriber,'select public.register_event($1,false)',[plain],/no disponible/);
await as(subscriber,"select public.add_comment($1,'hola')",[shared]);
await denied(subscriber,"select public.add_comment($1,'hola')",[makersOnly],/./);
await denied(subscriber,'select public.mentorship_report($1)',[shared],/responsable/);
// Plantillas: el suscriptor usa checklists solo dentro de sesiones autorizadas
await db.exec(`update public.content_pages set data=data where false`);
await as(subscriber,'select public.record_content_view($1)',[shared]);
await denied(subscriber,'select public.record_content_view($1)',[makersOnly],/no disponible/);
const revision=(await db.query('select revision from public.content_pages where content_id=$1',[shared])).rows[0].revision;
await denied(subscriber,"select public.save_interaction($1,$2,'a','checklist',$3)",[makersOnly,revision,JSON.stringify({checked:[0]})],/./);
// Materiales: heredan la audiencia de la sesión
await db.query("insert into public.content(kind,title,body,owner_id,parent_id,published) values('resource','Material compartido','x',$1,$2,true),('resource','Material privado','x',$1,$3,true),('resource','Otro recurso','x',$1,null,true)",[admin,shared,makersOnly]);
await db.query("update public.content set access_scope='community' where title='Material compartido'");
assert.deepEqual((await as(subscriber,"select title from public.content where kind='resource'")).map(r=>r.title),['Material compartido']);
assert.equal((await catalog(maker)).find(r=>r.content_id===shared).materials,1);
// Recorrido: inscribirse, confirmar, entrar y cancelar
await as(subscriber,'select public.register_event($1,false)',[shared]);
await denied(subscriber,'select public.get_join_link($1)',[shared],/cinco minutos/);
await as(subscriber,'select public.confirm_event($1)',[shared]);
assert.ok((await catalog(subscriber))[0].mine.confirmed_at);
await as(maker,'select public.register_event($1,false)',[shared]);
assert.equal((await catalog(maker)).find(r=>r.content_id===shared).seats_left,0);
assert.equal(JSON.stringify(await catalog(maker)).includes(subscriber),false,'el catálogo no revela inscritos');
await denied(other,'select public.register_event($1,false)',[shared],/No quedan cupos/);
await as(maker,'select public.register_event($1,true)',[shared]);
assert.equal((await catalog(maker)).find(r=>r.content_id===shared).mine,null);
await db.query("update public.content set starts_at=now()+interval '2 minutes' where id=$1",[shared]);
assert.equal(await one(subscriber,'select public.get_join_link($1)',[shared]),'https://zoom.us/j/1');
// Mentor asignado: gestiona la sesión, pero no un evento ajeno
await as(mentor,'select public.mark_attendance($1,$2,true)',[shared,subscriber]);
await denied(mentor,'select public.mark_attendance($1,$2,true)',[plain,subscriber],/Sin permiso/);
await denied(maker,'select public.mark_attendance($1,$2,true)',[shared,subscriber],/Sin permiso/);
await denied(maker,'select public.mentorship_report($1)',[shared],/responsable/);
// Encuesta: bloquea igual que en eventos y el informe no identifica a quien comenta
await db.exec("update public.fellowship_settings set started_at=now()-interval '1 day'");
await db.query("update public.content set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=$1",[shared]);
assert.equal(await one(subscriber,'select public.participant()'),false);
assert.equal(await catalog(subscriber).then(r=>r.length),0);
await as(subscriber,"select public.submit_event_survey($1,true,5,10,'Muy útil')",[shared]);
assert.equal(await one(subscriber,'select public.participant()'),true);
const report=await one(mentor,'select public.mentorship_report($1)',[shared]);
assert.equal(report.roster[0].status,'attended');assert.equal(report.roster[0].surveyed,true);assert.equal(report.survey.responses,1);assert.deepEqual(report.survey.comments,['Muy útil']);assert.equal(JSON.stringify(report.survey).includes(subscriber),false);
// Grabación: la gestiona el responsable y respeta la audiencia
await denied(maker,'select public.set_mentorship_recording($1,$2)',[shared,'https://youtu.be/abc'],/responsable/);
await assert.rejects(()=>as(mentor,'select public.set_mentorship_recording($1,$2)',[shared,'http://inseguro.test/x']));
await as(mentor,'select public.set_mentorship_recording($1,$2)',[shared,'https://youtu.be/abcdefghijk']);
await as(mentor,'select public.set_mentorship_recording($1,$2)',[makersOnly,'https://youtu.be/lmnopqrstuv']);
assert.equal(await one(subscriber,'select public.mentorship_recording($1)',[shared]),'https://youtu.be/abcdefghijk');
await denied(subscriber,'select public.mentorship_recording($1)',[makersOnly],/no disponible/);
await denied(subscriber,'select * from public.mentorship_sessions',[],/permission denied/);
// Cambiar de mentor retira el permiso anterior; publicar en borrador oculta la sesión
await one(admin,'select public.publish_scoped_content($1,$2,null,$3,$4)',[session('Solo makers',24,{id:makersOnly}),cover,conf('makers',organizer),'makers']);
assert.equal(await one(mentor,'select public.can_manage_content($1)',[makersOnly]),false);
assert.equal(await one(organizer,'select public.can_manage_content($1)',[makersOnly]),true);
await db.query("update public.content set published=false where id=$1",[shared]);
assert.equal((await as(subscriber,'select id from public.content')).length,0);
await db.query("update public.content set published=true where id=$1",[shared]);
// Los makers conservan su acceso. Repetir 023 no cambia la audiencia (no se debe repetir 022 después de 023).
assert.equal(await one(maker,'select public.active_member()'),true);
assert.ok((await as(maker,'select id from public.content')).some(r=>r.id===plain));
await db.exec(await fs.readFile(new URL('023_launch_access.sql',dir),'utf8'));
assert.deepEqual((await catalog(subscriber)).map(r=>r.content_id),[shared]);
await db.close();
console.log('PASS mentorías (reglas 1.6): audiencia por sesión, suscriptor sin contenido de makers, materiales y grabación por sesión, cupos sin revelar inscritos, recorrido de inscripción, mentor asignado, encuesta y migración repetible.');
