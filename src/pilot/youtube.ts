export function youtubeId(value:string|null):string|null{
 try{const u=new URL(value||'');if(u.protocol!=='https:')return null;const host=u.hostname.toLowerCase();let id='';
 if(host==='youtu.be')id=u.pathname.split('/')[1];
 if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v')||'':/^\/(?:embed|shorts|live)\//.test(u.pathname)?u.pathname.split('/')[2]:'';
 return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
