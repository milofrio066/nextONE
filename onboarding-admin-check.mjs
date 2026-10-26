import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
for(const f of ['001_pilot.sql','002_hardening.sql','003_projects.sql','004_interactive_pages.sql','005_unified_content.sql','006_makers.sql','007_workspace.sql','008_evidence_storage.sql','009_delete_and_profile_theme.sql','010_profile_appearance.sql','011_challenges_admin_analytics.sql','012_avatar_studio.sql','013_admin_operations_geography.sql','014_admin_email_outbox.sql','015_builder_case.sql','016_avatar_wardrobe.sql','017_covers_and_community_sync.sql'])await db.exec(await fs.readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));


const [admin,legacy,pending,unverified]=[1,2,3,4].map(i=>`00000000-0000-4000-8000-00000000000${i}`);
for(const id of [admin,legacy,pending,unverified])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[id,id+'@test.example',id===unverified?null:new Date()]);
await db.query("update public.profiles set status='active' where id in ($1,$2)",[admin,legacy]);await db.query("update public.profiles set role='admin' where id=$1",[admin]);
const migration=await fs.readFile(new URL('../supabase/migrations/018_onboarding_and_member_decisions.sql',import.meta.url),'utf8');await db.exec(migration);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
async function call(id,name,args=[]){return(await as(id,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args))[0]?.value;}
const theme={template:'neon',accent:'#00e5ff',font:'modern',titleStyle:'outline',background:'#05060d',sections:{},links:[],avatar:{skin:'#cf9569',hairColor:'#262033',shirtColor:'#8b5cf6',hair:'undercut',outfit:'blazer',accessory:'none',expression:'smile',motion:'walk'}};
const profile={name:'Nueva persona',nickname:'Maker 🚀',bio:'Aprendo creando proyectos y comparto ideas con la comunidad.',skills:'Diseño y desarrollo web',interests:['Tecnología']};
const before={status:'pending',role:'member',cohort:''};
try{
 assert.equal(await call(admin,'is_admin'),true);assert.equal(await call(legacy,'active_member'),true);assert.equal(await call(pending,'active_member'),false);
 for(const who of [pending,unverified])for(const [name,args] of [['save_profile',['Nombre','Información','Habilidades']],['save_makers_profile',[['IA']]],['save_identity',['Nombre','Maker','Presentación','Diseño',[]]],['save_member_location',['CO','Antioquia','Medellín']],['complete_onboarding',[profile,theme,null]]])await assert.rejects(()=>call(who,name,args));
 const content=await call(admin,'save_content',[null,'post','Contenido privado de comunidad','Descripción válida',null,null,null,null,null,true,null]);
 await call(admin,'admin_member',[pending,'pending','member','Una justificación anterior que ya estaba guardada.']);
 assert.ok((await call(admin,'admin_member_history',[pending])).some(e=>e.legacy&&e.reason.includes('anterior')));
 await assert.rejects(()=>call(legacy,'admin_update_member',[pending,'active','member','','No corresponde',before]));
 await assert.rejects(()=>call(admin,'admin_update_member',[unverified,'active','member','','Correo aún sin confirmar.',before]));
 await assert.rejects(()=>call(admin,'admin_update_member',[pending,'active','member','','corto',before]));
 await call(admin,'admin_update_member',[pending,'active','member','Makers 2026','Correo confirmado y solicitud revisada por el equipo.',before]);
 assert.equal((await as(admin,'select onboarding_completed_at from public.profiles where id=$1',[pending]))[0].onboarding_completed_at,null);
 // Re-applying the migration must NOT grandfather an approved but unfinished account.
 await db.exec(migration);assert.equal((await as(admin,'select onboarding_completed_at from public.profiles where id=$1',[pending]))[0].onboarding_completed_at,null);
 assert.equal(await call(pending,'active_member'),false);assert.equal((await as(pending,'select * from public.content')).length,0);assert.equal((await as(pending,'select * from public.profiles')).length,1);assert.ok(!(await as(legacy,'select id from public.profiles')).some(p=>p.id===pending));
 await assert.rejects(()=>call(pending,'save_profile',['Nombre','Perfil antes de entrar','Habilidades']));
 await assert.rejects(()=>call(admin,'admin_update_member',[pending,'suspended','member','','Otro cambio con una copia antigua.',before]));
 assert.equal((await as(admin,'select status from public.profiles where id=$1',[pending]))[0].status,'active');
 await assert.rejects(()=>call(pending,'complete_onboarding',[{...profile,bio:'Breve'},theme,null]));
 await assert.rejects(()=>call(pending,'complete_onboarding',[profile,{...theme,accent:'red'},null]));
 assert.equal((await as(admin,'select onboarding_completed_at from public.profiles where id=$1',[pending]))[0].onboarding_completed_at,null,'Partial save rolls back');
 await call(pending,'complete_onboarding',[profile,theme,{country:'CO',region:'Antioquia',city:'Medellín'}]);
 assert.equal(await call(pending,'active_member'),true);assert.equal((await as(pending,'select id from public.content where id=$1',[content])).length,1);
 const saved=(await as(pending,'select * from public.profiles where id=$1',[pending]))[0];assert.equal(saved.nickname,profile.nickname);assert.equal(saved.theme.avatar.hair,'undercut');assert.equal(saved.theme.avatar.motion,'walk');assert.equal((await as(pending,'select city from public.member_location'))[0].city,'Medellín');
 await call(pending,'complete_onboarding',[{...profile,bio:'No debe sobrescribir un onboarding completado.'},theme,null]);assert.equal((await as(pending,'select bio from public.profiles where id=$1',[pending]))[0].bio,profile.bio);
 const history=await call(admin,'admin_member_history',[pending]);assert.ok(history.some(h=>h.before_values?.status==='pending'&&h.after_values?.cohort==='Makers 2026'&&h.reason.includes('Correo confirmado')));assert.equal(history.filter(h=>!h.legacy).length,1,'No duplicate notes for same transaction');
 await assert.rejects(()=>call(pending,'admin_member_history',[pending]));assert.equal((await as(pending,'select * from public.member_decisions')).length,0);
 await assert.rejects(()=>call(admin,'admin_update_member',[admin,'suspended','member','','No puede quitarse acceso a sí mismo.',{status:'active',role:'admin',cohort:''}]));assert.equal(await call(admin,'is_admin'),true);
 console.log('PASS onboarding/admin: existing accounts preserved, pending edits blocked, approved accounts gated by RLS, complete profile/avatar/location saved atomically, duplicate submission safe, reason history private, legacy notes visible, stale decisions rejected, verified email and self-admin protection. Migration safely reapplied.');
}finally{await db.close();}
