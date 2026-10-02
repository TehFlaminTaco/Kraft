// Answer formatting: xxd layout, permalinks round-trip, CGCC and chat formats.
import assert from 'node:assert/strict';
import {xxd, permalink, parseHash, cgcc, cmc, REPO} from '../src/ui/answer.js';
import {compile} from '../src/core/index.js';

const enc = s => [...new TextEncoder().encode(s)];
assert.equal(xxd(enc('Hello, World!\n')), '00000000: 4865 6c6c 6f2c 2057 6f72 6c64 210a       Hello, World!.');
assert.equal(xxd(enc('0123456789abcdefXY')),
  '00000000: 3031 3233 3435 3637 3839 6162 6364 6566  0123456789abcdef\n00000010: 5859                                     XY');
assert.equal(xxd([]), '');

const page = 'https://example.github.io/Kraft/0.1.0/';
const link = permalink(page, 'II', 'L', [0x1a, 0xff], ['[5,9]', '"a (b)"']);
assert.ok(!/[()\s]/.test(link.slice(page.length)), 'permalink must be safe inside a Markdown link');
assert.deepEqual(parseHash(link.slice(page.length)), {I: 'II', O: 'L', hex: '1aff', inputs: '[5,9]\n"a (b)"'});
assert.deepEqual(parseHash('#I/I/0e'), {I: 'I', O: 'I', hex: '0e', inputs: null});

const r = compile('range sq sum', 'I', 'I'), src = 'range sq sum', l = permalink(page, 'I', 'I', r.bytes, ['3']);
assert.equal(cgcc({src, bytes: r.bytes, link: l}), [
  `# [Kraft](${REPO}), 2 bytes.`, '', '    range sq sum', '', '## Hex Dump', '', `    ${xxd(r.bytes)}`, '', `[Try it Online](${l})`].join('\n'));
assert.equal(cmc({src, bytes: r.bytes, link: l}), `[Kraft](${REPO}), 2 bytes. [\`range sq sum\`](${l}) (Hex: \`0e 0b\`)`);
assert.equal(cmc({src: 'a`b', bytes: [1], link: l}), `[Kraft](${REPO}), 1 byte. [Try it Online!](${l})`);
assert.equal(cmc({src: '[1,2] sum', bytes: [1], link: l}), `[Kraft](${REPO}), 1 byte. [\`[1,2] sum\`](${l}) (Hex: \`01\`)`);
assert.ok(cmc({src: 'x '.repeat(300), bytes: [1], link: l}).endsWith('[Try it Online!](' + l + ')'));
assert.ok(!cgcc({src: 'rng', bytes: [], link: l}).includes('Hex Dump'));
console.log('answer formats: ok');
