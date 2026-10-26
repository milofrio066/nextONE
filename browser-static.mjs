import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
export async function serveBuild(context){
 await context.route('http://127.0.0.1:4173/**',async route=>{
  const url=new URL(route.request().url());if(url.pathname.startsWith('/api/')){await route.fallback();return;}const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
  const target=path.resolve(root,relative);if(!target.startsWith(path.resolve(root)+path.sep)){await route.abort();return;}
  try{const body=await fs.readFile(target),types={'.json':'application/json','.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};await route.fulfill({status:200,contentType:types[path.extname(target)]||'application/octet-stream',body});}catch{await route.fulfill({status:404,body:'Not found'});}
 });
}
