// Collects Code Golf SE challenges that have Jelly, Vyxal AND Thunno 2 answers,
// with each language's shortest answer (bytes + code) and the challenge text.
// Usage: node cgcc_golf_sample.mjs [sampleSize=40] [seed=1] > sample.json
// Needs Node 18+ (built-in fetch). Uses ~20 API requests of the 300/day anonymous quota.
// Optional: set SE_KEY env var to an app key for a 10k/day quota.

const SAMPLE = +(process.argv[2] || 40), SEED = +(process.argv[3] || 1);
const API = 'https://api.stackexchange.com/2.3', SITE = 'codegolf';
const KEY = process.env.SE_KEY ? `&key=${process.env.SE_KEY}` : '';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(path) {
  const r = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}site=${SITE}${KEY}`);
  const j = await r.json();
  if (j.error_id) throw new Error(`${j.error_id} ${j.error_name}: ${j.error_message}`);
  if (j.backoff) await sleep(j.backoff * 1000);
  await sleep(150);
  return j;
}
async function getAll(path, maxPages = 10) {
  let items = [];
  for (let page = 1; page <= maxPages; page++) {
    const j = await get(`${path}&pagesize=100&page=${page}`);
    items = items.concat(j.items);
    if (!j.has_more) break;
  }
  return items;
}

const unesc = s => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
function parseAnswer(html) {
  const h = html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/);
  if (!h) return null;
  const header = unesc(h[1]).trim();
  // last "N byte(s)" in the header is the current score (earlier ones are usually struck out)
  const nums = [...header.matchAll(/(\d+(?:\.\d+)?)\s*(?:bytes?|bits?)/gi)];
  const bytes = nums.length ? +nums[nums.length - 1][1] : null;
  let lang = null;
  if (/thunno\s*2/i.test(header)) lang = 'Thunno 2';
  else if (/vyxal/i.test(header)) lang = 'Vyxal';
  else if (/\bjelly\b/i.test(header)) lang = 'Jelly';
  const code = html.match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/);
  return { lang, bytes, header, code: code ? unesc(code[1]).replace(/\n$/, '') : null };
}

// small seeded shuffle so runs are reproducible
function shuffle(a, seed) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const exc = await getAll(`/search/excerpts?order=desc&sort=creation&q=${encodeURIComponent('"Thunno 2"')}`, 5);
const qids = shuffle([...new Set(exc.filter(x => x.item_type === 'answer').map(x => x.question_id))], SEED);
console.error(`found ${qids.length} questions with Thunno 2 answers`);

const out = [];
for (let i = 0; i < qids.length && out.length < SAMPLE; i += 50) {
  const batch = qids.slice(i, i + 50);
  const qs = await getAll(`/questions/${batch.join(';')}?filter=withbody`, 1);
  const ans = await getAll(`/questions/${batch.join(';')}/answers?filter=withbody`, 15);
  for (const q of qs) {
    if (!q.tags.includes('code-golf')) continue;
    const best = {};
    for (const a of ans.filter(a => a.question_id === q.question_id)) {
      const p = parseAnswer(a.body);
      if (!p || !p.lang || p.bytes == null) continue;
      if (!best[p.lang] || p.bytes < best[p.lang].bytes)
        best[p.lang] = { bytes: p.bytes, header: p.header, code: p.code?.slice(0, 300), answer_id: a.answer_id };
    }
    if (!(best.Jelly && best.Vyxal && best['Thunno 2'])) continue;
    out.push({
      id: q.question_id, title: unesc(q.title), link: q.link,
      tags: q.tags.filter(t => t !== 'code-golf'),
      body: unesc(q.body).replace(/\n{3,}/g, '\n\n').slice(0, 1500),
      best
    });
    if (out.length >= SAMPLE) break;
  }
}
console.error(`kept ${out.length} challenges with all three languages`);
console.log(JSON.stringify(out, null, 1));
