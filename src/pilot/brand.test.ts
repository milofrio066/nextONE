import {describe,it,expect} from 'vitest';
import {contrast} from './contrast';
const {readFileSync}=await import(/* @vite-ignore */ String('node:fs'));
const css:string=readFileSync(new URL('./brand.css',import.meta.url),'utf8');
function tokens(selector:string){const block=css.slice(css.indexOf(selector+'{')).split('}')[0];return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):(#[0-9a-f]{6})(?=[;}]|$)/g)].map(m=>[m[1],m[2]]));}
const themes={oscuro:tokens(':root:not([data-theme=light])'),claro:tokens(':root[data-theme=light]')};
describe('Tokens de marca Makers',()=>{
 it('usa el verde del kit como acento en modo oscuro',()=>expect(themes.oscuro.accent).toBe('#5fcd9e'));
 for(const [name,t] of Object.entries(themes))it(`mantiene contraste AA en modo ${name}`,()=>{
  for(const background of [t.bg,t.surface,t.surface2])for(const color of [t.text,t.muted,t.accent])expect(contrast(color,background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(t['on-accent'],t.accent)).toBeGreaterThanOrEqual(4.5);
 });
});
