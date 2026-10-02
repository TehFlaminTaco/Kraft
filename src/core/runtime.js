// Runtime basics: limits and the step budget, type tables, comparison/JSON helpers, exact integer arithmetic.
// ===== Kraft core: types I (number), S (string), L [I], M [[I]], W [S] =====
const LIM=40,CAP=1e6,MAXI=32767,LB=15;
let STEPS=0,BUDGET=5e6;
const tick=()=>{if(++STEPS>BUDGET)throw Error('step limit reached ('+BUDGET+' steps)')};
const setBudget=b=>{STEPS=0;BUDGET=b};
const cost=n=>{STEPS+=Math.ceil(n);if(STEPS>BUDGET)throw Error('step limit reached ('+BUDGET+' steps)')};
const ELEM={L:'I',M:'L',S:'S',W:'S'},LIST={I:'L',L:'M',S:'W'},CONT='LMSW';
const zero=t=>t=='I'?0:t=='S'?'':[];
const truthy=v=>typeof v=='number'?v!==0&&v===v:typeof v=='bigint'?v!=0n:v.length>0;
const fmt=v=>(JSON.stringify(v,(k,x)=>typeof x=='bigint'?'@@big:'+x:x)??'null').replace(/"@@big:(-?\d+)"/g,'$1'),key=fmt;
const cmp=(a,b)=>{if(typeof a!='string'&&!Array.isArray(a))return a<b?-1:a>b?1:0;if(typeof a=='string')return a<b?-1:a>b?1:0;for(let i=0;i<Math.min(a.length,b.length);i++){const c=cmp(a[i],b[i]);if(c)return c}return a.length-b.length};
const chk=a=>{if(a.length>CAP)throw Error('list longer than '+CAP);return a};
const seq=(a,n,s=1)=>{n=Math.max(0,Math.floor(num(n)));if(n>CAP)throw Error('list longer than '+CAP);cost(n/20);return Array.from({length:n},(_,i)=>a+s*i)};
const A=v=>typeof v=='string'?[...v]:v,F=(a,C)=>C=='S'?a.join(''):a;
// ---- exact integers: doubles while safe, BigInt beyond 2^53 ----
const MS=9007199254740991n,isB=x=>typeof x=='bigint',isInt=x=>isB(x)||Number.isInteger(x);
const BIGLIM=1n<<100000n,nrm=x=>{if(!isB(x))return x;if(x>=-MS&&x<=MS)return Number(x);if(x>BIGLIM||x< -BIGLIM)throw Error('integer larger than 100000 bits');return x},BI=x=>isB(x)?x:BigInt(x),num=x=>isB(x)?Number(x):x;
const ar=(o,a,b)=>{if(!isB(a)&&!isB(b)){const r=o=='+'?a+b:o=='-'?a-b:a*b;if(Number.isSafeInteger(r)||!Number.isInteger(a)||!Number.isInteger(b))return r}
 if(isInt(a)&&isInt(b)){cost(2);const x=BI(a),y=BI(b);return nrm(o=='+'?x+y:o=='-'?x-y:x*y)}const x=num(a),y=num(b);return o=='+'?x+y:o=='-'?x-y:x*y};
const mn=(a,b)=>a<b?a:b,mx=(a,b)=>a>b?a:b;
const bsqrt=n=>{if(n<2n)return n;let x=1n<<BigInt(Math.ceil(n.toString(2).length/2));for(;;){const y=(x+n/x)>>1n;if(y>=x)break;x=y}while(x*x>n)x--;while((x+1n)*(x+1n)<=n)x++;return x};
const mpow=(b,e,m)=>{let r=1n;b%=m;while(e>0n){if(e&1n)r=r*b%m;b=b*b%m;e>>=1n}return r};
const isPB=n=>{if(n<2n)return 0;for(const p of[2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]){if(n==p)return 1;if(n%p==0n)return 0}
 let d=n-1n,r=0;while(!(d&1n)){d>>=1n;r++}for(const a of[2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]){let x=mpow(a,d,n);if(x==1n||x==n-1n)continue;let ok=0;for(let i=1;i<r;i++){x=x*x%n;if(x==n-1n){ok=1;break}}if(!ok)return 0}return 1};
