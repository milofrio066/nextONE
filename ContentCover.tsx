import {useEffect,useState} from 'react';
import {ImageIcon} from 'lucide-react';
import {backend} from './backend';
import type {Content} from './types';
const cache=new Map<string,{url:string;until:number}>();
const requests=new Map<string,Promise<string>>();
let generation=0;
export function clearCoverCache(){generation++;cache.clear();requests.clear();}
export async function coverUrl(path:string){
 const hit=cache.get(path);if(hit&&hit.until>Date.now())return hit.url;
 if(requests.has(path))return requests.get(path)!;
 const epoch=generation;const task=(async()=>{if(!backend)throw Error('Supabase no está configurado');const {data,error}=await backend.storage.from('content-covers').createSignedUrl(path,3600);if(error)throw error;if(epoch===generation)cache.set(path,{url:data.signedUrl,until:Date.now()+2400000});return data.signedUrl;})();
 requests.set(path,task);try{return await task;}finally{if(requests.get(path)===task)requests.delete(path);}
}
export default function ContentCover({item,detail=false}:{item:Pick<Content,'id'|'kind'|'title'|'cover_path'|'cover_alt'|'cover_position'>;detail?:boolean}){
 const [url,setUrl]=useState('');const [failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;setUrl('');setFailed(false);const load=()=>{if(item.cover_path)void coverUrl(item.cover_path).then(u=>{if(alive){setUrl(u);setFailed(false);}}).catch(()=>{if(alive)setFailed(true);});};load();const timer=setInterval(load,300000);return()=>{alive=false;clearInterval(timer);};},[item.cover_path]);
 const hash=Array.from(item.id||item.title).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 return <div className={'content-cover '+(detail?'cover-detail':'')+' cover-tone-'+hash%6}>
  {url&&!failed?<img src={url} alt={item.cover_alt||'Portada de '+item.title} loading={detail?'eager':'lazy'} decoding="async" style={{objectPosition:item.cover_position||'center'}} onError={()=>setFailed(true)}/>:<div className="cover-fallback" aria-hidden="true"><ImageIcon size={32}/><span>{item.title}</span></div>}
  {failed&&detail&&<small className="cover-error">No se pudo cargar la portada.</small>}
 </div>;
}
