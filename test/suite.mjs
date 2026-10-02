// Reproduce the suite numbers: pass counts, compile->decode round-trip, dead% and distinctness,
// plus the Code Golf SE benchmark totals (challenges with a `best` field).
import * as K from '../src/core/index.js';

const t0 = Date.now();
const rows = K.runAll();
let fail = 0, deadSum = 0, distSum = 0, n = 0, kb = 0, gb = 0, nb = 0, wins = [];
for (const x of rows) {
  if (x.err) { fail++; console.log(`ERR   ${x.c.id}: ${x.err}`); continue; }
  const ok = x.pass == x.c.t.length && x.rt;
  if (!ok) fail++;
  deadSum += x.st.dead; distSum += x.st.distinct; n++;
  if (x.c.best != null) { kb += x.r.bytes.length; gb += x.c.best; nb++; if (x.r.bytes.length <= x.c.best) wins.push(x.c.id); }
  if (!ok || process.argv.includes('-v'))
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${x.c.id.padEnd(48)} ${String(x.r.bytes.length).padStart(3)}B  best=${x.c.best ?? '-'}  tests ${x.pass}/${x.c.t.length}  rt=${x.rt ? 'ok' : 'FAIL'}  dead=${x.st.dead.toFixed(0)}%  distinct=${x.st.distinct.toFixed(2)}`);
}
console.log(`\n${rows.length - fail}/${rows.length} challenges pass with exact round-trip`);
console.log(`random 1-3 byte programs: mean dead ${(deadSum / n).toFixed(2)}%, mean distinct ${(distSum / n).toFixed(2)}`);
console.log(`CGCC benchmark: ${nb} challenges, Kraft ${kb} bytes vs best golflang ${gb} bytes`);
console.log(`Kraft wins/ties (${wins.length}): ${wins.join(', ')}`);
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
