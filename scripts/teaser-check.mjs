import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
// 025: vista bloqueada, encuesta 3 h después solo para confirmados, feedback definitivo privado y panel del organizador.
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create table auth.identities(user_id uuid,provider text,identity_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select 'authenticated'$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;do $$begin create publication supabase_realtime;exception when others then null;end$$;`);
const dir=new URL('../supabase/migrations/',import.meta.url),files=(await fs.readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
for(const f of files.filter(f=>f<'025'))await db.exec(await fs.readFile(new URL(f,dir),'utf8'));
const ids=[1,2,3,4,5,6,7].map(i=>`00000000-0000-4000-8000-00000000000${i}`),[admin,owner,organizer,maker,peer,mentor,author]=ids;
for(const id of ids)await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.exec("update public.profiles set status='active',onboarding_completed_at=now(),fellowship_location_completed_at=now()");
await db.query("update public.profiles set role='admin' where id=$1",[admin]);await db.query("update public.profiles set role='organizer' where id in ($1,$2)",[owner,organizer]);await db.query("update public.profiles set role='mentor' where id=$1",[mentor]);
await db.query("update public.profiles set access_tier='subscriber' where id=$1",[peer]);
await db.exec("update public.fellowship_settings set started_at=now()-interval '30 days'");
// Evento «solo makers» existente antes de 025: debe seguir viéndose bloqueado para peers.
const legacy=(await db.query("insert into public.content(kind,title,body,owner_id,published,starts_at,ends_at,access_scope) values('event','Evento previo de makers','Detalle',$1,true,now()+interval '1 day',now()+interval '1 day 1 hour','makers') returning id",[owner])).rows[0].id;
const m025=await fs.readFile(new URL('025_teaser_survey_reviews.sql',dir),'utf8');
await db.exec(m025);await db.exec(m025);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
const one=async(id,sql,args)=>Object.values((await as(id,sql,args))[0])[0];
const denied=(id,sql,args,pattern)=>assert.rejects(()=>as(id,sql,args),pattern);
assert.equal((await db.query('select teaser from public.content where id=$1',[legacy])).rows[0].teaser,true,'los eventos solo makers previos conservan la vista bloqueada');

// 1 · Vista bloqueada
const page={v:1,blocks:[{id:'a',type:'callout',props:{tone:'info',title:'Aviso',body:'Texto'}}]};
const content=(kind,title,extra={})=>JSON.stringify({p_id:null,p_kind:kind,p_title:title,p_body:'Qué haremos en esta sesión y para quién es.',p_url:null,p_parent:null,p_start:new Date(Date.now()+864e5).toISOString(),p_end:new Date(Date.now()+900e5).toISOString(),p_capacity:20,p_published:true,p_join_url:'https://zoom.us/j/1',p_template:'blank',p_data:page,p_topics:['IA'],p_methodology:'',p_audience:'',...extra});
const cover=JSON.stringify({path:'',alt:'',position:'center'});
const pub=(user,title,scope,teaser,kind='event')=>one(user,'select public.publish_scoped_content_v2($1,$2,null,null,$3,$4)',[content(kind,title),cover,scope,teaser]);
const makersTeaser=await pub(owner,'Taller makers con vista para peers','makers',true),peersTeaser=await pub(owner,'Meetup peers con vista para makers','peers',true),hidden=await pub(owner,'Solo makers oculto','makers',false);
await denied(owner,'select public.publish_scoped_content_v2($1,$2,null,null,$3,$4)',[content('event','Todos bloqueado'),cover,'community',true],/solo aplica/);
const lockedFor=async id=>(await one(id,'select public.locked_catalog()')).map(x=>x.title).sort();
assert.deepEqual(await lockedFor(peer),['Evento previo de makers','Taller makers con vista para peers']);
assert.deepEqual(await lockedFor(maker),['Meetup peers con vista para makers']);
assert.deepEqual(await lockedFor(admin),[],'quien puede entrar no ve la versión bloqueada');
const card=(await one(peer,'select public.locked_catalog()')).find(x=>x.title.startsWith('Taller'));
assert.equal(JSON.stringify(card).includes('zoom.us'),false,'no expone el enlace');assert.equal(card.capacity,undefined);
assert.equal((await as(peer,'select 1 from public.content where id=$1',[makersTeaser])).length,0,'el peer no lee el contenido');
await denied(peer,'select public.register_event($1,false)',[makersTeaser],/no disponible/);
await denied(peer,"select public.add_comment($1,'hola')",[makersTeaser],/./);
assert.deepEqual((await one(peer,'select public.locked_event_catalog()')).map(x=>x.title).sort(),['Evento previo de makers','Taller makers con vista para peers']);
assert.equal((await lockedFor(peer)).includes('Solo makers oculto'),false);

// 2 · Encuesta: solo confirmados o asistentes, 3 horas después del final
const ev=(title,endsAgo)=>db.query(`insert into public.content(kind,title,body,owner_id,published,starts_at,ends_at,access_scope) values('event',$1,'x',$2,true,now()-make_interval(mins=>$3+60),now()-make_interval(mins=>$3),'community') returning id`,[title,owner,endsAgo]).then(r=>r.rows[0].id);
const recent=await ev('Terminó hace 1 hora',60),old=await ev('Terminó hace 4 horas',240),unconfirmed=await ev('Sin confirmar',300),attendedOnly=await ev('Asistencia marcada',300);
for(const [c,confirmed] of [[recent,true],[old,true],[unconfirmed,false],[attendedOnly,false]])await db.query(`insert into public.registrations(content_id,user_id,status,confirmed_at) values($1,$2,'registered',${confirmed?'now()':'null'})`,[c,maker]);
await db.query("update public.registrations set status='attended' where content_id=$1",[attendedOnly]);
const due=async()=>(await one(maker,'select public.fellowship_gate()')).surveys.map(s=>s.title).sort();
assert.deepEqual(await due(),['Asistencia marcada','Terminó hace 4 horas'],'ni antes de 3 horas ni sin confirmar');
assert.equal(await one(maker,'select public.participant()'),false,'la encuesta pendiente bloquea como antes');
await denied(maker,'select public.submit_event_survey($1,true,5,9,$2)',[recent,''],/no disponible/);
await denied(maker,'select public.submit_event_survey($1,true,5,9,$2)',[unconfirmed,''],/no disponible/);
await denied(maker,'select public.submit_event_survey($1,true,null,null,$2)',[old,''],/Califica/);
await as(maker,'select public.submit_event_survey($1,true,5,10,$2)',[old,'Muy útil']);
await as(maker,'select public.submit_event_survey($1,false,null,null,$2)',[attendedOnly,'']);
assert.deepEqual(await due(),[]);assert.equal(await one(maker,'select public.participant()'),true);

// 3 · Feedback definitivo privado
const kase=(await db.query("insert into public.content(kind,title,body,owner_id,published,parent_id) values('case','Reto','x',$1,true,null) returning id",[owner])).rows[0].id;
await db.query('update public.content set parent_id=$1 where id=$2',[old,kase]);
const solution=(await db.query("insert into public.content(kind,title,body,url,owner_id,published,parent_id) values('solution','Solución','x','https://demo.example',$1,true,$2) returning id",[author,kase])).rows[0].id;
await db.query('insert into public.event_organizers(event_id,user_id) values($1,$2)',[old,organizer]);
await db.query("insert into public.feedback(content_id,user_id,rating) values($1,$2,4)",[solution,maker]);
await as(organizer,"select public.save_final_review($1,4,'Buen planteamiento del problema','Falta validar con usuarios','Aprobada con ajustes')",[solution]);
const sees=async id=>(await as(id,'select 1 from public.final_reviews where content_id=$1',[solution])).length===1;
assert.deepEqual([await sees(admin),await sees(owner),await sees(organizer),await sees(author)],[true,true,true,true]);
assert.deepEqual([await sees(maker),await sees(mentor)],[false,false],'miembros y mentores no lo ven');
assert.equal(await one(maker,'select public.can_view_final_review($1)',[solution]),false);assert.equal(await one(author,'select public.can_view_final_review($1)',[solution]),true);

// 4 · Panel del organizador
await db.query("insert into public.registrations(content_id,user_id,status,confirmed_at) values($1,$2,'registered',now())",[makersTeaser,maker]);
await db.query('insert into public.event_organizers(event_id,user_id) values($1,$2)',[makersTeaser,organizer]);
assert.equal((await one(organizer,'select public.event_attendance_roster($1)',[makersTeaser])).length,1,'el organizador asignado ve inscritos');
await as(organizer,'select public.mark_attendance($1,$2,true)',[makersTeaser,maker]);
assert.equal((await db.query('select status from public.registrations where content_id=$1',[makersTeaser])).rows[0].status,'attended');
await denied(mentor,'select public.event_attendance_roster($1)',[makersTeaser],/Solo responsable/);
await denied(maker,'select public.event_survey_summary($1)',[old],/Solo responsable/);
const summary=await one(owner,'select public.event_survey_summary($1)',[old]);
assert.equal(summary.responses,1);assert.equal(Number(summary.average),5);assert.equal(Number(summary.nps),100);assert.deepEqual(summary.comments,['Muy útil']);
assert.equal(JSON.stringify(summary).includes(maker),false,'sin identidades');

// Reversión y reaplicación
await db.exec(await fs.readFile(new URL('../supabase/rollback/025_revert.sql',import.meta.url),'utf8'));
assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_name='content' and column_name='teaser'")).rows[0].n,0);
await db.exec(m025);
console.log('PASS 1.9: vista bloqueada makers↔peers sin exponer enlaces ni cuerpo, encuesta 3 h después solo para confirmados o asistentes, feedback definitivo privado, panel del organizador asignado, migración repetible y reversible.');
