import {fmt,nrm,pj,setBudget} from './runtime.js';
import {DD,opts,st0} from './types.js';
import {wtabOf} from './weights.js';
import {WORDS} from './words.js';
import {encI,sbits} from './coder.js';
import {compile,ev,run,runv,same,show,tree} from './lang.js';
// ===== program search: best-first over typed programs, cheapest estimated bits first =====
// fast structural hash (two 32-bit lanes) and deep equality, used instead of JSON in the search
function hv(v,h){if(v==null){h[0]^=0xdead;return}if(typeof v=='number'){if(Number.isInteger(v)&&Math.abs(v)<2**31){h[0]=Math.imul(h[0]^v,16777619);h[1]=Math.imul(h[1]+v,2246822519)}else{const s=String(v);for(let i=0;i<s.length;i++){h[0]=Math.imul(h[0]^s.charCodeAt(i),16777619);h[1]=Math.imul(h[1]+s.charCodeAt(i),2246822519)}}h[0]^=0x9e37;return}
 if(typeof v=='string'){h[0]=Math.imul(h[0]^0x51,16777619);for(let i=0;i<v.length;i++){h[0]=Math.imul(h[0]^v.charCodeAt(i),16777619);h[1]=Math.imul(h[1]+v.charCodeAt(i),3266489917)}h[1]^=v.length;return}
 if(typeof v=='bigint'){hv(String(v),h);h[0]^=0x77;return}
 h[0]=Math.imul(h[0]^(0x5bd1+v.length),16777619);for(const x of v)hv(x,h);h[1]=Math.imul(h[1]^0x3c,2246822519)}
const hashOuts=outs=>{const h=[2166136261,0x811c9dc5];for(const s of outs){h[0]=Math.imul(h[0]^0x2f,16777619);for(const v of s)hv(v,h)}return h[0]+':'+h[1]};
function deq(a,b){if(a===b)return true;const ta=typeof a,tb=typeof b;
 if((ta=='number'||ta=='bigint')&&(tb=='number'||tb=='bigint')){if(ta=='number'&&tb=='number')return Math.abs(a-b)<1e-9;return a==b}
 if(ta=='string'||tb=='string')return false;if(!Array.isArray(a)||!Array.isArray(b)||a.length!=b.length)return false;for(let i=0;i<a.length;i++)if(!deq(a[i],b[i]))return false;return true}
class Heap{constructor(){this.a=[]}get size(){return this.a.length}
 push(x){const a=this.a;a.push(x);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=x.f)break;a[i]=a[p];i=p}a[i]=x}
 pop(){const a=this.a,top=a[0],x=a.pop();if(a.length){let i=0;for(;;){let c=2*i+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=x.f)break;a[i]=a[c];i=c}a[i]=x}return top}}
const SLITS=[3,4,5,6,7,8,9,11,12,13,14,15,16,20,26,32,48,64,100];
const litBits=v=>{const s=[];encI(v,s);return s.reduce((a,x)=>a+sbits(x),0)};
// extra inputs for validation: random values of the right type plus mutations of the challenge's own inputs,
// labelled by a trusted reference program (so the search cannot just memorise the visible tests)
function rndVal(t,r){const ri=n=>Math.floor(r()*n),word=()=>WORDS[ri(300)];
 if(t=='I')return ri(60);if(t=='S')return r()<.5?Array.from({length:1+ri(3)},word).join(' '):Array.from({length:ri(8)},()=>'abcdefghij'[ri(10)]).join('');
 if(t=='L')return Array.from({length:ri(8)},()=>ri(25));if(t=='M')return Array.from({length:ri(5)},()=>rndVal('L',r));return Array.from({length:ri(5)},word)}
function mutate(v,t){if(t=='I')return typeof v=='number'&&Number.isInteger(v)?[v+1,v+3,v*2+1]:[];if(t=='S')return[[...v].reverse().join(''),v+v.slice(0,2)];
 if(t=='L'||t=='M'||t=='W')return[[...v].reverse(),v.concat(v.slice(0,1))];return[]}
function extraTests(c,refSrc,max=14){const r=compile(refSrc,c.I,c.O);if(r.err)return[];const out=[],seen=new Set(c.t.map(x=>fmt(x[0])));let sd=987654;const rnd=()=>(sd=(sd*1103515245+12345)&0x7fffffff)/0x7fffffff;
 const cands=[];for(const[i]of c.t)cands.push(...(c.I.length==1?mutate(i,c.I):c.I.split('').flatMap((t,j)=>mutate(i[j],t).map(m=>{const x=[...i];x[j]=m;return x}))));
 for(let k=0;k<40;k++)cands.push(c.I.length==1?rndVal(c.I,rnd):c.I.split('').map(t=>rndVal(t,rnd)));
 for(let k=cands.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[cands[k],cands[j]]=[cands[j],cands[k]]}
 for(const v of cands){if(out.length>=max)break;const key=fmt(v);if(seen.has(key))continue;seen.add(key);try{out.push([v,runv(r.toks,c.I,v,2e5)])}catch(e){}}
 return out}
