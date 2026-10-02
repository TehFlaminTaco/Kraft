import {BI,isB,isInt,nrm,num} from './runtime.js';
import {WIDX,WMAX,WORDS} from './words.js';
// ===== entropy coding: mixed radix + rANS for weighted symbols =====
const wtab=W=>({W,M:W.reduce((a,b)=>a+b,0),C:W.map((_,i)=>W.slice(0,i).reduce((a,b)=>a+b,0))});
const TL=wtab([3,4,6,6,5,4,3,2,2,2,1,1,1,1,1,2]);
// characters, plus five specials: end of string, escape, and four dictionary-word forms
const CHR=[...' etaoinshrdlcumwfgypbvkjxqz.,\'!?-:;0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ()"/+*=_%&#@$<>[]{}|\\^~`\n'];
CHR.splice(4,0,'\0W','\0SW','\0CW','\0SCW');CHR.unshift('\0EOS');CHR.push('\0ESC');
const TS=wtab(CHR.map((_,r)=>Math.max(1,Math.floor(200/(r+8))))),EOS=0,SYM={W:5,SW:6,CW:7,SCW:8},ESC=CHR.length-1;
const sym=(t,i)=>[t.M,t.W[i],t.C[i]];
const sbits=([M,f])=>(typeof M=='bigint'?M.toString(2).length-1:Math.log2(M))-Math.log2(f);
// integers of any size: bit-length class (weighted, 15 = long form) then the remaining bits
function encI(v,s){if(typeof v=='number'&&(!Number.isInteger(v)||v<0))throw Error('integer literals must be non-negative integers (-5 means 5 neg)');
 const b=BigInt(v),L=b?b.toString(2).length:0;
 if(L<15)s.push(sym(TL,L));else{s.push(sym(TL,15));encI(L-15,s)}
 if(L>=2){const M=1n<<BigInt(L-1),rem=b-M;s.push(L>50?[M,1,rem]:[Number(M),1,Number(rem)])}}
const decI=d=>{let L=d.w(TL);if(L==15)L=15+num(decI(d));if(!(L<=100001))throw Error('literal too large');if(L<2)return L;const M=1n<<BigInt(L-1);return nrm(M+BigInt(d.u(L>50?M:Number(M))))};
// lists: count, then base (max+1), then fixed-width digits
function encL(a,s){encI(a.length,s);if(!a.length)return;for(const x of a)if(!isInt(x)||x<0)throw Error('list literals hold non-negative integers');
 const b=a.reduce((m,x)=>x>m?x:m,0);encI(b,s);const B=nrm(BI(b)+1n);if(B>1)for(const x of a)s.push(isB(B)?[B,1,BI(x)]:[B,1,num(x)])}
const LITMAX=100000,cnt=d=>{const n=num(decI(d));if(!(n<=LITMAX))throw Error('literal too long');return n};
const decL=d=>{const n=cnt(d);if(!n)return[];const b=decI(d),B=nrm(BI(b)+1n),a=[];for(let j=0;j<n;j++)a.push(B>1?nrm(BigInt(d.u(B))):0);return a};
// strings: cheapest mix of characters and dictionary words (dynamic programming over positions)
function strParse(str){const ch=[...str],n=ch.length,best=Array(n+1).fill(Infinity),how=Array(n+1);best[n]=sbits(sym(TS,EOS));
 const ib=i=>{const t=[];encI(i,t);return t.reduce((a,x)=>a+sbits(x),0)};
 for(let i=n-1;i>=0;i--){const c=ch[i],ci=CHR.indexOf(c);
  let cb=ci<0?sbits(sym(TS,ESC))+ib(c.codePointAt(0)):sbits(sym(TS,ci));if(cb+best[i+1]<best[i]){best[i]=cb+best[i+1];how[i]=['c',c]}
  for(const sp of[0,1]){if(sp&&c!=' ')continue;const st=i+sp;
   for(let L=2;L<=WMAX&&st+L<=n;L++){const w=ch.slice(st,st+L).join(''),lw=w.toLowerCase();if(!WIDX.has(lw))continue;
    let k=null;if(w==lw)k=sp?'SW':'W';else if(w==lw[0].toUpperCase()+lw.slice(1))k=sp?'SCW':'CW';if(!k)continue;
    const wb=sbits(sym(TS,SYM[k]))+ib(WIDX.get(lw));if(wb+best[st+L]<best[i]){best[i]=wb+best[st+L];how[i]=['w',k,WIDX.get(lw),st+L]}}}}
 const out=[];for(let i=0;i<n;){const h=how[i];out.push(h);i=h[0]=='c'?i+1:h[3]}return out}
function encS(str,s){for(const h of strParse(str)){if(h[0]=='c'){const ci=CHR.indexOf(h[1]);if(ci<0){s.push(sym(TS,ESC));encI(h[1].codePointAt(0),s)}else s.push(sym(TS,ci))}else{s.push(sym(TS,SYM[h[1]]));encI(h[2],s)}}s.push(sym(TS,EOS))}
const decS=d=>{let s='';for(let g=0;g<2000;g++){const i=d.w(TS);if(i==EOS)break;if(i==ESC){s+=String.fromCodePoint(Math.min(num(decI(d)),0x10ffff));continue}
 if(i>=5&&i<=8){const k=CHR[i].slice(1),w=WORDS[Math.min(num(decI(d)),WORDS.length-1)];s+=(k[0]=='S'?' ':'')+(k.includes('C')?w[0].toUpperCase()+w.slice(1):w);continue}s+=CHR[i]}return s};
const encLit=(k,v,s)=>k=='#I'?encI(v,s):k=='#S'?encS(v,s):k=='#L'?encL(v,s):k=='#M'?(encI(v.length,s),v.forEach(x=>encL(x,s))):(encI(v.length,s),v.forEach(x=>encS(x,s)));
const decLit=(k,d)=>k=='#I'?decI(d):k=='#S'?decS(d):k=='#L'?decL(d):k=='#M'?Array.from({length:cnt(d)},()=>decL(d)):Array.from({length:cnt(d)},()=>decS(d));
function mkdec(n){let x=n;return{u(M){if(typeof M=='bigint'){const d=x%M;x/=M;return d}const d=Number(x%BigInt(M));x/=BigInt(M);return d},
 w(t){const s=Number(x%BigInt(t.M));let i=0;while(t.C[i]+t.W[i]<=s)i++;x=BigInt(t.W[i])*(x/BigInt(t.M))+BigInt(s-t.C[i]);return i}}}
function pack(steps){let x=0n;for(let i=steps.length-1;i>=0;i--){const[M,f,c]=steps[i];x=(x/BigInt(f))*BigInt(M)+(x%BigInt(f))+BigInt(c)}const b=[];while(x>0n){b.unshift(Number(x&255n));x>>=8n}return b}

export {wtab,TL,CHR,TS,EOS,SYM,ESC,sym,sbits,encI,decI,encL,LITMAX,cnt,decL,strParse,encS,decS,encLit,decLit,mkdec,pack};
