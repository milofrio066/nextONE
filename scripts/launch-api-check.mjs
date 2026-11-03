import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import handler from '../api/maker-lookup.mjs';
function response(){return {code:0,body:null,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(b){this.body=b;return this;}};}
const req=body=>({method:'POST',headers:{origin:'https://example.com','x-real-ip':'127.0.0.1'},body});
test('consulta: origen, apagado, verificación y correo mediante transporte simulado',async()=>{
 const original={...process.env},realFetch=globalThis.fetch;
 try{
 process.env.APP_ORIGIN='https://example.com';process.env.MAKERS_REGISTRY_ENABLED='false';let res=response();await handler(req({action:'request',contact:'a@example.com'}),res);assert.equal(res.code,503);
 res=response();await handler({...req({}),headers:{origin:'https://attacker.example'}},res);assert.equal(res.code,403);
 res=response();await handler({...req({}),method:'GET'},res);assert.equal(res.code,405);
 Object.assign(process.env,{MAKERS_REGISTRY_ENABLED:'true',RESEND_API_KEY:'fake',ADMIN_NOTIFICATION_FROM:'test@example.com',SUPABASE_SERVICE_ROLE_KEY:'fake',VITE_SUPABASE_URL:'https://test.supabase.co'});
 let reservation,delivered,known=true;
 globalThis.fetch=async(url,init)=>{const target=String(url);const body=JSON.parse(init.body);if(target.includes('/start_maker_lookup')){reservation=body;assert.match(body.p_client,/^[a-f0-9]{64}$/);return new Response(JSON.stringify(known?'a@example.com':null),{status:200});}if(target==='https://api.resend.com/emails'){delivered=body;return new Response('{"id":"test"}',{status:200});}if(target.includes('/verify_maker_lookup'))return new Response(JSON.stringify(body.p_hash===reservation.p_hash?{access_code:'PERSONAL123',referral_code:'REFERRAL25'}:null),{status:200});throw Error('Unexpected network call');};
 res=response();await handler(req({action:'request',contact:'not an email'}),res);assert.equal(res.code,400);
 res=response();await handler(req({action:'request',contact:'a@example.com'}),res);assert.equal(res.code,200);assert.equal(res.body.access_code,undefined);assert.equal(res.body.email,undefined);const id=res.body.id,otp=delivered.text.match(/\b\d{6}\b/)[0];assert.equal(createHash('sha256').update(id+':'+otp).digest('hex'),reservation.p_hash);
 res=response();await handler(req({action:'verify',id,otp}),res);assert.equal(res.code,200);assert.equal(res.body.access_code,'PERSONAL123');
 res=response();await handler(req({action:'verify',id,otp:'000000'}),res);assert.equal(res.code,400);
 known=false;delivered=null;res=response();await handler(req({action:'request',contact:'+573001234567'}),res);assert.equal(res.code,200);assert.equal(delivered,null);assert.equal(res.body.email,undefined);
 }finally{globalThis.fetch=realFetch;for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);}
});
