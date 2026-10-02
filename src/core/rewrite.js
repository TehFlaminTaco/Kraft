// Redundant token sequences. The compiler rewrites each left side to its right side (shorter, or the
// same length and earlier in token order), and the decoder never emits a left side, so those
// programs take no code space. Sides are space-separated token kinds: names, or #I #S #L #M #W for
// any literal of that kind. A left side is 2 or 3 tokens and must end in a name.
// Every rule must hold on every stack shape where its left side type-checks; test/rewrites.mjs
// checks this on edge-case values, and scripts/find-rewrites.mjs searches for new ones (rules.js).
import {FOUND} from './rules.js';

// hand-written rules
let RW={'1 skip':['tail'],'1 %':['frac'],'sort rev':['sortd'],'digits sum':['dsum'],'0 +':[],'0 -':[],'1 *':[],'1 pow':[],'swap swap':[],'rev rev':[],'neg neg':[],'dup drop':[],'ord chr':[],
 'sort sort':['sort'],'uniq uniq':['uniq'],'abs abs':['abs'],'sign sign':['sign'],'floor floor':['floor'],'ceil ceil':['ceil'],'round round':['round'],'up up':['up'],'low low':['low']};
for(const op of['+','*','=','eql','min2','max2','gcd'])RW['swap '+op]=[op];
RW={...FOUND,...RW};

// Derived tables: BAN maps a history (the 1 or 2 tokens before) to the tokens that may not follow it;
// PREF holds every proper prefix of a left side, which is all the history the decoder needs to keep.
let BAN=new Map(),PREF=new Set();
function loadRules(rw){
 const bad=Object.keys(rw).find(k=>{const p=k.split(' ');return p.length<2||p.length>3||/^[#{}]/.test(p.at(-1))});
 if(bad)throw Error('bad rewrite rule: '+bad);
 RW=rw;BAN=new Map();PREF=new Set();
 for(const k in rw){const p=k.split(' ');for(let i=1;i<p.length;i++)PREF.add(p.slice(0,i).join(' '));
  const h=p.slice(0,-1).join(' ');if(!BAN.has(h))BAN.set(h,new Set());BAN.get(h).add(p.at(-1))}}
loadRules(RW);
// history after emitting token kind t: the longest suffix that is still a prefix of some left side
const hnext=(h,t)=>{const l=h?h.slice(h.lastIndexOf(' ')+1):'';return l&&PREF.has(l+' '+t)?l+' '+t:PREF.has(t)?t:''};
const banned=(h,t)=>{if(!h)return false;const s=BAN.get(h);if(s&&s.has(t))return true;
 const i=h.indexOf(' ');if(i<0)return false;const s2=BAN.get(h.slice(i+1));return !!(s2&&s2.has(t))};
const rules=()=>RW;

export {loadRules,hnext,banned,rules};
