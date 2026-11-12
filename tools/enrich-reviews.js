/* enrich-reviews.js — 为精选产品抓取真实测评/评论链接（Bing 站内检索真实结果）
   用法：node tools/enrich-reviews.js [--limit 400] [--concurrency 5]
   输出：data/enrich/media-N.js 的 media 字段（title + source + url 均为真实搜索结果，绝不臆造）
   原则：只记录 cn.bing.com 返回的真实标题与真实 URL；每个产品保留 ≤6 条、按来源类型分组 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const ENRICH = path.join(DATA, 'enrich');
const CACHE = path.join(ENRICH, '_revcache.json');
if (!fs.existsSync(ENRICH)) fs.mkdirSync(ENRICH, { recursive: true });

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
const argv = process.argv.slice(2);
const argNum = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? Number(argv[i + 1]) : d; };
const LIMIT = argNum('limit', 400);
const CONC = argNum('concurrency', 5);

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

async function text(url) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000);
    const r = await fetch(url, { headers: UA, signal: c.signal });
    const b = await r.text(); clearTimeout(t); return r.status === 200 ? b : '';
  } catch (e) { return ''; }
}

function decodeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

/* 从 Bing 网页结果提取 (title, url) —— 只取真实结果块 */
function parseResults(html) {
  const out = [];
  for (const m of html.matchAll(/<li class="b_algo"[\s\S]*?<h2><a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/g)) {
    const url = decodeHtml(m[1]);
    const title = decodeHtml(m[2].replace(/<[^>]+>/g, '')).trim();
    if (title && /^https?:\/\//.test(url) && !/bing\.com|microsoft\.com/i.test(url)) out.push({ title, url });
  }
  return out;
}

function hostKind(url, title) {
  if (/bilibili|youtube|youku|ixigua/i.test(url)) return 'video';
  if (/zhihu|weibo|tieba|reddit|chiphell|post\.smzdm/i.test(url)) return 'community';
  if (/dxomark|anandtech|tomshardware|notebookcheck|dpreview|cnap|consumerreports|评测机构/i.test(url + title)) return 'institution';
  return 'review';
}

async function reviewsFor(p) {
  const name = (p.name || '').trim();
  const queries = [
    name + ' 评测',
    name + ' 测评 体验',
    name + ' review'
  ];
  const found = [];
  const seen = new Set();
  for (const q of queries) {
    const html = await text('https://cn.bing.com/search?q=' + encodeURIComponent(q) + '&count=15');
    for (const r of parseResults(html)) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      found.push({ kind: hostKind(r.url, r.title), title: r.title, source: safeHost(r.url), url: r.url });
      if (found.length >= 6) break;
    }
    if (found.length >= 6) break;
  }
  return found;
}

function safeHost(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'web'; }
}

(async () => {
  let cache = {};
  if (fs.existsSync(CACHE)) { try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { cache = {}; } }
  const products = loadCurated();
  let todo = products.filter((p) => !(p.media && p.media.length) && !cache[p.id]);
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log('精选产品 ' + products.length + '，已有测评 ' + products.filter((p) => p.media && p.media.length).length + '，本轮待抓 ' + todo.length);

  let done = 0, hit = 0;
  const queue = todo.slice();
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const list = await reviewsFor(p);
      cache[p.id] = list;
      if (list.length) hit++;
      done++;
      if (done % 20 === 0) { fs.writeFileSync(CACHE, JSON.stringify(cache)); console.log('进度 ' + done + '/' + todo.length + ' 命中 ' + hit); }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(CACHE, JSON.stringify(cache));

  /* 合并图片缓存 + 测评缓存 → 重新写 media 分片 */
  const imgCache = {};
  const imgFile = path.join(ENRICH, '_imgcache.json');
  if (fs.existsSync(imgFile)) { try { Object.assign(imgCache, JSON.parse(fs.readFileSync(imgFile, 'utf8'))); } catch (e) {} }

  const ids = new Set([...Object.keys(imgCache).filter((k) => imgCache[k]), ...Object.keys(cache).filter((k) => (cache[k] || []).length)]);
  const all = [...ids];
  const perShard = 60;
  const shardCount = Math.max(1, Math.ceil(all.length / perShard));
  for (const f of fs.readdirSync(ENRICH)) if (/^media-\d+\.js$/.test(f)) fs.unlinkSync(path.join(ENRICH, f));
  for (let s = 0; s < shardCount; s++) {
    const chunk = all.slice(s * perShard, (s + 1) * perShard);
    const obj = {};
    for (const id of chunk) {
      const e = {};
      if (imgCache[id]) e.image = imgCache[id];
      if ((cache[id] || []).length) e.media = cache[id];
      obj[id] = e;
    }
    fs.writeFileSync(path.join(ENRICH, 'media-' + (s + 1) + '.js'),
      '/* 媒体/图片补充数据 ' + (s + 1) + '/' + shardCount + ' */\n' +
      'window.DB_MEDIA = Object.assign(window.DB_MEDIA || {}, ' + JSON.stringify(obj, null, 1) + ');\n');
  }
  console.log('完成：测评命中 ' + hit + '，合并 ' + all.length + ' 个产品 → media-1..' + shardCount + '.js');
})();
