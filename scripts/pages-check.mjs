import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
for (const f of ['001_pilot.sql', '002_hardening.sql', '003_projects.sql', '004_interactive_pages.sql']) await db.exec(await fs.readFile(new URL('../supabase/migrations/' + f, import.meta.url), 'utf8'));
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
  console.log('PASS páginas interactivas: permisos, lectura, validación de datos y auditoría.');
} finally { await db.close(); }
