import {backend} from './backend';

// Explicit stable ordering and bounded requests avoid Supabase's default row cap.
export async function readRows<T>(table:string, filters:Record<string,string>={}):Promise<T[]> {
 if(!backend)return [];
 const order:Record<string,string[]>={member_location:['user_id'],community_countries:['code'],challenge_rules:['content_id'],challenge_assessments:['solution_id'],editor_drafts:['user_id','draft_key'],interaction_progress:['content_id','user_id','revision','block_id'],feedback:['content_id','user_id'],registrations:['content_id','user_id'],attempts:['case_id','user_id'],project_members:['project_id','user_id'],event_organizers:['event_id','user_id'],content_pages:['content_id'],final_reviews:['content_id']};
 const result:T[]=[];
 for(let offset=0;;offset+=200){
  let query=backend.from(table).select('*');
  for(const [key,value] of Object.entries(filters))query=query.eq(key,value);
  for(const key of order[table]||['id'])query=query.order(key);
  const {data,error}=await query.range(offset,offset+199);
  if(error)throw error;
  const page=(data||[]) as T[];result.push(...page);
  if(page.length<200)return result;
 }
}

export async function readMetrics<T>():Promise<T[]>{
 if(!backend)return [];
 const result:T[]=[];
 for(let offset=0;;offset+=200){
  const {data,error}=await backend.rpc('content_metrics').order('id').range(offset,offset+199);
  if(error)throw error;
  const page=(data||[]) as T[];result.push(...page);if(page.length<200)return result;
 }
}

// Catalogue metadata is paginated by stable ID; long descriptions are fetched on opening a detail.
export async function readCatalog<T>():Promise<T[]>{if(!backend)return [];const all:T[]=[];for(let offset=0;;offset+=200){const {data,error}=await backend.rpc('content_catalog').order('id').range(offset,offset+199);if(error)throw error;all.push(...(data||[]) as T[]);if((data||[]).length<200)return all;}}
