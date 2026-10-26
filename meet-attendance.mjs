import {createClient} from '@supabase/supabase-js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).end();
 const env=process.env,token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return res.status(401).end();if(!env.APP_ORIGIN||req.headers.origin!==env.APP_ORIGIN)return res.status(403).end();
 const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return res.status(503).end();
 try{const client=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const auth=await client.auth.getUser(token);if(auth.error||!auth.data.user)return res.status(401).end();
 const event=req.body?.content_id;if(!/^[a-f0-9-]{36}$/i.test(event||''))return res.status(400).end();
 const {data:meeting,error}=await client.from('event_meetings').select('meeting_id').eq('content_id',event).eq('provider','meet').maybeSingle();
 if(error||!meeting)return res.status(403).json({error:'No hay una reunión Meet configurada que puedas gestionar'});
 if(!/^conferenceRecords\/[A-Za-z0-9_-]+$/.test(meeting.meeting_id))return res.status(400).json({error:'Configura el registro conferenceRecords/… de esta sesión de Meet'});
 if(!env.GOOGLE_MEET_CLIENT_ID||!env.GOOGLE_MEET_CLIENT_SECRET||!env.GOOGLE_MEET_REFRESH_TOKEN||!env.SUPABASE_SERVICE_ROLE_KEY)return res.status(503).json({error:'Falta autorizar la cuenta organizadora de Google Meet en el servidor'});
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.GOOGLE_MEET_CLIENT_ID,client_secret:env.GOOGLE_MEET_CLIENT_SECRET,refresh_token:env.GOOGLE_MEET_REFRESH_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)});const access=await r.json();if(!r.ok||!access.access_token)throw Error('OAuth');
 const db=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});let page='',processed=0,matched=0;
 // Bound each request, returning a continuation instead of claiming a complete import.
 if(req.body?.page_token)page=String(req.body.page_token).slice(0,2000);
 const endpoint=new URL(`https://meet.googleapis.com/v2/${meeting.meeting_id}/participants`);endpoint.searchParams.set('pageSize','250');if(page)endpoint.searchParams.set('pageToken',page);
 const result=await fetch(endpoint,{headers:{Authorization:'Bearer '+access.access_token},signal:AbortSignal.timeout(12000)});const data=await result.json();if(!result.ok)throw Error('Meet');
 for(const p of data.participants||[]){if(!p.name||!p.earliestStartTime)continue;const got=await db.rpc('ingest_google_attendance',{p_receipt:'meet:'+p.name,p_meeting:meeting.meeting_id,p_google_user:p.signedinUser?.user||''});if(got.error)throw got.error;processed++;if(got.data)matched++;}
 return res.status(200).json({processed,matched,next_page_token:data.nextPageToken||null});
 }catch{return res.status(502).json({error:'No se pudo consultar Meet. Revisa los permisos de la cuenta organizadora; no se confirma asistencia por nombre.'});}
}