const isP=n=>{if(isB(n))return isPB(n);if(!Number.isInteger(n)||n<2)return 0;if(n>1e12)return isPB(BigInt(n));cost(Math.sqrt(n)/50);for(let i=2;i*i<=n;i++)if(n%i==0)return 0;return 1};
const primesTo=n=>{n=Math.floor(num(n));if(n<2)return[];if(n>2e7)throw Error('primes: n too large');cost(n/10);const s=new Uint8Array(n+1),r=[];for(let i=2;i<=n;i++)if(!s[i]){r.push(i);for(let j=i*i;j<=n;j+=i)s[j]=1}return chk(r)};
const gcd=(a,b)=>{if(isB(a)||isB(b)){let x=BI(a),y=BI(b);x=x<0n?-x:x;y=y<0n?-y:y;while(y){[x,y]=[y,x%y]}return nrm(x)}a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a};
const base=(n,b)=>{b=Math.floor(num(b));if(isB(n)){n=n<0n?-n:n;if(b<2)throw Error('base: number too large for unary');if(b<=36){const t=n.toString(b);cost(t.length/8);return[...t].map(c=>parseInt(c,36))}const B=BigInt(b),r=[];while(n){tick();r.unshift(Number(n%B));n/=B}return r}
 if(!Number.isFinite(n))throw Error('base: not a finite number');n=Math.abs(Math.floor(n));if(b<2)return seq(1,n,0);if(!n)return[0];const r=[];while(n){r.unshift(n%b);n=Math.floor(n/b)}return r};
const ubase=(l,b)=>{cost(l.length/4);return l.reduce((a,d)=>ar('+',ar('*',a,b),d),0)};
const fdiv=(a,b)=>{if(isInt(a)&&isInt(b)&&(isB(a)||isB(b))){const x=BI(a),y=BI(b);if(!y)return 0;let q=x/y;if((x%y!=0n)&&((x<0n)!=(y<0n)))q--;return nrm(q)}b=num(b);return b?Math.floor(num(a)/b):0};
const fmod=(a,b)=>{if(isInt(a)&&isInt(b)&&(isB(a)||isB(b))){const x=BI(a),y=BI(b);if(!y)return 0;return nrm(((x%y)+y)%y)}a=num(a);b=num(b);return b?((a%b)+b)%b:0};
const ipow=(a,b)=>{if(isInt(a)&&isInt(b)&&b>=0){const r=num(a)**num(b);if(Number.isSafeInteger(r))return r;const bits=num(b)*Math.log2(Math.abs(num(a))||1);if(bits>100000)throw Error('integer larger than 100000 bits');cost(bits/64);return nrm(BI(a)**BI(b))}return num(a)**num(b)};
const zipL=(a,b,f)=>Array.from({length:Math.max(a.length,b.length)},(_,i)=>i<a.length&&i<b.length?f(a[i],b[i]):i<a.length?a[i]:b[i]);
// JSON with exact big integers
const pj=t=>{let o='',i=0,ins=0;const re=/-?\d+/y;
 while(i<t.length){const c=t[i];
  if(ins){o+=c;if(c=='\\'){o+=t[i+1]??'';i+=2;continue}if(c=='"')ins=0;i++;continue}
  if(c=='"'){ins=1;o+=c;i++;continue}
  re.lastIndex=i;const m=re.exec(t);
  if(m&&m.index==i){const n=m[0],nx=t[i+n.length]||'';o+=n.replace('-','').length>=16&&!/[.eE]/.test(nx)?'"@@pj:'+n+'"':n;i+=n.length;continue}
  o+=c;i++}
 return JSON.parse(o,(k,v)=>typeof v=='string'&&v.startsWith('@@pj:')?nrm(BigInt(v.slice(5))):v)};

export {LIM,CAP,MAXI,LB,STEPS,BUDGET,tick,setBudget,cost,ELEM,LIST,CONT,zero,truthy,fmt,key,cmp,chk,seq,A,F,MS,isB,isInt,BIGLIM,nrm,BI,num,ar,mn,mx,bsqrt,mpow,isPB,isP,primesTo,gcd,base,ubase,fdiv,fmod,ipow,zipL,pj};
