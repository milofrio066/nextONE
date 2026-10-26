import {useState} from 'react';
import {decodeStory} from './storyModel';
export default function InteractiveStory({body}:{body:string}){
 const {layout,blocks}=decodeStory(body);const [active,setActive]=useState(0),[checked,setChecked]=useState<number[]>([]);
 const index=Math.min(active,Math.max(0,blocks.length-1));
 if(!blocks.length)return <p>Agrega bloques para comenzar.</p>;
 return <section className={'interactive-story story-'+layout} aria-label="Experiencia interactiva">
 <div className="story-status"><span className="eyebrow">EXPLORA · APRENDE · CONSTRUYE</span><small>{layout==='checklist'?checked.length:index+1} / {blocks.length}</small></div>
 {layout==='checklist'?<><progress aria-label="Progreso personal" value={checked.length} max={blocks.length}/><p>Marca tu progreso personal durante esta visita.</p>{blocks.map((b,i)=><article className="story-task" key={i}><label><input type="checkbox" checked={checked.includes(i)} onChange={()=>setChecked(v=>v.includes(i)?v.filter(n=>n!==i):[...v,i])}/><strong>{b.title}</strong></label><p className="preserve-lines">{b.text}</p></article>)}</>:layout==='cards'?<div className="story-grid">{blocks.map((b,i)=><details className="story-block" key={i}><summary><small>{String(i+1).padStart(2,'0')}</small><strong>{b.title}</strong><span>Explorar +</span></summary><p className="preserve-lines">{b.text}</p></details>)}</div>:<>
 <div className="story-navigation" role="group" aria-label="Bloques del recorrido">{blocks.map((b,i)=><button type="button" className={index===i?'primary':'secondary'} aria-pressed={index===i} key={i} onClick={()=>setActive(i)}><span>{i+1}</span>{b.title}</button>)}</div>
 <article className="story-stage" aria-live="polite"><small>BLOQUE {String(index+1).padStart(2,'0')}</small><h2>{blocks[index].title}</h2><p className="preserve-lines">{blocks[index].text}</p></article>
 <div className="actions"><button type="button" className="secondary" disabled={index===0} onClick={()=>setActive(index-1)}>Anterior</button><progress aria-label="Progreso del recorrido" value={index+1} max={blocks.length}/><button type="button" className="primary" disabled={index===blocks.length-1} onClick={()=>setActive(index+1)}>Siguiente</button></div></>}
 </section>;
}
