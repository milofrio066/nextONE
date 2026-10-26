import {describe,it,expect} from 'vitest';
import {templates} from './templates';
import {decodeStory,encodeStory} from './storyModel';
import {aggregateMetrics,type Metric} from './metricModel';
import type {Kind} from './types';
describe('interactive content compatibility',()=>{
 for(const kind of ['event','webinar','resource','speaker','case','solution','project','update','post'] as Kind[]){
 it(kind+' preserves originals and includes five experiences',()=>{const all=templates(kind);expect(all).toHaveLength(8);expect(new Set(all.map(t=>t.id)).size).toBe(8);expect(all.slice(0,3).every(t=>!decodeStory(t.body).layout)).toBe(true);expect(new Set(all.slice(3).map(t=>t.layout)).size).toBe(5);for(const t of all.slice(3)){const parsed=decodeStory(t.body);expect(parsed.blocks.map(b=>b.title)).toEqual(t.steps);expect(t.body.length).toBeLessThan(12000);expect(encodeStory(parsed.layout!,parsed.blocks)).toBe(t.body);}});
 }
 it('preserves plain content and unknown markers',()=>{expect(decodeStory('Legacy body').text).toBe('Legacy body');expect(decodeStory('[nextONE:unknown]\nHello').layout).toBeNull();});
 it('round trips edited blocks',()=>{const blocks=[{title:'Nueva idea',text:'Primera línea\n\nSegunda línea'}];expect(decodeStory(encodeStory('slides',blocks)).blocks).toEqual(blocks);expect(decodeStory(encodeStory('cards',[{title:'',text:'Texto'}])).blocks[0].title).toBe('');});
});
describe('real metrics aggregation',()=>{
 const row=(average:number|null,rating_count:number,registrations=0,attendance=0)=>({average,rating_count,registrations,attendance,access_clicks:0,likes:0,dislikes:0,submissions:0} as Metric);
 it('weights ratings by response count, including numeric server values',()=>{expect(aggregateMetrics([row(5,1),row(1,3)]).average).toBe(2);});
 it('does not invent values without responses or registrations',()=>{expect(aggregateMetrics([]).average).toBeNull();expect(aggregateMetrics([row(null,0)]).attendanceRate).toBeNull();});
 it('calculates confirmed attendance per registration',()=>{expect(aggregateMetrics([row(null,0,10,4)]).attendanceRate).toBe(40);});
});
