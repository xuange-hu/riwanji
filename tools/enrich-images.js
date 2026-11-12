/* enrich-images.js — 为精选产品抓取真实图片（Baidu 图片 + Bing 图片）并验证可达
   用法：node tools/enrich-images.js [--limit 400] [--concurrency 6] [--only-new]
   结果写入 data/enrich/media-1..N.js（window.DB_MEDIA），并缓存 data/enrich/_imgcache.json 可断点续跑
   原则：只保留 HEAD/GET 验证为 image/* 且 200 的真实直链，绝不臆造 URL */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const ENRICH = path.join(DATA, 'enrich');
const CACHE = path.join(ENRICH, '_imgcache.json');
if (!fs.existsSync(ENRICH)) fs.mkdirSync(ENRICH, { recursive: true });

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
const argv = process.argv.slice(2);
const argNum = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? Number(argv[i + 1]) : d; };
const LIMIT = argNum('limit', 400);
const CONC = argNum('concurrency', 6);

/* ── 载入精选产品 ── */
function loadCurated() {
  const skip = new Set(['categories.js', 'brand-alias.js', 'manifest.js']);
  const files = fs.readdirSync(DATA).filter((f) => f.endsWith('.js') && !skip.has(f));
  const out = [];
  for (const f of files) {
    const code = fs.readFileSync(path.join(DATA, f), 'utf8');
    const window = {};
    try { new Function('window', 'module', code)(window, {}); } catch (e) { continue; }
    for (const ch of (window.DB_CHUNKS || [])) {
      const arr = (ch && (ch.products || ch.items)) || (Array.isArray(ch) ? ch : null);
      if (arr) for (const p of arr) if (p && p.id) out.push({ ...p, _file: f });
      else if (ch && ch.id) out.push({ ...ch, _file: f });
    }
  }
  return out;
}

/* ── 图片验证：必须 image/* 且 200 ── */
async function verifyImg(url) {
  if (!/^https?:\/\//.test(url)) return false;
  try {
    let r = await fetch(url, { method: 'HEAD', headers: UA, redirect: 'follow' });
    let ct = (r.headers.get('content-type') || '').toLowerCase();
    let cl = Number(r.headers.get('content-length') || 0);
    if (r.status === 200 && ct.startsWith('image/') && (!cl || (cl > 2500 && cl < 9e6))) return true;
    /* 部分 CDN 禁 HEAD → 退化为小 GET */
    r = await fetch(url, { headers: { ...UA, Range: 'bytes=0-2047' }, redirect: 'follow' });
    ct = (r.headers.get('content-type') || '').toLowerCase();
    return r.status === 200 && ct.startsWith('image/');
  } catch (e) { return false; }
}

/* ── 候选提取 ── */
function baiduImgs(html) {
  const urls = [];
  for (const m of html.matchAll(/"objURL":"(https?:\/\/[^"]+)"/g)) urls.push(m[1].replace(/\\\//g, '/'));
  for (const m of html.matchAll(/"thumbURL":"(https?:\/\/[^"]+)"/g)) urls.push(m[1].replace(/\\\//g, '/'));
  return urls;
}
function bingImgs(html) {
  const urls = [];
  for (const m of html.matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g)) urls.push(m[1]);
  for (const m of html.matchAll(/"murl":"(https?:\/\/[^"]+)"/g)) urls.push(m[1]);
  return urls;
}
async function text(url, extra) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000);
    const r = await fetch(url, { headers: { ...UA, ...(extra || {}) }, signal: c.signal });
    const b = await r.text(); clearTimeout(t); return r.status === 200 ? b : '';
  } catch (e) { return ''; }
}

async function candidatesFor(p) {
  const qs = [];
  const name = (p.name || '').trim();
  qs.push(name + ' 产品图');
  qs.push(name + ' 官方图');
  qs.push((p.brand || '') + ' ' + name);
  const out = [];
  for (const q of qs) {
    const bd = await text('https://image.baidu.com/search/acjson?tn=resultjson_com&word=' + encodeURIComponent(q) + '&pn=0&rn=12', { Referer: 'https://image.baidu.com/' });
    out.push(...baiduImgs(bd));
    const bi = await text('https://cn.bing.com/images/async?q=' + encodeURIComponent(q) + '&first=0&count=12&adlt=off');
    out.push(...bingImgs(bi));
    if (out.length >= 8) break;
  }
  /* 去重 + 优先高分辨率/常见图床 */
  const seen = new Set();
  return out.filter((u) => {
    if (!u || seen.has(u)) return false; seen.add(u); return true;
  }).sort((a, b) => {
    const score = (u) => (/gips\d?\.baidu|img\d?\.baidu|qnam\.smzdm|pconline|gsmarena|zol|jd\.com|mi\.com/i.test(u) ? 1 : 0)
      + (/1200|1080|e1080|w=1[0-9]{3}/i.test(u) ? 1 : 0);
    return score(b) - score(a);
  }).slice(0, 10);
}

/* ── 主流程 ── */
(async () => {
  let cache = {};
  if (fs.existsSync(CACHE)) { try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { cache = {}; } }

  let products = loadCurated();
  console.log('精选产品 ' + products.length + ' 个，已有图 ' + products.filter((p) => p.image).length + '，缓存命中 ' + Object.keys(cache).length);
  let todo = products.filter((p) => !p.image && !cache[p.id]);
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log('本轮待抓 ' + todo.length + ' 个，并发 ' + CONC);

  let done = 0, hit = 0;
  const queue = todo.slice();
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const cands = await candidatesFor(p);
      let found = null;
      for (const u of cands) { if (await verifyImg(u)) { found = u; break; } }
      if (found) { cache[p.id] = found; hit++; }
      else cache[p.id] = ''; /* 空串=已试无果，避免重试 */
      done++;
      if (done % 20 === 0) {
        fs.writeFileSync(CACHE, JSON.stringify(cache));
        console.log('进度 ' + done + '/' + todo.length + ' 命中 ' + hit);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(CACHE, JSON.stringify(cache));

  /* 写 enrich 分片（每片 60 条） */
  const withImg = Object.keys(cache).filter((k) => cache[k]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const perShard = 60;
  const shardCount = Math.max(1, Math.ceil(withImg.length / perShard));
  /* 删除旧 media 分片 */
  for (const f of fs.readdirSync(ENRICH)) if (/^media-\d+\.js$/.test(f)) fs.unlinkSync(path.join(ENRICH, f));
  for (let s = 0; s < shardCount; s++) {
    const ids = withImg.slice(s * perShard, (s + 1) * perShard);
    const obj = {};
    for (const id of ids) obj[id] = { image: cache[id] };
    const body = '/* 媒体/图片补充数据 ' + (s + 1) + '/' + shardCount + ' */\n' +
      'window.DB_MEDIA = Object.assign(window.DB_MEDIA || {}, ' + JSON.stringify(obj, null, 1) + ');\n';
    fs.writeFileSync(path.join(ENRICH, 'media-' + (s + 1) + '.js'), body);
  }
  console.log('完成：命中 ' + withImg.length + ' 个，写入 media-1..' + shardCount + '.js');
})();
