import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
// 024: audiencias makers / peers / makers + peers, seguimiento de intereses con segmentos, encuestas y avatar v4.
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create table auth.identities(user_id uuid,provider text,identity_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select 'authenticated'$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;do $$begin create publication supabase_realtime;exception when others then null;end$$;`);
const dir=new URL('../supabase/migrations/',import.meta.url),files=(await fs.readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
for(const f of files)await db.exec(await fs.readFile(new URL(f,dir),'utf8'));
// Repetible: aplicar 024 otra vez no falla ni borra datos.
const m024=await fs.readFile(new URL('024_peers_segments_polls.sql',dir),'utf8');
const [admin,mentor,maker,peer,peer2,organizer]=[1,2,3,4,5,6].map(i=>`00000000-0000-4000-8000-00000000000${i}`);
for(const id of [admin,mentor,maker,peer,peer2,organizer])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.exec("update public.profiles set status='active',onboarding_completed_at=now(),fellowship_location_completed_at=now()");
await db.query("update public.profiles set role='admin' where id=$1",[admin]);await db.query("update public.profiles set role='mentor' where id=$1",[mentor]);await db.query("update public.profiles set role='organizer' where id=$1",[organizer]);
await db.query("update public.profiles set access_tier='subscriber' where id in ($1,$2)",[peer,peer2]);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
const one=async(id,sql,args)=>Object.values((await as(id,sql,args))[0])[0];
const denied=(id,sql,args,pattern)=>assert.rejects(()=>as(id,sql,args),pattern);
const page={v:1,blocks:[{id:'a',type:'callout',props:{tone:'info',title:'Aviso',body:'Texto'}}]};
const content=(kind,title,extra={})=>JSON.stringify({p_id:null,p_kind:kind,p_title:title,p_body:'Contenido de prueba con contexto',p_url:null,p_parent:null,p_start:null,p_end:null,p_capacity:null,p_published:true,p_join_url:null,p_template:'blank',p_data:page,p_topics:[],p_methodology:'',p_audience:'',...extra});
const cover=JSON.stringify({path:'',alt:'',position:'center'});
const publish=(user,kind,title,scope,extra)=>one(user,'select public.publish_scoped_content($1,$2,null,null,$3)',[content(kind,title,extra),cover,scope]);
const titles=async id=>(await as(id,"select title from public.content where kind='resource' order by title")).map(r=>r.title);

// 1 · Tres audiencias
const onlyMakers=await publish(admin,'resource','A solo makers','makers'),onlyPeers=await publish(admin,'resource','B solo peers','peers'),both=await publish(admin,'resource','C makers y peers','community');
await denied(admin,'select public.publish_scoped_content($1,$2,null,null,$3)',[content('resource','Mala'),cover,'todos'],/Audiencia no válida/);
assert.deepEqual(await titles(maker),['A solo makers','C makers y peers']);
assert.deepEqual(await titles(peer),['B solo peers','C makers y peers']);
assert.deepEqual(await titles(mentor),['A solo makers','B solo peers','C makers y peers'],'el equipo ve todas las audiencias');
assert.deepEqual(await titles(admin),['A solo makers','B solo peers','C makers y peers']);
await denied(maker,"select public.add_comment($1,'hola')",[onlyPeers],/./);
await denied(peer,"select public.add_comment($1,'hola')",[onlyMakers],/./);
await as(peer,"select public.add_comment($1,'hola peers')",[onlyPeers]);
await as(maker,"select public.add_comment($1,'hola todos')",[both]);
// Los materiales heredan la audiencia más restrictiva de su contenedor.
await db.query("insert into public.content(kind,title,body,owner_id,parent_id,published,access_scope) values('resource','D anexo peers','x',$1,$2,true,'community')",[admin,onlyPeers]);
assert.equal((await titles(maker)).includes('D anexo peers'),false);
assert.equal((await titles(peer)).includes('D anexo peers'),true);
// Publicaciones de miembros: cada nivel elige su audiencia o toda la comunidad.
await publish(peer,'post','Pregunta de un peer','peers');
await denied(peer,'select public.publish_scoped_content($1,$2,null,null,$3)',[content('post','Peer a makers'),cover,'makers'],/peers o toda la comunidad/);
await denied(maker,'select public.publish_scoped_content($1,$2,null,null,$3)',[content('post','Maker a peers'),cover,'peers'],/makers o toda la comunidad/);
assert.equal((await as(maker,"select 1 from public.content where title='Pregunta de un peer'")).length,0);
// Mentoría solo para peers: el mentor (maker) asignado la ve; otro maker no.
const start=new Date(Date.now()+864e5).toISOString(),end=new Date(Date.now()+900e5).toISOString();
const peersSession=await one(admin,'select public.publish_scoped_content($1,$2,null,$3,$4)',[content('event','Mentoría peers',{p_start:start,p_end:end,p_capacity:10,p_join_url:'https://zoom.us/j/9'}),cover,JSON.stringify({mentor:maker,modality:'meet'}),'peers']);
assert.equal((await db.query('select audience from public.mentorship_sessions where content_id=$1',[peersSession])).rows[0].audience,'peers');
assert.ok((await as(maker,'select 1 from public.content where id=$1',[peersSession])).length,'el mentor asignado ve su sesión');
const otherMaker=(await db.query("insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000009','x@test.example',now()) returning id")).rows[0].id;
await db.query("update public.profiles set status='active',onboarding_completed_at=now(),fellowship_location_completed_at=now() where id=$1",[otherMaker]);
assert.equal((await as(otherMaker,'select 1 from public.content where id=$1',[peersSession])).length,0);
await as(peer,'select public.register_event($1,false)',[peersSession]);
await denied(otherMaker,'select public.register_event($1,false)',[peersSession],/no disponible/);
assert.deepEqual((await one(peer,'select public.mentorship_catalog()')).map(r=>r.audience),['peers']);

// 2 · Seguimiento y segmentos
await as(peer,'select public.save_member_intent($1)',[JSON.stringify({goals:['emprender','networking'],challenges:['validar_idea'],formats:['mentoria_grupal'],availability:['noche'],stage:'idea',note:'Quiero validar una app'})]);
await as(maker,'select public.save_member_intent($1)',[JSON.stringify({goals:['empleo'],challenges:['buscar_empleo'],formats:['taller'],availability:['tarde'],stage:'explorando'})]);
await denied(peer,'select public.save_member_intent($1)',[JSON.stringify({goals:['volar']})],/opciones de la lista/);
await denied(peer,'select public.save_member_intent($1)',[JSON.stringify({goals:[]})],/al menos un objetivo/);
await denied(peer,'select public.save_member_intent($1)',[JSON.stringify({goals:['empleo','emprender','freelance','networking','ingles']})],/opciones de la lista/);
assert.deepEqual((await one(peer,'select public.my_member_intent()')).goals,['emprender','networking']);
assert.equal((await as(peer,'select user_id from public.member_intents')).length,1,'cada persona ve solo lo suyo');
await denied(peer,"update public.member_intents set segment='x'",[],/permission denied/);
await denied(maker,'select public.admin_member_intents()',[],/Solo administración/);
await denied(maker,'select public.set_member_segment($1,$2)',[[peer],'Emprendedores'],/Solo administración/);
assert.equal(await one(admin,'select public.set_member_segment($1,$2)',[[peer,peer2],'Emprendedores']),2);
const overview=await one(admin,'select public.admin_member_intents()');
assert.equal(overview.find(r=>r.user_id===peer).segment,'Emprendedores');
assert.equal(overview.find(r=>r.user_id===peer2).goals.length,0,'quien no respondió aparece sin respuestas');
assert.equal((await one(peer,'select public.my_member_intent()')).segment_by,undefined,'no revela quién asignó el segmento');

// 3 · Encuestas
const poll={title:'¿Qué formato prefieres?',description:'Ayúdanos a planear noviembre',audience:'peers',status:'open',anonymous:true,show_results:true,questions:[
 {id:'formato',type:'single',prompt:'Formato favorito',options:['Taller','Webinar','Reto'],required:true},
 {id:'temas',type:'multiple',prompt:'Temas de interés',options:['IA','Datos','Producto'],required:false},
 {id:'nps',type:'scale',prompt:'¿Qué tan útil es la comunidad?',required:true},
 {id:'idea',type:'text',prompt:'¿Qué propones?',required:false}]};
await denied(maker,'select public.save_poll(null,$1)',[JSON.stringify(poll)],/Solo administración u organización/);
await denied(mentor,'select public.save_poll(null,$1)',[JSON.stringify(poll)],/Solo administración u organización/);
await denied(admin,'select public.save_poll(null,$1)',[JSON.stringify({...poll,questions:[{id:'a',type:'single',prompt:'Una opción',options:['Solo']}]})],/entre 2 y 10/);
await denied(admin,'select public.save_poll(null,$1)',[JSON.stringify({...poll,questions:[{id:'a',type:'raro',prompt:'Tipo raro'}]})],/Tipo de pregunta/);
const pollId=await one(organizer,'select public.save_poll(null,$1)',[JSON.stringify(poll)]);
const draft=await one(admin,'select public.save_poll(null,$1)',[JSON.stringify({...poll,title:'Borrador',status:'draft'})]);
assert.deepEqual((await one(maker,'select public.poll_feed()')).map(p=>p.id),[],'makers no ven una encuesta solo para peers');
assert.deepEqual((await one(peer,'select public.poll_feed()')).map(p=>p.id),[pollId],'los borradores no se publican');
assert.equal((await one(peer,'select public.poll_feed()'))[0].results,null,'sin resultados antes de responder');
await denied(maker,'select public.answer_poll($1,$2)',[pollId,JSON.stringify({formato:'Taller',nps:4})],/no disponible/);
await denied(peer,'select public.answer_poll($1,$2)',[draft,JSON.stringify({formato:'Taller',nps:4})],/no disponible/);
await denied(peer,'select public.answer_poll($1,$2)',[pollId,JSON.stringify({nps:4})],/Responde: Formato favorito/);
await denied(peer,'select public.answer_poll($1,$2)',[pollId,JSON.stringify({formato:'Otro',nps:4})],/Opción no válida/);
await denied(peer,'select public.answer_poll($1,$2)',[pollId,JSON.stringify({formato:'Taller',nps:9})],/de 1 a 5/);
await as(peer,'select public.answer_poll($1,$2)',[pollId,JSON.stringify({formato:'Taller',temas:['IA','Datos'],nps:5,idea:'  Un hackatón  ',extra:'ignorado'})]);
await denied(peer,'select public.answer_poll($1,$2)',[pollId,JSON.stringify({formato:'Reto',nps:3})],/Ya respondiste/);
await as(peer2,'select public.answer_poll($1,$2)',[pollId,JSON.stringify({formato:'Reto',temas:['IA'],nps:3})]);
const seen=(await one(peer,'select public.poll_feed()'))[0];
assert.equal(seen.answered,true);assert.equal(seen.results.responses,2);
assert.deepEqual(seen.results.questions[0].counts,[1,0,1]);assert.deepEqual(seen.results.questions[1].counts,[2,1,0]);
assert.equal(Number(seen.results.questions[2].average),4);assert.deepEqual(seen.results.questions[2].counts,[0,0,1,0,1]);
assert.deepEqual(seen.results.questions[3].texts,[],'los textos abiertos no llegan a otros miembros');
const managed=(await one(admin,'select public.poll_feed()')).find(p=>p.id===pollId);
assert.deepEqual(managed.results.questions[3].texts,['Un hackatón']);
assert.equal(JSON.stringify(managed).includes(peer),false,'resultados sin identidades');
await denied(peer,'select * from public.poll_responses',[],/permission denied/);
await denied(admin,'select public.save_poll($1,$2)',[pollId,JSON.stringify({...poll,questions:poll.questions.slice(0,2)})],/ya tiene respuestas/);
await as(admin,'select public.save_poll($1,$2)',[pollId,JSON.stringify({...poll,status:'closed'})]);
await denied(peer2,'select public.answer_poll($1,$2)',[pollId,JSON.stringify({formato:'Reto',nps:3})],/./);
// Segmento: solo quien tiene ese segmento la ve.
const segmented=await one(admin,'select public.save_poll(null,$1)',[JSON.stringify({...poll,title:'Solo emprendedores',audience:'community',segment:'Emprendedores'})]);
assert.ok((await one(peer,'select public.poll_feed()')).some(p=>p.id===segmented));
assert.equal((await one(maker,'select public.poll_feed()')).some(p=>p.id===segmented),false);
await as(admin,'select public.delete_poll($1)',[draft]);

// 4 · Avatar v4
const theme=avatar=>JSON.stringify({template:'neon',accent:'#00e5ff',links:[],font:'modern',titleStyle:'outline',background:'#05060d',sections:{},avatar:{skin:'#8d5524',hairColor:'#1b1b1b',shirtColor:'#8896f5',eyeColor:'#3b2a25',bottomColor:'#334155',shoesColor:'#f3f4ff',hair:'locs',outfit:'blouse',accessory:'none',expression:'smile',motion:'float',presentation:'feminine',face:'heart',body:'curvy',facialHair:'none',gesture:'idle',mood:'smile',gear:'hijab',bottom:'skirt',shoes:'flats',makeup:'full',marks:'freckles',lipColor:'#A33B5B',...avatar}});
await as(peer,'select public.save_profile_avatar_v4($1)',[theme({})]);
const saved=(await db.query('select theme->$2 a from public.profiles where id=$1',[peer,'avatar'])).rows[0].a;
assert.deepEqual([saved.hair,saved.outfit,saved.gear,saved.face,saved.body,saved.makeup,saved.marks,saved.lipColor],['locs','blouse','hijab','heart','curvy','full','freckles','#a33b5b']);
await denied(peer,'select public.save_profile_avatar_v4($1)',[theme({gear:'casco'})],/Avatar no válido/);
await denied(peer,'select public.save_profile_avatar_v4($1)',[theme({lipColor:'red'})],/Avatar no válido/);
await as(peer,'select public.save_profile_avatar_v3($1)',[theme({hair:'long',outfit:'tee',gear:'none',face:'oval',body:'soft'})]);

await db.exec(m024);
assert.equal((await db.query('select count(*)::int n from public.poll_responses')).rows[0].n,2,'024 se puede repetir sin perder respuestas');
assert.deepEqual(await titles(peer),['B solo peers','C makers y peers','D anexo peers']);
// Reversión: vuelve a la 1.7 sin dejar contenido peers visible para quien no debe y se puede reaplicar 024.
await db.exec(await fs.readFile(new URL('../supabase/rollback/024_revert.sql',import.meta.url),'utf8'));
assert.deepEqual(await titles(peer),['C makers y peers']);
assert.equal((await db.query("select to_regclass('public.community_polls') t")).rows[0].t,null);
await db.exec(m024);
console.log('PASS peers 1.8:audiencias makers/peers/ambos en lectura, comentarios, materiales y mentorías; seguimiento con segmentos; encuestas con validación, audiencia, segmento y resultados sin identidades; avatar v4; migración repetible.');
