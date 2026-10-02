// Re-check rewrite rules with the full equivalence check, in parallel worker threads.
// CLI: node scripts/verify-rules.mjs candidates.txt [perShape=60] [seeds=5]
//   reads lines like  'a b':['c']  (as printed by find-rewrites.mjs), prints the rules that pass,
//   and reports failures with a reason on stderr.
import {readFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {pathToFileURL} from 'node:url';
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';

export const parseRules = text => text.split('\n').map(l => /^'([^']*)':\[(.*?)\]/.exec(l)).filter(Boolean)
  .map(m => [m[1], m[2] ? m[2].split(',').map(x => x.slice(1, -1)) : []]);
export const formatRule = ([l, r]) => `'${l}':[${r.map(t => `'${t}'`).join(',')}]`;

// rules: [[lhs, rhsTokens]]; resolves to {ok: [lhs], bad: ['lhs → rhs: reason']}
export async function verifyAll(rules, opts = {}) {
  const n = Math.max(1, Math.min(availableParallelism() - 1, 12, rules.length));
  const chunks = Array.from({length: n}, (_, i) => rules.filter((_, j) => j % n == i));
  const results = await Promise.all(chunks.map(chunk => new Promise((res, rej) => {
    const w = new Worker(new URL(import.meta.url), {workerData: {chunk, opts}});
    w.on('message', res); w.on('error', rej);
  })));
  return {ok: results.flatMap(r => r.ok), bad: results.flatMap(r => r.bad)};
}

if (!isMainThread) {
  const K = await import('../src/core/index.js'), {check} = await import('./equiv.mjs');
  K.setRules({}); // evaluate both sides with no bans in the way
  const ok = [], bad = [];
  for (const [l, r] of workerData.chunk) {
    const c = check(l, r.join(' '), workerData.opts);
    if (c.ok) ok.push(l); else bad.push(`${l} → ${r.join(' ') || '∅'}: ${c.why}`);
  }
  parentPort.postMessage({ok, bad});
} else if (process.argv[1] && import.meta.url == pathToFileURL(process.argv[1]).href) {
  const rules = parseRules(readFileSync(process.argv[2], 'utf8'));
  const {ok, bad} = await verifyAll(rules, {perShape: +(process.argv[3] || 60), seeds: +(process.argv[4] || 5)});
  for (const rule of rules.filter(([l]) => ok.includes(l))) console.log(formatRule(rule));
  for (const b of bad) console.error(b);
  console.error(`${ok.length} passed, ${bad.length} rejected`);
}
