import {readable,mix,luminance} from './contrast';
import type {AvatarConfig,Profile,ProfileSection,ProfileTheme} from './types';
import {normalizeWebUrl} from './webLinks';
export const THEMES:Record<ProfileTheme['template'],{name:string;accent:string;bg:string;bg2:string}>={
 neon:{name:'Neón',accent:'#00e5ff',bg:'#05060d',bg2:'#12062a'},aurora:{name:'Aurora',accent:'#8b7bff',bg:'#070814',bg2:'#0b2a3a'},ember:{name:'Brasa',accent:'#ff4d5e',bg:'#0b0506',bg2:'#2a0a10'},mono:{name:'Mono',accent:'#e8e8f0',bg:'#08080a',bg2:'#1a1a22'},custom:{name:'Propio',accent:'#39ff88',bg:'#060809',bg2:'#0c1a14'}
};
export const FONTS={modern:{name:'Moderna',family:'system-ui, sans-serif'},geometric:{name:'Geométrica',family:'"Trebuchet MS", sans-serif'},rounded:{name:'Redondeada',family:'"Arial Rounded MT Bold", "Century Gothic", sans-serif'},mono:{name:'Tecnológica',family:'Consolas, "Courier New", monospace'},editorial:{name:'Editorial',family:'Georgia, serif'},display:{name:'Impacto',family:'Impact, "Arial Black", sans-serif'}};
export const SECTIONS:Record<ProfileSection,string>={hero:'Presentación',skills:'Qué hago',interests:'Intereses',about:'Sobre mí',links:'Redes y enlaces'};
export const DEFAULT_AVATAR:AvatarConfig={skin:'#cf9569',hairColor:'#262033',shirtColor:'#8b5cf6',hair:'wave',outfit:'hoodie',accessory:'none',expression:'smile',motion:'float',presentation:'neutral',face:'oval',body:'classic',eyeColor:'#3b2a25',facialHair:'none',gesture:'idle',mood:'smile',gear:'none',bottom:'jeans',bottomColor:'#334155',shoes:'sneakers',shoesColor:'#f3f4ff',makeup:'none',marks:'none',lipColor:'#b4475e'};
export const HEX=/^#[0-9a-fA-F]{6}$/;
const color=(v:unknown,fallback:string)=>typeof v==='string'&&HEX.test(v)?v:fallback;
const option=<T extends string>(v:unknown,list:readonly T[],fallback:T):T=>list.includes(v as T)?v as T:fallback;
export const AVATAR_CHOICES={
 presentation:[['neutral','Neutra'],['feminine','Femenina'],['masculine','Masculina']],face:[['oval','Ovalado'],['round','Redondo'],['square','Cuadrado'],['heart','Corazón']],body:[['classic','Clásica'],['soft','Suave'],['athletic','Atlética'],['curvy','Con curvas']],
 facialHair:[['none','Ninguno'],['stubble','Barba corta'],['beard','Barba'],['mustache','Bigote']],
 hair:[['crop','Corto'],['wave','Ondulado'],['curls','Rizos'],['long','Largo'],['bald','Sin cabello'],['bob','Bob'],['ponytail','Coleta'],['braids','Trenzas'],['bun','Recogido'],['afro','Afro'],['undercut','Degradado'],['pixie','Pixie'],['pigtails','Dos coletas'],['mohawk','Mohicano'],['fade','Fade'],['quiff','Pompadour'],['locs','Locs'],['coily','Rizos afro largos'],['longwavy','Largo ondulado'],['sidepart','Raya al lado'],['buzz','Rapado'],['highpuff','Puff alto']],
 outfit:[['hoodie','Sudadera'],['jacket','Chaqueta'],['tee','Camiseta'],['shirt','Camisa'],['tank','Esqueleto'],['dress','Vestido'],['blazer','Blazer'],['suit','Traje con corbata'],['coat','Abrigo largo'],['overalls','Overol'],['sport','Deportivo'],['tracksuit','Conjunto deportivo'],['blouse','Blusa'],['jumpsuit','Enterizo'],['cardigan','Cárdigan']],
 bottom:[['jeans','Jean'],['trousers','Pantalón'],['shorts','Short'],['skirt','Falda']],shoes:[['sneakers','Tenis'],['boots','Botas'],['flats','Bailarinas']],
 accessory:[['none','Ninguno'],['glasses','Gafas'],['headphones','Audífonos'],['cap','Gorra']],
 gear:[['none','Ninguno'],['sunglasses','Gafas de sol'],['round','Gafas redondas'],['beanie','Gorro'],['headband','Diadema'],['bow','Moño'],['crown','Corona'],['scarf','Bufanda'],['chain','Cadena'],['earrings','Aretes'],['hoops','Argollas'],['pearls','Collar de perlas'],['flower','Flor en el cabello'],['hijab','Hiyab'],['headwrap','Turbante'],['hearing','Audífono auditivo']],
 makeup:[['none','Sin maquillaje'],['lashes','Pestañas'],['lips','Labios'],['full','Pestañas y labios']],marks:[['none','Ninguno'],['freckles','Pecas'],['mole','Lunar'],['blush','Rubor']],
 mood:[['smile','Sonrisa'],['calm','Serena'],['happy','Alegre'],['grin','Carcajada'],['wink','Guiño'],['surprised','Sorpresa'],['smirk','Pícara'],['sleepy','Tranquila']],
 gesture:[['idle','Relajado'],['wave','Saludando'],['hips','Manos a la cintura'],['victory','Victoria'],['think','Pensando'],['thumbs','Pulgar arriba'],['salute','Saludo']],
 motion:[['float','Respirar y flotar'],['wave','Saludar'],['none','Sin movimiento'],['dance','Bailar'],['walk','Caminar']],
} as const satisfies Record<string,readonly (readonly [string,string])[]>;
export const AVATAR_COLORS=[['skin','Tono de piel'],['hairColor','Color del cabello'],['eyeColor','Color de los ojos'],['shirtColor','Color de la ropa'],['bottomColor','Color del pantalón o falda'],['shoesColor','Color del calzado'],['lipColor','Color de labios']] as const;
const pick=<K extends keyof typeof AVATAR_CHOICES>(k:K,v:unknown,fallback:string)=>{const keys=AVATAR_CHOICES[k].map(o=>o[0]) as string[];return (keys.includes(v as string)?v:fallback) as never;};
/** Normaliza un avatar de cualquier origen: solo catálogos cerrados y colores hex de 6 dígitos llegan al dibujo. */
export function normalizeAvatar(a:Partial<AvatarConfig>|null|undefined,accent=DEFAULT_AVATAR.shirtColor):AvatarConfig{
 const x=(a&&typeof a==='object'?a:{}) as Record<string,unknown>,D=DEFAULT_AVATAR;
 return {skin:color(x.skin,D.skin),hairColor:color(x.hairColor,D.hairColor),shirtColor:color(x.shirtColor,accent),eyeColor:color(x.eyeColor,D.eyeColor),bottomColor:color(x.bottomColor,D.bottomColor),shoesColor:color(x.shoesColor,D.shoesColor),
  hair:pick('hair',x.hair,'wave'),outfit:pick('outfit',x.outfit,'hoodie'),accessory:pick('accessory',x.accessory,'none'),expression:option(x.expression,['smile','calm','happy'],'smile'),motion:pick('motion',x.motion,'float'),presentation:pick('presentation',x.presentation,'neutral'),face:pick('face',x.face,'oval'),body:pick('body',x.body,'classic'),facialHair:pick('facialHair',x.facialHair,'none'),
  gesture:pick('gesture',x.gesture,'idle'),mood:pick('mood',x.mood??(x.expression==='happy'?'happy':x.expression==='calm'?'calm':'smile'),'smile'),gear:pick('gear',x.gear,'none'),bottom:pick('bottom',x.bottom,'jeans'),shoes:pick('shoes',x.shoes,'sneakers'),makeup:pick('makeup',x.makeup,'none'),marks:pick('marks',x.marks,'none'),lipColor:color(x.lipColor,D.lipColor)};
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
export function themeVars(t:ProfileTheme):Record<string,string>{const accent=readable(t.accent,t.background,5.5),text=readable('#f3f4ff',t.background,5.5);return {'--pf-accent':accent,'--pf-bg':t.background,'--pf-bg2':mix(t.background,luminance(text)>.5?'#000000':'#ffffff',.08),'--pf-text':text,'--pf-on-accent':readable('#05060d',accent),'--pf-font':FONTS[t.font].family};}

export function sectionStyle(t:ProfileTheme,key:ProfileSection){const sec=t.sections[key];return {backgroundColor:sec.background,color:readable(sec.text,sec.background),'--pf-section-accent':readable(t.accent,sec.background)};}

export const splitList=(v:string)=>v.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
export function graphemes(value:string):string[]{return Array.from(new Intl.Segmenter('es',{granularity:'grapheme'}).segment(value),x=>x.segment);}
export function limitNickname(value:string,max=40):string{let out='';for(const part of graphemes(value)){if(Array.from(out+part).length>max)break;out+=part;}return out;}
export const avatarOf=(p:Pick<Profile,'name'|'nickname'>)=>graphemes(p.nickname||'').find(x=>/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(x))||graphemes(p.name).filter(n=>n.trim()).slice(0,2).join('').toUpperCase();

// Tonos de piel de muy claro a muy oscuro, con subtonos fríos, neutros y cálidos.
export const SKIN_TONES=[['#fbe3d3','Porcelana'],['#f4cfb4','Claro rosado'],['#eac09a','Claro dorado'],['#d9a57f','Trigueño claro'],['#c68c62','Canela'],['#b0774f','Trigueño'],['#94603d','Moreno'],['#7a4b2e','Moreno profundo'],['#5c3620','Ébano'],['#3f2516','Ébano profundo']] as const;
export const HAIR_COLORS=[['#111018','Negro'],['#2b1d16','Castaño oscuro'],['#5a3a22','Castaño'],['#8a5a2b','Caramelo'],['#c49a5b','Rubio oscuro'],['#e8c879','Rubio'],['#a8402a','Cobrizo'],['#d9d4cf','Canoso'],['#8896f5','Lila'],['#eea2f3','Rosa'],['#5fcd9e','Verde menta']] as const;
export const EYE_COLORS=[['#3b2a25','Café oscuro'],['#6b4226','Café'],['#8a6a3a','Avellana'],['#4f7a4a','Verde'],['#4a6f9a','Azul'],['#6b7280','Gris']] as const;
export const LIP_COLORS=[['#b4475e','Frambuesa'],['#8e2f4f','Vino'],['#c2566f','Rosa intenso'],['#d98c8c','Nude rosado'],['#9b5a43','Canela'],['#6b2b3a','Ciruela']] as const;
const preset=(name:string,a:Partial<AvatarConfig>)=>({name,avatar:{...DEFAULT_AVATAR,...a}});
export const AVATAR_PRESETS={
 creativa:preset('Creativa · locs',{presentation:'feminine',skin:'#7a4b2e',hair:'locs',hairColor:'#111018',face:'heart',body:'curvy',outfit:'blouse',shirtColor:'#8896f5',bottom:'skirt',bottomColor:'#1f2340',shoes:'flats',shoesColor:'#eea2f3',gear:'hoops',makeup:'full',lipColor:'#8e2f4f',mood:'happy',motion:'wave'}),
 fundadora:preset('Fundadora · hiyab',{presentation:'feminine',skin:'#c68c62',gear:'hijab',hairColor:'#2b1d16',face:'oval',outfit:'blazer',shirtColor:'#5fcd9e',bottom:'trousers',bottomColor:'#202432',shoes:'boots',shoesColor:'#2b1d16',makeup:'lashes',mood:'smile',gesture:'hips',motion:'float'}),
 dev:preset('Dev · rizos y gafas',{presentation:'feminine',skin:'#eac09a',hair:'coily',hairColor:'#5a3a22',face:'round',outfit:'hoodie',shirtColor:'#eea2f3',accessory:'glasses',marks:'freckles',makeup:'lips',lipColor:'#c2566f',bottom:'jeans',mood:'grin',motion:'dance'}),
 lider:preset('Líder · turbante',{presentation:'feminine',skin:'#5c3620',gear:'headwrap',hairColor:'#111018',face:'heart',body:'soft',outfit:'dress',shirtColor:'#fcc368',shoes:'flats',shoesColor:'#5fcd9e',makeup:'full',lipColor:'#9b2f45',mood:'smile',gesture:'wave',motion:'wave'}),
 analista:preset('Analista · bob',{presentation:'feminine',skin:'#fbe3d3',hair:'bob',hairColor:'#a8402a',outfit:'cardigan',shirtColor:'#8896f5',bottom:'skirt',bottomColor:'#334155',shoes:'flats',gear:'pearls',marks:'mole',makeup:'lips',mood:'calm',motion:'float'}),
 masculine:preset('Masculino · urbano',{presentation:'masculine',hair:'undercut',face:'square',body:'athletic',outfit:'jacket',facialHair:'stubble',motion:'walk'}),
 builder:preset('Builder · fade',{presentation:'masculine',skin:'#94603d',hair:'fade',hairColor:'#111018',face:'oval',outfit:'tee',shirtColor:'#5fcd9e',facialHair:'beard',gear:'chain',mood:'smirk',motion:'walk'}),
 neutral:preset('Neutro · explorador',{hair:'afro',accessory:'glasses',shirtColor:'#22b89a',motion:'dance'}),
};
/** Equivalente compatible con la ruta de guardado anterior (onboarding). Debe coincidir con save_profile_avatar_v4. */
export function legacyAvatar(a:AvatarConfig):AvatarConfig{
 const hair:Record<string,AvatarConfig['hair']>={locs:'braids',coily:'afro',longwavy:'long',sidepart:'crop',buzz:'fade',highpuff:'bun'},outfit:Record<string,AvatarConfig['outfit']>={blouse:'tee',jumpsuit:'overalls',cardigan:'jacket'},gear:Record<string,AvatarConfig['gear']>={hijab:'none',headwrap:'none',hearing:'none',hoops:'earrings',flower:'bow',pearls:'chain'};
 return {...a,hair:hair[a.hair]||a.hair,outfit:outfit[a.outfit]||a.outfit,gear:gear[a.gear]||a.gear,face:a.face==='heart'?'oval':a.face,body:a.body==='curvy'?'soft':a.body,makeup:'none',marks:'none',lipColor:DEFAULT_AVATAR.lipColor};
}
export const needsAvatarV4=(a:AvatarConfig)=>JSON.stringify(legacyAvatar(a))!==JSON.stringify({...a,makeup:'none',marks:'none',lipColor:DEFAULT_AVATAR.lipColor})||a.makeup!=='none'||a.marks!=='none'||a.lipColor!==DEFAULT_AVATAR.lipColor;
