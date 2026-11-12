/* enrich-reviews3.js — 严格版测评链接抓取 v3（修掉品牌词/泛词误匹配）
   v2 缺陷（本轮实测发现）：
     1) p.brand 与名称里的品牌写法不一致（如 brand=Philips 名称=飞利浦）→ 品牌词泄漏成特征词，
        品牌官网首页全部误匹配（飞利浦官网 ×6、西门子中国 ×6）；
     2) MICRO/PRO/MAX 等泛词被当强特征词 → 词典站误匹配。
   v3 规则：
     · 全局品牌词表（所有产品的 brand + 其 token）全部从特征词中剔除；
     · 泛词黑名单剔除；
     · T1（含数字且≥3字符的型号 token）存在 → 标题/URL 必须命中 ≥1 个 T1；
     · 无 T1 → 过滤后 token 集若 ≤2 则要求全部命中，否则 ≥2 命中；
     · 品牌官方域名链接仅标记 kind=official，排序靠后，最多 2 条。
   输出：data/enrich/_revcache3.json */
const fs = require('fs');
const path = require('path');
const ENRICH = path.join(__dirname, '..', 'data', 'enrich');
const CACHE = path.join(ENRICH, '_revcache3.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
const argv = process.argv.slice(2);
const argNum = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? Number(argv[i + 1]) : d; };
const LIMIT = argNum('limit', 400);
const CONC = argNum('concurrency', 4);

const GENERIC = new Set(['PRO', 'MAX', 'MINI', 'AIR', 'PLUS', 'ULTRA', 'NOTE', 'PAD', 'BOOK', 'HOME',
  'WATCH', 'STUDIO', 'FOLD', 'FLIP', 'EDGE', 'NEO', 'ONE', 'TWO', 'SERIES', 'CLASSIC', 'LITE', 'GO',
  'MIX', 'MICRO', 'BIT', 'THE', 'FOR', 'AND', 'NEW', 'GEN', 'SE', 'LE', 'XR', 'GT', 'TV', 'PC', 'AI',
  'LCD', 'LED', 'OLED', 'USB', 'WIFI', 'MAX', 'SUPER', 'MASTER', 'PRIME', 'SMART', 'CORE', 'POWER',
  'V2', 'X1', 'X2', 'M1', 'M2', 'M3', 'P1', 'S1', 'A1', 'T1', 'V1']);

/* 全局品牌词表：任何品牌的任何片段都不能当特征词 */
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

function keyTokens(name, brand) {
  const base = String(name || '').replace(new RegExp((brand || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
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
  /* 剔除：品牌词（含片段）+ 泛词 + 纯数字 */
  return [...new Set(toks)].filter((t) => {
    const up = t.toUpperCase();
    if (GENERIC.has(up)) return false;
    if (/^\d+$/.test(up)) return false;
    for (const b of BRAND_TOKENS) if (b.length >= 2 && up.length >= 2 && (b.includes(up) || up.includes(b))) return false;
    return true;
  });
}

/* T1：含数字且长度≥3 的型号 token（HD9867 / X-T4 / D850 / 1000XM5） */
function tier1(toks) { return toks.filter((t) => /[0-9]/.test(t) && t.length >= 3); }

function matches(title, url, toks) {
  const hay = (title + ' ' + url).toUpperCase();
  const hit = toks.filter((t) => hay.includes(t.toUpperCase()));
  const t1 = tier1(toks);
  if (t1.length) return t1.some((t) => hay.includes(t));
  if (toks.length <= 2) return toks.length > 0 && hit.length === toks.length;
  return hit.length >= 2;
}

function decodeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}
function parseResults(html, toks) {
  const out = [];
  for (const m of html.matchAll(/<li class="b_algo"[\s\S]*?<h2><a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/g)) {
    const url = decodeHtml(m[1]);
    const title = decodeHtml(m[2].replace(/<[^>]+>/g, '')).trim();
    if (!title || !/^https?:\/\//.test(url)) continue;
    if (/bing\.com|microsoft\.com|baike\.baidu|hanyuguoxue|zdic\.net|dictionary\.cambridge|iciba\.com|dict\./i.test(url)) continue;
    if (!matches(title, url, toks)) continue;
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
  /* 先建全局品牌词表（全部产品的 brand） */
  for (const p of products) addBrandTokens(p.brand);
  try {
    const alias = require(path.join(ENRICH, '..', 'brand-alias.js'));
    (alias.BRAND_ALIAS || alias || []).forEach((a) => addBrandTokens(typeof a === 'string' ? a : (a.alias || a.name)));
  } catch (e) { /* 可选 */ }

  let cache = {};
  if (fs.existsSync(CACHE)) { try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { cache = {}; } }
  let todo = products.filter((p) => !cache[p.id]);
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log('精选 ' + products.length + '，本轮 ' + todo.length + '，品牌词表 ' + BRAND_TOKENS.size);

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
          found.push({ kind: kindOf(r.url, r.title), title: r.title, source: hostOf(r.url), url: r.url });
        }
      }
      /* 排序：测评/视频/社区靠前，官方 'web' 靠后；官方 ≤2 */
      const rank = { video: 0, review: 1, institution: 1, community: 2, web: 3 };
      found.sort((a, b) => (rank[a.kind] || 9) - (rank[b.kind] || 9));
      const webN = found.filter((x) => x.kind === 'web').length;
      cache[p.id] = webN > 2 ? found.filter((x) => x.kind !== 'web' || found.indexOf(x) < 2).slice(0, 6) : found.slice(0, 6);
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
