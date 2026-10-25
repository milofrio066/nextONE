import {describe,it,expect} from 'vitest';
import {contrast,readable} from './contrast';
import {resolveTheme,sectionStyle,themeVars} from './profileThemes';
describe('Portfolio contrast independent from the application theme',()=>{
 it('preserves readable choices and repairs white on white and dark purple on dark backgrounds',()=>{
  expect(readable('#ffffff','#000000')).toBe('#ffffff');
  for(const [foreground,background] of [['#ffffff','#ffffff'],['#59277c','#080a14'],['#00e5ff','#ffffff'],['#ff0000','#121212']])expect(contrast(readable(foreground,background),background)).toBeGreaterThanOrEqual(4.5);
 });
 it('keeps text and accents readable across custom backgrounds and the card gradient',()=>{
  for(const background of ['#ffffff','#000000','#777777','#aa4422','#22ccaa','#eeeeee'])for(const accent of ['#ffffff','#000000','#00e5ff','#59277c','#ff0000']){
   const theme=resolveTheme({theme:{template:'custom',background,accent}}),vars=themeVars(theme);
   for(const bg of [vars['--pf-bg'],vars['--pf-bg2']])for(const fg of [vars['--pf-text'],vars['--pf-accent']])expect(contrast(fg,bg)).toBeGreaterThanOrEqual(4.5);
   expect(contrast(vars['--pf-on-accent'],vars['--pf-accent'])).toBeGreaterThanOrEqual(4.5);
  }
 });
 it('repairs section text without mutating the saved user choice',()=>{
  const theme=resolveTheme({theme:{sections:{hero:{background:'#ffffff',text:'#ffffff'}} as never}});
  const style=sectionStyle(theme,'hero');expect(contrast(style.color,style.backgroundColor)).toBeGreaterThanOrEqual(4.5);expect(theme.sections.hero.text).toBe('#ffffff');
 });
});
