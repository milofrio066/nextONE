import {useId,useState,type ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
import './viz.css';
// Gráficos de Makers: lila, verde, rosa y amarillo en orden fijo (validados para daltonismo en claro y oscuro, ver viz.css).
// Cada gráfico lleva texto alternativo y una tabla accesible; el color nunca es la única señal.
export type Tone=1|2|3|4;
export const fmt=(v:number|null|undefined,digits=0)=>v===null||v===undefined||Number.isNaN(v)?'—':Number(v).toLocaleString('es-CO',{maximumFractionDigits:digits});
const pct=(part:number,total:number)=>total?part/total*100:0;

export function Sparkline({values,tone=1}:{values:number[];tone?:Tone}){
 const id=useId().replace(/:/g,'');if(values.length<2)return null;
 const max=Math.max(1,...values),w=120,h=36,step=w/(values.length-1),pts=values.map((v,i)=>[i*step,h-2-(v/max)*(h-6)] as const);
 const line=pts.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' ');
 return <svg className={'viz-spark tone-'+tone} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" preserveAspectRatio="none"><defs><linearGradient id={id} x2="0" y2="1"><stop stopColor="currentColor" stopOpacity=".35"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path d={`${line} L${w} ${h} L0 ${h}Z`} fill={`url(#${id})`}/><path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/></svg>;
}

export function KpiTile({label,value,note,tone=1,icon:Icon,spark,trend}:{label:string;value:string;note?:string;tone?:Tone;icon?:LucideIcon;spark?:number[];trend?:ReactNode}){
 return <article className={'viz-kpi tone-'+tone}><header>{Icon&&<span className="viz-kpi-icon"><Icon size={20} aria-hidden="true"/></span>}<small>{label}</small></header><strong className={/\d/.test(value)||value==='—'?undefined:'is-text'}>{value}</strong>{trend}{note&&<p>{note}</p>}{spark&&<Sparkline values={spark} tone={tone}/>}</article>;
}

export function Gauge({value,display,label,note,tone=1}:{value:number|null;display:string;label:string;note?:string;tone?:Tone}){
 const r=42,c=2*Math.PI*r,v=value===null?0:Math.max(0,Math.min(100,value));
 return <figure className={'viz-gauge tone-'+tone}><svg viewBox="0 0 100 100" role="img" aria-label={`${label}: ${value===null?'sin datos':display}`}><circle cx="50" cy="50" r={r} className="viz-track"/><circle cx="50" cy="50" r={r} className="viz-arc" strokeDasharray={`${c*v/100} ${c}`} transform="rotate(-90 50 50)"/></svg><div className="viz-gauge-center"><strong>{value===null?'—':display}</strong></div><figcaption><b>{label}</b>{note&&<small>{note}</small>}</figcaption></figure>;
}

type Slice={label:string;value:number};
/** Dona de composición: hasta cuatro partes con nombre y el resto agrupado en «Otros». */
export function Donut({data,label,center}:{data:Slice[];label:string;center?:string}){
 const [hover,setHover]=useState<number|null>(null);
 const sorted=data.filter(d=>d.value>0).sort((a,b)=>b.value-a.value),slices=sorted.length>4?[...sorted.slice(0,3),{label:'Otros',value:sorted.slice(3).reduce((t,d)=>t+d.value,0)}]:sorted;
 const total=slices.reduce((t,d)=>t+d.value,0),r=40,c=2*Math.PI*r,gap=total&&slices.length>1?1.6:0;let acc=0;
 const active=hover===null?null:slices[hover];
 if(!total)return <figure className="viz-donut empty"><figcaption>{label}</figcaption><p>Aún no hay datos para este período.</p></figure>;
 return <figure className="viz-donut"><figcaption>{label}</figcaption><div className="viz-donut-body"><svg viewBox="0 0 100 100" role="img" aria-label={label+': '+slices.map(s=>`${s.label} ${fmt(pct(s.value,total),1)}%`).join(', ')}>{slices.map((s,i)=>{const len=c*s.value/total,dash=Math.max(0,len-gap),offset=-acc;acc+=len;return <circle key={s.label} cx="50" cy="50" r={r} className={'viz-slice '+(s.label==='Otros'?'tone-other':'tone-'+(i+1))+(hover===i?' is-active':'')} strokeDasharray={`${dash} ${c-dash}`} strokeDashoffset={offset} transform="rotate(-90 50 50)" tabIndex={0} onPointerEnter={()=>setHover(i)} onPointerLeave={()=>setHover(null)} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)}><title>{`${s.label}: ${fmt(s.value)} (${fmt(pct(s.value,total),1)}%)`}</title></circle>;})}</svg><div className="viz-donut-center" aria-hidden="true"><strong>{active?fmt(pct(active.value,total),0)+'%':fmt(total)}</strong><small>{active?active.label:center||'Total'}</small></div></div>
 <ul className="viz-legend">{slices.map((s,i)=><li key={s.label} className={hover===i?'is-active':''} onPointerEnter={()=>setHover(i)} onPointerLeave={()=>setHover(null)}><i className={s.label==='Otros'?'tone-other':'tone-'+(i+1)}/><span>{s.label}</span><b>{fmt(s.value)}</b><small>{fmt(pct(s.value,total),0)}%</small></li>)}</ul></figure>;
}

