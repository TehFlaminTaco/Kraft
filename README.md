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
  rewrite.js          redundant-pair rewrites RW and the derived BAN set
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
scripts/            build and release
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

String literals use word data from [wordfreq](https://github.com/rspeer/wordfreq) by Robyn Speer (CC BY-SA 4.0).
