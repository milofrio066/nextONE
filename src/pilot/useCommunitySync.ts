import {useEffect,useRef,useState} from 'react';
import {backend} from './backend';
export type SyncScope='all'|'profiles'|'content';
/** A notification contains only a scope/version. All actual rows are re-read under RLS. */
export function useCommunitySync(user:string|undefined,blocked:boolean,reload:(scope:SyncScope)=>Promise<void>){
 const current=useRef({reload,blocked});current.current={reload,blocked};
 const [status,setStatus]=useState<'connecting'|'live'|'fallback'|'offline'>('connecting');
 useEffect(()=>{
  if(!user||!backend)return;let stopped=false,running=false,pending:SyncScope|null=null,polling=false,connected=false,retryNeeded=false;const versions=new Map<string,number>();
  let debounce:ReturnType<typeof setTimeout>|undefined;
  const flush=async()=>{if(stopped||running||document.hidden||!navigator.onLine||current.current.blocked||document.activeElement?.matches('input,textarea,select,[contenteditable=true]')||!pending)return;
   const scope=pending;pending=null;running=true;
   try{await current.current.reload(scope);retryNeeded=false;if(!stopped)setStatus(connected?'live':'fallback');if(!stopped)window.dispatchEvent(new Event('nextone:remote'));}
   catch{retryNeeded=true;if(!stopped)setStatus(navigator.onLine?'fallback':'offline');}
   finally{running=false;if(pending&&!stopped)debounce=setTimeout(()=>void flush(),800);}
  };
  const schedule=(scope:SyncScope)=>{pending=pending&&pending!==scope?'all':scope;clearTimeout(debounce);debounce=setTimeout(()=>void flush(),800);};
  const channel=backend.channel('nextone-sync-'+user).on('postgres_changes',{event:'UPDATE',schema:'public',table:'community_updates'},payload=>{
   const scope=String(payload.new.scope);versions.set(scope,Number(payload.new.version));schedule(scope==='profiles'?'profiles':scope==='content'?'content':'all');
  }).subscribe(state=>{if(stopped)return;connected=state==='SUBSCRIBED';setStatus(state==='SUBSCRIBED'?'live':navigator.onLine?'fallback':'offline');if(state==='SUBSCRIBED')schedule('all');});
  const wake=()=>{if(!navigator.onLine){setStatus('offline');return;}schedule('all');};
  // A bounded fallback also catches revoked access, missed deletes and disabled Realtime.
  const poll=async()=>{if(stopped||polling||document.hidden||!navigator.onLine)return;polling=true;try{
   if(retryNeeded){retryNeeded=false;schedule('all');}
   const {data,error}=await backend!.from('community_updates').select('scope,version');if(stopped)return;
   if(error){setStatus('fallback');schedule('all');return;}
   if(!data?.length){schedule('profiles');return;}
   for(const row of data){const version=Number(row.version);if(versions.get(row.scope)!==version){versions.set(row.scope,version);schedule(row.scope==='profiles'?'profiles':row.scope==='content'?'content':'all');}}
  }catch{retryNeeded=true;if(!stopped)setStatus(navigator.onLine?'fallback':'offline');}finally{polling=false;}};
  const timer=setInterval(()=>void poll(),30000);
  window.addEventListener('focus',wake);window.addEventListener('online',wake);window.addEventListener('offline',wake);document.addEventListener('visibilitychange',wake);
  const retry=setInterval(()=>{if(pending)void flush();},2000);
  return()=>{stopped=true;clearTimeout(debounce);clearInterval(timer);clearInterval(retry);window.removeEventListener('focus',wake);window.removeEventListener('online',wake);window.removeEventListener('offline',wake);document.removeEventListener('visibilitychange',wake);void backend!.removeChannel(channel);};
 },[user]);
 return status;
}