function makeSearch(I,O,allTests,{maxTok=9,maxInner=3,lits=SLITS,H=2}={}){
 // search on small inputs (fast), verify every candidate on all of them
 const small=v=>{const t=fmt(v);return t.length<=40&&!/\d{4,}/.test(t)},tests=allTests.filter(([i])=>small(i)).slice(0,6);if(tests.length<3)tests.push(...allTests.slice(0,3));
 const heap=new Heap(),seen=new Map(),S={best:null,expanded:0,pushed:0,done:false};let DL=0;const STOP={};
 const one=O.length==1||O=='*',args=tests.map(([i])=>I.length==1?[i]:i),NC=new Map();
 const nodeOf=(t,info)=>{const k=t+'|'+info;let n=NC.get(k);if(!n){n=t[0]=='#'?{lit:t[1]=='I'?nrm(BigInt(t.slice(2))):pj(t.slice(2))}:t=='n'||t=='m'||t=='k'?{arg:{n:1,m:2,k:3}[t]}:{t,si:info};NC.set(k,n)}return n};
 const run1=(outs,nodes)=>{const r=[];for(let j=0;j<outs.length;j++){setBudget(2e4);const s=outs[j].slice();try{ev(nodes,s,args[j])}catch(e){return null}r.push(s)}return r};
 const ok=outs=>outs.every((s,j)=>(one?s.length==1:s.length==O.length)&&deq(one?s[0]:s,tests[j][1]));
 const verify=toks=>allTests.every(([i,o])=>{try{return same(run(toks,I,I.length==1?[i]:i,5e5),o)}catch(e){return false}});
 const consider=toks=>{const src=toks.map(show).join(' '),r=compile(src,I,O);if(!r.err&&verify(r.toks)&&(!S.best||r.bytes.length<S.best.bytes||(r.bytes.length==S.best.bytes&&r.bits<S.best.bits)))S.best={src,bytes:r.bytes.length,bits:r.bits}};
 const push=(nd)=>{if(Date.now()>DL)throw STOP;const dd=DD(nd.st.f,nd.st.bs,O);nd.f=nd.bits+H*(dd>=1e9?20:dd);
  if(nd.st.bs.length){const sig='B'+nd.toks.join(' ');if(seen.has(sig))return;seen.set(sig,nd.bits);heap.push(nd);S.pushed++;return}
  if(!nd.outs)return;const sig=nd.st.f.join('|')+'/'+hashOuts(nd.outs);
  if(seen.has(sig)&&seen.get(sig)<=nd.bits)return;seen.set(sig,nd.bits);
  if(ok(nd.outs)){const o=opts(nd.st,I,O,false);if(o.length&&o[0][0]=='END')consider(nd.toks)}
  heap.push(nd);S.pushed++};
 const start={bits:0,f:0,toks:[],st:st0(I),outs:args.map(a=>[...a])};heap.push(start);if(ok(start.outs))consider([]);
 S.step=ms=>{const t0=Date.now();DL=t0+ms;
  while(heap.size&&Date.now()-t0<ms){const nd=heap.pop();
   if(S.best&&nd.bits>=S.best.bytes*8+8)continue;
   try{const o=opts(nd.st,I,O,false);if(!o.length)continue;const WT=wtabOf(o),inB=nd.st.bs.length>0;
    if(!inB&&nd.toks.length>=maxTok)continue;S.expanded++;
    for(let oi=0;oi<o.length;oi++){const[t,st2,info]=o[oi];if(t=='END')continue;const b0=nd.bits+Math.log2(WT.M/WT.W[oi]);
     if(inB){if(t[0]=='{')continue;
      if(t[0]=='}'){const outs=run1(nd.base,[{b:tree(nd.body),info}]);push({bits:b0,toks:[...nd.toks,t],st:st2,outs});continue}
      if(nd.body.length>=maxInner)continue;
      const vs=t=='#I'?lits.map(v=>['#I'+v,litBits(v)]):t[0]=='#'?[]:[[t,0]];
      for(const[tt,xb]of vs)push({bits:b0+xb,toks:[...nd.toks,tt],st:st2,base:nd.base,body:[...nd.body,[tt,info]]});continue}
     if(t[0]=='}')continue;
     if(t[0]=='{'){push({bits:b0,toks:[...nd.toks,t],st:st2,base:nd.outs,body:[]});continue}
     if(t=='#I'){for(const v of lits){const tt='#I'+v;push({bits:b0+litBits(v),toks:[...nd.toks,tt],st:st2,outs:run1(nd.outs,[nodeOf(tt,null)])})}continue}
     if(t[0]=='#')continue;
     push({bits:b0,toks:[...nd.toks,t],st:st2,outs:run1(nd.outs,[nodeOf(t,info)])})}}
   catch(e){if(e!==STOP)throw e;heap.push(nd);break}}
  if(!heap.size)S.done=true;return S.done};
 return S}
function golf(I,O,tests,ms=5000,o={}){const S=makeSearch(I,O,tests,o);const t0=Date.now();while(!S.done&&Date.now()-t0<ms)S.step(200);return S}

export {hv,hashOuts,deq,Heap,SLITS,litBits,rndVal,mutate,extraTests,makeSearch,golf};
