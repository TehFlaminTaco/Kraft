# Kraft

An experimental code-golf language designed as a compression scheme over typed programs.
You write typed, readable source; the compiler type-checks it and emits a dense bytestring
where only valid tokens take code space; the decoder replays the same type rules.

Live: GitHub Pages serves `docs/` as the site root. `/` redirects to the latest version, and
every released version stays available at `/<version>/`, so old share links keep decoding the way they did when they were made.

## Layout

```
index.html          page markup (Vite entry)
src/core/           language core (no DOM; runs in Node and the browser)
  runtime.js          limits, step budget, type tables, exact integer arithmetic, BigInt-safe JSON
  builtins.js         builtin token table T (add / U / B / G helpers)
  rewrite.js          redundant token sequences: the compiler rewrites them, the decoder never emits them
  rules.js            generated rewrite rules (see below)
  types.js            typed states: opts0 / opts, distance-to-END (h1, DD)
  weights.js          prior token weights: common tokens cost fewer bits (a best guess, not fitted)
  words.js            4,096-word dictionary (wordfreq, CC BY-SA 4.0)
  coder.js            mixed radix + rANS literal coding, pack / mkdec
  lang.js             lexer, compile, decode, annotate / tree / ev, run
  challenges.js       challenge suite CH
  suite.js            runAll, stats
  search.js           best-first program search (makeSearch, golf, extraTests)
src/ui/             page script and styles
test/suite.mjs      suite runner (all pass + exact round-trip, dead%, distinct, CGCC totals)
test/fuzz.mjs       random-bytestring fuzz (no hangs, crashes or undefined results)
test/answer.mjs     CGCC / chat answer formats and permalinks
test/rewrites.mjs   every rewrite rule is a true equivalence on edge-case values
scripts/            build and release; equiv.mjs + find-rewrites.mjs search for new rewrite rules
tools/cgcc/         Code Golf SE sampler scripts used to build the benchmark
docs/               built site (committed; one folder per version)
```

## Commands

```bash
npm install
npm run dev               # local dev server with hot reload
npm test                  # suite: must pass before any release (add -- -v for every challenge)
npm run build             # build the current package.json version into docs/<version>/
npm run release -- patch  # test, bump version (patch | minor | major | X.Y.Z), build into a new docs/<version>/
```

Each build is a single self-contained HTML file (`vite-plugin-singlefile`). After building,
`docs/index.html` redirects to the highest version present (the URL hash is preserved) and
`docs/versions.json` lists every version. `npm run build` overwrites the current version's
folder; `npm run release` refuses to overwrite one that already exists.

## Rewrite rules

Two programs that always do the same thing waste code space, so redundant token sequences are
banned: the compiler rewrites them (`swap swap` disappears, `0 swap -` becomes `neg`) and the decoder
never produces them. A rule must hold on every stack shape where its left side type-checks, so rules
are found and checked by testing, not by hand:

```bash
node --max-old-space-size=8192 scripts/find-rewrites.mjs > candidates.txt
node scripts/verify-rules.mjs candidates.txt 60 5 > verified.txt
```

`find-rewrites` fingerprints every 2-token sequence (and 3-token sequences over common tokens) on
sample stacks and proposes shorter or canonical equivalents; `verify-rules` re-checks each one on
every stack shape up to 4 deep, with edge-case values (NaN, ±Infinity, -0, huge integers, rounding
traps, Unicode case quirks) and correlated stacks (an item drawn from the list below it, equal lists,
sums...), under 5 independent sample sets. Put the verified rules in `src/core/rules.js`; `npm test`
re-checks all of them. Sampling cannot prove equivalence, so a rule that slips through is a bug: if
you find one, add the counterexample values to `scripts/equiv.mjs` and re-verify.

String literals use word data from [wordfreq](https://github.com/rspeer/wordfreq) by Robyn Speer (CC BY-SA 4.0).
