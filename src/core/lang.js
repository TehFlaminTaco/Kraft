import {A,chkS,ELEM,F,LIM,ar,chk,cmp,fmt,isInt,key,nrm,num,pj,setBudget,tick,truthy,zero} from './runtime.js';
import {NAMES,SG} from './builtins.js';
import {rules} from './rewrite.js';
import {wtabOf} from './weights.js';
import {opts,opts0,st0} from './types.js';
import {decLit,encLit,mkdec,pack,sbits} from './coder.js';
// ===== source <-> tokens =====
const CONSTS=new Set(['0','1','2','10']);
function litKind(t){if(/^\d+$/.test(t))return CONSTS.has(t)?null:'#I';if(t[0]=='"')return'#S';if(t[0]!='[')return null;let v;try{v=pj(t)}catch(e){throw Error('bad list literal '+t)}
 if(!Array.isArray(v))throw Error('bad list literal '+t);if(v.every(x=>isInt(x)))return'#L';if(v.every(x=>Array.isArray(x)&&x.every(y=>isInt(y))))return'#M';if(v.every(x=>typeof x=='string'))return'#W';throw Error('list literals hold integers, lists of integers, or strings')}
function lex(src){const ts=src.match(/"(?:[^"\\]|\\.)*"|\[(?:[^\[\]"]|"(?:[^"\\]|\\.)*"|\[[^\[\]]*\])*\]|\S+/g)||[],m=[];
 for(let i=0;i<ts.length;i++){const t=ts[i];if(t=='}'&&ts[i+1]){m.push('}'+ts[++i]);continue}if(/^-\d+$/.test(t)){m.push(t.slice(1),'neg');continue}m.push(t)}
 // rewrite redundant sequences (matched by token kind, longest first) until none is left
 const RW=rules(),kd=m.map(t=>litKind(t)||t);
 for(let ch=1,it=0;ch;){ch=0;if(++it>1e5)throw Error('rewrite rules do not terminate');
  for(let i=0;i<m.length&&!ch;i++)for(const L of[3,2]){const w=kd.slice(i,i+L),r=i+L<=m.length&&RW[w.join(' ')];if(r){m.splice(i,L,...r.map(k=>k[0]=='#'?m[i+w.indexOf(k)]:k));kd.splice(i,L,...r);ch=1;break}}}
 return m}
const show=t=>t[0]=='#'?t.slice(2):t.length>1&&t[0]=='}'?'} '+t.slice(1):t;
const kindOf=t=>t[0]=='#'?t.slice(0,2):t;
function compile(src,I,O){let st=st0(I);const steps=[],costs=[],toks=[];
 try{const m=lex(src);
  for(const t of m){const kind=litKind(t)||t,o=opts(st,I,O,toks.length>=LIM),i=o.findIndex(x=>x[0]==kind);
   if(i<0){const known=NAMES.includes(t)||/^(\{[2xac]?|\}\w+)$/.test(t)||kind[0]=='#';const v=o.map(x=>x[0]);
    return{err:`'${t}' is not valid here (stack [${st.f.at(-1)}]${st.bs.length?' inside a block':''}${known?'':', unknown token'}). Valid: ${v.slice(0,60).join(' ')}${v.length>60?' …':''}`}}
   const s0=steps.length;{const wt=wtabOf(o);steps.push([wt.M,wt.W[i],wt.C[i]])}let tok=t;
   if(kind[0]=='#'){const v=kind=='#I'?nrm(BigInt(t)):pj(t);encLit(kind,v,steps);tok=kind+(kind=='#I'?String(v):fmt(v))}
   toks.push(tok);costs.push([show(tok),steps.slice(s0).reduce((a,x)=>a+sbits(x),0)]);st=o[i][1]}}
 catch(e){return{err:e.message}}
 const o=opts(st,I,O,toks.length>=LIM);
 if(!o.length||o[0][0]!='END')return{err:`program ends with stack [${st.f.at(-1)}]${st.bs.length?' (unclosed block)':''}, need [${O}]`};
 {const wt=wtabOf(o);steps.push([wt.M,wt.W[0],0])}return{toks,bytes:pack(steps),costs,bits:costs.reduce((a,c)=>a+c[1],0)}}
function decode(bytes,I,O){try{return decode1(bytes,I,O)}catch(e){return null}}
function decode1(bytes,I,O){let n=0n;for(const b of bytes)n=n*256n+BigInt(b);const d=mkdec(n);let st=st0(I);const out=[];
 for(let s=0;s<80;s++){const o=opts(st,I,O,out.length>=LIM);if(!o.length)return null;const i=d.w(wtabOf(o)),t=o[i][0];if(t=='END')return out;
  if(t[0]=='#'){const v=decLit(t,d);out.push(t+(t=='#I'?String(v):fmt(v)))}else out.push(t);st=o[i][1]}
 return null}
