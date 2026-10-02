// Observational equivalence of token sequences, used to verify rewrite rules (test/rewrites.mjs)
// and to discover new ones (scripts/find-rewrites.mjs). Sequences are lists of token kinds as the
// lexer sees them (names, '}map', or '#I' style literal kinds, which are tried with sample literals).
import * as K from '../src/core/index.js';

// edge-case values for each type; anything a rewrite might get wrong should be in here
export const SAMPLES = {
  I: [0, 1, -1, 2, 3, 7, 10, -10, 2.5, -2.5, 0.5, 0.1, 100, 255, 12345678901234567890n, -98765432109876543210n, NaN, Infinity, -Infinity, 1e300, 1e-17, -1e-17, 5e-324, 4503599627370495.5, 0.30000000000000004, 1.5, 6, 64, 3.2, 7.75, -0.4],
  L: [[], [0], [1, 2, 3], [3, 1, 2, 2], [-1, 5, 0], [2.5, 0.1, 0.2], [5, 5, 5], [1, 0, 1, 1], [10, 20], [7], [0.1, 0.2, 0.3], [9, 8, 7, 6, 5, 4, 3], [12345678901234567890n, 1], [1e-17, 0], [0, 1e-17, 0], [4503599627370495.5, 4503599627370496], [NaN, 1], [Infinity, 2, -Infinity], [0.30000000000000004, 0.1, 0.2]],
  S: ['', 'a', 'abc', 'aab', 'Hello World', 'ba', ' x  y ', '121', '0', 'ß', 'İi', 'aAbB', '1,2-3', '😀a'],
  M: [[], [[]], [[1, 2], [3]], [[3], [1, 2], [1, 2]], [[0, 0]], [[1], [2], [3]], [[2, 1], [1, 2]], [[5]], [[1e-17], [0]], [[NaN, 1], [2]]],
  W: [[], [''], ['ab', 'c'], ['b', 'a', 'b'], ['hello', 'world'], ['1', '2'], ['ß', 'A']],
};
// stored the way the language stores numbers (exact integers beyond 2^53, no -0)
const canon = v => Array.isArray(v) ? v.map(canon) : K.cn(v);
for (const t in SAMPLES) SAMPLES[t] = SAMPLES[t].map(canon);
export const LITS = {'#I': ['#I5', '#I0', '#I123456'], '#S': ['#S"ab"', '#S""'], '#L': ['#L[1,2]', '#L[]'], '#M': ['#M[[1],[2,3]]'], '#W': ['#W["a","bc"]']};

export const shapes = maxDepth => {
  const out = [''];
  for (let d = 1; d <= maxDepth; d++) for (const s of out.filter(x => x.length == d - 1)) for (const t of 'ILSMW') out.push(s + t);
  return out;
};

let seed = 1;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
// Values of type `to` derived from value v of type `from`: equal values, elements, slices, sums...
// Rules that relate two stack items fail only on coincidences between them (an item that occurs
// twice in a list, a list equal to another), which independent random samples rarely produce.
const uniqBy = a => { const s = new Set(); return a.filter(x => { const k = vkey(x); return s.has(k) ? 0 : (s.add(k), 1); }); };
function derive(v, from, to) {
  const out = [];
  if (from == to) { out.push(v); if (from != 'I') { const a = from == 'S' ? [...v] : v, F = x => from == 'S' ? x.join('') : x;
    out.push(F(a.slice(0, 1)), F(a.slice(1)), F(a.slice(0, -1)), F([...a].reverse()), F([...a, ...a.slice(0, 2)]), F([...a].sort()));
  } else if (typeof v == 'bigint') out.push(v + 1n, -v); else out.push(v + 1, v - 1, -v, 2 * v); }
  if ({L: 'I', M: 'L', S: 'S', W: 'S'}[from] == to) out.push(...(from == 'S' ? [...v] : v));
  if (to == 'I' && from != 'I') { out.push(v.length); if (from == 'L' && v.length) { const ok = v.every(x => typeof x == 'number'); if (ok) out.push(v.reduce((a, b) => a + b, 0), Math.max(...v), Math.min(...v)); } }
  if (from == 'I' && to == 'L') out.push([v], [v, v]);
  if (from == 'I' && to == 'S') out.push(String(v));
  if (from == 'S' && to == 'W') out.push([v], [...v], v.split(' '));
  if (from == 'L' && to == 'M') out.push([v], [v, v]);
  if (from == 'M' && to == 'I') out.push(...v.map(r => r.length));
  if (from == 'W' && to == 'I') out.push(...v.map(r => r.length));
  return uniqBy(out.map(canon));
}
// up to n sample stacks for a shape: every combination when small, else a seeded random selection;
// for 2+ items, plus as many again with each item derived from one below it where possible
export function stacks(shape, n, seedOffset = 0) {
  const pools = [...shape].map(t => SAMPLES[t]), total = pools.reduce((a, p) => a * p.length, 1);
  seed = 7 + shape.length * 31 + [...shape].reduce((a, c) => a * 5 + 'ILSMW'.indexOf(c), 0) + seedOffset * 7919;
  let out;
  if (total <= n) {
    out = [[]];
    for (const p of pools) out.splice(0, out.length, ...out.flatMap(s => p.map(v => [...s, v])));
  } else out = Array.from({length: n}, (_, i) => pools.map((p, j) => p[i < p.length ? (i + j) % p.length : Math.floor(rnd() * p.length)]));
  if (shape.length > 1) {
    const extra = [];
    for (let i = 0; extra.length < n && i < n * 4; i++) {
      const s = pools.map(p => p[Math.floor(rnd() * p.length)]);
      for (let j = 1; j < s.length; j++) { const from = Math.floor(rnd() * j), d = derive(s[from], shape[from], shape[j]); if (d.length && rnd() < 0.8) s[j] = d[Math.floor(rnd() * d.length)]; }
      extra.push(s);
    }
    out = uniqBy([...out, ...extra]);
  }
  return out;
}

