/* enrich-reviews4.js — 测评链接抓取 v4（v3 + 型号复合词规则 + 多页召回）
   v3 实测遗留问题：apple-iphone-4 匹配到「iPhone - Apple」通用页（纯数字型号 token 被剔除，
   只剩 IPHONE 弱词误放行）。v4 新规则：
     · 名称含数字 → 必须命中「型号复合词」（品牌剥离后名称归一化串，如 iphone4 / findx6 / 3310）；
     · 名称不含数字 → 沿用 v3 规则（T1 型号词命中，或少量弱词全中）；
     · Bing 取第 1、2 页提高召回。
   输出：data/enrich/_revcache4.json */
const fs = require('fs');
const path = require('path');
const ENRICH = path.join(__dirname, '..', 'data', 'enrich');
const CACHE = path.join(ENRICH, '_revcache4.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
const argv = process.argv.slice(2);
const argNum = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? Number(argv[i + 1]) : d; };
const LIMIT = argNum('limit', 400);
const CONC = argNum('concurrency', 4);

const GENERIC = new Set(['PRO', 'MAX', 'MINI', 'AIR', 'PLUS', 'ULTRA', 'NOTE', 'PAD', 'BOOK', 'HOME',
  'WATCH', 'STUDIO', 'FOLD', 'FLIP', 'EDGE', 'NEO', 'ONE', 'TWO', 'SERIES', 'CLASSIC', 'LITE', 'GO',
  'MIX', 'MICRO', 'BIT', 'THE', 'FOR', 'AND', 'NEW', 'GEN', 'SE', 'LE', 'XR', 'GT', 'TV', 'PC', 'AI',
  'LCD', 'LED', 'OLED', 'USB', 'WIFI', 'SUPER', 'MASTER', 'PRIME', 'SMART', 'CORE', 'POWER']);

const BRAND_TOKENS = new Set();
function addBrandTokens(name) {
  const up = String(name || '').toUpperCase();
  if (!up) return;
  BRAND_TOKENS.add(up);
  for (const m of up.matchAll(/[A-Z0-9]+/g)) if (m[0].length >= 2) BRAND_TOKENS.add(m[0]);
  for (const m of up.matchAll(/[\u4e00-\u9fa5]{2,}/g)) {
    BRAND_TOKENS.add(m[0]);
    for (let i = 0; i + 2 <= m[0].length; i++) BRAND_TOKENS.add(m[0].slice(i, i + 2));
  }
}

