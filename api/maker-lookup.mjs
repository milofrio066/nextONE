import {createClient} from '@supabase/supabase-js';
import {randomInt,randomUUID,createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
 if(!process.env.APP_ORIGIN||req.headers.origin!==process.env.APP_ORIGIN)return res.status(403).json({error:'Origen no autorizado'});
 if(process.env.MAKERS_REGISTRY_ENABLED!=='true')return res.status(503).json({error:'La consulta de Makers todavía no está conectada. Conserva tu código o vuelve cuando el equipo habilite la base.'});
 if(!process.env.RESEND_API_KEY||!process.env.ADMIN_NOTIFICATION_FROM||!process.env.SUPABASE_SERVICE_ROLE_KEY)return res.status(503).json({error:'Consulta temporalmente no disponible'});
 const input=req.body;if(!input||typeof input!=='object')return res.status(400).json({error:'Solicitud no válida'});
 try{
 const client=createClient(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 if(input.action==='request'){
 const contact=typeof input.contact==='string'?input.contact.trim().toLowerCase():'';
 if(contact.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)||/^\+[1-9][0-9]{7,14}$/.test(contact)))return res.status(400).json({error:'Escribe un correo válido o celular con prefijo internacional (+57…)'});
 const id=randomUUID(),otp=String(randomInt(100000,1000000));
 const {data,error}=await client.rpc('start_maker_lookup',{p_id:id,p_contact:contact,p_key:hash(contact),p_hash:hash(id+':'+otp),p_client:hash(String(req.headers['x-real-ip']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown'))});
 if(error)return res.status(429).json({error:'Consulta no disponible. Espera e inténtalo más tarde.'});
 if(data){const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.ADMIN_NOTIFICATION_FROM,to:[data],subject:'Verifica tu consulta de Makers',text:`Tu código de verificación es ${otp}. Caduca en 10 minutos. Si no lo solicitaste, ignora este mensaje.`}),signal:AbortSignal.timeout(10000)});if(!sent.ok)return res.status(503).json({error:'No se pudo enviar la verificación. Inténtalo más tarde.'});}
 return res.status(200).json({id,message:'Si tus datos están registrados, recibirás una verificación en el correo asociado a Makers.'});
 }
 if(input.action==='verify'&&typeof input.id==='string'&&/^[a-f0-9-]{36}$/i.test(input.id)&&typeof input.otp==='string'&&/^\d{6}$/.test(input.otp)){
 const {data,error}=await client.rpc('verify_maker_lookup',{p_id:input.id,p_hash:hash(input.id+':'+input.otp)});if(error||!data)return res.status(400).json({error:'Verificación incorrecta, vencida o agotada. Solicita una nueva.'});return res.status(200).json(data);
 }
 return res.status(400).json({error:'Solicitud no válida'});
 }catch{return res.status(503).json({error:'No pudimos completar la consulta. Inténtalo más tarde.'});}
}
