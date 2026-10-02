import {CONT,ELEM,LIST} from './runtime.js';
import {NAMES,SG} from './builtins.js';
import {BAN} from './rewrite.js';
// ===== options: every token valid in a state, with its typed effect =====
const OC=new Map(),OS=new Map();
function opts0(st,I,O,full){const ck=st.f.join('|')+'/'+st.bs.join('|')+'/'+st.p+'/'+I+'/'+O+'/'+(full?1:0);let r=OC.get(ck);if(r)return r;r=[];
 const Fr=st.f,B=st.bs,c=Fr.at(-1),lim=Math.max(5,I.length+2),nw=(f,p,bs=B)=>({f,bs,p});
 if(Fr.length==1&&(O=='*'?c.length==1:c==O))r.push(['END',null,null]);
 if(Fr.length>1&&c.length==1){const b=B.at(-1),C=b[0],md=b[1],o=Fr.at(-2),rest=Fr.slice(0,-2),bs=B.slice(0,-1),R=c,cl=(k,res,outer)=>r.push(['}'+k,nw([...rest,outer??o.slice(0,-1)+res],'}',bs),{k,C,r:R}]);
  if(md=='1'){if('ILS'.includes(R))cl('map',C=='S'&&R=='S'?'S':LIST[R]);if(R=='I'){cl('filter',C);cl('sortby',C);cl('find',ELEM[C]);cl('count','I')}}
  else if(md=='2'){if(R==ELEM[C]){cl('reduce',R);if(C!='S')cl('scan',C)}}
  else{const t=C;if(t=='I'&&R=='I')cl('first','I');if(R==t){cl('fix',t);if('ILS'.includes(t))cl('trace',LIST[t]);if(o.length>=2&&o.at(-2)=='I')cl('times',null,o.slice(0,-2)+t)}}}
 if(!full){
  if(Fr.length<3&&c.length){const top=c.at(-1);
   if(CONT.includes(top)){const E=ELEM[top];r.push(['{',nw([...Fr,E],'{',[...B,top+'1']),null]);r.push(['{2',nw([...Fr,E+E],'{',[...B,top+'2']),null])}
   r.push(['{x',nw([...Fr,top],'{',[...B,top+'x']),null])}
  for(const t of NAMES){const AI={n:1,m:2,k:3}[t];if(AI&&I.length<AI)continue;if(BAN[st.p]&&BAN[st.p].has(t))continue;
   const sigs=AI?[['',I.at(-AI)]]:SG(t);
   for(let si=0;si<sigs.length;si++){const[i,o]=sigs[si];if(c.length<i.length)continue;const top=c.slice(c.length-i.length),b={};let ok=1;
    for(let j=0;j<i.length;j++){if(i[j]<'a'){if(top[j]!=i[j]){ok=0;break}}else if(b[i[j]]&&b[i[j]]!=top[j]){ok=0;break}else b[i[j]]=top[j]}
    if(!ok)continue;const c2=c.slice(0,c.length-i.length)+[...o].map(x=>x<'a'?x:b[x]).join('');
    if(c2.length<=lim)r.push([t,nw([...Fr.slice(0,-1),c2],t),si]);break}}
  for(const k of['#I','#S','#L','#M','#W'])if(c.length<lim)r.push([k,nw([...Fr.slice(0,-1),c+k[1]],k),null])}
 OC.set(ck,r);return r}
// distance to a valid ending, over a small always-available move set (drop / push literal / single-token conversions)
const CONV={I:'LS',L:'ISM',S:'LIW',M:'LI',W:'SIL'},H1={},DM={};
function h1(c,t){const k=c+'>'+t;if(k in H1)return H1[k];const hit=x=>t=='*'?x.length==1:x==t;let q=[c];const seen=new Set(q);
 for(let d=0;d<14&&q.length;d++){const nq=[];for(const x of q){if(hit(x))return H1[k]=d;const nb=[];if(x.length)nb.push(x.slice(0,-1));if(x.length<5)for(const y of'ISL')nb.push(x+y);if(x.length)for(const y of CONV[x.at(-1)])nb.push(x.slice(0,-1)+y);for(const y of nb)if(!seen.has(y)){seen.add(y);nq.push(y)}}q=nq}
 return H1[k]=1e9}
function DD(Fr,B,O){const k=Fr.join('|')+'/'+B.join('|')+'/'+O;if(k in DM)return DM[k];let v=1e9;
 if(Fr.length==1)v=h1(Fr[0],O);
 else{const c=Fr.at(-1),b=B.at(-1),C=b[0],md=b[1],o=Fr.at(-2),rest=Fr.slice(0,-2),bs=B.slice(0,-1);
  const tc=(r,res,outer)=>{const a=h1(c,r);if(a>=1e9)return;v=Math.min(v,a+1+DD([...rest,outer??o.slice(0,-1)+res],bs,O))};
  if(md=='1'){for(const r of'ILS')tc(r,C=='S'&&r=='S'?'S':LIST[r]);tc('I',C);tc('I',ELEM[C]);tc('I','I')}
  else if(md=='2'){tc(ELEM[C],ELEM[C]);if(C!='S')tc(ELEM[C],C)}
  else{const t=C;if(t=='I')tc('I','I');tc(t,t);if('ILS'.includes(t))tc(t,LIST[t]);if(o.length>=2&&o.at(-2)=='I')tc(t,null,o.slice(0,-2)+t)}}
 return DM[k]=v}
function opts(st,I,O,full){const ck=st.f.join('|')+'/'+st.bs.join('|')+'/'+st.p+'/'+I+'/'+O+'/'+(full?1:0);let r=OS.get(ck);if(r)return r;
 r=opts0(st,I,O,full).map(x=>[x,x[1]?DD(x[1].f,x[1].bs,O):-1]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]);OS.set(ck,r);return r}
const st0=I=>({f:[I],bs:[],p:null});

export {OC,OS,opts0,CONV,H1,DM,h1,DD,opts,st0};
