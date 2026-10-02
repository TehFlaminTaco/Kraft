// Suite statistics: pass/round-trip per challenge, plus dead% and distinctness of random bytestrings.
import {fmt} from './runtime.js';
import {compile,decode,runv,same} from './lang.js';
import {CH} from './challenges.js';
function stats(c){let seed=12345;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
 const probes=c.t.map(x=>x[0]);let dead=0,valid=0;const sigs=new Set(),N=200;
 for(let k=0;k<N;k++){const L=1+Math.floor(rnd()*3),b=Array.from({length:L},()=>Math.floor(rnd()*256)),d=decode(b,c.I,c.O);
  if(!d){dead++;continue}valid++;sigs.add(fmt(probes.map(p=>{try{return runv(d,c.I,p,1e4)}catch(e){return'E'}})))}
 return{dead:100*dead/N,distinct:valid?sigs.size/valid:0}}
function runAll(){return CH.map(c=>{const r=compile(c.src,c.I,c.O);if(r.err)return{c,err:r.err};
 const d=decode(r.bytes,c.I,c.O),rt=fmt(d)==fmt(r.toks);let pass=0;
 for(const[i,o]of c.t)try{if(same(runv(d||[],c.I,i),o))pass++}catch(e){}
 return{c,r,rt,pass,st:stats(c)}})}

export {stats,runAll};