// ===== typed execution: replay the type rules to pick each overload =====
function annotate(toks,I){let st=st0(I);const ann=[];
 for(const t of toks){const k=kindOf(t),o=opts0(st,I,'?',false),x=o.find(z=>z[0]==k);if(!x)throw Error('ill-typed program at '+show(t));ann.push([t,x[2]]);st=x[1]}
 return ann}
function tree(ann){const root=[],st=[root];
 for(const[t,info]of ann){if(t[0]=='{')st.push([]);else if(t[0]=='}'){const b=st.pop();st.at(-1).push({b,info})}
  else if(t[0]=='#')st.at(-1).push({lit:t[1]=='I'?nrm(BigInt(t.slice(2))):pj(t.slice(2))});
  else if(t=='n'||t=='m'||t=='k')st.at(-1).push({arg:{n:1,m:2,k:3}[t]});
  else st.at(-1).push({t,si:info})}
 return root}
function ev(p,s,args){for(const nd of p){tick();
 if(nd.b){const{k,C,r,m}=nd.info,f=x=>{tick();const z=ev(nd.b,x,args);return z[z.length-1]};
  if(k=='first'){let x=s.pop();while(!truthy(f([x])))x=ar('+',x,1);s.push(x)}
  else if(k=='fix'){let x=s.pop();for(;;){const y=f([x]);if(key(y)==key(x))break;x=y}s.push(x)}
  else if(k=='trace'){let x=s.pop();const out=[x],seen=new Set([key(x)]);for(;;){const y=f([x]),ky=key(y);if(seen.has(ky))break;seen.add(ky);out.push(y);x=y}s.push(chk(out))}
  else if(k=='fold'||k=='folds'){let acc=s.pop();const a=A(s.pop()),out=[];for(const x of a){acc=f([acc,x]);if(k=='folds')out.push(acc)}s.push(k=='fold'?acc:chk(out))}
  else if(k=='firstn'){let x=s.pop();const n=num(s.pop()),out=[];while(out.length<n){if(truthy(f([x])))out.push(x);x=ar('+',x,1)}s.push(chk(out))}
  else if(k=='times'){let x=s.pop();const n=num(s.pop());for(let i=0;i<n;i++)x=f([x]);s.push(x)}
  else{const a=A(s.pop()),cap=m=='c'?[s.pop()]:[],g=x=>f([...cap,x]);
   if(k=='map'){const res=a.map(x=>g(x));s.push(C=='S'&&r=='S'?chkS(res.join('')):res)}
   else if(k=='filter')s.push(F(a.filter(x=>truthy(g(x))),C));
   else if(k=='sortby')s.push(F(a.map((x,i)=>[g(x),i,x]).sort((p,q)=>cmp(p[0],q[0])||p[1]-q[1]).map(e=>e[2]),C));
   else if(k=='find'){const x=a.find(y=>truthy(g(y)));s.push(x===undefined?zero(ELEM[C]):x)}
   else if(k=='count')s.push(a.filter(y=>truthy(g(y))).length);
   else if(k=='reduce')s.push(a.length?a.slice(1).reduce((acc,x)=>f([acc,x]),a[0]):zero(ELEM[C]));
   else{let acc;s.push(F(a.map((x,i)=>i?acc=f([acc,x]):acc=x),C))}}}
 else if('lit'in nd)s.push(nd.lit);
 else if(nd.arg)s.push(args[args.length-nd.arg]);
 else{const[i,o,f]=SG(nd.t)[nd.si],a=s.splice(s.length-i.length),r=f(...a);o.length==1?s.push(r):s.push(...r)}}
 return s}
function exec(toks,I,args,budget=5e6){setBudget(budget);return ev(tree(annotate(toks,I)),[...args],args)}
const run=(toks,I,args,b)=>{const s=exec(toks,I,args,b);return s.length==1?s[0]:s};
const runv=(toks,I,v,b)=>run(toks,I,I.length==1?[v]:v,b);
const okv=(v,T)=>T.length==1?(T=='I'?typeof v=='bigint'||typeof v=='number'&&isFinite(v):T=='S'?typeof v=='string':T=='L'?Array.isArray(v)&&v.every(x=>okv(x,'I')):T=='M'?Array.isArray(v)&&v.every(x=>okv(x,'L')):Array.isArray(v)&&v.every(x=>typeof x=='string')):Array.isArray(v)&&v.length==T.length&&[...T].every((t,j)=>okv(v[j],t));
const same=(a,b)=>typeof a=='number'&&typeof b=='number'&&!(Number.isInteger(a)&&Number.isInteger(b))?Math.abs(a-b)<1e-9:fmt(a)==fmt(b);

export {CONSTS,litKind,lex,show,kindOf,compile,decode,decode1,annotate,tree,ev,exec,run,runv,okv,same};
