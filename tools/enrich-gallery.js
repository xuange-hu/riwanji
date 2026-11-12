/* enrich-gallery.js — 为精选产品抓取 ≥3 张真实产品图（百度/必应图源，逐张验证可达）
   用法：node tools/enrich-gallery.js [--limit 400] [--concurrency 5] [--per 3]
   输出：data/enrich/_galcache.json { id: [url1,url2,url3] }，每张均 HEAD/GET 验证 image/* 200
   原则：绝不臆造/错配 URL；同一产品内图片去重、来源分散 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const ENRICH = path.join(DATA, 'enrich');
const CACHE = path.join(ENRICH, '_galcache.json');
if (!fs.existsSync(ENRICH)) fs.mkdirSync(ENRICH, { recursive: true });

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
const argv = process.argv.slice(2);
const argNum = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? Number(argv[i + 1]) : d; };
const LIMIT = argNum('limit', 400);
const CONC = argNum('concurrency', 5);
const PER = argNum('per', 3);

function loadCurated() {
  const skip = new Set(['categories.js', 'brand-alias.js', 'manifest.js']);
  const out = [];
  for (const f of fs.readdirSync(DATA).filter((x) => x.endsWith('.js') && !skip.has(x))) {
    const window = {};
    try { new Function('window', 'module', fs.readFileSync(path.join(DATA, f), 'utf8'))(window, {}); } catch (e) { continue; }
    for (const ch of (window.DB_CHUNKS || [])) {
      const arr = (ch && (ch.products || ch.items)) || (Array.isArray(ch) ? ch : null);
      if (arr) for (const p of arr) if (p && p.id) out.push(p);
      else if (ch && ch.id) out.push(ch);
    }
  }
  return out;
}
async function verifyImg(url) {
  if (!/^https?:\/\//.test(url)) return false;
  try {
    let r = await fetch(url, { method: 'HEAD', headers: UA, redirect: 'follow' });
    let ct = (r.headers.get('content-type') || '').toLowerCase();
    let cl = Number(r.headers.get('content-length') || 0);
    if (r.status === 200 && ct.startsWith('image/') && (!cl || (cl > 2500 && cl < 9e6))) return true;
    r = await fetch(url, { headers: { ...UA, Range: 'bytes=0-2047' }, redirect: 'follow' });
    ct = (r.headers.get('content-type') || '').toLowerCase();
    return r.status === 200 && ct.startsWith('image/');
  } catch (e) { return false; }
}
function baiduImgs(h) {
  const u = [];
  for (const m of h.matchAll(/"objURL":"(https?:\/\/[^"]+)"/g)) u.push(m[1].replace(/\\\//g, '/'));
  for (const m of h.matchAll(/"thumbURL":"(https?:\/\/[^"]+)"/g)) u.push(m[1].replace(/\\\//g, '/'));
  return u;
}
function bingImgs(h) {
  const u = [];
  for (const m of h.matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g)) u.push(m[1]);
  for (const m of h.matchAll(/"murl":"(https?:\/\/[^"]+)"/g)) u.push(m[1]);
  return u;
}
async function text(url, extra) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000);
    const r = await fetch(url, { headers: { ...UA, ...(extra || {}) }, signal: c.signal });
    const b = await r.text(); clearTimeout(t); return r.status === 200 ? b : '';
  } catch (e) { return ''; }
}
async function candidatesFor(p) {
  const name = (p.name || '').trim();
  const qs = [name + ' 产品图', name + ' 官方图', name + ' 不同角度', (p.brand || '') + ' ' + name];
  const out = [];
  for (const q of qs) {
    const bd = await text('https://image.baidu.com/search/acjson?tn=resultjson_com&word=' + encodeURIComponent(q) + '&pn=0&rn=18', { Referer: 'https://image.baidu.com/' });
    out.push(...baiduImgs(bd));
    const bi = await text('https://cn.bing.com/images/async?q=' + encodeURIComponent(q) + '&first=0&count=18&adlt=off');
    out.push(...bingImgs(bi));
    if (out.length >= 16) break;
  }
  const seen = new Set();
  return out.filter((u) => { if (!u || seen.has(u)) return false; seen.add(u); return true; })
    .sort((a, b) => {
      const sc = (u) => (/gips\d?\.baidu|img\d?\.baidu|qnam\.smzdm|pconline|gsmarena|zol|jd\.com|mi\.com/i.test(u) ? 1 : 0)
        + (/1200|1080|e1080|w=1[0-9]{3}/i.test(u) ? 1 : 0);
      return sc(b) - sc(a);
    }).slice(0, 16);
}

(async () => {
  let cache = {};
  if (fs.existsSync(CACHE)) { try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { cache = {}; } }
  const products = loadCurated();
  let todo = products.filter((p) => (cache[p.id] || []).length < PER);
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log('精选 ' + products.length + '，已达 ' + PER + ' 图 ' + products.filter((p) => (cache[p.id] || []).length >= PER).length + '，本轮待抓 ' + todo.length);

  let done = 0, hit = 0;
  const queue = todo.slice();
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const cands = await candidatesFor(p);
      const got = cache[p.id] ? cache[p.id].slice() : [];
      if (p.image && got.indexOf(p.image) === -1) got.unshift(p.image); /* 原图优先 */
      const hostUsed = new Set(got.map((u) => { try { return new URL(u).host; } catch (e) { return ''; } }));
      for (const u of cands) {
        if (got.length >= PER) break;
        if (got.indexOf(u) !== -1) continue;
        let h = ''; try { h = new URL(u).host; } catch (e) {}
        /* 来源分散：同 host 最多 2 张，保证角度/来源多样 */
        const sameHost = got.filter((x) => { try { return new URL(x).host === h; } catch (e) { return false; } }).length;
        if (sameHost >= 2) continue;
        if (await verifyImg(u)) got.push(u);
      }
      cache[p.id] = got.slice(0, Math.max(PER, got.length));
      if (got.length) hit++;
      done++;
      if (done % 15 === 0) {
        fs.writeFileSync(CACHE, JSON.stringify(cache));
        const all = Object.values(cache);
        const avg = all.length ? (all.reduce((n, a) => n + a.length, 0) / all.length) : 0;
        console.log('进度 ' + done + '/' + todo.length + '，均图 ' + avg.toFixed(2));
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  const arr = Object.values(cache);
  console.log('完成：' + arr.length + ' 产品，平均 ' + (arr.reduce((n, a) => n + a.length, 0) / Math.max(1, arr.length)).toFixed(2) + ' 图/产品');
  console.log('达标(≥' + PER + '图)：' + arr.filter((a) => a.length >= PER).length + '/' + arr.length);
})();
