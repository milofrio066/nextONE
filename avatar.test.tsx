// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ProfileAvatar from './ProfileAvatar';
import {AVATAR_CHOICES,DEFAULT_AVATAR,normalizeAvatar,resolveTheme} from './profileThemes';
import type {Profile} from './types';
const person=(avatar:Record<string,unknown>):Profile=>({id:'u',name:'Ana Pérez',bio:'',skills:'',role:'member',status:'active',source:'',created_at:'',theme:{avatar} as Profile['theme']});
const render=(avatar:Record<string,unknown>)=>renderToStaticMarkup(<ProfileAvatar person={person(avatar)}/>);
describe('avatar ampliado',()=>{
 it('cada opción del catálogo se dibuja sin errores ni valores indefinidos',()=>{
  for(const [key,values] of Object.entries(AVATAR_CHOICES))for(const [value] of values){const html=render({[key]:value});expect(html,`${key}=${value}`).toContain('<svg');expect(html).not.toMatch(/undefined|NaN/);}
 });
 it('valores desconocidos o maliciosos vuelven a los predeterminados y nunca llegan al SVG',()=>{
  const bad={hair:'<script>alert(1)</script>',outfit:'x" onload="1',gesture:'javascript:1',mood:'../',gear:'</svg><img src=x>',bottom:{a:1},shoes:null,skin:'red',hairColor:'url(#x)',shirtColor:'#12',bottomColor:'"><svg/onload=1>',shoesColor:'expression(1)',eyeColor:'#GGGGGG'};
  const n=normalizeAvatar(bad as never);expect(n.hair).toBe('wave');expect(n.outfit).toBe('hoodie');expect(n.gesture).toBe('idle');expect(n.mood).toBe('smile');expect(n.gear).toBe('none');expect(n.bottom).toBe('jeans');expect(n.shoes).toBe('sneakers');expect(n.skin).toBe(DEFAULT_AVATAR.skin);expect(n.bottomColor).toBe(DEFAULT_AVATAR.bottomColor);
  const html=render(bad);expect(html).not.toMatch(/<script|onload|javascript:|<img|expression\(/i);
 });
 it('conserva la compatibilidad: un avatar anterior sin campos nuevos se ve igual de válido',()=>{
  const legacy={skin:'#cf9569',hairColor:'#262033',shirtColor:'#8b5cf6',hair:'crop',outfit:'jacket',accessory:'glasses',expression:'happy',motion:'wave'};
  const a=resolveTheme({theme:{avatar:legacy} as Profile['theme']}).avatar;expect(a).toMatchObject({hair:'crop',outfit:'jacket',accessory:'glasses',mood:'happy',gesture:'idle',bottom:'jeans',shoes:'sneakers'});expect(render(legacy)).toContain('avatar-wave');
 });
 it('los gestos y la expresión cambian el dibujo',()=>{expect(render({gesture:'wave'})).toContain('gesture-wave');expect(render({gesture:'idle'})).not.toContain('class="gesture-wave"');expect(render({mood:'surprised'})).not.toBe(render({mood:'smile'}));expect(render({gesture:'victory'})).not.toBe(render({gesture:'idle'}));});
 it('el nombre accesible no incluye marcado',()=>{expect(render({})).toContain('aria-label="Avatar personalizable de Ana Pérez"');});
});
