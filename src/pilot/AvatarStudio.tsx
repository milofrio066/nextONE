import {useState} from 'react';
import {Shuffle,Check} from 'lucide-react';
import ProfileAvatar from './ProfileAvatar';
import {AVATAR_CHOICES,AVATAR_PRESETS,EYE_COLORS,HAIR_COLORS,LIP_COLORS,SKIN_TONES} from './profileThemes';
import type {AvatarConfig,Profile} from './types';
import './peers.css';
type Key=keyof typeof AVATAR_CHOICES;
const TABS:{id:string;label:string;keys:[Key,string][];colors?:{key:keyof AvatarConfig;title:string;swatches?:readonly (readonly [string,string])[]}[]}[]=[
 {id:'rostro',label:'Rostro',keys:[['presentation','Rasgos'],['face','Forma del rostro'],['mood','Expresión'],['marks','Detalles de la piel'],['makeup','Maquillaje'],['facialHair','Vello facial']],colors:[{key:'skin',title:'Tono de piel',swatches:SKIN_TONES},{key:'eyeColor',title:'Color de ojos',swatches:EYE_COLORS},{key:'lipColor',title:'Color de labios',swatches:LIP_COLORS}]},
 {id:'cabello',label:'Cabello',keys:[['hair','Peinado']],colors:[{key:'hairColor',title:'Color del cabello',swatches:HAIR_COLORS}]},
 {id:'ropa',label:'Ropa',keys:[['body','Silueta'],['outfit','Parte superior'],['bottom','Parte inferior'],['shoes','Calzado']],colors:[{key:'shirtColor',title:'Color de la ropa'},{key:'bottomColor',title:'Color del pantalón o falda'},{key:'shoesColor',title:'Color del calzado'}]},
 {id:'accesorios',label:'Accesorios',keys:[['gear','Complementos'],['accessory','Accesorio']]},
 {id:'movimiento',label:'Pose',keys:[['gesture','Gesto'],['motion','Movimiento']]},
];
const any=<T,>(list:readonly T[]):T=>list[Math.floor(Math.random()*list.length)];
/** Estudio del avatar: puntos de partida diversos, pestañas por zona y muestras de color. Todo sale de catálogos cerrados. */
export default function AvatarStudio({person,avatar,set}:{person:Profile;avatar:AvatarConfig;set:(a:AvatarConfig)=>void}){
 const [tab,setTab]=useState('rostro'),current=TABS.find(t=>t.id===tab)!;
 const change=(key:keyof AvatarConfig,value:string)=>set({...avatar,[key]:value});
 const surprise=()=>{const next={...avatar} as Record<string,string>;for(const [key,values] of Object.entries(AVATAR_CHOICES))if(key!=='motion')next[key]=any(values as readonly (readonly [string,string])[])[0];next.skin=any(SKIN_TONES)[0];next.hairColor=any(HAIR_COLORS)[0];if(next.presentation==='feminine')next.facialHair='none';set(next as unknown as AvatarConfig);};
 return <div className="avatar-studio">
  <div className="avatar-stage"><ProfileAvatar person={{...person,theme:{...person.theme,avatar}}}/><button type="button" className="secondary" onClick={surprise}><Shuffle size={16}/> Sorpréndeme</button><small>Haz clic en el avatar para que reaccione.</small></div>
  <div className="avatar-tools"><h3>Crea tu avatar</h3><p>Empieza con un estilo y combina cualquier rasgo, sin restricciones de género.</p>
   <div className="avatar-presets">{Object.entries(AVATAR_PRESETS).map(([key,preset])=><button type="button" className="avatar-preset" key={key} onClick={()=>set({...preset.avatar,motion:avatar.motion})} aria-label={'Aplicar estilo '+preset.name}><ProfileAvatar compact person={{...person,theme:{...person.theme,avatar:preset.avatar}}}/><span>{preset.name}</span></button>)}</div>
   <div className="space-tabs avatar-tabs" role="tablist">{TABS.map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.label}</button>)}</div>
   <div role="tabpanel" className="avatar-panel">{current.keys.map(([key,title])=><fieldset key={key} className="avatar-group"><legend>{title}</legend><div className="avatar-chips">{AVATAR_CHOICES[key].map(([value,label])=><button type="button" key={value} className="avatar-chip" aria-pressed={avatar[key as keyof AvatarConfig]===value} onClick={()=>change(key as keyof AvatarConfig,value)}>{avatar[key as keyof AvatarConfig]===value&&<Check size={13} aria-hidden="true"/>}{label}</button>)}</div></fieldset>)}
    {current.colors?.map(({key,title,swatches})=><fieldset key={key} className="avatar-group"><legend>{title}</legend><div className="avatar-swatches">{swatches?.map(([hex,name])=><button type="button" key={hex} className="avatar-swatch" style={{background:hex}} aria-label={name} title={name} aria-pressed={String(avatar[key]).toLowerCase()===hex} onClick={()=>change(key,hex)}/>)}<label className="avatar-custom-color" title="Elegir otro color"><input type="color" aria-label={title+' personalizado'} value={String(avatar[key])} onChange={e=>change(key,e.target.value)}/><span>Otro</span></label></div></fieldset>)}
   </div></div></div>;
}
