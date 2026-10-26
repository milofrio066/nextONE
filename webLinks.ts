/** Normalizes a web domain without accepting script schemes or embedded credentials. */
export function normalizeWebUrl(value: unknown): string {
 if(typeof value !== 'string')return '';
 const text=value.trim();
 if(!text||text.length>500||/[\\\s\u0000-\u001f<>]/u.test(text))return '';
 let candidate=text;
 if(!/^https:\/\//i.test(candidate)){
  if(/^[a-z][a-z0-9+.-]*:/i.test(candidate)||candidate.startsWith('/')||!candidate.split('/')[0].includes('.'))return '';
  candidate='https://'+candidate;
 }
 try {const url=new URL(candidate);return url.protocol==='https:'&&!!url.hostname&&url.hostname.includes('.')&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function normalizePageLinks(value:unknown):unknown{
 if(Array.isArray(value))return value.map(normalizePageLinks);
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([key,v])=>{
  if(key==='url'&&typeof v==='string'&&v.trim()){
   const safe=normalizeWebUrl(v);if(!safe)throw new Error('Hay un enlace inválido en el diseño. Usa un dominio o una dirección HTTPS completa.');return [key,safe];
  }
  return [key,normalizePageLinks(v)];
 }));
}

export function contrastInk(hex:string):string{const rgb=hex.replace('#','').match(/.{2}/g)?.map(v=>parseInt(v,16)/255)||[0,0,0];const linear=rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722>.179?'#08111c':'#ffffff';}
