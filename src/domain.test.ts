import { describe, it, expect } from 'vitest';
import { seed, invitationStatus, submitApplication, canEnter, canManage, reviewProject, safeUrl, type Application } from './domain';
const application = (invite = ''): Application => ({ id:'a', name:'Demo applicant', email:'test@example.com', skills:'React, TypeScript', portfolio:'https://example.com', linkedin:'https://example.com', cv:'', bio:'Demo', invite, source:'', state:'pending' });
describe('invitation admissions', () => {
  it('automatically admits founder, mentor and cohort referrals and preserves attribution', () => {
    for (const invite of seed.invites) {
      const state = submitApplication(structuredClone(seed), application(invite.id), new Date('2026-10-07'));
      expect(state.applications[0].state).toBe('approved');
      expect(state.people.at(-1)?.role).toBe('member');
      expect(state.people.at(-1)?.source).toContain(invite.label);
      expect(state.invites.find(i=>i.id===invite.id)?.used).toBe(1);
      expect(seed.invites.find(i=>i.id===invite.id)?.used).toBe(0);
    }
  });
  it('requires review for ordinary applications and review links', () => {
    const state = submitApplication(structuredClone(seed), application());
    expect(state.applications[0].state).toBe('pending');
    expect(state.people).toHaveLength(seed.people.length);
    const input = structuredClone(seed); input.invites[0].kind='review';
    expect(submitApplication(input, application(input.invites[0].id), new Date('2026-10-07')).applications[0].state).toBe('pending');
  });
  it('rejects invalid, exhausted, revoked and expired invitations without consuming quota', () => {
    expect(()=>submitApplication(structuredClone(seed),application('unknown'))).toThrow('invitation');
    for (const changes of [{used:10},{revoked:true},{expires:'2020-01-01T00:00:00Z'}]) {
      const state=structuredClone(seed);Object.assign(state.invites[0],changes);
      expect(()=>submitApplication(state,application(state.invites[0].id),new Date('2026-10-07'))).toThrow('invitation');
      expect(state.applications).toHaveLength(0);
    }
  });
  it('does not accept a duplicate email, including casing differences', () => {
    const state=submitApplication(structuredClone(seed),application());
    expect(()=>submitApplication(state,{...application(),email:'TEST@example.com'})).toThrow('duplicate');
  });
  it('makes expiration boundary unavailable',()=>expect(invitationStatus(seed.invites[0],new Date(seed.invites[0].expires))).toBe('expired'));
});
describe('demo access gates',()=>{
  it('isolates project work from unrelated members and visitors',()=>{
    expect(canEnter(seed.projects[0],seed.people.find(p=>p.id==='member'))).toBe(true);
    expect(canEnter(seed.projects[0],seed.people.find(p=>p.id==='mateo'))).toBe(false);
    expect(canEnter(seed.projects[0],undefined)).toBe(false);
    expect(canManage(seed.projects[0],seed.people.find(p=>p.id==='member'))).toBe(false);
  });
  it('blocks suspended collaborators, including their own projects',()=>{
    expect(canEnter(seed.projects[0],{...seed.people[0],status:'suspended'})).toBe(false);
  });
});
describe('assistant and external links',()=>{
  it('flags a similar project while requiring a differentiator',()=>{
    const result=reviewProject(seed.projects[0].title,seed.projects[0].summary,'',seed.projects);
    expect(result.similar[0].project.id).toBe('p1');expect(result.ready).toBe(false);
  });
  it('rejects executable and malformed URLs',()=>{
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();expect(safeUrl('data:text/html,test')).toBeUndefined();expect(safeUrl('not a url')).toBeUndefined();expect(safeUrl('https://example.com')).toBe('https://example.com/');
  });
});