/** Barras horizontales de un solo tono: la longitud es la magnitud y el valor va escrito al final. */
export function BarList({rows,label,tone=1,unit='',empty='Aún no hay datos.',max}:{rows:{label:string;value:number;note?:string}[];label:string;tone?:Tone;unit?:string;empty?:string;max?:number}){
 const top=max??Math.max(1,...rows.map(r=>r.value));
 return <figure className={'viz-bars tone-'+tone}><figcaption>{label}</figcaption>{rows.length?<ul>{rows.map(r=><li key={r.label} title={`${r.label}: ${fmt(r.value,1)}${unit}`}><span className="viz-bar-label">{r.label}{r.note&&<small>{r.note}</small>}</span><span className="viz-bar-track"><i style={{width:Math.max(r.value?2:0,pct(r.value,top))+'%'}}/></span><b>{fmt(r.value,1)}{unit}</b></li>)}</ul>:<p>{empty}</p>}</figure>;
}

/** Columnas verticales con su valor visible: para distribuciones cortas como una escala de 1 a 5. */
export function Columns({rows,label,tone=2,note}:{rows:{label:string;value:number}[];label:string;tone?:Tone;note?:string}){
 const top=Math.max(1,...rows.map(r=>r.value)),total=rows.reduce((t,r)=>t+r.value,0);
 return <figure className={'viz-columns tone-'+tone}><figcaption>{label}</figcaption><div className="viz-columns-plot" role="img" aria-label={label+': '+rows.map(r=>`${r.label} ${r.value}`).join(', ')}>{rows.map(r=><div key={r.label} className="viz-col" title={`${r.label}: ${fmt(r.value)} (${fmt(pct(r.value,total),0)}%)`}><b>{fmt(r.value)}</b><span><i style={{height:pct(r.value,top)+'%'}}/></span><small>{r.label}</small></div>)}</div>{note&&<p className="viz-note">{note}</p>}</figure>;
}

/** Embudo: cada paso muestra cuántas personas siguen y qué porcentaje conserva del primero. */
export function Funnel({steps,label}:{steps:{label:string;value:number}[];label:string}){
 const first=Math.max(1,steps[0]?.value||0);
 return <figure className="viz-funnel"><figcaption>{label}</figcaption><ol>{steps.map((s,i)=><li key={s.label} className={'tone-'+((i%4)+1)}><span className="viz-funnel-bar" style={{width:Math.max(6,pct(s.value,first))+'%'}}><b>{fmt(s.value)}</b></span><span>{s.label}{i>0&&<small>{fmt(pct(s.value,first),0)}% del inicio</small>}</span></li>)}</ol></figure>;
}

type Point={x:string;values:number[]};
/** Área de una o dos series en la misma unidad, con línea guía y detalle del día al pasar el cursor o con el teclado. */
export function AreaTrend({points,series,label,height=180}:{points:Point[];series:string[];label:string;height?:number}){
 const id=useId().replace(/:/g,''),[at,setAt]=useState<number|null>(null);
 const w=600,h=height,pad=8,max=Math.max(1,...points.flatMap(p=>p.values)),step=points.length>1?(w-pad*2)/(points.length-1):0;
 const X=(i:number)=>pad+i*step,Y=(v:number)=>h-22-(v/max)*(h-40);
 const path=(k:number)=>points.map((p,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(p.values[k]||0).toFixed(1)).join(' ');
 if(!points.length)return <figure className="viz-area"><figcaption>{label}</figcaption><p>Aún no hay actividad en este período.</p></figure>;
 const move=(clientX:number,box:DOMRect)=>{const rel=(clientX-box.left)/box.width*w;setAt(Math.max(0,Math.min(points.length-1,Math.round((rel-pad)/(step||1)))));};
 const cur=at===null?null:points[at],ticks=[0,.5,1].map(f=>Math.round(max*f));
 return <figure className="viz-area"><figcaption>{label}</figcaption>{series.length>1&&<ul className="viz-legend inline">{series.map((s,k)=><li key={s}><i className={'tone-'+(k+1)}/><span>{s}</span></li>)}</ul>}
 <div className="viz-area-plot"><svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${label}. Máximo ${fmt(max)}.`} tabIndex={0}
  onPointerMove={e=>move(e.clientX,e.currentTarget.getBoundingClientRect())} onPointerLeave={()=>setAt(null)}
  onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();setAt(v=>Math.min(points.length-1,(v??-1)+1));}if(e.key==='ArrowLeft'){e.preventDefault();setAt(v=>Math.max(0,(v??points.length)-1));}if(e.key==='Escape')setAt(null);}}>
  <defs>{series.map((_,k)=><linearGradient key={k} id={id+k} x2="0" y2="1"><stop className={'tone-'+(k+1)} stopColor="currentColor" stopOpacity=".32"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient>)}</defs>
  {ticks.map(t=><line key={t} className="viz-grid" x1="0" x2={w} y1={Y(t)} y2={Y(t)} vectorEffect="non-scaling-stroke"/>)}
  {series.map((_,k)=><g key={k} className={'tone-'+(k+1)}><path d={`${path(k)} L${X(points.length-1)} ${h-22} L${X(0)} ${h-22}Z`} fill={`url(#${id+k})`}/><path d={path(k)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></g>)}
  {cur&&<line className="viz-cross" x1={X(at!)} x2={X(at!)} y1="6" y2={h-22} vectorEffect="non-scaling-stroke"/>}
 </svg>{cur&&<div className="viz-tip" style={{left:`clamp(70px, ${X(at!)/w*100}%, calc(100% - 70px))`}} role="status"><b>{cur.x}</b>{series.map((s,k)=><span key={s}><i className={'tone-'+(k+1)}/>{s}: {fmt(cur.values[k])}</span>)}</div>}
 <div className="viz-axis" aria-hidden="true"><span>{points[0].x}</span><span>{points.at(-1)!.x}</span></div></div>
 <table className="mx-sr"><caption>{label}</caption><thead><tr><th>Fecha</th>{series.map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{points.map(p=><tr key={p.x}><td>{p.x}</td>{p.values.map((v,k)=><td key={k}>{v}</td>)}</tr>)}</tbody></table></figure>;
}
