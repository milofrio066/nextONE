import {createHmac,timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
export const config={api:{bodyParser:false}};
export function verifyZoom(raw,timestamp,signature,secret,now=Date.now()){
 if(!secret||!/^\d+$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300)return false;
 const expected='v0='+createHmac('sha256',secret).update(`v0:${timestamp}:${raw}`).digest('hex'),a=Buffer.from(expected),b=Buffer.from(signature||'');return a.length===b.length&&timingSafeEqual(a,b);
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).end();
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>100000)return res.status(413).end();}
 const env=process.env;if(!verifyZoom(raw,req.headers['x-zm-request-timestamp'],req.headers['x-zm-signature'],env.ZOOM_WEBHOOK_SECRET))return res.status(401).end();
 let body;try{body=JSON.parse(raw);}catch{return res.status(400).end();}
 if(body.event==='endpoint.url_validation'){const plainToken=body.payload?.plainToken;if(typeof plainToken!=='string')return res.status(400).end();return res.status(200).json({plainToken,encryptedToken:createHmac('sha256',env.ZOOM_WEBHOOK_SECRET).update(plainToken).digest('hex')});}
 if(body.event!=='meeting.participant_joined')return res.status(200).json({ignored:true});
 if(!env.SUPABASE_SERVICE_ROLE_KEY)return res.status(503).end();
 const object=body.payload?.object,p=object?.participant;if(!object?.id||!p)return res.status(400).end();
 const db=createClient(env.SUPABASE_URL||env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const {error}=await db.rpc('ingest_verified_attendance',{p_receipt:`zoom:${object.uuid||object.id}:${p.participant_uuid||p.user_id||p.id||'unknown'}:${p.join_time||body.event_ts}`,p_provider:'zoom',p_meeting:String(object.id),p_email:p.email||''});
 return res.status(error?503:200).json({received:!error});
}
