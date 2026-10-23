import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler,{validPlan,planSchema,instructions} from '../api/project-plan.mjs';
const plan=Object.fromEntries(Object.keys(planSchema.properties).map(k=>[k,k==='title'?'Proyecto verificable':'Una propuesta breve con evidencia.']));
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('IA: salida validada, sin herramientas ni ejecución de propuestas',()=>{assert.equal(validPlan(plan),true);assert.equal(validPlan({...plan,title:'x'.repeat(200)}),false);assert.equal(validPlan({...plan,extra:'secret'}),false);assert.match(instructions,/nunca publiques/);});
test('IA: origen, sesión, cuota, timeouts y respuesta estructurada con transporte simulado',async()=>{
 const previous={...process.env},original=global.fetch;
 Object.assign(process.env,{APP_ORIGIN:'https://nextone.example',OPENAI_API_KEY:'test-never-real',OPENAI_MODEL:'configured-test-model',SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-test-key'});
 const request={method:'POST',headers:{origin:'https://nextone.example',authorization:'Bearer test-token'},body:{type:'semillero',idea:'Investigar un problema real de la comunidad',constraints:'Cuatro semanas'}};
 try{
  let res=response();await handler({...request,headers:{origin:'https://evil.example'}},res);assert.equal(res.code,403);
  res=response();await handler({...request,headers:{origin:'https://nextone.example'}},res);assert.equal(res.code,401);
  let calls=0;global.fetch=async(url,opts)=>{calls++;if(String(url).includes('/auth/v1/user'))return Response.json({id:'00000000-0000-4000-8000-000000000001'});if(String(url).includes('/reserve_ai_request'))return Response.json(null);assert.equal(String(url),'https://api.openai.com/v1/responses');const sent=JSON.parse(opts.body);assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);assert.equal(sent.tools,undefined);assert.ok(!JSON.stringify(sent).includes('test-never-real'));return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}]});};
  res=response();await handler(request,res);assert.equal(res.code,200);assert.deepEqual(res.body,{plan});assert.equal(calls,3);
  global.fetch=async(url)=>String(url).includes('/auth/v1/user')?Response.json({message:'invalid'},{status:401}):Response.json(null);res=response();await handler(request,res);assert.equal(res.code,401);
  global.fetch=async(url)=>String(url).includes('/auth/v1/user')?Response.json({id:'00000000-0000-4000-8000-000000000001'}):Response.json({message:'quota'},{status:400});res=response();await handler(request,res);assert.equal(res.code,429);
  delete process.env.OPENAI_API_KEY;res=response();await handler(request,res);assert.equal(res.code,503);assert.match(res.body.error,/manualmente/);
 }finally{global.fetch=original;for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
});
