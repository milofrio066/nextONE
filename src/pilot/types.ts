export type Kind = 'event'|'webinar'|'resource'|'speaker'|'case'|'solution'|'project'|'update'|'post';
export type ProfileSection='hero'|'skills'|'interests'|'about'|'links';
export type AvatarConfig={skin:string;hairColor:string;shirtColor:string;hair:'crop'|'wave'|'curls'|'long'|'bald';outfit:'hoodie'|'jacket'|'tee';accessory:'none'|'glasses'|'headphones'|'cap';expression:'smile'|'calm'|'happy';motion:'float'|'wave'|'none'};
export type ProfileTheme = {template:'neon'|'aurora'|'ember'|'mono'|'custom';accent:string;headline:string;quote:string;links:{label:string;url:string;kind?:string}[];font:'modern'|'geometric'|'rounded'|'mono'|'editorial'|'display';titleStyle:'outline'|'solid'|'gradient';background:string;sections:Record<ProfileSection,{background:string;text:string}>;avatar:AvatarConfig};
export type Profile = {id:string;theme?:Partial<ProfileTheme>;name:string;bio:string;skills:string;role:'admin'|'organizer'|'mentor'|'member';status:'pending'|'active'|'suspended';source:string;nickname?:string;name_changes?:number;interests?:string[];cohort?:string;created_at:string};
export type Content = {id:string;kind:Kind;title:string;body:string;url:string|null;owner_id:string;parent_id:string|null;starts_at:string|null;ends_at:string|null;capacity:number|null;published:boolean;evaluator_id?:string|null;project_type?:'project'|'semillero';project_plan?:Record<string,string>;featured?:boolean;topics?:string[];methodology?:string;audience?:string;created_at:string};
export type Feedback = {content_id:string;user_id:string;reaction:-1|1|null;rating:number|null;updated_at:string};
export type Comment = {id:string;content_id:string;author_id:string;body:string;created_at:string};
export type Registration = {content_id:string;user_id:string;status:'registered'|'attended'|'cancelled';joined_at:string|null;created_at:string};
export type Attempt = {case_id:string;user_id:string;started_at:string;submitted_at:string|null;solution_id:string|null};
export type Invite = {id:string;token:string;label:string;recipient_email:string|null;max_uses:number;used:number;expires_at:string;revoked:boolean;direct:boolean};
export type Report = {id:string;user_id:string;content_id:string|null;comment_id:string|null;reason:string;resolved:boolean;decision:string;created_at:string};
export const labels = ['Nada útil','Poco útil','Me sirvió','Muy útil','Excelente'];
export function summarize(rows:Feedback[]){const ratings=rows.filter(f=>f.rating!==null).map(f=>f.rating!);return {likes:rows.filter(f=>f.reaction===1).length,dislikes:rows.filter(f=>f.reaction===-1).length,ratingCount:ratings.length,average:ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null,distribution:labels.map((_,i)=>ratings.filter(n=>n===i+1).length)};}
export function urlAllowed(value:string){if(!value)return true;try{const u=new URL(value);return u.protocol==='https:';}catch{return false;}}
