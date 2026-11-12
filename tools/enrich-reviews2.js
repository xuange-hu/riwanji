/* enrich-reviews2.js — 严格版测评链接抓取（标题强匹配，防错配）
   与 v1 的区别：结果标题必须命中产品名的特征词（型号 token / 双字词），否则丢弃；
   每条 URL 做可达性验证；来源分类 video/community/institution/review。
   用法：node tools/enrich-reviews2.js [--limit 400] [--concurrency 4]
   输出：data/enrich/_revcache2.json { id: [{kind,title,source,url}] }
   原则：标题不含产品特征词的结果一律拒绝（上一版就是错配在这一步） */
const fs = require('fs');
const path = require('path');
const ENRICH = path.join(__dirname, '..', 'data', 'enrich');
const CACHE = path.join(ENRICH, '_revcache2.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
const argv = process.argv.slice(2);
const argNum = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? Number(argv[i + 1]) : d; };
const LIMIT = argNum('limit', 400);
const CONC = argNum('concurrency', 4);

/* 产品名 → 特征词集合：型号 token（含字母数字）优先，CJK 双字词次之 */
function keyTokens(name, brand) {
  const base = String(name || '').replace(brand || '', ' ');
  const toks = [];
  /* 型号 token：如 V15 / X-T4 / D850 / WH-1000XM5 / 5D / ECAM23.420 */
  for (const m of base.matchAll(/[A-Za-z][A-Za-z0-9]*[-.]?[A-Za-z0-9]+|[0-9]+[A-Za-z][A-Za-z0-9]*/g)) {
    const t = m[0].toUpperCase();
    if (t.length >= 2) toks.push(t);
  }
  /* CJK 词：连续 ≥2 字的片段（如 无绳吸尘器 → 无绳/吸尘/尘器） */
  for (const m of base.matchAll(/[\u4e00-\u9fa5]{2,}/g)) {
    const s = m[0];
    for (let i = 0; i + 2 <= s.length; i += 2) toks.push(s.slice(i, i + 2));
    if (s.length >= 3) toks.push(s);
  }
  return [...new Set(toks)];
}

/* 标题/URL 强匹配：至少命中 2 个特征词，或 1 个型号 token */
function titleMatches(title, url, toks) {
  const hay = (title + ' ' + url).toUpperCase();
  let hit = 0, strong = false;
  for (const t of toks) {
    if (hay.indexOf(t.toUpperCase()) === -1) continue;
    if (/[A-Z0-9]/.test(t) && t.length >= 3) strong = true;
    hit++;
  }
  return strong || hit >= 2;
}

function parseResults(html, toks) {
  const out = [];
  /* 只取主结果列表 b_algo 块 */
  for (const m of html.matchAll(/<li class="b_algo"[\s\S]*?<h2><a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/g)) {
    const url = decodeHtml(m[1]);
    const title = decodeHtml(m[2].replace(/<[^>]+>/g, '')).trim();
    if (!title || !/^https?:\/\//.test(url)) continue;
    if (/bing\.com|microsoft\.com|baike\.baidu|hanyuguoxue|zdic\.net/i.test(url)) continue; /* 词典/百科垃圾 */
    if (!titleMatches(title, url, toks)) continue; /* 核心防线：标题不含产品特征词 */
    out.push({ title: title.slice(0, 80), url });
  }
  return out;
}
function decodeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}
function kindOf(url) {
  if (/bilibili|youtube|youku|ixigua/i.test(url)) return 'video';
  if (/zhihu|weibo|tieba|reddit|chiphell|post\.smzdm/i.test(url)) return 'community';
  if (/dxomark|anandtech|tomshardware|notebookcheck|dpreview|consumerreports/i.test(url)) return 'institution';
  return 'review';
}
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'web'; } }

async function verifyUrl(url) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 6000);
    const r = await fetch(url, { method: 'HEAD', headers: UA, redirect: 'follow', signal: c.signal });
    clearTimeout(t);
    if (r.status === 200) return true;
    /* 部分站点禁 HEAD → 退化小 GET */
    const c2 = new AbortController(); const t2 = setTimeout(() => c2.abort(), 6000);
    const r2 = await fetch(url, { headers: { ...UA, Range: 'bytes=0-512' }, redirect: 'follow', signal: c2.signal });
    clearTimeout(t2);
    return r2.status === 200;
  } catch (e) { return false; }
}

async function text(url) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000);
    const r = await fetch(url, { headers: UA, signal: c.signal });
    const b = await r.text(); clearTimeout(t); return r.status === 200 ? b : '';
  } catch (e) { return ''; }
}

function loadCurated() {
  const DATA = path.join(ENRICH, '..', '');
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

(async () => {
  let cache = {};
  if (fs.existsSync(CACHE)) { try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { cache = {}; } }
  const products = loadCurated();
  let todo = products.filter((p) => !cache[p.id] && !(p.media && p.media.length));
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log('精选 ' + products.length + '，已有测评 ' + products.filter((p) => p.media && p.media.length).length + '，本轮 ' + todo.length);

  let done = 0, hit = 0;
  const queue = todo.slice();
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const toks = keyTokens(p.name, p.brand);
      const found = [];
      const seen = new Set();
      for (const q of [p.name + ' 评测', p.name + ' 测评 体验']) {
        if (found.length >= 6) break;
        const html = await text('https://cn.bing.com/search?q=' + encodeURIComponent(q));
        for (const r of parseResults(html, toks)) {
          if (found.length >= 6) break;
          if (seen.has(r.url)) continue;
          seen.add(r.url);
          if (!(await verifyUrl(r.url))) continue;
          found.push({ kind: kindOf(r.url), title: r.title, source: hostOf(r.url), url: r.url });
        }
      }
      cache[p.id] = found;
      if (found.length) hit++;
      done++;
      if (done % 20 === 0) { fs.writeFileSync(CACHE, JSON.stringify(cache)); console.log('进度 ' + done + '/' + todo.length + '，命中产品 ' + hit); }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  const total = Object.values(cache).reduce((n, a) => n + a.length, 0);
  console.log('完成：命中产品 ' + hit + '，链接共 ' + total + ' 条，均 ' + (total / Math.max(1, Object.keys(cache).length)).toFixed(2) + ' 条/产品');
})();
