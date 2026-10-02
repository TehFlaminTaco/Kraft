// Search for redundant token sequences: 2-token sequences equivalent to a shorter one (or to an
// earlier-ordered sequence of the same length), and 3-token sequences over a smaller vocabulary
// equivalent to something shorter. Candidates come from fingerprints on a few sample stacks and are
// then confirmed with the full check. Prints rules in rewrite.js syntax; review before adopting.
// Usage: node scripts/find-rewrites.mjs [--no3]
import * as K from '../src/core/index.js';
import {shapes, stacks, compiled, run, check} from './equiv.mjs';

const t0 = Date.now(), log = (...a) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
const current = K.rules();
K.setRules({});
const VOCAB = K.NAMES.filter(t => !'nmk'.includes(t) || t.length > 1);
const SH = shapes(3), FP_N = 8;
// canonical order: common (heavy) tokens first, so they are the ones kept
// stack shuffles first, so e.g. a pure binary op then drop canonicalises to 'drop drop'
const STACK = ['drop', 'dup', 'swap', 'over', 'rot'];
const rank = new Map([...VOCAB].sort((a, b) => (STACK.includes(b) - STACK.includes(a)) || K.tokW(b) - K.tokW(a) || VOCAB.indexOf(a) - VOCAB.indexOf(b)).map((t, i) => [t, i]));
const before = (a, b) => a.length - b.length || (() => { for (let i = 0; i < a.length; i++) if (a[i] != b[i]) return rank.get(a[i]) - rank.get(b[i]); return 0; })();

// short hash of a result string (errors stay a literal 'E' so they can be skipped)
const h = x => { if (x == 'E') return x; let a = 2166136261, b = 0x9747b28c; for (let i = 0; i < x.length; i++) { const c = x.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = Math.imul(b + c, 2246822519) ^ (b >>> 13); } return (a >>> 0).toString(36) + (b >>> 0).toString(36); };
// states after a token prefix, per shape (memoised), then fingerprints
const stateMemo = new Map();
const stateOf = (seq, sh) => {
  const key = sh + '/' + seq.join(' ');
  if (stateMemo.has(key)) return stateMemo.get(key);
  let st;
  if (!seq.length) st = {f: [sh], bs: [], p: ''};
  else { const prev = stateOf(seq.slice(0, -1), sh); const x = prev && K.opts0(prev, 'IIII', '?', false).find(o => o[0] == seq.at(-1)); st = x ? x[1] : null; }
  if (seq.length < 3) stateMemo.set(key, st);
  return st;
};
function fingerprint(seq) {
  const m = new Map();
  for (const sh of SH) {
    const st = stateOf(seq, sh); if (!st || st.bs.length) continue;
    const tr = compiled(seq, sh); if (!tr) continue;
    m.set(sh, st.f.at(-1) + '|' + stacks(sh, FP_N).map(s => h(run(tr, s, 5e3))).join('|'));
  }
  return m;
}
// does r agree with l wherever l is defined (per sample, ignoring l's errors)?
const agrees = (fl, fr) => [...fl].every(([sh, v]) => {
  const w = fr.get(sh); if (w == null) return false;
  const a = v.split('|'), b = w.split('|');
  return a[0] == b[0] && a.every((x, i) => i == 0 || x == 'E' || x == b[i]);
});

// index every sequence of length <= 2 by (shape, behaviour)
const seqs = [[], ...VOCAB.map(t => [t]), ...VOCAB.flatMap(a => VOCAB.map(b => [a, b]))];
const FP = new Map(), index = new Map();
for (const s of seqs) {
  const f = fingerprint(s); if (!f.size) continue;
  FP.set(s.join(' '), f);
  for (const [sh, v] of f) { const k = sh + '#' + v; if (!index.has(k)) index.set(k, []); index.get(k).push(s); }
}
log(`fingerprinted ${FP.size} sequences`);

const rules = {}, rejected = [];
const shorterMatch = (l, fl, maxLen) => {
  const [sh, v] = fl.entries().next().value;
  const cands = (index.get(sh + '#' + v) || []).filter(r => before(r, l) < 0 && r.length <= maxLen && agrees(fl, FP.get(r.join(' '))));
  cands.sort(before);
  for (const r of cands.slice(0, 6)) { const c = check(l.join(' '), r.join(' ')); if (c.ok) return r; rejected.push(`${l.join(' ')} → ${r.join(' ') || '∅'}: ${c.why}`); }
  return null;
};
// pairs

for (const s of seqs.filter(s => s.length == 2)) {
  const fl = FP.get(s.join(' ')); if (!fl) continue;
  const r = shorterMatch(s, fl, 2); if (r) rules[s.join(' ')] = r;
}
log(`pairs: ${Object.keys(rules).length} rules`);

// triples over a smaller vocabulary, skipping any that already contain a reducible pair
if (!process.argv.includes('--no3')) {
  const V3 = ['dup', 'swap', 'drop', 'over', 'rot', '0', '1', '2', '10', '+', '-', '*', '/', '%', 'neg', 'not', 'inc', 'dec', 'abs', 'sq', '=', '<', '>', 'min2', 'max2', 'cat', 'rev', 'len', 'sum', 'head', 'last', 'wrap', 'pair', 'eql'];
  let n3 = 0;
  for (const a of V3) for (const b of V3) for (const c of V3) {
    const l = [a, b, c]; if (rules[a + ' ' + b] || rules[b + ' ' + c]) continue;
    const fl = fingerprint(l); if (!fl.size) continue;
    const r = shorterMatch(l, fl, 2); if (r) { rules[l.join(' ')] = r; n3++; }
  }
  log(`triples: ${n3} rules`);
}

K.setRules(current);
const fmtRule = ([l, r]) => `'${l}':[${r.map(t => `'${t}'`).join(',')}]`;
const entries = Object.entries(rules).sort((a, b) => a[1].length - b[1].length || a[0].localeCompare(b[0]));
console.log(`// ${entries.length} rules (${entries.filter(([l]) => current[l]).length} already present)`);
for (const e of entries) console.log(fmtRule(e) + (current[e[0]] ? '  // existing' : ''));
const missing = Object.keys(current).filter(l => !rules[l]);
if (missing.length) console.log('// existing rules not rediscovered: ' + missing.join(', '));
console.error(`rejected after full check: ${rejected.length}`); for (const r of rejected.slice(0, 40)) console.error('  ' + r);
