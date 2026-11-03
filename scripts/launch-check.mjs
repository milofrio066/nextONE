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
 const subscriber='00000000-0000-4000-8000-000000000004',other='00000000-0000-4000-8000-000000000005';
 for(const id of [subscriber,other])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
 await db.query("update public.profiles set status='active',onboarding_completed_at=now(),fellowship_location_completed_at=now() where id in ($1,$2,$3)",[admin,member,subscriber]);
 await db.query("update public.profiles set access_tier='subscriber' where id=$1",[subscriber]);
 assert.equal((await call(member,'launch_config')).payments_enabled,false);
 await assert.rejects(()=>call(pending,'claim_maker_code',['PERSONAL123']));
 await db.exec('update public.launch_settings set registry_enabled=true');
 await db.query('insert into public.maker_registry(email,access_code,referral_code) values($1,$2,$3)',[pending+'@test.example','PERSONAL123','REFERRAL25']);
 assert.equal(await call(subscriber,'check_referral',['REFERRAL25']),'valid');assert.equal(await call(subscriber,'check_referral',['PERSONAL123']),'invalid');

 const applicant='00000000-0000-4000-8000-000000000006';await db.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)',[applicant,'applicant@test.example',JSON.stringify({entry_path:'subscriber',username:'applicant',referral_code:'REFERRAL25',status:'active',role:'admin'})]);
 const ap=(await as(applicant,'select status,role,access_tier from public.profiles where id=$1',[applicant]))[0];assert.deepEqual(ap,{status:'pending',role:'member',access_tier:'subscriber'});assert.equal((await call(applicant,'my_launch_status')).application.stage,'awaiting_selection');
 await assert.rejects(()=>db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',['00000000-0000-4000-8000-000000000007','duplicate@test.example',JSON.stringify({username:'applicant'})]));
 await db.query('update auth.users set email_confirmed_at=null where id=$1',[pending]);await assert.rejects(()=>call(pending,'claim_maker_code',['PERSONAL123']));await db.query('update auth.users set email_confirmed_at=now() where id=$1',[pending]);
 await assert.rejects(()=>call(other,'claim_maker_code',['PERSONAL123']));
 await assert.rejects(()=>call(pending,'claim_maker_code',['REFERRAL25']));
 await call(pending,'claim_maker_code',['PERSONAL123']);await call(pending,'claim_maker_code',['PERSONAL123']);
 assert.equal((await as(pending,'select status from public.profiles where id=$1',[pending]))[0].status,'active');
 await assert.rejects(()=>as(member,'select * from public.maker_registry'));
 await assert.rejects(()=>call(member,'start_maker_lookup',[other,'x','x','x','client']));
 const lookup='00000000-0000-4000-8000-000000000099';
 await db.query('select public.start_maker_lookup($1,$2,$3,$4,$5)',[lookup,pending+'@test.example','key','HASH','client']);
 for(let n=0;n<5;n++)assert.equal((await db.query('select public.verify_maker_lookup($1,$2) v',[lookup,'WRONG'])).rows[0].v,null);
 assert.equal((await db.query('select public.verify_maker_lookup($1,$2) v',[lookup,'HASH'])).rows[0].v,null,'Attempts exhausted remain blocked');
 const good='00000000-0000-4000-8000-000000000098';await db.query('select public.start_maker_lookup($1,$2,$3,$4,$5)',[good,pending+'@test.example','key','HASH','client']);
 assert.equal((await db.query('select public.verify_maker_lookup($1,$2) v',[good,'HASH'])).rows[0].v.access_code,'PERSONAL123');
 assert.equal((await db.query('select public.verify_maker_lookup($1,$2) v',[good,'HASH'])).rows[0].v,null,'Single use OTP');
 const future=new Date(Date.now()+3600000).toISOString(),end=new Date(Date.now()+7200000).toISOString();
 const makerEvent=await call(admin,'save_content',[null,'webinar','Exclusivo makers','No debe filtrarse',null,null,future,end,100,true,'https://meet.google.com/test']);
 const shared=await call(admin,'save_content',[null,'webinar','Compartido comunidad','Descripción compartida',null,null,future,end,100,true,'https://meet.google.com/test']);
 await db.query("update public.content set access_scope='community' where id=$1",[shared]);
 assert.equal(await call(subscriber,'can_read_content',[makerEvent]),false);assert.equal(await call(subscriber,'can_read_content',[shared]),true);
 await assert.rejects(()=>call(subscriber,'register_event',[makerEvent,false]));await call(subscriber,'register_event',[shared,false]);await call(subscriber,'set_feedback',[shared,1,5]);
 assert.equal((await as(subscriber,'select * from public.content where id=$1',[makerEvent])).length,0);
 assert.equal((await call(subscriber,'locked_event_catalog'))[0].title,'Exclusivo makers');

 const page={p_id:null,p_kind:'post',p_title:'Audiencia atómica',p_body:'Datos válidos de publicación.',p_url:null,p_parent:null,p_start:null,p_end:null,p_capacity:null,p_published:true,p_join_url:null,p_template:'blank',p_data:{v:1,accent:'#8896f5',blocks:[{id:'hero-1',type:'hero',props:{title:'Hola'}}]},p_topics:[],p_methodology:'',p_audience:'',p_project_config:null};
 const posted=await call(member,'publish_scoped_content',[page,{path:'',alt:'',position:'center'},null,null,'community']);assert.equal(await call(subscriber,'can_read_content',[posted]),true);
 await assert.rejects(()=>call(subscriber,'publish_scoped_content',[{...page,p_title:'No guardar'}, {path:'',alt:'',position:'center'},null,null,'makers']));
 assert.equal((await db.query("select count(*)::int n from public.content where title='No guardar'")).rows[0].n,0);

 const mentorship=await call(admin,'publish_scoped_content',[{...page,p_kind:'event',p_title:'Mentoría compartida',p_start:future,p_end:end,p_capacity:30},{path:'',alt:'',position:'center'},null,{mentor:admin,modality:'meet'},'community']);
 assert.equal(await call(subscriber,'can_read_content',[mentorship]),true);await call(subscriber,'register_event',[mentorship,false]);
 assert.ok((await call(subscriber,'mentorship_catalog')).some(m=>m.content_id===mentorship));
 await call(admin,'publish_scoped_content',[{...page,p_id:mentorship,p_kind:'event',p_title:'Mentoría compartida',p_start:future,p_end:end,p_capacity:30},{path:'',alt:'',position:'center'},null,{mentor:admin,modality:'meet'},'makers']);
 assert.equal(await call(subscriber,'can_read_content',[mentorship]),false);assert.equal((await call(subscriber,'mentorship_catalog')).some(m=>m.content_id===mentorship),false);
 // No child or grandchild may leak the body of an exclusive hierarchy.
 const child=await call(admin,'save_content',[null,'resource','Material privado','Secreto descendiente',null,makerEvent,null,null,null,true,null]);
 const grandchild=await call(admin,'save_content',[null,'resource','Nieto privado','Otro secreto',null,child,null,null,null,true,null]);
 await db.query("update public.content set access_scope='community' where id in ($1,$2)",[child,grandchild]);assert.equal(await call(subscriber,'can_read_content',[child]),false);assert.equal(await call(subscriber,'can_read_content',[grandchild]),false);
 await db.query("update public.content set published=false where id=$1",[makerEvent]);assert.equal((await call(subscriber,'locked_event_catalog')).some(c=>c.id===makerEvent),false);
 const benefit=await call(admin,'save_sponsor_benefit',[null,'Sponsor real','Créditos reales','Condiciones','https://example.com','SECRET',true,null]);
 assert.equal((await as(subscriber,'select * from public.sponsor_benefits')).length,0);assert.equal((await as(member,'select * from public.sponsor_benefits')).length,1);
 await assert.rejects(()=>call(member,'save_sponsor_benefit',[null,'Fake','Acceso','No','https://example.com','',true,null]));
 await call(admin,'delete_sponsor_benefit',[benefit]);
 await assert.rejects(()=>call(subscriber,'begin_selection'));await assert.rejects(()=>db.exec('update public.launch_settings set payments_enabled=true'));
 await db.exec(await fs.readFile(new URL('../supabase/migrations/023_launch_access.sql',import.meta.url),'utf8'));
 console.log('PASS launch: migration repeat, membership vs referral, verified identity, OTP retry/single use, database RLS, shared registrations/feedback, locked events, sponsor isolation and disabled payments');
}finally{await db.close();}


