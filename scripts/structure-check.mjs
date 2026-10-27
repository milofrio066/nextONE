import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const exists=p=>fs.existsSync(path.join(root,p));
const problems=[];
for(const p of ['src/main.tsx','src/pilot/PilotApp.tsx','src/pilot/backend.ts','package.json','index.html','supabase/migrations/021_member_monthly_visuals.sql'])if(!exists(p))problems.push('Falta '+p);
for(const p of ['src/src','src/scripts','src/supabase','src/package.json','nextONE/src'])if(exists(p))problems.push('Carpeta o archivo copiado en lugar incorrecto: '+p);
for(const name of fs.readdirSync(root))if(/\.(tsx|css|sql|mjs)$/.test(name))problems.push('Archivo fuera de su carpeta: '+name);
if(problems.length){console.error('La estructura del repositorio no es correcta:\n'+problems.map(p=>' - '+p).join('\n')+'\nReemplaza el contenido de la raíz con la carpeta limpia, conservando .git. No copies el paquete dentro de src.');process.exit(1);}
console.log('PASS estructura: una sola raíz, fuentes en src/pilot y migraciones en supabase/migrations.');
