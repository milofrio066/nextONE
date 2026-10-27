import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create table auth.identities(user_id uuid,provider text,identity_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
for(const f of (await fs.readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())await db.exec(await fs.readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));

await db.exec(await fs.readFile(new URL('../supabase/migrations/021_member_monthly_visuals.sql',import.meta.url),'utf8'));

const [admin,member,pending]=[1,2,3].map(i=>`00000000-0000-4000-8000-00000000000${i}`);
for(const id of [admin,member,pending])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.query("update public.profiles set status='active',onboarding_completed_at=now() where id in ($1,$2)",[admin,member]);await db.query("update public.profiles set role='admin' where id=$1",[admin]);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
async function call(id,name,args=[]){return(await as(id,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args))[0]?.value;}
try{
 assert.equal(await call(admin,'active_member'),false);
 await assert.rejects(()=>call(admin,'save_member_location',['CO','','Medellín']));
 await assert.rejects(()=>call(pending,'save_member_location',['CO','Antioquia','Medellín']));
 for(const id of [admin,member])await call(id,'save_member_location',['CO','Antioquia','Medellín']);
 assert.equal(await call(admin,'is_admin'),true);
 const event=await call(admin,'save_content',[null,'webinar','Webinar de prueba','Descripción del webinar',null,null,new Date(Date.now()+3600000),new Date(Date.now()+7200000),100,true,'https://meet.google.com/abc-defg-hij']);
 await call(member,'register_event',[event,false]);await call(member,'confirm_event',[event]);
 await call(member,'record_content_view',[event]);await call(member,'record_content_view',[event]);
 const activity=await call(admin,'admin_member_activity',[member,0]);assert.equal(activity.events.filter(e=>e.event==='content_viewed').length,1);
 await assert.rejects(()=>call(member,'admin_member_activity',[admin,0]));
 await assert.rejects(()=>call(member,'fellowship_analytics',[30]));
 await assert.rejects(()=>call(member,'submit_event_survey',[event,true,5,10,'Aún no termina']));
 await call(admin,'configure_event_meeting',[event,'zoom','123456789']);
 await db.query("update public.content set starts_at=now()-interval '4 hours',ends_at=now()-interval '3 hours' where id=$1",[event]);
 await db.exec("update public.fellowship_settings set started_at=now()-interval '1 day'");
 assert.equal((await call(member,'fellowship_gate')).surveys.length,1);assert.equal(await call(member,'active_member'),false,'Survey gates backend access too');await assert.rejects(()=>call(member,'record_content_view',[event]));
 await assert.rejects(()=>call(member,'ingest_verified_attendance',['fake','zoom','123456789',member+'@test.example']));
 assert.equal((await db.query("select public.ingest_verified_attendance('receipt1','zoom','123456789',$1) v",[member+'@test.example'])).rows[0].v,true);
 assert.equal((await call(admin,'event_attendance_roster',[event]))[0].status,'attended');
 const job=(await db.query('select public.claim_event_reminder() v')).rows[0].v;assert.equal(job.email,member+'@test.example');
 assert.equal((await db.query('select public.claim_event_reminder() v')).rows[0].v,null,'Lease prevents concurrent duplicate sends');
 await assert.rejects(()=>call(member,'submit_event_survey',[event,true,null,10,'']));
 await call(member,'submit_event_survey',[event,false,null,null,'No pude asistir']);assert.equal((await call(member,'fellowship_gate')).surveys.length,0);
 const stats=await call(admin,'fellowship_analytics',[30]);assert.equal(stats.satisfaction.responses,1);assert.equal(stats.satisfaction.average,null);
 await db.query("insert into auth.identities values($1,'google',$2)",[member,JSON.stringify({sub:'google-member-id'})]);
 await call(admin,'configure_event_meeting',[event,'meet','conferenceRecords/test-session']);
 assert.equal((await db.query("select public.ingest_google_attendance('google-receipt','conferenceRecords/test-session','users/google-member-id') v")).rows[0].v,true);
 assert.equal((await db.query("select public.ingest_google_attendance('anonymous-receipt','conferenceRecords/test-session','') v")).rows[0].v,false);
 await assert.rejects(()=>as(member,'select * from public.attendance_receipts'));
 await assert.rejects(()=>as(member,'select * from public.event_email_deliveries'));
 const month=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Bogota'}).slice(0,7)+'-01';
 for(let i=0;i<55;i++)await db.query("select public.append_activity($1,$2,'content_viewed')",[event,member]);
 const monthly=await call(admin,'admin_member_monthly',[member,month,'webinar','content_viewed',0]);assert.ok(monthly.total>=55);assert.equal(monthly.events.length,50);assert.equal(monthly.days.reduce((n,d)=>n+Number(d.actions),0),monthly.total);assert.ok((await call(admin,'admin_member_monthly',[member,month,'webinar','content_viewed',50])).events.length>0);assert.equal((await call(admin,'admin_member_monthly',[member,month,'resource','',0])).total,0);await assert.rejects(()=>call(member,'admin_member_monthly',[admin,month,'','',0]));
 console.log('Fellowship: location gate, private timeline, view deduplication, confirmation, survey validation, verified attendance, mail lease and permissions passed.');
}finally{await db.close();}
