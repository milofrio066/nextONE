import type {AvatarConfig,Profile,ProfileSection,ProfileTheme} from './types';
import {normalizeWebUrl} from './webLinks';
export const THEMES:Record<ProfileTheme['template'],{name:string;accent:string;bg:string;bg2:string}>={
 neon:{name:'Neón',accent:'#00e5ff',bg:'#05060d',bg2:'#12062a'},aurora:{name:'Aurora',accent:'#8b7bff',bg:'#070814',bg2:'#0b2a3a'},ember:{name:'Brasa',accent:'#ff4d5e',bg:'#0b0506',bg2:'#2a0a10'},mono:{name:'Mono',accent:'#e8e8f0',bg:'#08080a',bg2:'#1a1a22'},custom:{name:'Propio',accent:'#39ff88',bg:'#060809',bg2:'#0c1a14'}
};
export const FONTS={modern:{name:'Moderna',family:'system-ui, sans-serif'},geometric:{name:'Geométrica',family:'"Trebuchet MS", sans-serif'},rounded:{name:'Redondeada',family:'"Arial Rounded MT Bold", "Century Gothic", sans-serif'},mono:{name:'Tecnológica',family:'Consolas, "Courier New", monospace'},editorial:{name:'Editorial',family:'Georgia, serif'},display:{name:'Impacto',family:'Impact, "Arial Black", sans-serif'}};
export const SECTIONS:Record<ProfileSection,string>={hero:'Presentación',skills:'Qué hago',interests:'Intereses',about:'Sobre mí',links:'Redes y enlaces'};
export const DEFAULT_AVATAR:AvatarConfig={skin:'#cf9569',hairColor:'#262033',shirtColor:'#8b5cf6',hair:'wave',outfit:'hoodie',accessory:'none',expression:'smile',motion:'float',presentation:'neutral',face:'oval',body:'classic',eyeColor:'#3b2a25',facialHair:'none',gesture:'idle',mood:'smile',gear:'none',bottom:'jeans',bottomColor:'#334155',shoes:'sneakers',shoesColor:'#f3f4ff'};
export const HEX=/^#[0-9a-fA-F]{6}$/;
const color=(v:unknown,fallback:string)=>typeof v==='string'&&HEX.test(v)?v:fallback;
const option=<T extends string>(v:unknown,list:readonly T[],fallback:T):T=>list.includes(v as T)?v as T:fallback;
export const AVATAR_CHOICES={
 presentation:[['neutral','Neutra'],['feminine','Femenina'],['masculine','Masculina']],face:[['oval','Ovalado'],['round','Redondo'],['square','Cuadrado']],body:[['classic','Clásica'],['soft','Suave'],['athletic','Atlética']],
 facialHair:[['none','Ninguno'],['stubble','Barba corta'],['beard','Barba'],['mustache','Bigote']],
 hair:[['crop','Corto'],['wave','Ondulado'],['curls','Rizos'],['long','Largo'],['bald','Sin cabello'],['bob','Bob'],['ponytail','Coleta'],['braids','Trenzas'],['bun','Recogido'],['afro','Afro'],['undercut','Degradado'],['pixie','Pixie'],['pigtails','Dos coletas'],['mohawk','Mohicano'],['fade','Fade'],['quiff','Pompadour']],
 outfit:[['hoodie','Sudadera'],['jacket','Chaqueta'],['tee','Camiseta'],['shirt','Camisa'],['tank','Esqueleto'],['dress','Vestido'],['blazer','Blazer'],['suit','Traje con corbata'],['coat','Abrigo largo'],['overalls','Overol'],['sport','Deportivo'],['tracksuit','Conjunto deportivo']],
 bottom:[['jeans','Jean'],['trousers','Pantalón'],['shorts','Short'],['skirt','Falda']],shoes:[['sneakers','Tenis'],['boots','Botas'],['flats','Bailarinas']],
 accessory:[['none','Ninguno'],['glasses','Gafas'],['headphones','Audífonos'],['cap','Gorra']],
 gear:[['none','Ninguno'],['sunglasses','Gafas de sol'],['round','Gafas redondas'],['beanie','Gorro'],['headband','Diadema'],['bow','Moño'],['crown','Corona'],['scarf','Bufanda'],['chain','Cadena'],['earrings','Aretes']],
 mood:[['smile','Sonrisa'],['calm','Serena'],['happy','Alegre'],['grin','Carcajada'],['wink','Guiño'],['surprised','Sorpresa'],['smirk','Pícara'],['sleepy','Tranquila']],
 gesture:[['idle','Relajado'],['wave','Saludando'],['hips','Manos a la cintura'],['victory','Victoria'],['think','Pensando'],['thumbs','Pulgar arriba'],['salute','Saludo']],
 motion:[['float','Respirar y flotar'],['wave','Saludar'],['none','Sin movimiento'],['dance','Bailar'],['walk','Caminar']],
} as const satisfies Record<string,readonly (readonly [string,string])[]>;
export const AVATAR_COLORS=[['skin','Tono de piel'],['hairColor','Color del cabello'],['eyeColor','Color de los ojos'],['shirtColor','Color de la ropa'],['bottomColor','Color del pantalón o falda'],['shoesColor','Color del calzado']] as const;
const pick=<K extends keyof typeof AVATAR_CHOICES>(k:K,v:unknown,fallback:string)=>{const keys=AVATAR_CHOICES[k].map(o=>o[0]) as string[];return (keys.includes(v as string)?v:fallback) as never;};
/** Normaliza un avatar de cualquier origen: solo catálogos cerrados y colores hex de 6 dígitos llegan al dibujo. */
export function normalizeAvatar(a:Partial<AvatarConfig>|null|undefined,accent=DEFAULT_AVATAR.shirtColor):AvatarConfig{
 const x=(a&&typeof a==='object'?a:{}) as Record<string,unknown>,D=DEFAULT_AVATAR;
 return {skin:color(x.skin,D.skin),hairColor:color(x.hairColor,D.hairColor),shirtColor:color(x.shirtColor,accent),eyeColor:color(x.eyeColor,D.eyeColor),bottomColor:color(x.bottomColor,D.bottomColor),shoesColor:color(x.shoesColor,D.shoesColor),
  hair:pick('hair',x.hair,'wave'),outfit:pick('outfit',x.outfit,'hoodie'),accessory:pick('accessory',x.accessory,'none'),expression:option(x.expression,['smile','calm','happy'],'smile'),motion:pick('motion',x.motion,'float'),presentation:pick('presentation',x.presentation,'neutral'),face:pick('face',x.face,'oval'),body:pick('body',x.body,'classic'),facialHair:pick('facialHair',x.facialHair,'none'),
  gesture:pick('gesture',x.gesture,'idle'),mood:pick('mood',x.mood??(x.expression==='happy'?'happy':x.expression==='calm'?'calm':'smile'),'smile'),gear:pick('gear',x.gear,'none'),bottom:pick('bottom',x.bottom,'jeans'),shoes:pick('shoes',x.shoes,'sneakers')};
}
export function resolveTheme(p:Pick<Profile,'theme'>):ProfileTheme{
 const t=p.theme&&typeof p.theme==='object'?p.theme:{};
 const template=option(t.template,Object.keys(THEMES) as ProfileTheme['template'][],'neon');const base=THEMES[template];
 const sections=Object.fromEntries(Object.keys(SECTIONS).map(key=>{const sec=t.sections?.[key as ProfileSection];return [key,{background:color(sec?.background,base.bg2),text:color(sec?.text,'#f3f4ff')}];})) as ProfileTheme['sections'];
 const a=t.avatar||{} as Partial<AvatarConfig>;
 return {template,accent:color(t.accent,base.accent),headline:typeof t.headline==='string'?t.headline.slice(0,80):'',quote:typeof t.quote==='string'?t.quote.slice(0,160):'',
 links:Array.isArray(t.links)?t.links.flatMap(l=>{if(!l||typeof l.label!=='string')return [];const url=normalizeWebUrl(l.url);return url?[{label:l.label.slice(0,30),url,kind:typeof l.kind==='string'?l.kind:'other'}]:[];}).slice(0,8):[],font:option(t.font,Object.keys(FONTS) as ProfileTheme['font'][],'modern'),titleStyle:option(t.titleStyle,['outline','solid','gradient'],'outline'),background:color(t.background,base.bg),sections,
 avatar:normalizeAvatar(a,base.accent)};
}
export function themeVars(t:ProfileTheme):Record<string,string>{const base=THEMES[t.template];return {'--pf-accent':t.accent,'--pf-bg':t.background,'--pf-bg2':base.bg2,'--pf-font':FONTS[t.font].family};}
export const splitList=(v:string)=>v.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
export function graphemes(value:string):string[]{return Array.from(new Intl.Segmenter('es',{granularity:'grapheme'}).segment(value),x=>x.segment);}
export function limitNickname(value:string,max=40):string{let out='';for(const part of graphemes(value)){if(Array.from(out+part).length>max)break;out+=part;}return out;}
export const avatarOf=(p:Pick<Profile,'name'|'nickname'>)=>graphemes(p.nickname||'').find(x=>/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(x))||graphemes(p.name).filter(n=>n.trim()).slice(0,2).join('').toUpperCase();

export const AVATAR_PRESETS={masculine:{name:'Masculino · urbano',avatar:{...DEFAULT_AVATAR,presentation:'masculine' as const,hair:'undercut' as const,face:'square' as const,body:'athletic' as const,outfit:'jacket' as const,facialHair:'stubble' as const,motion:'walk' as const}},feminine:{name:'Femenino · creativo',avatar:{...DEFAULT_AVATAR,presentation:'feminine' as const,hair:'ponytail' as const,outfit:'blazer' as const,shirtColor:'#d65ca7',motion:'wave' as const}},neutral:{name:'Neutro · explorador',avatar:{...DEFAULT_AVATAR,hair:'afro' as const,accessory:'glasses' as const,shirtColor:'#22b89a',motion:'dance' as const}}};
