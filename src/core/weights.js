// Prior token weights: a best guess at how often golfers reach for each token, from general
// golf-language experience. Deliberately coarse and NOT fitted to the challenge suite; a fitted
// version must be validated on held-out (later-dated) challenges.
// In every state each valid option gets its token's weight, so a token costs
// log2(total weight of valid options / its weight) bits instead of a flat log2(option count).
// END keeps the lowest weight: it is free when it comes last, so its share is pure overhead.
const TIER={
 8:'dup swap + - * / % = < > sum len range head last rev sort not inc dec 0 1 2 n #I { }map }filter eql max min digits',
 2:'rot if ncr npr fib nthp fact isqrt ceil round sign div pow ubase base grade where combs windows chunks halves alt group bins cart zip powerset perms sublists ALPHA digs alpha 10 ord chr up low split join words chars #M #W {2 {x {a }folds }scan }fix }trace }times }firstn }find k m rotate rep idxof count dvd gcd min2 max2 cumsum deltas undig lens flat wrap pair keep take skip str num band bor bxor frac pad mdiff',
 1:'END'};
const W=new Map();for(const[w,s]of Object.entries(TIER))for(const t of s.split(' '))W.set(t,+w);
const tokW=t=>W.get(t)??4;
// weighted symbol table for an options list (opts() caches lists per state, so this caches per state too)
const TB=new WeakMap();
const wtabOf=o=>{let t=TB.get(o);if(!t){const w=o.map(x=>tokW(x[0])),C=[];let a=0;for(const x of w){C.push(a);a+=x}t={W:w,C,M:a};TB.set(o,t)}return t};

export {TIER,tokW,wtabOf};
