import {CalendarDays,Target,Lightbulb,ChevronDown,Layers} from 'lucide-react';
import InteractiveStory from './InteractiveStory';
import {decodeStory} from './storyModel';
import {templates} from './templates';
import type {Kind} from './types';
const headings=new Set((['event','webinar','resource','speaker','case','solution','project','update','post','builder'] as Kind[]).flatMap(k=>templates(k).flatMap(t=>t.steps)).map(s=>s.toLowerCase()));
export default function ContentStory({body}:{body:string}){
 if(decodeStory(body).layout)return <InteractiveStory body={body}/>;
 const blocks=body.split(/\n\s*\n/).map(text=>{const lines=text.trim().split('\n'),title=lines[0].replace(/:$/,'').trim();return {title:headings.has(title.toLowerCase())&&lines.length>1?title:null,text};});
 if(!blocks.some(b=>b.title))return <p className="preserve-lines">{body}</p>;
 return <div className="content-story">{blocks.filter(b=>!b.title).map((b,i)=><p className="preserve-lines" key={i}>{b.text}</p>)}<div className="story-grid">{blocks.filter(b=>b.title).map((b,i)=>{const Icon=/agenda|paso|hito/i.test(b.title!)?CalendarDays:/objetivo|criterio|alcance|resultado/i.test(b.title!)?Target:/hipótesis|problema|aprend/i.test(b.title!)?Lightbulb:Layers;return <details className="story-block" key={i} open={i===0}><summary><span className="story-icon"><Icon size={19}/></span><span><small>BLOQUE {String(i+1).padStart(2,'0')}</small><strong>{b.title}</strong></span><ChevronDown size={16}/></summary><p>{b.text.split('\n').slice(1).join('\n')}</p></details>;})}</div></div>;
}