// strict identity of results: number vs bigint, NaN, and -0 all distinguished
export const vkey = v => typeof v == 'number' ? 'n' + (Object.is(v, -0) ? '-0' : String(v)) : typeof v == 'bigint' ? 'b' + v
  : typeof v == 'string' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(vkey).join(',') + ']' : '?' + String(v);

// Type replay from an arbitrary starting stack shape. The program input passed to the option tables is
// fixed so their caches stay small: three arguments, so n/m/k are available, and the real stack-depth
// limit of 5. (n/m/k then read the starting stack, which is all an equivalence check needs.)
const PI = 'III';
const walk = (toks, shape) => {
  let st = {f: [shape], bs: [], p: ''}, peak = shape.length; const ann = [];
  for (const t of toks) { const x = K.opts0(st, PI, '?', false).find(o => o[0] == K.kindOf(t)); if (!x) return null; ann.push([t, x[2]]); st = x[1]; peak = Math.max(peak, st.f.at(-1).length); }
  return st.bs.length ? null : {out: st.f.at(-1), ann, peak};
};
// output shape of a token sequence on a stack shape, or null if it does not type-check
export const typeOf = (toks, shape) => walk(toks, shape)?.out ?? null;
export function compiled(toks, shape) { const w = walk(toks, shape); return w && K.tree(w.ann); }
export const peakOf = (toks, shape) => walk(toks, shape)?.peak;
export function run(tree, stack, budget = 2e4) {
  K.setBudget(budget);
  try { return K.ev(tree, [...stack], stack).map(vkey).join(' '); } catch (e) { return 'E'; }
}

// concrete token lists for a sequence of kinds (literal kinds expand to sample literals)
export const instances = seqKinds => seqKinds.reduce((acc, k) => acc.flatMap(a => (LITS[k] || [k]).map(t => [...a, t])), [[]]);

// Does rhs agree with lhs wherever lhs type-checks and runs without error?
export function check(lhs, rhs, {maxDepth = 4, perShape = 60, seeds = 1} = {}) {
  const L = lhs.split(' ').filter(x => x), R = rhs.split(' ').filter(x => x);
  let shapesChecked = 0;
  for (const lt of instances(L)) {
    // literals in lhs that also appear in rhs keep the same concrete value
    const rt = R.map(k => LITS[k] ? lt[L.indexOf(k)] : k);
    for (const sh of shapes(maxDepth)) {
      const outL = typeOf(lt, sh); if (outL == null) continue;
      const outR = typeOf(rt, sh);
      if (outR != outL) return {ok: false, why: `shape ${sh || '∅'}: ${lhs} gives ${outL}, ${rhs || '(nothing)'} gives ${outR ?? 'a type error'}`};
      // the replacement may never need a deeper stack, or it could exceed the depth limit where lhs fits
      if (peakOf(rt, sh) > peakOf(lt, sh)) return {ok: false, why: `shape ${sh || '∅'}: ${rhs} needs a deeper stack than ${lhs}`};
      const tl = compiled(lt, sh), tr = compiled(rt, sh), ss = Array.from({length: seeds}, (_, k) => stacks(sh, perShape, k)).flat();
      let defined = 0;
      for (const s of ss) {
        const a = run(tl, s); if (a == 'E') continue;
        defined++;
        const b = run(tr, s);
        if (a != b) return {ok: false, why: `on ${K.fmt(s)}: ${lhs} → ${a}, ${rhs || '(nothing)'} → ${b}`};
      }
      // too little evidence: lhs errors on (nearly) every sample of this shape
      if (defined < Math.min(3, ss.length)) return {ok: false, why: `shape ${sh || '∅'}: ${lhs} errors on ${ss.length - defined} of ${ss.length} samples`};
      shapesChecked++;
    }
  }
  return {ok: shapesChecked > 0, shapesChecked, why: shapesChecked ? '' : 'left side never type-checks'};
}
