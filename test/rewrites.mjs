// Every rewrite rule must be a true equivalence, and the rewriting must leave no banned sequence.
// Rules are checked in parallel; pass --full for the slower, more thorough check.
import * as K from '../src/core/index.js';
import {verifyAll} from '../scripts/verify-rules.mjs';

const RW = K.rules(), t0 = Date.now();
const {bad} = await verifyAll(Object.entries(RW), process.argv.includes('--full') ? {perShape: 100} : {perShape: 20});

// the lexer reaches a fixpoint with no left side left in it
const kinds = toks => toks.map(t => K.litKind(t) || t);
const windows = ks => ks.flatMap((_, i) => [ks.slice(i, i + 2).join(' '), ks.slice(i, i + 3).join(' ')]);
const sample = {'#I': '5', '#S': '"a"', '#L': '[1]', '#M': '[[1]]', '#W': '["a"]'};
for (const lhs of Object.keys(RW)) {
  const src = lhs.split(' ').map(k => sample[k] || k).join(' ');
  const out = K.lex(`${src} ${src}`), left = windows(kinds(out)).filter(w => RW[w]);
  if (left.length) bad.push(`lexing "${src} ${src}" left ${left.join(', ')}`);
}

console.log(`rewrites: ${Object.keys(RW).length} rules checked in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${bad.length} problems`);
if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
