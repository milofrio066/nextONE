import type {Content} from './types';
// Quién ve y quién entra. La base aplica las mismas reglas (content.access_scope + content.teaser, 025).
export type AccessValue='community'|'makers'|'peers'|'makers_teaser'|'peers_teaser';
export type Tier='maker'|'subscriber';
export const ACCESS_OPTIONS:{value:AccessValue;label:string;makers:'enter'|'see'|'none';peers:'enter'|'see'|'none'}[]=[
 {value:'community',label:'Pueden ver y entrar todos (makers + peers)',makers:'enter',peers:'enter'},
 {value:'makers',label:'Solo makers',makers:'enter',peers:'none'},
 {value:'peers',label:'Solo peers',makers:'none',peers:'enter'},
 {value:'makers_teaser',label:'Entran los makers · los peers lo ven bloqueado',makers:'enter',peers:'see'},
 {value:'peers_teaser',label:'Entran los peers · los makers lo ven bloqueado',makers:'see',peers:'enter'},
];
export function accessOption(value:string){const v=(ACCESS_OPTIONS.some(o=>o.value===value)?value:'makers') as AccessValue;return {value:v,scope:v.replace('_teaser','') as 'community'|'makers'|'peers',teaser:v.endsWith('_teaser')};}
export const accessValue=(c:Pick<Content,'access_scope'|'teaser'>):AccessValue=>{const scope=c.access_scope||'makers';return scope!=='community'&&c.teaser?`${scope}_teaser` as AccessValue:scope;};
/** Un miembro sin rol de equipo solo puede publicar donde él mismo entra. */
export const allowedFor=(v:AccessValue,tier:Tier,staff:boolean)=>staff||(tier==='subscriber'?ACCESS_OPTIONS.find(o=>o.value===v)!.peers==='enter':ACCESS_OPTIONS.find(o=>o.value===v)!.makers==='enter');
export const accessLabel=(c:Pick<Content,'access_scope'|'teaser'>)=>ACCESS_OPTIONS.find(o=>o.value===accessValue(c))!.label;
