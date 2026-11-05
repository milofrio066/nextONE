// Encuestas de comunidad: tipos y validación del lado del cliente. La base (024) vuelve a validar todo.
export type Audience='makers'|'peers'|'community';
export type Question={id:string;type:'single'|'multiple'|'scale'|'text';prompt:string;options?:string[];required?:boolean};
export type QuestionResult={id:string;type:Question['type'];counts?:number[];average?:number|null;answered?:number;texts?:string[]};
export type Poll={id:string;title:string;description:string;questions:Question[];audience:Audience;segment:string|null;anonymous:boolean;show_results:boolean;status:'draft'|'open'|'closed';closes_at:string|null;created_at:string;answered:boolean;can_manage:boolean;results:{responses:number;questions:QuestionResult[]}|null};
export type PollDraft={id:string|null;title:string;description:string;audience:Audience;segment:string;anonymous:boolean;show_results:boolean;status:Poll['status'];closes_at:string;questions:Question[];locked?:boolean};
export const AUDIENCE_LABEL:Record<Audience,string>={community:'Makers + peers',makers:'Solo makers',peers:'Solo peers'};
export const POLL_TYPES:Record<Question['type'],string>={single:'Opción única',multiple:'Varias opciones',scale:'Escala 1 a 5',text:'Respuesta abierta'};
export function blankQuestion(type:Question['type'],n:number,taken:string[]=[]):Question{
 let i=n,id='p'+i;while(taken.includes(id))id='p'+(++i);
 return {id,type,prompt:'',required:true,...(type==='single'||type==='multiple'?{options:['','']}:{})};
}
/** Devuelve los problemas en lenguaje claro, en el orden en que la persona los verá. */
export function pollIssues(d:PollDraft):string[]{
 const out:string[]=[];
 if(d.title.trim().length<3)out.push('Escribe un título de al menos 3 caracteres.');
 if(!d.questions.length||d.questions.length>12)out.push('Una encuesta tiene entre 1 y 12 preguntas.');
 d.questions.forEach((q,i)=>{
  if(q.prompt.trim().length<3)out.push(`La pregunta ${i+1} necesita un enunciado.`);
  if(q.type==='single'||q.type==='multiple'){const opts=(q.options||[]).map(o=>o.trim());if(opts.length<2||opts.some(o=>!o))out.push(`Completa al menos dos opciones en la pregunta ${i+1}.`);else if(new Set(opts).size!==opts.length)out.push(`La pregunta ${i+1} tiene opciones repetidas.`);}
 });
 if(d.segment.trim()&&d.segment.trim().length<2)out.push('El segmento debe tener al menos 2 caracteres.');
 return out;
}
/** Filas para gráficos y CSV a partir del resultado agregado de una pregunta. */
export function resultRows(q:Question,r:QuestionResult|undefined):{label:string;value:number}[]{
 if(!r)return [];
 if(q.type==='scale')return [1,2,3,4,5].map((n,i)=>({label:String(n),value:Number(r.counts?.[i]||0)}));
 if(q.type==='text')return [{label:'Respuestas abiertas',value:Number(r.answered||0)}];
 return (q.options||[]).map((o,i)=>({label:o,value:Number(r.counts?.[i]||0)}));
}
