import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
for (const f of ['001_pilot.sql', '002_hardening.sql', '003_projects.sql', '004_interactive_pages.sql', '005_unified_content.sql']) await db.exec(await fs.readFile(new URL('../supabase/migrations/' + f, import.meta.url), 'utf8'));
const admin = '00000000-0000-4000-8000-000000000001', alice = '00000000-0000-4000-8000-000000000002', bob = '00000000-0000-4000-8000-000000000003';
for (const id of [admin, alice, bob]) await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, id + '@test.example']);
await db.exec("update public.profiles set status='active'");
await db.query("update public.profiles set role='admin' where id=$1", [admin]);
async function as(id, sql, args = []) { await db.query("select set_config('test.uid',$1,false)", [id]); await db.exec('set role authenticated'); try { return (await db.query(sql, args)).rows; } finally { await db.exec('reset role'); } }
async function call(id, name, args = []) { return (await as(id, `select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as value`, args))[0]?.value; }
const page = { v: 1, accent: '#22d3ee', blocks: [{ id: 'a1', type: 'hero', props: { title: 'Hola' } }] };
try {
  const post = await call(alice, 'save_content', [null, 'post', 'Mi publicación', 'Contenido', null, null, null, null, null, true, null]);
  const draft = await call(alice, 'save_content', [null, 'post', 'Borrador', 'Contenido', null, null, null, null, null, false, null]);
  await call(alice, 'save_content_page', [post, 'post-anuncio', page]);
  await call(alice, 'save_content_page', [post, 'post-reto', { ...page, accent: '#8b5cf6' }]);
  assert.equal((await as(bob, 'select * from public.content_pages where content_id=$1', [post])).length, 1, 'otro miembro activo lee páginas publicadas');
  assert.equal((await as(alice, 'select template_id from public.content_pages'))[0].template_id, 'post-reto', 'guardar de nuevo reemplaza, no duplica');
  await assert.rejects(() => call(bob, 'save_content_page', [post, 'post-anuncio', page]), /Solo el responsable/);
  await assert.rejects(() => call(bob, 'delete_content_page', [post]), /Solo el responsable/);
  await assert.rejects(() => as(alice, "insert into public.content_pages(content_id,template_id,data) values($1,'x',$2)", [post, page]), /permission denied/);
  await call(alice, 'save_content_page', [draft, 'post-anuncio', page]);
  assert.equal((await as(bob, 'select * from public.content_pages where content_id=$1', [draft])).length, 0, 'un borrador ajeno no se lee');
  await assert.rejects(() => call(alice, 'save_content_page', [post, 'MAL ID!', page]), /check/i);
  await assert.rejects(() => call(alice, 'save_content_page', [post, 'ok', { v: 1, blocks: [] }]), /check/i);
  await assert.rejects(() => call(alice, 'save_content_page', [post, 'ok', { v: 1, blocks: Array.from({ length: 41 }, (_, i) => ({ id: 'b' + i, type: 'hero', props: {} })) }]), /check/i);
  await assert.rejects(() => call(alice, 'save_content_page', [post, 'ok', { v: 1, blocks: [{ id: 'x', type: 'hero', props: { t: 'x'.repeat(61000) } }] }]), /check/i);
  await assert.rejects(() => call(alice, 'save_content_page', [post, 'ok', { v: 1 }]), /check/i);
  await call(admin, 'save_content_page', [post, 'post-historia', page]);
  assert.equal((await as(admin, 'select template_id from public.content_pages where content_id=$1', [post]))[0].template_id, 'post-historia', 'administración puede editar');
  await call(alice, 'delete_content_page', [post]);
  assert.equal((await as(alice, 'select * from public.content_pages where content_id=$1', [post])).length, 0);
  assert.ok((await db.query("select count(*)::int c from public.audit_log where action in ('save_content_page','delete_content_page')")).rows[0].c >= 4, 'queda auditoría');

  const organizer='00000000-0000-4000-8000-000000000004', stranger='00000000-0000-4000-8000-000000000005';
  for(const id of [organizer,stranger]) {await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);await db.query("update public.profiles set status='active',role='organizer' where id=$1",[id]);}
  const event=await call(organizer,'save_content',[null,'event','Evento organizado','Descripción',null,null,new Date(Date.now()+10000),new Date(Date.now()+86400000),20,true,null]);
  const challenge=await call(organizer,'save_content',[null,'case','Builder case asociado','Descripción',null,event,null,new Date(Date.now()+86400000),null,true,null]);
  await call(alice,'start_case',[challenge]);
  const solution=await call(alice,'publish_interactive_content',[null,'solution','Mi solución interactiva','Descripción','https://example.com',challenge,null,null,null,true,null,'solution-demo',page]);
  assert.ok((await as(alice,'select * from public.content_pages where content_id=$1',[solution])).length);
  await assert.rejects(()=>call(organizer,'save_final_review',[solution,5,'Fortalezas detalladas','Mejoras detalladas','Decisión definitiva']),/Primero/);
  await call(bob,'set_feedback',[solution,1,4]);
  await assert.rejects(()=>call(alice,'save_final_review',[solution,5,'Fortalezas detalladas','Mejoras detalladas','Decisión definitiva']),/Solo los organizadores/);
  await assert.rejects(()=>call(stranger,'save_final_review',[solution,5,'Fortalezas detalladas','Mejoras detalladas','Decisión definitiva']),/Solo los organizadores/);
  await call(organizer,'save_final_review',[solution,5,'Fortalezas detalladas','Mejoras detalladas','Decisión definitiva']);
  await call(organizer,'set_event_organizer',[event,stranger,false]);
  await call(stranger,'save_final_review',[solution,4,'Fortalezas revisadas','Mejoras revisadas','Decisión revisada']);
  assert.equal((await as(bob,'select * from public.final_reviews where content_id=$1',[solution]))[0].revision,2);
  await call(organizer,'set_event_organizer',[event,stranger,true]);
  await assert.rejects(()=>call(stranger,'save_final_review',[solution,4,'Fortalezas revisadas','Mejoras revisadas','Decisión revisada']),/Solo los organizadores/);
  await assert.rejects(()=>call(bob,'delete_content',[solution]),/Solo el autor/);
  await assert.rejects(()=>call(organizer,'delete_content',[challenge]),/publicaciones vinculadas/);
  await call(alice,'delete_content',[solution]);
  assert.equal((await as(bob,'select * from public.content where id=$1',[solution])).length,0);
  assert.equal((await as(bob,'select * from public.content_pages where content_id=$1',[solution])).length,0);
  assert.equal((await as(bob,'select * from public.final_reviews where content_id=$1',[solution])).length,0);
  await assert.rejects(()=>call(alice,'set_feedback',[solution,1,5]),/no disponible/);
  await assert.rejects(()=>call(alice,'publish_interactive_content',[solution,'solution','Editar eliminado','Descripción','https://example.com',challenge,null,null,null,true,null,'solution-demo',page]),/no disponible/);
  const before=(await db.query('select count(*)::int n from public.content')).rows[0].n;
  await assert.rejects(()=>call(alice,'publish_interactive_content',[null,'post','Guardado atómico','Descripción',null,null,null,null,null,true,null,'post-demo',{v:1}]),/check/);
  assert.equal((await db.query('select count(*)::int n from public.content')).rows[0].n,before);
  await call(admin,'delete_content',[challenge]);
  await call(organizer,'delete_content',[event]);
  const project=await call(alice,'save_content',[null,'project','Proyecto eliminable','Descripción',null,null,null,null,null,true,null]);
  await call(alice,'delete_content',[project]);
  assert.equal(await call(alice,'in_project',[project]),false);
  assert.equal(await call(alice,'leads_project',[project]),false);

  // Every content kind supports the unified design operation; solutions use the case flow above.
  const baseProject=await call(alice,'save_content',[null,'project','Proyecto para avances','Descripción',null,null,null,null,null,true,null]);
  for(const kind of ['event','webinar','resource','speaker','case','project','post','update']) {
   const meeting=['event','webinar'].includes(kind), parent=kind==='update'?baseProject:null;
   const id=await call(admin,'publish_interactive_content',[null,kind,'Contenido '+kind,'Descripción',null,parent,meeting?new Date(Date.now()+10000):null,['event','webinar','case'].includes(kind)?new Date(Date.now()+86400000):null,null,true,null,'blank',page]);
   await call(bob,'set_feedback',[id,null,3]);
   await call(admin,'save_final_review',[id,4,'Fortalezas del contenido','Mejoras del contenido','Conclusión del contenido']);
   await assert.rejects(()=>as(bob,"insert into public.final_reviews(content_id,score,strengths,improvements,verdict,reviewer_id) values($1,5,'Fortalezas suficientes','Mejoras suficientes','Conclusión suficiente',$2)",[id,bob]),/permission denied/);
   await call(admin,'delete_content',[id]);
   assert.equal((await as(bob,'select * from public.final_reviews where content_id=$1',[id])).length,0);
   const metrics=await as(admin,'select * from public.content_metrics()');assert.ok(!metrics.some(m=>m.id===id));
  }
  console.log('PASS contenido unificado: guardado atómico, soluciones, revisión comunitaria y final, organizadores asignados, revisiones, eliminación autorizada, vínculos y privacidad tras eliminar.');

} finally { await db.close(); }
