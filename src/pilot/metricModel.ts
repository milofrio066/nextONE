import type {Kind} from './types';
export type Metric={id:string;title:string;kind:Kind;registrations:number;attendance:number;access_clicks:number;likes:number;dislikes:number;rating_count:number;average:number|null;comments:number;participants:number;submissions:number;average_minutes:number|null};
export function aggregateMetrics(data:Metric[]){
 const sum=(key:'registrations'|'attendance'|'access_clicks'|'likes'|'dislikes'|'submissions')=>data.reduce((a,m)=>a+Number(m[key]||0),0);
 const rated=data.filter(m=>m.average!==null&&Number(m.rating_count)>0),ratings=rated.reduce((a,m)=>a+Number(m.rating_count),0);
 const registrations=sum('registrations'),attendance=sum('attendance');
 return {registrations,attendance,access_clicks:sum('access_clicks'),likes:sum('likes'),dislikes:sum('dislikes'),submissions:sum('submissions'),ratings,attendanceRate:registrations?attendance/registrations*100:null,average:ratings?rated.reduce((a,m)=>a+Number(m.average)*Number(m.rating_count),0)/ratings:null};
}
