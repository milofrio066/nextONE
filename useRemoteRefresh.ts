import {useEffect,useRef} from 'react';
export function useRemoteRefresh(refresh:()=>void){const current=useRef(refresh);current.current=refresh;useEffect(()=>{const run=()=>current.current();window.addEventListener('nextone:remote',run);return()=>window.removeEventListener('nextone:remote',run);},[]);}
