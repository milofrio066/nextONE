import {useEffect,useRef,useState} from 'react';
import {backend} from './backend';
import ContentCover from './ContentCover';
export type CoverDraft={path:string;alt:string;position:'top'|'center'|'bottom'};
export async function prepareCover(file:File):Promise<Blob>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Elige una imagen JPG, PNG o WebP.');
 if(file.size>8*1024*1024)throw Error('La imagen original debe pesar menos de 8 MB.');
 const bitmap=await createImageBitmap(file);
 try{if(bitmap.width*bitmap.height>40000000)throw Error('La imagen es demasiado grande. Usa una de menos de 40 megapíxeles.');
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la imagen.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('No se pudo convertir la imagen.')),'image/webp',.84));if(blob.type!=='image/webp'||blob.size>2097152)throw Error('No se pudo optimizar la imagen a menos de 2 MB.');return blob;
 }finally{bitmap.close();}
}
export default function CoverEditor({user,value,onChange,onBusy}:{user:string;value:CoverDraft;onChange:(next:CoverDraft)=>void;onBusy:(busy:boolean)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const input=useRef<HTMLInputElement>(null),latest=useRef(value),uploads=useRef<string[]>([]),mounted=useRef(true);latest.current=value;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(uploads.current.length&&backend)void backend.storage.from('content-covers').remove(uploads.current).catch(()=>{});};},[]);
 async function upload(file:File){setError('');setBusy(true);onBusy(true);try{const blob=await prepareCover(file);if(!backend)throw Error('Supabase no está configurado');const path=user+'/'+crypto.randomUUID()+'.webp';const {error}=await backend.storage.from('content-covers').upload(path,blob,{contentType:'image/webp',upsert:false,cacheControl:'3600'});if(error)throw Error('No se pudo subir la portada. Revisa tu conexión y que la migración 017 esté aplicada.');if(!mounted.current){void backend.storage.from('content-covers').remove([path]);return;}uploads.current.push(path);onChange({...latest.current,path});}catch(e){setError((e as Error).message);}finally{setBusy(false);onBusy(false);if(input.current)input.current.value='';}}
 return <fieldset className="cover-editor"><legend>Portada del contenido</legend><p>Identifica este contenido con una imagen propia. Se optimiza automáticamente; no cambia el diseño interactivo.</p>
 <label className="field">Subir imagen de portada<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/></label>
 <input type="hidden" name="cover_path" value={value.path}/>
 {value.path&&<><ContentCover item={{id:value.path,kind:'event',title:value.alt||'Vista previa',cover_path:value.path,cover_alt:value.alt,cover_position:value.position}}/>
 <label className="field">Descripción de la portada<input name="cover_alt" value={value.alt} maxLength={180} onChange={e=>onChange({...value,alt:e.target.value})} placeholder="Describe la imagen para quienes no pueden verla"/></label>
 <label className="field">Enfoque de la portada<select name="cover_position" value={value.position} onChange={e=>onChange({...value,position:e.target.value as CoverDraft['position']})}><option value="center">Centro</option><option value="top">Parte superior</option><option value="bottom">Parte inferior</option></select></label>
 <button type="button" className="secondary" disabled={busy} onClick={()=>onChange({path:'',alt:'',position:'center'})}>Quitar portada</button></>}
 {busy&&<p role="status">Optimizando y subiendo imagen…</p>}{error&&<p role="alert">{error}</p>}<small>JPG, PNG o WebP de hasta 8 MB. Se guarda como WebP privado de hasta 2 MB. Formato recomendado: horizontal 16:9. La portada se publica al guardar el contenido.</small>
 </fieldset>;
}
