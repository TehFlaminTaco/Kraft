// Builtin token table T: name -> list of [input shape, output shape, implementation] overloads.
import {A,BI,CAP,chkS,cn,CONT,ELEM,F,LIST,ar,base,bsqrt,chk,cmp,cost,fdiv,fmod,gcd,ipow,isB,isInt,isP,key,mn,mx,nrm,num,primesTo,seq,tick,truthy,ubase,zero,zipL} from './runtime.js';
const T={};
const add=(n,...sigs)=>{(T[n]||(T[n]=[])).push(...sigs)};
const U=(n,f0)=>{const f=a=>cn(f0(a));add(n,['I','I',f],['L','L',a=>a.map(f)],['M','M',a=>a.map(r=>r.map(f))])};
const B=(n,f0)=>{const f=(a,b)=>cn(f0(a,b));add(n,['II','I',f],['LI','L',(a,b)=>a.map(x=>f(x,b))],['IL','L',(a,b)=>b.map(y=>f(a,y))],['LL','L',(a,b)=>zipL(a,b,f)])};
const G=(n,cs,i,o,mk)=>{for(const C of cs){const sb=s=>s.replace(/C/g,C).replace(/E/g,ELEM[C]).replace(/R/g,LIST[C]||'');add(n,[sb(i),sb(o),mk(C)])}};
// stack and arguments
add('dup',['a','aa',a=>[a,a]]);add('swap',['ab','ba',(a,b)=>[b,a]]);add('drop',['a','',a=>[]]);
add('over',['ab','aba',(a,b)=>[a,b,a]]);add('rot',['abc','bca',(a,b,c)=>[b,c,a]]);add('if',['Iaa','a',(c,a,b)=>truthy(c)?a:b]);
for(const v of[0,1,2,10])add(String(v),['','I',()=>v]);
// scalar arithmetic, vectorised over lists
B('+',(a,b)=>ar('+',a,b));B('-',(a,b)=>ar('-',a,b));B('*',(a,b)=>ar('*',a,b));B('/',fdiv);B('div',(a,b)=>{b=num(b);return b?num(a)/b:0});
B('%',fmod);B('dvd',(a,b)=>b!=0&&fmod(a,b)==0?1:0);B('=',(a,b)=>+(a==b));B('<',(a,b)=>+(a<b));B('>',(a,b)=>+(a>b));
B('min2',mn);B('max2',mx);B('gcd',gcd);B('pow',ipow);
// bitwise on integers (non-integers are floored, non-finite values give 0)
const bw=f=>(a,b)=>{const I=x=>isInt(x)?BI(x):Number.isFinite(x)?BigInt(Math.floor(x)):null,x=I(a),y=I(b);return x==null||y==null?0:nrm(f(x,y))};
B('band',bw((x,y)=>x&y));B('bor',bw((x,y)=>x|y));B('bxor',bw((x,y)=>x^y));
B('ncr',(n,k)=>{n=num(n);k=num(k);if(k<0||k>n)return 0;k=Math.min(k,n-k);cost(k);let r=1n;for(let i=1;i<=k;i++)r=r*BigInt(n-k+i)/BigInt(i);return nrm(r)});
B('npr',(n,k)=>{n=num(n);k=num(k);if(k<0||k>n)return 0;cost(k);let r=1n;for(let i=0;i<k;i++){r*=BigInt(n-i);if(i%256==255)nrm(r)}return nrm(r)});
U('inc',a=>ar('+',a,1));U('dec',a=>ar('-',a,1));U('even',a=>+(isB(a)?a%2n==0n:a%2==0));U('neg',a=>isB(a)?nrm(-a):-a);U('abs',a=>isB(a)?(a<0n?-a:a):Math.abs(a));
U('sq',a=>ar('*',a,a));U('not',a=>+!truthy(a));U('sign',a=>a>0?1:a<0?-1:0);
U('issq',a=>{if(isB(a))return +(a>=0n&&bsqrt(a)**2n==a);if(!Number.isInteger(a)||a<0)return 0;let r=Math.floor(Math.sqrt(a));while(r*r>a)r--;while((r+1)*(r+1)<=a)r++;return +(r*r==a)});
U('dsum',a=>base(a,10).reduce((x,y)=>x+y,0));U('isint',a=>+isInt(a));U('frac',a=>fmod(a,1));
U('isqrt',a=>isB(a)?nrm(bsqrt(a<0n?0n:a)):a<0?0:Math.floor(Math.sqrt(a)));U('sqrt',a=>Math.sqrt(num(a)));U('floor',a=>isB(a)?a:Math.floor(a));U('ceil',a=>isB(a)?a:Math.ceil(a));U('round',a=>isB(a)?a:Math.round(a));U('prime',isP);
U('fact',n=>{n=num(n);if(n<0)return 0;if(n<=18){let r=1;for(let i=2;i<=n;i++)r*=i;return r}if(n>8000)throw Error('fact: n too large');cost(n*n/2e4);let r=1n;for(let i=2n;i<=BigInt(n);i++)r*=i;return r});
U('fib',n=>{n=num(n);if(n<=78){let a=0,b=1;for(let i=0;i<n;i++)[a,b]=[b,a+b];return a}if(n>100000)throw Error('fib: n too large');cost(n*n/2e5);let a=0n,b=1n;for(let i=0;i<n;i++)[a,b]=[b,a+b];return a});
U('nthp',k=>{k=num(k);let c=0,x=1;while(c<k){x++;tick();if(isP(x))c++}return k<1?0:x});
// numbers <-> lists
add('range',['I','L',n=>seq(1,n)],['L','M',l=>l.map(n=>seq(1,n))]);add('iota0',['I','L',n=>seq(0,n)]);
add('rng',['II','L',(a,b)=>{if(isB(a)||isB(b)){const n=num(ar('-',b,a)),s=n<0?-1:1,c=Math.abs(n)+1;if(c>CAP)throw Error('list longer than '+CAP);return Array.from({length:c},(_,i)=>ar('+',a,s*i))}return b<a?seq(a,a-b+1,-1):seq(a,b-a+1)}]);add('primes',['I','L',primesTo]);
add('divs',['I','L',n=>{if(isB(n))throw Error('divs: number too large');const r=[],s=[];cost(Math.sqrt(Math.max(n,0))/10);for(let d=1;d*d<=n;d++)if(n%d==0){r.push(d);if(d*d!=n)s.unshift(n/d)}return r.concat(s)}]);
add('pfac',['I','L',n=>{const r=[];if(isB(n)){let x=n;for(let p=2n;p*p<=x&&p<200000n;p++)while(x%p==0n){r.push(nrm(p));x/=p}if(x>1n)r.push(nrm(x));return r}if(n<2)return r;cost(Math.min(Math.sqrt(n),1e6)/10);for(let p=2;p*p<=n&&p<1e6;p++)while(n%p==0){r.push(p);n/=p}if(n>1)r.push(n);return r}]);
add('digits',['I','L',n=>base(n,10)],['L','M',l=>l.map(n=>base(n,10))]);add('undig',['L','I',l=>ubase(l,10)],['M','L',m=>m.map(l=>ubase(l,10))]);
add('base',['II','L',base]);add('ubase',['LI','I',ubase]);
const RW1=(n,f,z)=>add(n,['L','I',l=>l.length?f(l):z],['M','L',m=>m.map(l=>l.length?f(l):z)]);
RW1('sum',l=>l.reduce((a,b)=>ar('+',a,b),0),0);RW1('prod',l=>l.reduce((a,b)=>ar('*',a,b),1),1);RW1('max',l=>l.reduce(mx),0);RW1('min',l=>l.reduce(mn),0);
add('minmax',['L','L',l=>l.length?[l.reduce(mn),l.reduce(mx)]:[0,0]]);
RW1('all',l=>+l.every(truthy),1);RW1('any',l=>+l.some(truthy),0);
const cs=l=>{let a=0;return l.map(x=>a=ar('+',a,x))};add('cumsum',['L','L',cs],['M','M',m=>m.map(cs)]);
const dl=l=>l.slice(1).map((x,i)=>ar('-',x,l[i]));add('deltas',['L','L',dl],['M','M',m=>m.map(dl)]);
add('where',['L','L',l=>l.map((x,i)=>truthy(x)?i+1:0).filter(x=>x)]);
G('keep',CONT,'CL','C',C=>(v,m)=>F(A(v).filter((_,i)=>i<m.length&&truthy(m[i])),C));
add('grade',['L','L',l=>l.map((x,i)=>[x,i]).sort((a,b)=>cmp(a[0],b[0])||a[1]-b[1]).map(p=>p[1]+1)]);
// generic container operations (strings act as lists of characters)
G('len',CONT,'C','I',C=>v=>A(v).length);G('rev',CONT,'C','C',C=>v=>{cost(v.length/20);return F([...A(v)].reverse(),C)});G('sort',CONT,'C','C',C=>v=>{cost(A(v).length/10);return F([...A(v)].sort(cmp),C)});
G('uniq',CONT,'C','C',C=>v=>{cost(A(v).length/10);const s=new Set;return F(A(v).filter(x=>{const k=key(x);return s.has(k)?0:(s.add(k),1)}),C)});
G('head',CONT,'C','E',C=>v=>{const a=A(v);return a.length?a[0]:zero(ELEM[C])});G('last',CONT,'C','E',C=>v=>{const a=A(v);return a.length?a[a.length-1]:zero(ELEM[C])});
G('tail',CONT,'C','C',C=>v=>F(A(v).slice(1),C));G('init',CONT,'C','C',C=>v=>F(A(v).slice(0,-1),C));
G('cat',CONT,'CC','C',C=>(a,b)=>{cost((a.length+b.length)/20);return C=='S'?chkS(a+b):chk(a.concat(b))});
// all prefixes (shortest first) and suffixes (longest first)
const fixes=(C,pre)=>v=>{const a=A(v),n=a.length;if(n*(n+1)/2>CAP)throw Error('list longer than '+CAP);cost(n*(n+1)/40);return a.map((_,i)=>F(pre?a.slice(0,i+1):a.slice(i),C))};
G('prefixes','LS','C','R',C=>fixes(C,1));G('suffixes','LS','C','R',C=>fixes(C,0));
G('pal',CONT,'C','I',C=>v=>{const a=A(v);cost(a.length/20);for(let i=0,j=a.length-1;i<j;i++,j--)if(key(a[i])!=key(a[j]))return 0;return 1});
G('sortd',CONT,'C','C',C=>v=>{cost(A(v).length/10);return F([...A(v)].sort(cmp).reverse(),C)});
// multiset difference: each item of the second removes one matching item of the first
G('mdiff',CONT,'CC','C',C=>(a,b)=>{cost((A(a).length+A(b).length)/10);const m=new Map;for(const x of A(b)){const k=key(x);m.set(k,(m.get(k)||0)+1)}return F(A(a).filter(x=>{const k=key(x),c=m.get(k);if(c){m.set(k,c-1);return false}return true}),C)});
G('diff',CONT,'CC','C',C=>(a,b)=>{cost((A(a).length+A(b).length)/10);const s=new Set(A(b).map(key));return F(A(a).filter(x=>!s.has(key(x))),C)});
G('inter',CONT,'CC','C',C=>(a,b)=>{cost((A(a).length+A(b).length)/10);const s=new Set(A(b).map(key));return F(A(a).filter(x=>s.has(key(x))),C)});
G('pad','LS','CI','C',C=>(v,n)=>{const a=A(v);n=Math.floor(num(n));if(!(n>a.length))return v;if(n>CAP)throw Error('list longer than '+CAP);cost(n/20);return F(Array(n-a.length).fill(C=='S'?' ':0).concat(a),C)});
G('take',CONT,'CI','C',C=>(v,n)=>F(A(v).slice(0,Math.max(0,num(n))),C));G('skip',CONT,'CI','C',C=>(v,n)=>F(A(v).slice(Math.max(0,num(n))),C));
G('rotate',CONT,'CI','C',C=>(v,n)=>{n=num(n);const a=A(v);if(!a.length)return v;const k=((n%a.length)+a.length)%a.length;return F(a.slice(k).concat(a.slice(0,k)),C)});
G('rep',CONT,'CI','C',C=>(v,n)=>{n=Math.max(0,Math.floor(num(n)));const a=A(v);if(!a.length||!(n>0))return F([],C);if(a.length*n>CAP)throw Error('rep: too large');cost(a.length*n/20);return F(Array.from({length:n},()=>a).flat(),C)});
G('idx',CONT,'CI','E',C=>(v,i)=>{i=Math.floor(num(i));const a=A(v);return i>=1&&i<=a.length?a[i-1]:zero(ELEM[C])});
G('idx',CONT,'CL','C',C=>(v,l)=>{const a=A(v);return F(l.map(x=>Math.floor(num(x))).map(i=>i>=1&&i<=a.length?a[i-1]:zero(ELEM[C])),C)});
G('has',CONT,'CE','I',C=>C=='S'?(s,x)=>+s.includes(x):(a,x)=>{cost(a.length/10);const k=key(x);return +a.some(y=>key(y)==k)});
G('idxof',CONT,'CE','I',C=>C=='S'?(s,x)=>s.indexOf(x)+1:(a,x)=>{cost(a.length/10);const k=key(x);return a.findIndex(y=>key(y)==k)+1});
G('count',CONT,'CE','I',C=>C=='S'?(s,x)=>x?s.split(x).length-1:0:(a,x)=>{cost(a.length/10);const k=key(x);return a.filter(y=>key(y)==k).length});
G('eql',CONT,'CC','I',C=>(a,b)=>{cost((A(a).length+A(b).length)/20);return +(key(a)==key(b))});
G('wrap','LMW','E','C',C=>x=>[x]);G('pair','LMW','EE','C',C=>(x,y)=>[x,y]);
G('lens','MW','C','L',C=>v=>v.map(x=>A(x).length));G('flat','MW','C','E',C=>v=>{cost(v.length/10);return C=='W'?chkS(v.join('')):chk(v.flat())});
G('zip','MW','C','C',C=>v=>{const rows=v.map(A);cost(rows.reduce((t,r)=>t+r.length,0)/20);const n=rows.reduce((m,r)=>Math.max(m,r.length),0),out=[];for(let j=0;j<n;j++)out.push(F(rows.filter(r=>j<r.length).map(r=>r[j]),C=='W'?'S':'L'));return out});
G('sublists','LS','C','R',C=>v=>{const a=A(v),r=[];cost(a.length*(a.length+1)*(a.length+2)/60);for(let i=0;i<a.length;i++)for(let j=i+1;j<=a.length;j++)r.push(F(a.slice(i,j),C));return chk(r)});
G('perms','LS','C','R',C=>v=>{const a=A(v);if(a.length>9)throw Error('perms: at most 9 elements');let f=1;for(let i=2;i<=a.length;i++)f*=i;cost(f*a.length/10);const r=[],go=(p,rest)=>{if(!rest.length){r.push(F(p,C));return}for(let i=0;i<rest.length;i++){tick();go([...p,rest[i]],rest.slice(0,i).concat(rest.slice(i+1)))}};go([],a);return r});
G('powerset','LS','C','R',C=>v=>{const a=A(v);if(a.length>20)throw Error('powerset: at most 20 elements');cost((2**a.length)*(a.length+1)/20);const r=[];for(let m=0;m<1<<a.length;m++){tick();r.push(F(a.filter((_,i)=>m>>i&1),C))}return r});
G('combs','LS','CI','R',C=>(v,k)=>{k=num(k);const a=A(v),r=[],go=(s,p)=>{tick();if(p.length==k){r.push(F(p,C));return}for(let i=s;i<a.length;i++)go(i+1,[...p,a[i]])};if(k>=0)go(0,[]);return chk(r)});
G('windows','LS','CI','R',C=>(v,k)=>{k=num(k);const a=A(v),r=[];if(k<1)return r;cost(Math.max(0,a.length-k+1)*k/20);for(let i=0;i+k<=a.length;i++)r.push(F(a.slice(i,i+k),C));return r});
G('chunks','LS','CI','R',C=>(v,k)=>{k=num(k);const a=A(v),r=[];if(k<1)return[F(a,C)];for(let i=0;i<a.length;i+=k)r.push(F(a.slice(i,i+k),C));return r});
G('halves','LS','C','R',C=>v=>{const a=A(v),h=Math.ceil(a.length/2);return[F(a.slice(0,h),C),F(a.slice(h),C)]});
G('alt','LS','C','R',C=>v=>{const a=A(v);return[F(a.filter((_,i)=>i%2==0),C),F(a.filter((_,i)=>i%2),C)]});
G('group','LS','C','R',C=>v=>{const a=A(v),r=[];cost(a.length/10);for(const x of a){if(r.length&&key(r.at(-1).at(-1))==key(x))r.at(-1).push(x);else r.push([x])}return r.map(g=>F(g,C))});
G('bins','LS','C','R',C=>v=>{cost(A(v).length/10);const m=new Map;for(const x of A(v)){const k=key(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return[...m.values()].sort((p,q)=>cmp(p[0],q[0])).map(g=>F(g,C))});
G('cart','LS','CC','R',C=>(p,q)=>{const a=A(p),b=A(q),r=[];cost(a.length*b.length/5);for(const x of a)for(const y of b){tick();r.push(C=='S'?x+y:[x,y])}return chk(r)});
// strings
add('ord',['S','L',s=>[...s].map(c=>c.codePointAt(0))],['W','M',w=>w.map(s=>[...s].map(c=>c.codePointAt(0)))]);
const CH1=x=>String.fromCodePoint(Math.max(0,Math.min(Math.floor(num(x)),0x10ffff)));
add('chr',['L','S',l=>l.map(CH1).join('')],['I','S',CH1],['M','W',m=>m.map(l=>l.map(CH1).join(''))]);
add('str',['I','S',n=>String(n)],['L','W',l=>l.map(String)]);const pnum=s=>{const m=/^\s*-?\d{16,}/.exec(s);return m?nrm(BigInt(m[0].trim())):cn(parseFloat(s)||0)};add('num',['S','I',pnum],['W','L',w=>w.map(pnum)]);
add('up',['S','S',s=>s.toUpperCase()],['W','W',w=>w.map(s=>s.toUpperCase())]);add('low',['S','S',s=>s.toLowerCase()],['W','W',w=>w.map(s=>s.toLowerCase())]);
add('split',['SS','W',(s,d)=>s.split(d)]);add('join',['WS','S',(w,d)=>{cost(w.length/10);return chkS(w.join(d))}]);add('words',['S','W',s=>s.split(/\s+/).filter(x=>x)]);add('chars',['S','W',s=>[...s]]);
add('alpha',['','S',()=>'abcdefghijklmnopqrstuvwxyz']);add('ALPHA',['','S',()=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);add('digs',['','S',()=>'0123456789']);
const SG=t=>T[t];
const NAMES=['n','m','k',...Object.keys(T)];

export {T,add,U,B,G,RW1,cs,dl,CH1,pnum,SG,NAMES};
