import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
const dir=new URL('../supabase/migrations/',import.meta.url);
for(const f of (await fs.readdir(dir)).filter(x=>/^\d{3}_.*\.sql$/.test(x)).sort())await db.exec(await fs.readFile(new URL(f,dir),'utf8'));
const [a,b,c]=Array.from({length:3},(_,i)=>`00000000-0000-4000-8000-00000000000${i+1}`);
for(const id of [a,b,c])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.example']);
await db.exec("update public.profiles set status='active'");await db.query("update public.profiles set status='suspended' where id=$1",[c]);
async function as(id,sql,args=[]){await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');try{return(await db.query(sql,args)).rows;}finally{await db.exec('reset role');}}
const base={skin:'#cf9569',hairColor:'#262033',shirtColor:'#8b5cf6',hair:'pixie',outfit:'suit',accessory:'glasses',expression:'smile',motion:'dance',presentation:'feminine',face:'round',body:'soft',eyeColor:'#3b2a25',facialHair:'none',gesture:'victory',mood:'wink',gear:'crown',bottom:'skirt',bottomColor:'#6D28D9',shoes:'boots',shoesColor:'#111111'};
const theme=av=>({template:'neon',accent:'#00e5ff',headline:'',quote:'',links:[],font:'modern',titleStyle:'outline',background:'#05060d',sections:{},avatar:av});
const save=(id,av)=>as(id,'select public.save_profile_avatar_v3($1::jsonb)',[JSON.stringify(theme(av))]);
const stored=async id=>(await db.query('select theme->\'avatar\' v from public.profiles where id=$1',[id])).rows[0].v;
try{
 await save(a,base);const v=await stored(a);
 assert.equal(v.hair,'pixie');assert.equal(v.outfit,'suit');assert.equal(v.gesture,'victory');assert.equal(v.mood,'wink');assert.equal(v.gear,'crown');assert.equal(v.bottom,'skirt');assert.equal(v.bottomColor,'#6d28d9');assert.equal(v.shoes,'boots');
 assert.equal(v.accessory,'glasses');assert.equal(v.motion,'dance');assert.equal(v.presentation,'feminine');
 await save(a,{...base,hair:'mohawk',outfit:'overalls',gesture:'thumbs',mood:'surprised',gear:'scarf',bottom:'shorts'});assert.equal((await stored(a)).hair,'mohawk');
 // Valores heredados siguen funcionando sin campos nuevos
 const {gesture,mood,gear,bottom,bottomColor,shoes,shoesColor,...legacy}=base;await save(b,{...legacy,hair:'wave',outfit:'hoodie'});assert.equal((await stored(b)).gesture,'idle');assert.equal((await stored(b)).bottom,'jeans');
 // Rechazos
 for(const bad of [{hair:'<svg onload=1>'},{outfit:'capa'},{gesture:'bailar'},{mood:'x'},{gear:'arma'},{bottom:'toga'},{shoes:'tacones'},{bottomColor:'red'},{shoesColor:'url(#x)'}])await assert.rejects(()=>save(a,{...base,...bad}),/no válido/i);
 await assert.rejects(()=>save(a,{...base,pad:'x'.repeat(1600)}),/Avatar no válido/);
 await assert.rejects(()=>as(a,'select public.save_profile_avatar_v3($1::jsonb)',['[]']),/no válida/);
 await assert.rejects(()=>save(c,base),/./);
 assert.equal((await stored(a)).hair,'mohawk','un rechazo no altera lo guardado');
 const other=await stored(b);assert.notEqual(other.hair,'mohawk','aislamiento entre cuentas');
 const unknown=await as(a,"select public.save_profile_avatar_v3($1::jsonb) r",[JSON.stringify(theme({...base,evil:'<img onerror=1>'}))]);assert.equal((await stored(a)).evil,undefined);
 console.log('PASS avatar ampliado: catálogos cerrados, colores hex, degradación heredada, rechazos, aislamiento y suspendidos.');
}catch(e){console.error(e);process.exitCode=1;}
finally{await db.close();}
