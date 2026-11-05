// Catálogos cerrados del seguimiento por persona. Deben coincidir con save_member_intent (024).
export const GOALS=[['empleo','Conseguir empleo'],['emprender','Emprender'],['freelance','Trabajar como freelance'],['aprender_ia','Aprender IA'],['aprender_datos','Aprender datos'],['aprender_producto','Aprender producto'],['aprender_diseno','Aprender diseño'],['portafolio','Construir portafolio'],['networking','Conocer personas'],['liderazgo','Liderazgo'],['ingles','Mejorar inglés'],['comunidad','Aportar a la comunidad']] as const;
export const CHALLENGES=[['sin_idea','Aún no tengo una idea'],['validar_idea','Validar mi idea'],['habilidades_tecnicas','Habilidades técnicas'],['conseguir_clientes','Conseguir clientes'],['financiacion','Financiación'],['armar_equipo','Armar equipo'],['tiempo','Falta de tiempo'],['visibilidad','Visibilidad'],['buscar_empleo','Búsqueda de empleo'],['constancia','Constancia']] as const;
export const FORMATS=[['mentoria_grupal','Mentorías grupales'],['taller','Talleres prácticos'],['webinar','Webinars'],['reto','Retos y hackatones'],['networking','Networking'],['contenido','Contenido para ver a mi ritmo'],['proyecto_equipo','Proyectos en equipo']] as const;
export const AVAILABILITY=[['manana','Mañanas'],['tarde','Tardes'],['noche','Noches'],['fin_de_semana','Fines de semana']] as const;
export const STAGES=[['explorando','Explorando'],['idea','Tengo una idea'],['construyendo','Construyendo'],['lanzado','Ya lancé'],['empleo','Busco o cambio de empleo']] as const;
export const MAX_PICKS=4;
export type Intent={goals:string[];challenges:string[];formats:string[];availability:string[];stage:string;note:string;segment?:string|null;updated_at?:string|null};
export type IntentRow=Intent&{user_id:string;name:string;access_tier:'maker'|'subscriber';cohort:string|null;skills:string;interests:string[]|null;updated_at:string|null};
export const EMPTY_INTENT:Intent={goals:[],challenges:[],formats:[],availability:[],stage:'',note:''};
// Las etapas tienen su propio diccionario: «empleo» existe como objetivo y como etapa.
const dictionary=new Map<string,string>([...GOALS,...CHALLENGES,...FORMATS,...AVAILABILITY]),stages=new Map<string,string>(STAGES);
export const label=(key:string)=>dictionary.get(key)||key;
export const stageLabel=(key:string)=>stages.get(key)||key;
export const tierLabel=(tier:string)=>tier==='subscriber'?'Peer':'Maker';
export function toggle(list:string[],value:string,max=MAX_PICKS){return list.includes(value)?list.filter(v=>v!==value):list.length>=max?list:[...list,value];}
export const answered=(row:Pick<Intent,'goals'>)=>row.goals.length>0;

/** Cuenta cuántas personas eligieron cada opción, de mayor a menor. */
export function tally(rows:Intent[],field:'goals'|'challenges'|'formats'|'availability'){const counts=new Map<string,number>();for(const r of rows)for(const v of r[field])counts.set(v,(counts.get(v)||0)+1);return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([key,count])=>({key,label:label(key),count}));}

/** Parecido entre dos personas: retos y objetivos comunes pesan más que el formato y el horario. */
export function similarity(a:Intent,b:Intent){
 const j=(x:string[],y:string[])=>{if(!x.length&&!y.length)return 0;const s=new Set(x);const common=y.filter(v=>s.has(v)).length;return common/new Set([...x,...y]).size;};
 return j(a.challenges,b.challenges)*.4+j(a.goals,b.goals)*.3+j(a.formats,b.formats)*.15+j(a.availability,b.availability)*.1+(a.stage&&a.stage===b.stage?.05:0);
}
export type Group={theme:string;members:IntentRow[];cohesion:number};
/**
 * Arma grupos de mentoría por necesidad (alrededor de `size` personas) solo con quienes respondieron.
 * Voraz y determinista: cada grupo nace del reto más frecuente que aún queda sin cubrir y suma a quienes más se parecen.
 */
export function suggestGroups(rows:IntentRow[],size=10):Group[]{
 const pool=rows.filter(answered).slice().sort((a,b)=>a.name.localeCompare(b.name)),groups:Group[]=[];
 while(pool.length){
  const top=tally(pool,'challenges')[0]?.key||tally(pool,'goals')[0]?.key;
  const seedIndex=Math.max(0,pool.findIndex(r=>r.challenges.includes(top!)||r.goals.includes(top!)));
  const seed=pool.splice(seedIndex,1)[0],members=[seed];
  while(members.length<size&&pool.length){
   let best=0,score=-1;pool.forEach((r,i)=>{const s=members.reduce((t,m)=>t+similarity(r,m),0)/members.length;if(s>score){score=s;best=i;}});
   if(score<=0&&members.length>=Math.ceil(size/2))break;
   members.push(pool.splice(best,1)[0]);
  }
  let pairs=0,total=0;for(let i=0;i<members.length;i++)for(let k=i+1;k<members.length;k++){pairs++;total+=similarity(members[i],members[k]);}
  groups.push({theme:label(top||'comunidad'),members,cohesion:pairs?total/pairs:1});
 }
 // Un grupo muy pequeño al final se reparte entre los anteriores para no dejar a nadie casi solo.
 const last=groups.at(-1);if(groups.length>1&&last&&last.members.length<3){groups.pop();last.members.forEach((m,i)=>groups[i%groups.length].members.push(m));}
 return groups;
}
/** Filas para downloadCsv (analyticsModel ya escapa celdas y fórmulas). */
export function intentsTable(rows:IntentRow[]):string[][]{
 return [['Nombre','Tipo','Cohorte','Segmento','Objetivos','Retos','Formatos','Disponibilidad','Etapa','Nota','Actualizado'],...rows.map(r=>[r.name,tierLabel(r.access_tier),r.cohort||'',r.segment||'',r.goals.map(label).join('; '),r.challenges.map(label).join('; '),r.formats.map(label).join('; '),r.availability.map(label).join('; '),r.stage?stageLabel(r.stage):'',r.note,r.updated_at||''])];
}
