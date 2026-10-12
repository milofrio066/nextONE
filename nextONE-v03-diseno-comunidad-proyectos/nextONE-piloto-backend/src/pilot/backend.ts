import { createClient } from '@supabase/supabase-js';
const env=import.meta.env as Record<string,string|undefined>;
export const backendReady=!!env.VITE_SUPABASE_URL&&!!env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const googleLoginEnabled=env.VITE_GOOGLE_LOGIN_ENABLED==='true';
export const backend=backendReady?createClient(env.VITE_SUPABASE_URL!,env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{if(!backend)throw new Error('Configura Supabase para conectar la base de datos.');const {data,error}=await backend.rpc(name,args);if(error)throw error;return data as T;}
