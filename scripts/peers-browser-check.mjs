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

const [admin,maker,peer,peer2]=[1,2,3,4].map(i=>`00000000-0000-4000-8000-00000000000${i}`);
const names={[admin]:'Camilo piloto',[maker]:'Maker piloto',[peer]:'Peer piloto',[peer2]:'Lucía peer'};
for(const id of [admin,maker,peer,peer2])await db.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)',[id,id+'@test.example',JSON.stringify({full_name:names[id]})]);
await db.exec("update public.profiles set status='active',onboarding_completed_at=now(),fellowship_location_completed_at=now()");
await db.query("update public.profiles set role='admin' where id=$1",[admin]);await db.query("update public.profiles set access_tier='subscriber' where id in ($1,$2)",[peer,peer2]);
let queue=Promise.resolve();function serialized(work){const result=queue.then(work);queue=result.catch(()=>{});return result;}
async function as(id,sql,args=[]){return serialized(async()=>{await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return (await db.query(sql,args)).rows;}finally{await db.exec('reset role');}});}
const user=id=>({id,aud:'authenticated',role:'authenticated',email:id+'@test.example',app_metadata:{provider:'google',providers:['google']},user_metadata:{full_name:names[id]},created_at:new Date().toISOString()});
const token=id=>[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+86400})).toString('base64url'),'test-only'].join('.');
const browser=await chromium.launch({...(process.env.NEXTONE_BROWSER_CHANNEL==='chromium'?{}:{channel:'chrome'}),headless:true});const errors=[];const calls=[];
async function context(id){const c=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});await c.addInitScript(({id,u,t})=>{localStorage.setItem('sb-nextone-test-auth-token',JSON.stringify({access_token:t,refresh_token:'test-only',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user:u}));},{id,u:user(id),t:token(id)});await c.route('https://nextone-test.supabase.co/**',async route=>{const request=route.request(),url=new URL(request.url());try{let data;if(url.pathname==='/auth/v1/user')data=user(id);else if(url.pathname.startsWith('/rest/v1/rpc/')){const name=url.pathname.split('/').pop(),args=request.postDataJSON()||{};assert.match(name,/^[a-z_][a-z_0-9]*$/);calls.push(name);const keys=Object.keys(args);for(const key of keys)assert.match(key,/^p_[a-z_]+$/);const tableRpc=['content_metrics','admin_export_metrics','content_catalog'].includes(name);const expr='public.'+name+'('+keys.map((key,i)=>key+'=> $'+(i+1)).join(',')+')';const result=await as(id,tableRpc?'select * from '+expr:'select '+expr+' as value',Object.values(args));data=tableRpc?result:result[0]?.value??null;}else if(url.pathname.startsWith('/rest/v1/')){const table=url.pathname.split('/').pop();assert.ok(['profiles','content','feedback','comments','registrations','attempts','invitations','reports','project_roles','project_members','project_tasks','project_messages','content_pages','final_reviews','event_organizers','interaction_progress','name_requests','room_messages','project_reviews','project_evidence','editor_drafts','challenge_rules','challenge_assessments','solution_versions','member_location','community_countries','community_updates'].includes(table));data=await as(id,'select * from public.'+table);for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))data=data.filter(r=>String(r[key])===value.slice(3));if(value==='is.null')data=data.filter(r=>r[key]===null);}const order=url.searchParams.get('order');if(order)data.sort((a,b)=>{for(const spec of order.split(',')){const [key,dir]=spec.split('.');const x=String(a[key]).localeCompare(String(b[key]));if(x)return dir==='desc'?-x:x;}return 0;});const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||200);data=data.slice(offset,offset+limit);if(table==='editor_drafts')data=data[0]||null;if(table==='content_pages'){const contentId=(url.searchParams.get('content_id')||'').replace(/^eq\./,'');data=data.find(r=>r.content_id===contentId)||null;}}else throw new Error('Unexpected endpoint '+url.pathname);await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});}catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message,code:'TEST_ERROR'})});}});await c.route('http://127.0.0.1:4173/api/admin-notifications',async route=>{const r=(await as(id,'select public.admin_email_status() value'))[0].value;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...r,configured:false})});});await serveBuild(c);return c;}
const shots='artifacts/peers';
try{
 await fs.mkdir(shots,{recursive:true});
 // Datos sembrados: contenido por audiencia, un evento para peers, respuestas de seguimiento y una encuesta.
 const ins=(title,scope,kind='resource',dated=false)=>db.query(`insert into public.content(kind,title,body,owner_id,published,access_scope,starts_at,ends_at,capacity) values($1,$2,'Contenido sembrado para la prueba.',$3,true,$4,${dated?"now()+interval '2 day',now()+interval '2 day 1 hour',30":'null,null,null'}) returning id`,[kind,title,admin,scope]).then(r=>r.rows[0].id);
 await ins('Guía solo makers','makers');await ins('Guía solo peers','peers');await ins('Guía compartida','community');
 const peerEvent=await ins('Meet and greet de peers','peers','event',true);
 const intents=[[maker,['empleo','networking'],['buscar_empleo'],['taller'],['tarde'],'explorando'],[peer,['emprender','aprender_ia'],['validar_idea','tiempo'],['mentoria_grupal','reto'],['noche'],'idea'],[peer2,['emprender'],['validar_idea'],['mentoria_grupal'],['noche','fin_de_semana'],'construyendo']];
 for(const [id,g,c,f,av,st] of intents)await as(id,'select public.save_member_intent($1)',[JSON.stringify({goals:g,challenges:c,formats:f,availability:av,stage:st})]);
 await as(admin,'select public.save_poll(null,$1)',[JSON.stringify({title:'¿Qué formato prefieres para diciembre?',description:'Ayúdanos a planear el primer mes de Peers Community Pass.',audience:'community',status:'open',anonymous:true,show_results:true,questions:[{id:'formato',type:'single',prompt:'Formato favorito',options:['Taller práctico','Webinar','Reto o hackatón'],required:true},{id:'utilidad',type:'scale',prompt:'¿Qué tan útil te parece la comunidad hasta ahora?',required:true},{id:'idea',type:'text',prompt:'¿Qué propones?',required:false}]})]);
 const pollId=(await db.query('select id from public.community_polls')).rows[0].id;
 await as(maker,'select public.answer_poll($1,$2)',[pollId,JSON.stringify({formato:'Webinar',utilidad:4})]);

 // Peer: ve contenido de peers y compartido, nunca el de makers.
 const p=await context(peer),pp=await p.newPage();pp.on('pageerror',e=>errors.push(e.message));
 await pp.goto('http://127.0.0.1:4173/?page=resource');await pp.getByText('Guía solo peers').first().waitFor();
 assert.equal(await pp.getByText('Guía solo makers').count(),0,'un peer no ve contenido solo de makers');
 // Comunidad: encuesta para responder y ver resultados.
 await pp.goto('http://127.0.0.1:4173/?page=post');await pp.getByRole('button',{name:'Encuestas'}).click();
 await pp.getByRole('heading',{name:'¿Qué formato prefieres para diciembre?'}).waitFor();
 await pp.getByText('Reto o hackatón').click();await pp.locator('.poll-scale-step').nth(4).click();await pp.getByRole('button',{name:'Enviar respuestas'}).click();
 await pp.getByRole('button',{name:'Ver resultados'}).click();await pp.locator('.poll-results .viz-bars').first().waitFor();
 await pp.screenshot({path:shots+'/1-encuesta-peer.png',fullPage:true});
 assert.equal((await db.query('select count(*)::int n from public.poll_responses')).rows[0].n,2);
 // Inscripción: los enlaces de calendario aparecen destacados al inscribirse.
 await pp.goto('http://127.0.0.1:4173/?page=event&content='+peerEvent);await pp.getByRole('button',{name:'Inscribirme'}).click();
 const cal=pp.getByRole('group',{name:'Añadir a mi calendario'});await cal.getByText('¡Listo! Guárdalo en tu calendario').waitFor();
 const google=await cal.getByRole('link',{name:'Google Calendar'}).getAttribute('href');assert.match(google,/^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
 await cal.scrollIntoViewIfNeeded();await pp.screenshot({path:shots+'/2-calendario.png'});
 // Perfil: estudio del avatar con estilos diversos y guardado v4.
 await pp.goto('http://127.0.0.1:4173/?page=profile');await pp.getByRole('button',{name:'Aplicar estilo Fundadora · hiyab'}).click();
 await pp.getByRole('tab',{name:'Rostro'}).click();await pp.getByRole('button',{name:'Ébano',exact:true}).click();
 await pp.locator('.avatar-studio').scrollIntoViewIfNeeded();await pp.locator('.avatar-studio').screenshot({path:shots+'/3-avatar.png'});
 await pp.getByRole('button',{name:'Guardar portafolio y avatar'}).click();await pp.getByText('Portafolio, redes y avatar actualizados').waitFor();
 const saved=(await db.query('select theme->$2 a from public.profiles where id=$1',[peer,'avatar'])).rows[0].a;assert.equal(saved.gear,'hijab');assert.equal(saved.skin,'#5c3620');

 // Maker: no ve lo de peers; el cuestionario aparece si aún no respondió.
 await db.query('delete from public.member_intents where user_id=$1',[maker]);
 const m=await context(maker),mp=await m.newPage();mp.on('pageerror',e=>errors.push(e.message));
 await mp.goto('http://127.0.0.1:4173/?page=resource');await mp.getByText('Guía solo makers').first().waitFor();assert.equal(await mp.getByText('Guía solo peers').count(),0,'un maker no ve contenido solo de peers');
 await mp.goto('http://127.0.0.1:4173/?page=post');await mp.getByRole('heading',{name:'Cuéntanos en un minuto qué necesitas'}).waitFor();
 await mp.getByRole('button',{name:'Conseguir empleo'}).click();await mp.getByRole('button',{name:'Búsqueda de empleo'}).click();await mp.getByRole('button',{name:'Guardar mis respuestas'}).click();
 await mp.getByText('¡Gracias! Usaremos tus respuestas').waitFor();
 await mp.locator('.intent-card').screenshot({path:shots+'/7-que-buscas.png'});

 // Administración: indicadores visuales y segmentos.
 const a=await context(admin),ap=await a.newPage();ap.on('pageerror',e=>errors.push(e.message));
 await ap.goto('http://127.0.0.1:4173/?page=metrics');await ap.locator('.viz-kpi').first().waitFor();await ap.getByText('Qué busca la comunidad').waitFor();
 await ap.screenshot({path:shots+'/4-indicadores.png',fullPage:true});
 await ap.locator('#mx-segmentos').scrollIntoViewIfNeeded();await ap.locator('#mx-segmentos').screenshot({path:shots+'/5-segmentos.png'});
 await ap.locator('#mx-segmentos').getByRole('button',{name:/Asignar segmento «Grupo 1»/}).click();await ap.locator('#mx-segmentos').getByText(/quedaron en «Grupo 1/).waitFor();
 assert.ok((await db.query("select count(*)::int n from public.member_intents where segment like 'Grupo 1%'")).rows[0].n>=2,'el grupo sugerido queda segmentado');
 await ap.evaluate(()=>{document.documentElement.dataset.theme='light';});await ap.locator('.viz-kpis').first().screenshot({path:shots+'/6-kpis-claro.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS navegador peers 1.8: audiencias makers/peers en la interfaz, encuesta respondida con resultados, calendario al inscribirse, avatar v4 guardado, cuestionario «¿Qué buscas?», indicadores visuales y segmentos. Capturas en '+shots+'.');
}finally{await browser.close();}
