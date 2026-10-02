// Random-bytestring fuzz: decode random programs for many type signatures and run them on sample
// inputs under the step budget. Fails on hangs (slow programs), non-Error throws, or undefined results.
import * as K from '../src/core/index.js';

const SIGS = [['I', '*'], ['L', '*'], ['S', '*'], ['M', '*'], ['W', '*'], ['II', '*'], ['LI', '*'], ['SS', '*'], ['', '*'], ['I', 'L'], ['L', 'I']];
const SAMPLE = {I: [0, 7, -3, 2.5, 30, 123456789], L: [[], [3, 1, 2, 2], [10, -4, 7]], S: ['', 'Hello, World!', 'a-b,c'], M: [[[1, 2], [3]], []], W: [['ab', 'c'], []]};
const N = +(process.argv[2] || 3000), SLOW_MS = 1500;
let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
let decoded = 0, runs = 0, errors = 0, slowest = [0, ''], fail = [];
for (let k = 0; k < N; k++) {
  const [I, O] = SIGS[k % SIGS.length], bytes = Array.from({length: 1 + Math.floor(rnd() * 6)}, () => Math.floor(rnd() * 256));
  const toks = K.decode(bytes, I, O); if (!toks) continue; decoded++;
  const args = I ? [...I].map(t => SAMPLE[t][Math.floor(rnd() * SAMPLE[t].length)]) : [];
  const t0 = Date.now(); runs++;
  try { const st = K.exec(toks, I, args, 1e5); if (st.some(v => v === undefined)) fail.push(`undefined result: ${I}->${O} ${toks.map(K.show).join(' ')}`); }
  catch (e) { if (!(e instanceof Error)) fail.push(`non-Error throw ${String(e)}: ${toks.map(K.show).join(' ')}`); errors++; }
  const ms = Date.now() - t0; if (ms > slowest[0]) slowest = [ms, `${I}->${O} ${toks.map(K.show).join(' ')} on ${K.fmt(args)}`];
  if (ms > SLOW_MS) fail.push(`slow (${ms}ms): ${slowest[1]}`);
}
// option order is a pure function of the state: decode again with cold caches, in reverse order
const progs = []; seed = 99;
for (let k = 0; k < 400; k++) { const [I, O] = SIGS[k % SIGS.length]; progs.push([I, O, Array.from({length: 1 + Math.floor(rnd() * 5)}, () => Math.floor(rnd() * 256))]); }
const dec = ([I, O, b]) => { try { return K.fmt(K.decode1(b, I, O)); } catch (e) { return 'E'; } };
const first = progs.map(dec); K.setRules(K.rules());
const again = [...progs].reverse().map(dec).reverse();
const differ = first.filter((x, i) => x != again[i]).length;
if (differ) fail.push(`${differ} programs decode differently with cold caches`);
// option 0 always leads to END: no random program may run out of tokens without ending
const dead = progs.filter((p, i) => first[i] == 'null').length;
if (dead) fail.push(`${dead} random programs never reach END`);
console.log(`fuzz: ${N} bytestrings, ${decoded} decoded, ${runs} runs, ${errors} runtime errors (budget/caps), slowest ${slowest[0]}ms: ${slowest[1]}`);
if (fail.length) { console.log(fail.slice(0, 20).join('\n')); process.exit(1); }
