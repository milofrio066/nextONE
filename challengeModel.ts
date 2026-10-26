import type {Content} from './types';
export type Criterion={label:string;weight:number};
export type ChallengeRules={content_id?:string;instructions:string;deliverables:string;criteria:Criterion[];phase:'accepting'|'review'|'completed';participant_limit:number|null;allow_updates:boolean};
export const DEFAULT_RULES:ChallengeRules={instructions:'',deliverables:'',criteria:[{label:'Solución al problema',weight:40},{label:'Evidencia y validación',weight:30},{label:'Calidad de la demostración',weight:30}],phase:'accepting',participant_limit:null,allow_updates:true};
export function challengeStatus(c:Content,r?:ChallengeRules,now=Date.now()):'draft'|'scheduled'|'open'|'closed'|'review'|'completed'{if(!c.published)return 'draft';if(r?.phase==='completed')return 'completed';if(r?.phase==='review')return 'review';if(c.starts_at&&new Date(c.starts_at).getTime()>now)return 'scheduled';if(!c.ends_at||new Date(c.ends_at).getTime()<=now)return 'closed';return 'open';}
export const STATUS_NAMES={draft:'Borrador',scheduled:'Próximamente',open:'Abierto',closed:'Plazo finalizado',review:'En revisión',completed:'Finalizado'};
export function rubricScore(criteria:Criterion[],scores:number[]):number{return criteria.reduce((n,c,i)=>n+c.weight*(scores[i]||0)/100,0);}
