import {createClient} from '@supabase/supabase-js';
import {timingSafeEqual} from 'node:crypto';
export const config={maxDuration:60};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const env=process.env,a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+(env.CRON_SECRET||''));
 if(!env.CRON_SECRET||a.length!==b.length||!timingSafeEqual(a,b))return res.status(401).json({error:'No autorizado'});
 if(!['GET','POST'].includes(req.method))return res.status(405).end();
 if(!env.RESEND_API_KEY||!env.EVENT_NOTIFICATION_FROM||!env.APP_ORIGIN||!env.SUPABASE_SERVICE_ROLE_KEY)return res.status(503).json({error:'Configura el remitente verificado y las credenciales del servidor'});
 const db=createClient(env.SUPABASE_URL||env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 let sent=0;const start=Date.now();
 try{while(sent<20&&Date.now()-start<40000){const {data:job,error}=await db.rpc('claim_event_reminder');if(error)throw error;if(!job)break;let ok=false;
 try{const link=new URL('/',env.APP_ORIGIN).href;const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`fellowship-survey-${job.content_id}-${job.user_id}`},body:JSON.stringify({from:env.EVENT_NOTIFICATION_FROM,to:[job.email],subject:'Makers Fellowship · ¿Cómo fue tu experiencia?',text:`Tu experiencia en «${job.title}» nos ayuda a mejorar.\n\nEntra con tu cuenta para responder la encuesta (también puedes indicar que no asististe):\n${link}\n\nMakers Fellowship by nextONE`}),signal:AbortSignal.timeout(12000)});ok=r.ok&&!!(await r.json()).id;}catch{ok=false;}
 const done=await db.rpc('finish_event_reminder',{p_content:job.content_id,p_user:job.user_id,p_lease:job.lease,p_sent:ok});if(done.error)throw done.error;if(!ok)return res.status(502).json({sent,error:'Entrega pendiente de reintento'});sent++;}
 return res.status(200).json({sent});}catch{return res.status(502).json({error:'No se pudo procesar la cola'});}
}
