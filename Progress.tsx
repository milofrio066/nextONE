import {createContext,useContext,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {readRows} from '../data';
import {rpc} from '../backend';
type Payload={done?:number[];answers?:number[];score?:number;total?:number};
type Row={block_id:string;payload:Payload};
type Context={ready:boolean;rows:Row[];save:(block:string,kind:string,payload:Payload)=>Promise<Payload>};
const ProgressContext=createContext<Context|null>(null);
export function ProgressProvider({content,revision,children}:{content:string;revision:number;children:ReactNode}){
 const [rows,setRows]=useState<Row[]>([]),[ready,setReady]=useState(false),[error,setError]=useState('');const request=useRef(0);
 async function load(){const version=++request.current;setReady(false);setRows([]);setError('');try{const data=await readRows<Row>('interaction_progress',{content_id:content,revision:String(revision)});if(version===request.current){setRows(data);setReady(true);}}catch(e){if(version===request.current)setError((e as Error).message);}}
 useEffect(()=>{void load();return()=>{request.current++;};},[content,revision]);
 async function save(block:string,kind:string,payload:Payload){const version=request.current;const result=await rpc<Payload>('save_interaction',{p_content:content,p_revision:revision,p_block:block,p_kind:kind,p_payload:payload});if(version===request.current)setRows(old=>[...old.filter(r=>r.block_id!==block),{block_id:block,payload:result}]);return result;}
 return <ProgressContext.Provider value={{ready,rows,save}}><p className="ix-note">Los quizzes enviados y los checklists se guardan en tu cuenta y generan estadísticas agregadas para Makers. Puedes retomarlos en otro dispositivo. No equivalen a una certificación de aprendizaje.</p>{error&&<p role="alert">No se pudo recuperar tu progreso. {error} <button className="secondary" onClick={()=>void load()}>Reintentar</button></p>}{children}</ProgressContext.Provider>;
}
export function useProgress(block:string){const context=useContext(ProgressContext),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState<{kind:string;payload:Payload}|null>(null);
 async function save(kind:string,payload:Payload){if(!context)return;setBusy(true);setError('');setRetry({kind,payload});try{await context.save(block,kind,payload);setRetry(null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return {enabled:!!context,ready:context?.ready??true,saved:context?.rows.find(r=>r.block_id===block)?.payload,save,busy,notice:error?<p role="alert">No se guardó el progreso: {error} <button type="button" onClick={()=>retry&&void save(retry.kind,retry.payload)}>Reintentar guardado</button></p>:busy?<p role="status">Guardando progreso…</p>:null};
}
