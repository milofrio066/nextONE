import {describe,it,expect} from 'vitest';
import {challengeStatus,DEFAULT_RULES,rubricScore} from './challengeModel';import {periodRange,ratio,csvCell} from './analyticsModel';import {isRecoveryUrl,recoveryError,authMessage} from './authModel';import {resolveTheme,AVATAR_PRESETS} from './profileThemes';import type {Content,ProfileTheme} from './types';
describe('challenge lifecycle and evaluation',()=>{
 const now=Date.parse('2026-10-23T12:00:00Z'),base={published:true,starts_at:'2026-10-20T00:00:00Z',ends_at:'2026-10-24T00:00:00Z'} as Content;
 it('distinguishes draft, upcoming, open, closed and explicit review phases',()=>{expect(challengeStatus({...base,published:false},DEFAULT_RULES,now)).toBe('draft');expect(challengeStatus({...base,starts_at:'2026-10-24T00:00:00Z'},DEFAULT_RULES,now)).toBe('scheduled');expect(challengeStatus(base,DEFAULT_RULES,now)).toBe('open');expect(challengeStatus({...base,ends_at:new Date(now).toISOString()},DEFAULT_RULES,now)).toBe('closed');expect(challengeStatus(base,{...DEFAULT_RULES,phase:'review'},now)).toBe('review');expect(challengeStatus(base,{...DEFAULT_RULES,phase:'completed'},now)).toBe('completed');});
 it('computes official scores using the published weights',()=>{expect(rubricScore([{label:'A',weight:80},{label:'B',weight:20}],[2,5])).toBeCloseTo(2.6);});
});
describe('administrative report data',()=>{
 it('includes the entire last date in Colombia',()=>{expect(periodRange('2026-10-01','2026-10-23')).toEqual({from:'2026-10-01T05:00:00.000Z',until:'2026-10-24T05:00:00.000Z'});});
 it('rejects reversed, invalid and excessive periods',()=>{for(const [a,b] of [['bad','date'],['2026-10-23','2026-10-22'],['2020-01-01','2026-10-23'],['2026-02-30','2026-03-04']])expect(()=>periodRange(a,b)).toThrow();});
 it('keeps missing denominators separate from zero percent',()=>{expect(ratio(0,0)).toBeNull();expect(ratio(0,5)).toBe(0);expect(ratio(3,5)).toBe(60);});
 it('neutralizes spreadsheet formulas, quotes and embedded separators',()=>{expect(csvCell(' =1+1').charCodeAt(1)).toBe(39);expect(csvCell('hello,world')).toBe('"hello,world"');expect(csvCell(null)).toBe('""');});
});
describe('password recovery and avatar compatibility',()=>{
 it('recognizes email reset links and error states',()=>{expect(isRecoveryUrl('https://example.com/?recovery=1')).toBe(true);expect(isRecoveryUrl('https://example.com/?token_hash=x&type=recovery')).toBe(true);expect(isRecoveryUrl('https://example.com/#type=recovery')).toBe(true);expect(recoveryError('https://example.com/#error_code=otp_expired')).toBe('otp_expired');expect(authMessage('otp_expired')).toContain('enlace venció');});
 it('preserves older profiles and all studio presets',()=>{expect(resolveTheme({theme:{} as ProfileTheme}).avatar.presentation).toBe('neutral');for(const preset of Object.values(AVATAR_PRESETS)){expect(resolveTheme({theme:{avatar:preset.avatar} as ProfileTheme}).avatar).toEqual(preset.avatar);}});
});
