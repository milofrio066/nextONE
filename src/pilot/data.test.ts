import {describe,expect,it,vi} from 'vitest';
const transport=vi.hoisted(()=>({calls:[] as {filters:Record<string,string>;order:string[];from:number;to:number}[],fail:false}));
vi.mock('./backend',()=>({backend:{from:()=>{const filters:Record<string,string>={},order:string[]=[];const query={select:()=>query,eq:(key:string,value:string)=>{filters[key]=value;return query;},order:(key:string)=>{order.push(key);return query;},range:async(from:number,to:number)=>{transport.calls.push({filters:{...filters},order:[...order],from,to});return transport.fail&&from>0?{data:null,error:Error('offline')}:{data:Array.from({length:Math.max(0,Math.min(450, to+1)-from)},(_,i)=>({id:from+i})),error:null};}};return query;}}}));
import {readRows} from './data';
describe('lectura paginada',()=>{
 it('recupera más de un límite de API y conserva filtros y orden estable en cada página',async()=>{transport.calls=[];transport.fail=false;const rows=await readRows('registrations',{user_id:'me'});expect(rows).toHaveLength(450);expect(transport.calls.map(c=>c.from)).toEqual([0,200,400]);for(const call of transport.calls){expect(call.filters).toEqual({user_id:'me'});expect(call.order).toEqual(['content_id','user_id']);expect(call.to-call.from).toBe(199);}});
 it('no presenta un resultado parcial como completo si falla una página',async()=>{transport.calls=[];transport.fail=true;await expect(readRows('content')).rejects.toThrow('offline');});
});
