// Browser + real local PostgreSQL/RLS. Auth and HTTP transport are test adapters;
// this does not claim that hosted Google OAuth or Supabase deployment was tested.
import {serveBuild} from './browser-static.mjs';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.NEXTONE_PLAYWRIGHT?pathToFileURL(process.env.NEXTONE_PLAYWRIGHT).href:'playwright');
const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
for(const filename of (await fs.readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())await db.exec(await fs.readFile(new URL('../supabase/migrations/'+filename,import.meta.url),'utf8'));


const [admin,owner,organizer,maker,peer,author]=[1,2,3,4,5,6].map(i=>`00000000-0000-4000-8000-00000000000${i}`);
const names={[admin]:'Camilo piloto',[owner]:'Sara organizadora',[organizer]:'Sofía organizadora',[maker]:'Maker piloto',[peer]:'Peer piloto',[author]:'Ana autora'};
for(const id of Object.keys(names))await db.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)',[id,id+'@test.example',JSON.stringify({full_name:names[id]})]);
await db.exec("update public.profiles set status='active',onboarding_completed_at=now(),fellowship_location_completed_at=now()");
await db.query("update public.profiles set role='admin' where id=$1",[admin]);await db.query("update public.profiles set role='organizer' where id in ($1,$2)",[owner,organizer]);
await db.query("update public.profiles set access_tier='subscriber' where id=$1",[peer]);
await db.exec("update public.fellowship_settings set started_at=now()-interval '30 days'");
let queue=Promise.resolve();function serialized(work){const result=queue.then(work);queue=result.catch(()=>{});return result;}
async function as(id,sql,args=[]){return serialized(async()=>{await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return (await db.query(sql,args)).rows;}finally{await db.exec('reset role');}});}
const user=id=>({id,aud:'authenticated',role:'authenticated',email:id+'@test.example',app_metadata:{provider:'google',providers:['google']},user_metadata:{full_name:names[id]},created_at:new Date().toISOString()});
const token=id=>[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+86400})).toString('base64url'),'test-only'].join('.');
const browser=await chromium.launch({...(process.env.NEXTONE_BROWSER_CHANNEL==='chromium'?{}:{channel:'chrome'}),headless:true});const errors=[];const calls=[];
async function context(id){const c=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});await c.addInitScript(({id,u,t})=>{localStorage.setItem('sb-nextone-test-auth-token',JSON.stringify({access_token:t,refresh_token:'test-only',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user:u}));},{id,u:user(id),t:token(id)});await c.route('https://nextone-test.supabase.co/**',async route=>{const request=route.request(),url=new URL(request.url());try{let data;if(url.pathname==='/auth/v1/user')data=user(id);else if(url.pathname.startsWith('/rest/v1/rpc/')){const name=url.pathname.split('/').pop(),args=request.postDataJSON()||{};assert.match(name,/^[a-z_][a-z_0-9]*$/);calls.push(name);const keys=Object.keys(args);for(const key of keys)assert.match(key,/^p_[a-z_]+$/);const tableRpc=['content_metrics','admin_export_metrics','content_catalog'].includes(name);const expr='public.'+name+'('+keys.map((key,i)=>key+'=> $'+(i+1)).join(',')+')';const result=await as(id,tableRpc?'select * from '+expr:'select '+expr+' as value',Object.values(args));data=tableRpc?result:result[0]?.value??null;}else if(url.pathname.startsWith('/rest/v1/')){const table=url.pathname.split('/').pop();assert.ok(['profiles','content','feedback','comments','registrations','attempts','invitations','reports','project_roles','project_members','project_tasks','project_messages','content_pages','final_reviews','event_organizers','interaction_progress','name_requests','room_messages','project_reviews','project_evidence','editor_drafts','challenge_rules','challenge_assessments','solution_versions','member_location','community_countries','community_updates'].includes(table));data=await as(id,'select * from public.'+table);for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))data=data.filter(r=>String(r[key])===value.slice(3));if(value==='is.null')data=data.filter(r=>r[key]===null);}const order=url.searchParams.get('order');if(order)data.sort((a,b)=>{for(const spec of order.split(',')){const [key,dir]=spec.split('.');const x=String(a[key]).localeCompare(String(b[key]));if(x)return dir==='desc'?-x:x;}return 0;});const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||200);data=data.slice(offset,offset+limit);if(table==='editor_drafts')data=data[0]||null;if(table==='content_pages'){const contentId=(url.searchParams.get('content_id')||'').replace(/^eq\./,'');data=data.find(r=>r.content_id===contentId)||null;}}else throw new Error('Unexpected endpoint '+url.pathname);await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});}catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message,code:'TEST_ERROR'})});}});await c.route('http://127.0.0.1:4173/api/admin-notifications',async route=>{const r=(await as(id,'select public.admin_email_status() value'))[0].value;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...r,configured:false})});});await serveBuild(c);return c;}
const shots='artifacts/teaser';
try{
 await fs.mkdir(shots,{recursive:true});
 const ev=(title,scope,teaser,startH,endH)=>db.query(`insert into public.content(kind,title,body,owner_id,published,access_scope,teaser,starts_at,ends_at,capacity,topics) values('event',$1,'Sesión práctica para validar ideas con usuarios reales y salir con un plan.',$2,true,$3,$4,now()+make_interval(mins=>$5),now()+make_interval(mins=>$6),40,'{Validación,IA}') returning id`,[title,owner,scope,teaser,Math.round(startH*60),Math.round(endH*60)]).then(r=>r.rows[0].id);
 const workshop=await ev('Taller makers: valida tu MVP','makers',true,48,49.5);
 const desk=await ev('Demo day de la cohorte','community',false,24,26);
 const past=await ev('Meet and greet de noviembre','community',false,-6,-4);
 await db.query('insert into public.event_organizers(event_id,user_id) values($1,$2)',[desk,organizer]);
 for(const [u,confirmed,status] of [[maker,true,'registered'],[peer,false,'registered'],[author,true,'attended'],[admin,false,'cancelled']])await db.query(`insert into public.registrations(content_id,user_id,status,confirmed_at,joined_at) values($1,$2,$3,${confirmed?'now()':'null'},${status==='attended'?'now()':'null'})`,[desk,u,status]);
 await db.query("insert into public.registrations(content_id,user_id,status,confirmed_at) values($1,$2,'registered',now())",[past,maker]);
 // Reto con solución evaluada para probar la privacidad del feedback definitivo.
 const kase=(await db.query("insert into public.content(kind,title,body,owner_id,published,parent_id) values('case','Reto de validación','Describe el reto',$1,true,$2) returning id",[owner,desk])).rows[0].id;
 const solution=(await db.query("insert into public.content(kind,title,body,url,owner_id,published,parent_id) values('solution','Solución de Ana','Mi propuesta','https://demo.example',$1,true,$2) returning id",[author,kase])).rows[0].id;
 await db.query("insert into public.feedback(content_id,user_id,rating) values($1,$2,4)",[solution,maker]);
 await as(owner,"select public.review_challenge_solution($1,$2,$3,$4,$5)",[solution,[4,5,4],'Problema claro y bien investigado.','Falta medir la retención de usuarios.','Aprobada: pasa a la siguiente fase.']).catch(async()=>{await as(owner,"select public.save_final_review($1,4,'Problema claro y bien investigado.','Falta medir la retención de usuarios.','Aprobada: pasa a la siguiente fase.')",[solution]);});

 // Peer: ve el taller de makers bloqueado, sin poder entrar.
 const p=await context(peer),pp=await p.newPage();pp.on('pageerror',e=>errors.push(e.message));
 await pp.goto('http://127.0.0.1:4173/?page=event');const locked=pp.locator('.locked-card',{hasText:'Taller makers: valida tu MVP'});await locked.waitFor();
 assert.equal(await locked.getByRole('button',{name:'Acceso reservado a makers'}).isDisabled(),true);
 await pp.locator('.locked-section').screenshot({path:shots+'/1-bloqueado-peer.png'});

 // Organizadora asignada: panel del organizador con indicadores, filtros y verificación de asistencia.
 const o=await context(organizer),op=await o.newPage();op.on('pageerror',e=>errors.push(e.message));
 await op.goto('http://127.0.0.1:4173/?page=event&content='+desk);const panel=op.locator('.event-desk');await panel.getByText('Inscritos, confirmados y asistentes').waitFor();
 await panel.locator('.desk-person',{hasText:'Maker piloto'}).getByRole('button',{name:'Verificar asistencia'}).click();await panel.getByText('Asistencia de Maker piloto verificada').waitFor();
 assert.equal((await db.query('select status from public.registrations where content_id=$1 and user_id=$2',[desk,maker])).rows[0].status,'attended');
 await panel.getByRole('button',{name:/Asistieron/}).click();assert.equal(await panel.locator('.desk-person').count(),2);await panel.getByRole('button',{name:/^Todos/}).click();
 await panel.screenshot({path:shots+'/2-panel-organizador.png'});
 assert.equal(await panel.getByRole('button',{name:'Asignar al evento'}).count(),0,'solo responsable o administración asignan organizadores');

 // Maker: la encuesta aparece porque confirmó y el evento terminó hace más de 3 horas.
 const m=await context(maker),mp=await m.newPage();mp.on('pageerror',e=>errors.push(e.message));
 await mp.goto('http://127.0.0.1:4173/?page=home');await mp.getByRole('heading',{name:'¿Cómo te fue?'}).waitFor();await mp.getByText('Meet and greet de noviembre').waitFor();
 await mp.getByRole('button',{name:'Sí, asistí'}).click();await mp.screenshot({path:shots+'/3-encuesta.png'});
 await mp.getByRole('button',{name:'5 de 5: Muy útil'}).click();await mp.getByRole('group',{name:'Recomendación de 0 a 10'}).getByRole('button',{name:'9',exact:true}).click();
 await mp.getByLabel('Comentario').fill('Muy buena dinámica');await mp.getByRole('button',{name:'Enviar y continuar'}).click();
 await mp.locator('.survey-flow').waitFor({state:'detached'});
 assert.equal((await db.query('select rating,recommend from public.event_surveys where content_id=$1',[past])).rows[0].recommend,9);
 // Un maker que no es autor ni organizador no ve el feedback definitivo.
 await mp.goto('http://127.0.0.1:4173/?page=solution&content='+solution);await mp.getByRole('heading',{name:'Solución de Ana'}).first().waitFor();await mp.waitForTimeout(800);
 assert.equal(await mp.getByRole('heading',{name:'Feedback definitivo'}).count(),0,'los miembros no ven el feedback definitivo');

 // Autora: ve su feedback definitivo con el nuevo diseño.
 const au=await context(author),ap=await au.newPage();ap.on('pageerror',e=>errors.push(e.message));
 await ap.goto('http://127.0.0.1:4173/?page=solution&content='+solution);const review=ap.locator('.final-review');await review.getByText('Problema claro y bien investigado.').waitFor();
 await review.screenshot({path:shots+'/4-feedback-autora.png'});

 // Administración: selector de acceso con vista previa.
 const a=await context(admin),adp=await a.newPage();adp.on('pageerror',e=>errors.push(e.message));
 await adp.goto('http://127.0.0.1:4173/?page=mentorship');await adp.getByRole('button',{name:'Crear mentoría',exact:true}).click();
 const picker=adp.locator('.access-picker');await picker.locator('select[name=access_scope]').selectOption('peers_teaser');await picker.locator('.access-group.is-see',{hasText:'Makers'}).waitFor();
 await picker.screenshot({path:shots+'/5-selector-acceso.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS navegador 1.9: vista bloqueada para peers, panel del organizador asignado con verificación de asistencia, encuesta por pasos 3 h después, feedback definitivo privado y selector de acceso con vista previa. Capturas en '+shots+'.');
}finally{await browser.close();}