function brandStrip(name, brand) {
  return String(name || '').replace(new RegExp((brand || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
}
/* 型号复合词：品牌剥离后整名归一化（去空格标点转小写），如 "iPhone 4" → iphone4 */
function modelComp(name, brand) {
  return brandStrip(name, brand).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
}
function hayNorm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
}

function keyTokens(name, brand) {
  const base = brandStrip(name, brand);
  const toks = [];
  for (const m of base.matchAll(/[A-Za-z][A-Za-z0-9]*[-.:]?[A-Za-z0-9]+|[0-9]+[A-Za-z][A-Za-z0-9]*/g)) {
    const t = m[0].toUpperCase();
    if (t.length >= 2) toks.push(t);
  }
  for (const m of base.matchAll(/[\u4e00-\u9fa5]{2,}/g)) {
    const s = m[0];
    for (let i = 0; i + 2 <= s.length; i += 2) toks.push(s.slice(i, i + 2));
    if (s.length >= 3) toks.push(s);
  }
  return [...new Set(toks)].filter((t) => {
    const up = t.toUpperCase();
    if (GENERIC.has(up)) return false;
    if (/^\d+$/.test(up)) return false;
    for (const b of BRAND_TOKENS) if (b.length >= 2 && up.length >= 2 && (b.includes(up) || up.includes(b))) return false;
    return true;
  });
}

function matches(title, url, toks, comp) {
  const hay = (title + ' ' + url).toUpperCase();
  const hayN = hayNorm(title + ' ' + url);
  const t1 = toks.filter((t) => /[0-9]/.test(t) && t.length >= 3);
  /* 名称含数字 → 型号复合词必须命中（防 iPhone 通用页误匹配） */
  if (comp && /[0-9]/.test(comp)) {
    return t1.some((t) => hay.includes(t)) || (comp.length >= 3 && hayN.includes(comp));
  }
  if (t1.length) return t1.some((t) => hay.includes(t));
  const hit = toks.filter((t) => hay.includes(t));
  if (toks.length <= 2) return toks.length > 0 && hit.length === toks.length;
  return hit.length >= 2;
}

function decodeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}
function parseResults(html, toks, comp) {
  const out = [];
  for (const m of html.matchAll(/<li class="b_algo"[\s\S]*?<h2><a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/g)) {
    const url = decodeHtml(m[1]);
    const title = decodeHtml(m[2].replace(/<[^>]+>/g, '')).trim();
    if (!title || !/^https?:\/\//.test(url)) continue;
    if (/bing\.com|microsoft\.com|baike\.baidu|hanyuguoxue|zdic\.net|dictionary\.cambridge|iciba\.com|dict\./i.test(url)) continue;
    if (!matches(title, url, toks, comp)) continue;
    out.push({ title: title.slice(0, 80), url });
  }
  return out;
}
function kindOf(url, title) {
  if (/bilibili|youtube|youku|ixigua/i.test(url)) return 'video';
  if (/zhihu|weibo|tieba|reddit|chiphell|post\.smzdm|douban/i.test(url)) return 'community';
  if (/dxomark|anandtech|tomshardware|notebookcheck|dpreview|consumerreports/i.test(url)) return 'institution';
  if (/评测|测评|体验|上手|开箱|对比|review/i.test(title)) return 'review';
  return 'web';
}
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'web'; } }

async function verifyUrl(url) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 6000);
    const r = await fetch(url, { method: 'HEAD', headers: UA, redirect: 'follow', signal: c.signal });
    clearTimeout(t);
    return r.status === 200;
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
  const DATA = path.join(ENRICH, '..');
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
  const products = loadCurated();
  for (const p of products) addBrandTokens(p.brand);

  let cache = {};
  if (fs.existsSync(CACHE)) { try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { cache = {}; } }
  let todo = products.filter((p) => !cache[p.id]);
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log('精选 ' + products.length + '，本轮 ' + todo.length);

  let done = 0, hit = 0;
  const queue = todo.slice();
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const toks = keyTokens(p.name, p.brand);
      const comp = modelComp(p.name, p.brand);
      const found = [];
      const seen = new Set();
      for (const q of [p.name + ' 评测', p.name + ' 测评 体验']) {
        if (found.length >= 6) break;
        for (const first of [0, 10]) { /* 两页召回 */
          if (found.length >= 6) break;
          const html = await text('https://cn.bing.com/search?q=' + encodeURIComponent(q) + '&first=' + first);
          for (const r of parseResults(html, toks, comp)) {
            if (found.length >= 6) break;
            if (seen.has(r.url)) continue;
            seen.add(r.url);
            if (!(await verifyUrl(r.url))) continue;
            found.push({ kind: kindOf(r.url, r.title), title: r.title, source: hostOf(r.url), url: r.url });
          }
        }
      }
      const rank = { video: 0, review: 1, institution: 1, community: 2, web: 3 };
      found.sort((a, b) => (rank[a.kind] || 9) - (rank[b.kind] || 9));
      cache[p.id] = found.slice(0, 6);
      if (cache[p.id].length) hit++;
      done++;
      if (done % 20 === 0) { fs.writeFileSync(CACHE, JSON.stringify(cache)); console.log('进度 ' + done + '/' + todo.length + '，命中 ' + hit); }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  const total = Object.values(cache).reduce((n, a) => n + a.length, 0);
  console.log('完成：命中 ' + hit + ' 产品，链接 ' + total + ' 条');
})();
