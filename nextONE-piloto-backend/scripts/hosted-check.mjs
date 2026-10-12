import fs from 'node:fs/promises';
const env=Object.fromEntries((await fs.readFile('.env.local','utf8')).split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim()];}));
const base=env.VITE_SUPABASE_URL,headers={apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY};
const settings=await fetch(base+'/auth/v1/settings',{headers});const auth=await settings.json();console.log('Proveedores habilitados:',Object.entries(auth.external||{}).filter(([,v])=>v).map(([k])=>k).join(', '));
for(const table of ['profiles','content','event_access','feedback']){const response=await fetch(base+'/rest/v1/'+table+'?select=*&limit=1',{headers});const result=await response.json();console.log(table+': '+response.status+' '+(result.message||'respuesta recibida'));if(response.ok)throw new Error('El usuario anónimo no debe poder consultar '+table);if(result.code==='PGRST205')throw new Error('La tabla '+table+' aún no está instalada');}
