export type RosterPerson={id:string;name:string;access_tier:'maker'|'subscriber';status:'registered'|'attended'|'cancelled';created_at:string;confirmed_at:string|null;joined_at:string|null;surveyed:boolean};
export type Stage='pending'|'confirmed'|'attended'|'cancelled';
/** Etapa visible de cada persona: la asistencia verificada pesa más que la confirmación. */
export function personStage(p:Pick<RosterPerson,'status'|'confirmed_at'>):Stage{return p.status==='cancelled'?'cancelled':p.status==='attended'?'attended':p.confirmed_at?'confirmed':'pending';}
export function deskCounts(rows:RosterPerson[]){
 const c={pending:0,confirmed:0,attended:0,cancelled:0,joined:0,surveyed:0,active:0};
 for(const p of rows){const s=personStage(p);c[s]++;if(s!=='cancelled'){c.active++;if(p.joined_at)c.joined++;if(p.surveyed)c.surveyed++;}}
 return c;
}
