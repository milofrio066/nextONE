export type CvDraft={name:string;bio:string;skills:string;linkedin:string;github:string;portfolio:string};
// Deterministic suggestions only; never infer identity, membership, age or location.
export function cvSuggestions(text:string):CvDraft{
 const clean=text.replace(/\u0000/g,'').slice(0,100000),lines=clean.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
 const url=(re:RegExp)=>clean.match(re)?.[0]?.replace(/[).,;]+$/,'')||'';
 const known=['JavaScript','TypeScript','Python','React','Node.js','SQL','Excel','Power BI','Figma','UX','UI','Java','CSS','HTML','Marketing','Diseño','Ventas','Inglés','Análisis de datos','Machine Learning'];
 const skills=known.filter(k=>new RegExp('(^|[^a-záéíóúñ])'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-záéíóúñ]|$)','i').test(clean)).join(', ');
 const first=lines.find(v=>v.length>=5&&v.length<=100&&!/[@\d:/]|curr[ií]cul|resume|hoja de vida|perfil profesional/i.test(v))||'';
 const start=lines.findIndex(v=>/^(perfil|resumen|sobre m[ií]|profile|summary)/i.test(v));
 const bio=(start>=0?lines.slice(start+1,start+4):lines.filter(v=>v.length>70).slice(0,2)).join(' ').slice(0,2000);
 return {name:first,bio,skills,linkedin:url(/(?:https:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w%-]+/i),github:url(/(?:https:\/\/)?(?:www\.)?github\.com\/[\w-]+/i),portfolio:''};
}
