import type {Profile,ProfileTheme} from './types';
export const THEMES:Record<ProfileTheme['template'],{name:string;accent:string;bg:string;bg2:string}>={
 neon:{name:'Neón',accent:'#00e5ff',bg:'#05060d',bg2:'#12062a'},
 aurora:{name:'Aurora',accent:'#8b7bff',bg:'#070814',bg2:'#0b2a3a'},
 ember:{name:'Brasa',accent:'#ff4d5e',bg:'#0b0506',bg2:'#2a0a10'},
 mono:{name:'Mono',accent:'#e8e8f0',bg:'#08080a',bg2:'#1a1a22'},
 custom:{name:'Propio',accent:'#39ff88',bg:'#060809',bg2:'#0c1a14'}
};
export const HEX=/^#[0-9a-fA-F]{6}$/;
export function resolveTheme(p:Pick<Profile,'theme'>):ProfileTheme{
 const t=p.theme||{};const template=(t.template&&t.template in THEMES?t.template:'neon') as ProfileTheme['template'];
 return {template,accent:t.accent&&HEX.test(t.accent)?t.accent:THEMES[template].accent,headline:t.headline||'',quote:t.quote||'',links:Array.isArray(t.links)?t.links.filter(l=>l&&typeof l.url==='string'&&l.url.startsWith('https://')).slice(0,4):[]};
}
export function themeVars(t:ProfileTheme):Record<string,string>{const base=THEMES[t.template];return {'--pf-accent':t.accent,'--pf-bg':base.bg,'--pf-bg2':base.bg2};}
export const avatarOf=(p:Pick<Profile,'name'|'nickname'>)=>p.nickname?.match(/\p{Extended_Pictographic}/u)?.[0]||p.name.split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase();
export const splitList=(v:string)=>v.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
