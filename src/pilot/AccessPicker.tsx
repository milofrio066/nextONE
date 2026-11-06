import {useState} from 'react';
import {Eye,EyeOff,Lock,LogIn} from 'lucide-react';
import {ACCESS_OPTIONS,allowedFor,type AccessValue,type Tier} from './accessModel';
import './access.css';
const STATE={enter:{icon:LogIn,text:'Ven y entran'},see:{icon:Lock,text:'Lo ven bloqueado'},none:{icon:EyeOff,text:'No lo ven'}} as const;
/** Selector de acceso con una vista previa de lo que verá cada grupo. Conserva el nombre de campo access_scope. */
export default function AccessPicker({defaultValue,tier,staff,mentorship=false}:{defaultValue:string;tier:Tier;staff:boolean;mentorship?:boolean}){
 const [value,setValue]=useState<AccessValue>(()=>{const v=(ACCESS_OPTIONS.some(o=>o.value===defaultValue)?defaultValue:'makers') as AccessValue;return allowedFor(v,tier,staff)?v:tier==='subscriber'?'community':'makers';});
 const current=ACCESS_OPTIONS.find(o=>o.value===value)!;
 return <div className="access-picker"><label className="field">Quién puede ver y entrar<select name="access_scope" value={value} onChange={e=>setValue(e.target.value as AccessValue)}>{ACCESS_OPTIONS.filter(o=>!mentorship||!o.value.endsWith('_teaser')||staff).map(o=><option key={o.value} value={o.value} disabled={!allowedFor(o.value,tier,staff)}>{o.label}</option>)}</select></label>
  <div className="access-preview" aria-live="polite">{(['makers','peers'] as const).map(group=>{const state=current[group],S=STATE[state];return <div key={group} className={'access-group is-'+state}><span className="access-icon"><S.icon size={18} aria-hidden="true"/></span><div><strong>{group==='makers'?'Makers':'Peers'}</strong><small>{S.text}</small></div></div>;})}</div>
  <p className="access-note">{current.makers==='see'||current.peers==='see'?<><Eye size={14} aria-hidden="true"/> El grupo bloqueado ve el título, un resumen, la fecha y la portada, pero no puede abrir, inscribirse, comentar ni ver enlaces.</>:'La regla se aplica también en la base de datos, no solo en el menú. Los materiales vinculados heredan la restricción del contenido principal.'}</p></div>;
}
