// Copy-ready answer formats: Code Golf SE posts and chat (CMC) one-liners.
export const REPO = 'https://github.com/TehFlaminTaco/Kraft';
export const CHAT_MAX = 500; // Stack Exchange chat message limit

const hex2 = x => x.toString(16).padStart(2, '0');
const byteCount = n => `${n} byte${n == 1 ? '' : 's'}`;
const indent = s => s.split('\n').map(l => '    ' + l).join('\n');

// xxd-style dump: offset, 16 bytes per line in 2-byte groups, printable ASCII column.
export const xxd = bytes => {
  const out = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const row = bytes.slice(i, i + 16), groups = [];
    for (let j = 0; j < row.length; j += 2) groups.push(row.slice(j, j + 2).map(hex2).join(''));
    out.push(`${i.toString(16).padStart(8, '0')}: ${groups.join(' ').padEnd(39)}  ${row.map(x => x >= 32 && x < 127 ? String.fromCharCode(x) : '.').join('')}`);
  }
  return out.join('\n');
};

// Share link: <page>#<in>/<out>/<hex>[/<inputs, one JSON value per line>]. Parentheses and friends are
// percent-encoded too, so the URL survives inside a Markdown link.
export const permalink = (page, I, O, bytes, inputs = []) => {
  const enc = s => encodeURIComponent(s).replace(/[()'!*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${page}#${I}/${O}/${bytes.map(hex2).join('')}${inputs.length ? '/' + enc(inputs.join('\n')) : ''}`;
};
export const parseHash = hash => {
  const m = /^#([ILSMW]{1,4})\/([ILSMW]{1,4}|\*)\/([0-9a-f]*)(?:\/(.*))?$/.exec(hash) || /^#([IL])([IL*])\.([0-9a-f]*)$/.exec(hash);
  if (!m) return null;
  let inputs = null;
  if (m[4] != null) try { inputs = decodeURIComponent(m[4]); } catch { }
  return {I: m[1], O: m[2], hex: m[3], inputs};
};

export const cgcc = ({src, bytes, link}) => [
  `# [Kraft](${REPO}), ${byteCount(bytes.length)}.`, '', indent(src),
  ...(bytes.length ? ['', '## Hex Dump', '', indent(xxd(bytes))] : []),
  '', `[Try it Online](${link})`,
].join('\n');

// Inline source when it is safe in a chat code span and the message fits; otherwise just the link.
export const cmc = ({src, bytes, link}) => {
  const head = `[Kraft](${REPO}), ${byteCount(bytes.length)}.`;
  const full = `${head} [\`${src}\`](${link}) (Hex: \`${bytes.map(hex2).join(' ')}\`)`;
  const safe = src.length > 0 && !/[`\n\r]/.test(src);
  return safe && bytes.length && full.length <= CHAT_MAX ? full : `${head} [Try it Online!](${link})`;
};
