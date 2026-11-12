#!/usr/bin/env node
/* ============================================================
   tools/serve.js — 日理万机在线服务器（v2 · 百万 SKU 架构）
   静态文件 + 百万级产品检索 API。
   架构：精选数据全内存；海量 SKU 用「轻量索引常驻内存 +
   完整详情按需从 bulk-detail.jsonl 随机读取」，支撑百万级数据。

   启动： node tools/serve.js [--port 8123]
   前端契约：
     GET /api/meta        全库概览（含品类树统计）
     GET /api/categories  品类树 + 各品类型号数
     GET /api/home        首页数据
     GET /api/search      q/cat/leaf/brand/era/source/sort/page/pageSize
     GET /api/suggest     q
     GET /api/product/:id
     GET /api/products?ids=a,b,c
     GET /api/ranking     cat/sort/dir/page/pageSize
     GET /api/timeline
     GET /api/related?id=
     GET /api/brands                品牌目录（跨品类统计）
     GET /api/brand/:name           品牌详情（sort/page/pageSize）
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const TREE = require(path.join(ROOT, 'data', 'categories.js'));
const BRAND_ALIAS = require(path.join(ROOT, 'data', 'brand-alias.js'));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jsonl': 'application/x-ndjson; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

/* ---------- 参数 ---------- */
function parseArgs() {
  const a = { port: parseInt(process.env.PORT, 10) || 8123 };
  const argv = process.argv;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--port') a.port = parseInt(argv[++i], 10) || 8123;
  }
  return a;
}

/* ---------- 数据装载 ---------- */
function loadChunkFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  const window = {};
  new Function('window', code)(window);
  return window.DB_CHUNKS || [];
}

/* 媒体与图片补充数据（data/enrich/*.js → window.DB_MEDIA） */
function loadEnrich() {
  const dir = path.join(DATA_DIR, 'enrich');
  if (!fs.existsSync(dir)) return {};
  const merged = {};
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    try {
      const window = {};
      new Function('window', 'module', fs.readFileSync(path.join(dir, f), 'utf8'))(window, {});
      Object.assign(merged, window.DB_MEDIA || {});
    } catch (e) {
      console.warn('  跳过 enrich/' + f + '：' + e.message);
    }
  }
  return merged;
}

/* 全网测评搜索直达链接（真实可用的搜索入口，非杜撰链接） */
function searchLinks(name) {
  const q = encodeURIComponent(name + ' 测评');
  const qv = encodeURIComponent(name + ' 评测');
  return [
    { kind: 'video', title: 'B 站搜索「' + name + ' 评测」', source: 'bilibili', url: 'https://search.bilibili.com/all?keyword=' + qv },
    { kind: 'video', title: 'YouTube 搜索「' + name + ' review」', source: 'YouTube', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' review') },
    { kind: 'community', title: '知乎搜索「' + name + '」', source: '知乎', url: 'https://www.zhihu.com/search?q=' + encodeURIComponent(name) },
    { kind: 'institution', title: 'Google 搜索「' + name + ' 评测」', source: 'Google', url: 'https://www.google.com/search?q=' + q }
  ];
}

/* 产品海报 SVG：品牌 + 型号 + 品类图标 + 渐变底（无真实图时的兜底视觉） */
function posterSVG(p, variant) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const name = String(p.name || '');
  const brand = String(p.brand || '');
  const icon = (p.categoryName || '📦');
  // 由 id 派生稳定色相，保证同一产品配色一致
  let h = 0;
  const v = variant | 0;
  const id = String(p.id || name) + '#' + v;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue1 = (h + v * 97) % 360, hue2 = (hue1 + 42 + v * 13) % 360;
  const size = 800;
  const nameSize = name.length > 18 ? 40 : (name.length > 12 ? 50 : 60);
  /* 三种视觉变体：0=正面主视 1=参数视 2=侧视，构图各异 */
  const geo = v === 0
    ? '<circle cx="640" cy="160" r="190" fill="none" stroke="hsla(' + hue2 + ',70%,70%,0.25)" stroke-width="2"/>'
      + '<circle cx="640" cy="160" r="130" fill="none" stroke="hsla(' + hue2 + ',70%,70%,0.18)" stroke-width="2"/>'
      + '<circle cx="140" cy="660" r="160" fill="none" stroke="hsla(' + hue1 + ',70%,75%,0.16)" stroke-width="2"/>'
    : v === 1
      ? [0, 1, 2, 3].map((i) => '<rect x="72" y="' + (380 + i * 64) + '" width="' + (300 + (i % 2) * 200) + '" height="14" rx="7" fill="hsla(' + hue2 + ',60%,80%,0.22)"/>').join('')
      : '<rect x="72" y="380" width="656" height="200" rx="18" fill="hsla(' + hue2 + ',55%,70%,0.12)"/><rect x="120" y="430" width="560" height="100" rx="12" fill="hsla(' + hue1 + ',60%,75%,0.16)"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 800 800">' +
    '<defs><linearGradient id="g" x1="' + (v === 2 ? 1 : 0) + '" y1="0" x2="' + (v === 0 ? 1 : 0) + '" y2="1">' +
    '<stop offset="0%" stop-color="hsl(' + hue1 + ',58%,22%)"/>' +
    '<stop offset="55%" stop-color="hsl(' + hue2 + ',62%,30%)"/>' +
    '<stop offset="100%" stop-color="hsl(' + hue1 + ',55%,14%)"/></linearGradient>' +
    '<radialGradient id="glow" cx="0.75" cy="0.2" r="0.9">' +
    '<stop offset="0%" stop-color="hsl(' + hue2 + ',80%,60%)" stop-opacity="0.35"/>' +
    '<stop offset="100%" stop-color="hsl(' + hue2 + ',80%,60%)" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="800" height="800" fill="url(#g)"/>' +
    '<rect width="800" height="800" fill="url(#glow)"/>' + geo +
    '<text x="72" y="200" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="34" fill="hsla(' + hue2 + ',70%,82%,0.9)">' + esc(brand) + '</text>' +
    '<text x="72" y="300" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="' + nameSize + '" font-weight="700" fill="#fff">' + esc(name.slice(0, 22)) + '</text>' +
    (name.length > 22 ? '<text x="72" y="' + (300 + nameSize + 12) + '" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="' + (nameSize - 12) + '" font-weight="700" fill="#fff">' + esc(name.slice(22, 46)) + '</text>' : '') +
    '<text x="72" y="720" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="30" fill="hsla(' + hue1 + ',60%,85%,0.75)">' + esc(p.categoryName || '') + ' · ' + esc(p.year || '') + ' · 日理万机</text>' +
    '<rect x="72" y="620" width="86" height="6" rx="3" fill="hsl(' + hue2 + ',75%,62%)"/>' +
    '</svg>';
}

/* 每款产品图集（≥3 图）：真实图优先，不足用海报变体补足；供 API 返回 images 字段 */
function galleryFor(rec, full) {
  const p = full || rec;
  const real = [];
  if (Array.isArray(p.images) && p.images.length) real.push(...p.images.filter(Boolean));
  if (p.image && real.indexOf(p.image) === -1) real.unshift(p.image);
  if (real.length >= 3) return real.slice(0, 6);
  const out = real.slice();
  const id = encodeURIComponent(String(rec.id));
  for (let v = 0; out.length < 3; v++) out.push('/api/image/' + id + '?v=' + v);
  return out;
}

async function loadCurated(catMeta) {
  const items = [];
  let manifest = { shards: [] };
  try {
    const code = fs.readFileSync(path.join(DATA_DIR, 'manifest.js'), 'utf8');
    const window = {};
    new Function('window', code)(window);
    manifest = window.DB_MANIFEST || manifest;
  } catch (e) {
    console.warn('  警告：无法读取 data/manifest.js（' + e.message + '），请先运行 tools/build-manifest.js');
  }
  for (const s of (manifest.shards || [])) {
    /* data/gen/ 是纯静态托管扩充分片（与 bulk-index 同源），在线模式已有完整 bulk 数据，跳过以免重复计数 */
    if (s.file.indexOf('data/gen/') === 0) continue;
    const file = path.join(ROOT, s.file);
    if (!fs.existsSync(file)) continue;
    let chunks = [];
    try { chunks = loadChunkFile(file); } catch (e) { console.warn('  跳过 ' + s.file + '：' + e.message); continue; }
    for (const c of chunks) {
      if (!catMeta.has(c.category)) {
        catMeta.set(c.category, {
          id: c.category, name: c.categoryName || c.category,
          icon: c.icon || '📦', description: c.description || '', count: 0
        });
      }
      for (const p of (c.products || [])) {
        p.category = p.category || c.category;
        p.categoryName = catMeta.get(c.category).name;
        p.source = p.source || 'curated';
        items.push(p);
      }
    }
  }
  return items;
}

/* 海量 SKU：轻量索引进内存，完整详情留在磁盘分片按需读取 */
const DETAIL_FDS = [];      // 分片 fd 列表（bulk-detail-0.jsonl …）
const DETAIL_CACHE = new Map(); // id → 完整产品（小容量 LRU）

async function loadBulkIndex(catMeta) {
  const idxPath = path.join(DATA_DIR, 'bulk', 'bulk-index.jsonl');
  if (!fs.existsSync(idxPath)) return { count: 0, ms: 0 };
  /* 打开详情分片（兼容旧单文件） */
  for (let i = 0; ; i++) {
    const f = path.join(DATA_DIR, 'bulk', 'bulk-detail-' + i + '.jsonl');
    if (!fs.existsSync(f)) break;
    DETAIL_FDS.push(fs.openSync(f, 'r'));
  }
  if (!DETAIL_FDS.length) {
    const single = path.join(DATA_DIR, 'bulk', 'bulk-detail.jsonl');
    if (fs.existsSync(single)) DETAIL_FDS.push(fs.openSync(single, 'r'));
  }
  const t0 = Date.now();
  const stream = fs.createReadStream(idxPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (!line) continue;
    let p;
    try { p = JSON.parse(line); } catch (e) { continue; }
    p.categoryName = p.catName || (catMeta.get(p.category) || {}).name || p.category;
    p.source = 'bulk';
    PRODUCTS.push(p);
    n++;
    if (n % 250000 === 0) console.log('  … 索引已载入 ' + n.toLocaleString() + ' 条');
  }
  return { count: n, ms: Date.now() - t0 };
}

function hydrate(rec) {
  if (!rec) return null;
  let full = rec;
  if (rec.off != null && DETAIL_FDS.length) {
    if (DETAIL_CACHE.has(rec.id)) {
      /* 真 LRU：命中后移到队尾，淘汰时删队首 */
      full = DETAIL_CACHE.get(rec.id);
      DETAIL_CACHE.delete(rec.id);
      DETAIL_CACHE.set(rec.id, full);
    } else {
      try {
        const fd = DETAIL_FDS[rec.df || 0];
        if (fd != null) {
          const buf = Buffer.alloc(rec.len);
          fs.readSync(fd, buf, 0, rec.len, rec.off);
          full = JSON.parse(buf.toString('utf8'));
          DETAIL_CACHE.set(rec.id, full);
          if (DETAIL_CACHE.size > 4096) DETAIL_CACHE.delete(DETAIL_CACHE.keys().next().value);
        }
      } catch (e) { full = rec; }
    }
  }
  /* 没有真实测评索引的产品 → 提供全网搜索直达链接（真实可用入口） */
  if (!full.media || !full.media.length) full.media = searchLinks(full.name);
  return full;
}

/* ---------- 全局状态 ---------- */
const PRODUCTS = [];
let CATS = [];        // [{id,name,icon,description,count}]
let BRANDS = [];      // 按 count 降序
let LEAF_COUNTS = {}; // leafId → count
let YEAR_MIN = 9999;
let YEAR_MAX = 0;
const BY_ID = new Map();

function finalize(catMeta) {
  const counts = {};
  const leafCounts = {};
  const catBrand = new Map(); /* 品类 → 品牌 → 数量（品牌细分） */
  for (const p of PRODUCTS) {
    counts[p.category] = (counts[p.category] || 0) + 1;
    if (p.catLeaf) leafCounts[p.catLeaf] = (leafCounts[p.catLeaf] || 0) + 1;
    if (p.year) { if (p.year < YEAR_MIN) YEAR_MIN = p.year; if (p.year > YEAR_MAX) YEAR_MAX = p.year; }
    if (!BY_ID.has(p.id)) BY_ID.set(p.id, p); else console.warn('  重复 id 已忽略：' + p.id);
    let bm = catBrand.get(p.category);
    if (!bm) catBrand.set(p.category, bm = {});
    bm[p.brand] = (bm[p.brand] || 0) + 1;
  }
  /* 品类注册表里的基础品类补进 catMeta（保证名称/图标一致） */
  for (const g of TREE.groups) {
    for (const b of g.bases) {
      if (!catMeta.has(b.id)) {
        catMeta.set(b.id, { id: b.id, name: b.name, icon: b.icon, description: g.name, count: 0 });
      }
    }
  }
  CATS = Array.from(catMeta.values()).filter((c) => counts[c.id])
    .map((c) => Object.assign({}, c, { count: counts[c.id] }));
  CATS.sort((a, b) => b.count - a.count);
  /* 每个品类按品牌细分（降序，全部品牌） */
  for (const c of CATS) {
    const bm = catBrand.get(c.id) || {};
    c.brands = Object.keys(bm).sort((x, y) => bm[y] - bm[x]).map((b) => ({ name: b, count: bm[b] }));
  }
  LEAF_COUNTS = leafCounts;
  /* 每个品类的细分叶子（含交叉细分），供列表页细分筛选 */
  const baseById = {};
  for (const g of TREE.groups) for (const b of g.bases) baseById[b.id] = b;
  for (const c of CATS) {
    const b = baseById[c.id];
    if (!b) { c.leaves = [{ id: c.id, name: c.name, count: c.count }]; continue; }
    const leaves = [{ id: b.id, name: b.name, count: leafCounts[b.id] || 0 }];
    for (const v of (b.variants || [])) {
      const lid = b.id + '-' + v.slug;
      if (b.cross && b.cross.length) {
        for (const cr of b.cross) {
          const cid = lid + '-' + cr.slug;
          leaves.push({ id: cid, name: b.name + ' · ' + v.label + ' ' + cr.label, count: leafCounts[cid] || 0 });
        }
      } else {
        leaves.push({ id: lid, name: b.name + ' · ' + v.label, count: leafCounts[lid] || 0 });
      }
    }
    c.leaves = leaves.filter((l) => l.count > 0);
  }
  const brandCount = {};
  for (const p of PRODUCTS) brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
  BRANDS = Object.keys(brandCount).sort((a, b) => brandCount[b] - brandCount[a]);
}

/* 预计算检索串（不含 review，控制内存）；含品牌别名（中英互通） */
function aliasOf(brand) {
  return BRAND_ALIAS[brand] ? ' ' + BRAND_ALIAS[brand] : '';
}
function buildHaystacks() {
  for (const p of PRODUCTS) {
    const alias = aliasOf(p.brand);
    const hay = (p.name + ' ' + p.brand + alias + ' ' + (p.summary || '') + ' ' +
      (p.tags || []).join(' ') + ' ' + (p.catName || '') + ' ' + (p.subcat || '') + ' ' +
      (p.specs ? p.specs.map((s) => s[1]).join(' ') : '')).toLowerCase();
    p._hay = hay;
    p._name = String(p.name).toLowerCase();
    p._brand = (String(p.brand) + alias).toLowerCase();
    p._tags = (p.tags || []).join(' ').toLowerCase();
    p._cat = (String(p.catName || '') + ' ' + String(p.subcat || '') + ' ' + String(p.categoryName || '')).toLowerCase(); /* 品类词表（含细分，如「耳机 降噪耳机」） */
    if (p.catLeaf) p._leaf = p.catLeaf;
  }
}

/* ---------- 检索与排序 ---------- */
/* 单字符英文数字噪声（如 "xbox series x" 的 x）直接丢弃 */
const tokenize = (q) => String(q || '').toLowerCase().split(/[\s,，、;；+]+/)
  .filter((t) => t && !(t.length === 1 && /[a-z0-9]/.test(t)));

/* 中文长词切分为双字词（「降噪耳机」→ 降噪+耳机），提升中文语义查询命中 */
const isCJK = (t) => /[\u4e00-\u9fa5]/.test(t);
function cjkSplit(toks) {
  const out = [];
  for (const t of toks) {
    if (isCJK(t) && t.length >= 4 && /^[\u4e00-\u9fa5]+$/.test(t)) {
      for (let i = 0; i + 1 < t.length; i += 2) out.push(t.slice(i, i + 2));
    } else out.push(t);
  }
  return out;
}

/* 常见型号别名 → 展开为真实全称词，让「ps5」能搜到 PlayStation 5 */
const QUERY_ALIAS = {
  'ps5': 'playstation 5', 'ps4': 'playstation 4', 'ps3': 'playstation 3', 'ps2': 'playstation 2',
  'xss': 'xbox series s', 'xsx': 'xbox series x', 'xb1': 'xbox one', 'x360': 'xbox 360',
  'nsw': 'nintendo switch', 'switch': 'nintendo switch', 'wiiu': 'wii u',
  'gbc': 'game boy color', 'gba': 'game boy advance', 'famicom': 'famicom', 'mega drive': 'mega drive',
  'mba': 'macbook air', 'mbp': 'macbook pro', 'x1c': 'thinkpad x1 carbon',
  'steamdeck': 'steam deck', 'quest3': 'quest 3', 'quest2': 'quest 2',
  'a7m4': 'a7m4', 'xt5': 'x-t5', 'mavic': 'mavic', 'gopro': 'hero',
  'xm5': 'wh-1000xm5', 'xm4': 'wh-1000xm4', 'airpods': 'airpods',
  'findx6': 'find x6', 'mate60': 'mate 60', 'magic6': 'magic 6',
  's23u': 'galaxy s23 ultra', 's24u': 'galaxy s24 ultra', 'n3310': '3310', 'razr': 'razr',
  /* 英文品类词 → 中文（headphone 能搜到耳机分类） */
  'headphone': '耳机', 'headphones': '耳机', 'earbuds': '耳机', 'earphone': '耳机',
  'camera': '相机', 'laptop': '笔记本', 'notebook': '笔记本', 'phone': '手机', 'smartphone': '手机',
  'watch': '手表', 'smartwatch': '智能手表', 'tablet': '平板电脑',
  'speaker': '音箱', 'keyboard': '键盘', 'mouse': '鼠标', 'drone': '无人机', 'tv': '电视',
  'console': '游戏机', 'monitor': '显示器', 'router': '路由器', 'ssd': '固态硬盘', 'gpu': '显卡',
  'cpu': '处理器', 'printer': '打印机', 'projector': '投影'
};

function expandQuery(q) {
  return String(q || '').toLowerCase().split(/\s+/).filter(Boolean)
    .map((t) => (QUERY_ALIAS[t] || t))
    .join(' ');
}

function searchItems(q, cat, leaf, brand, era, source) {
  let list = PRODUCTS;
  if (cat) list = list.filter((p) => p.category === cat);
  if (leaf) list = list.filter((p) => p._leaf === leaf);
  if (brand) list = list.filter((p) => p.brand === brand);
  if (source === 'curated' || source === 'bulk') list = list.filter((p) => p.source === source);
  if (era) {
    list = list.filter((p) => {
      const y = p.year || 0;
      if (era === '2020s') return y >= 2020;
      if (era === '2010s') return y >= 2010 && y < 2020;
      if (era === '2000s') return y >= 2000 && y < 2010;
      if (era === 'pre') return y < 2000;
      return true;
    });
  }
  const exq = expandQuery(q);
  const phrase = String(exq || '').toLowerCase().replace(/\s+/g, ' ').trim(); /* 整句：连续子串命中权重最高 */
  const toks = cjkSplit(tokenize(exq));
  if (!toks.length) return { list: list, scored: false };

  const scored = [];
  for (const p of list) {
    let s = 0, hitAll = true, nameHits = 0, brandHits = 0, strongHit = false;
    for (const t of toks) {
      /* 品类词（耳机/相机/手机…）天然出现在「品牌 耳机 型号」式通名里，降权防止通名刷榜 */
      const catWord = p._cat.indexOf(t) !== -1;
      if (p._name.indexOf(t) !== -1) { s += catWord ? 3 : 12; nameHits++; strongHit = true; }
      else if (p._brand.indexOf(t) !== -1) { s += 6; brandHits++; strongHit = true; }
      else if (p._tags.indexOf(t) !== -1) { s += 5; strongHit = true; }
      else if (catWord) { s += 4; strongHit = true; } /* 品类词命中（耳机/相机/手表…） */
      else if (p._hay.indexOf(t) !== -1) s += 2;
      else { hitAll = false; break; }
    }
    if (!hitAll) continue;
    /* 整句与全名命中：保证「搜 Find X6 时 Find X6 压过 Find X6 Pro」；
       整句本身是品类词（如「相机」）时降权，避免通名刷屏 */
    const catPhrase = p._cat.indexOf(phrase) !== -1;
    if (p._name.indexOf(phrase) !== -1) s += catPhrase ? 4 : 30;
    else if (p._hay.indexOf(phrase) !== -1) s += 8;
    if (catPhrase) s += 20; /* 整句是品类词 → 全品类加权，真实产品靠评分胜出 */
    if (p._name === phrase) s += 25;
    /* 全词名称命中加权，但查询全是品类词时跳过（「万魔 降噪耳机 F114」式通名不该靠名称刷分） */
    const allCatWords = toks.every((t) => p._cat.indexOf(t) !== -1);
    if (nameHits === toks.length && !allCatWords) s += 15; /* 每个词都出现在名称里 */
    /* 真实精选产品置顶（仅在名称/品牌/标签/品类确有命中时强加权，防蹭词） */
    if (p.source !== 'bulk') s += strongHit ? 35 : 8;
    scored.push([p, s]);
  }
  if (scored.length) {
    scored.sort((a, b) => b[1] - a[1] ||
      (b[0].source !== 'bulk') - (a[0].source !== 'bulk') || /* 同分时真实精选产品优先 */
      String(a[0].name).length - String(b[0].name).length ||
      (b[0].score || 0) - (a[0].score || 0));
    return { list: scored.map((x) => x[0]), scored: true };
  }
  // AND 无结果 → OR 降级（至少命中一半词，避免无关噪声）
  const need = Math.ceil(toks.length / 2);
  for (const p of list) {
    let hits = 0, s = 0;
    for (const t of toks) {
      if (p._name.indexOf(t) !== -1) { hits++; s += 4; }
      else if (p._brand.indexOf(t) !== -1) { hits++; s += 2; }
      else if (p._hay.indexOf(t) !== -1) { hits++; s += 1; }
    }
    if (hits < need) continue;
    if (p._name.indexOf(phrase) !== -1) s += 10;
    if (p.source !== 'bulk') s += 8;
    scored.push([p, s]);
  }
  scored.sort((a, b) => b[1] - a[1] ||
    String(a[0].name).length - String(b[0].name).length ||
    (b[0].score || 0) - (a[0].score || 0));
  return { list: scored.map((x) => x[0]), scored: true };
}

const SORTERS = {
  score: (a, b) => (b.score || 0) - (a.score || 0) || (b.userScore || 0) - (a.userScore || 0),
  user: (a, b) => (b.userScore || 0) - (a.userScore || 0),
  new: (a, b) => (b.year || 0) - (a.year || 0),
  old: (a, b) => (a.year || 0) - (b.year || 0),
  priceDesc: (a, b) => (b.price || 0) - (a.price || 0),
  priceAsc: (a, b) => (a.price || 0) - (b.price || 0),
  name: (a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN')
};

const RANK_CACHE = new Map();
function sortItems(list, sort, dir) {
  if (dir === 1 || dir === -1) {
    const key = sort === 'userScore' ? 'userScore' : sort;
    const num = (v) => (typeof v === 'string' ? v : (v || 0));
    return list.slice().sort((a, b) => {
      const va = num(a[key]), vb = num(b[key]);
      if (typeof va === 'string') return dir * va.localeCompare(String(b[key]), 'zh-CN');
      return dir * (va - vb);
    });
  }
  return list.slice().sort(SORTERS[sort] || SORTERS.score);
}

function metaPayload() {
  return {
    total: PRODUCTS.length,
    curated: PRODUCTS.filter((p) => p.source === 'curated').length,
    bulk: PRODUCTS.filter((p) => p.source === 'bulk').length,
    yearMin: YEAR_MIN === 9999 ? null : YEAR_MIN,
    yearMax: YEAR_MAX || null,
    categories: CATS,
    brands: BRANDS,
    tree: {
      groups: TREE.stats.groups,
      bases: TREE.stats.bases,
      leaves: TREE.stats.leaves
    }
  };
}

/* 品类树 + 各品类（含细分）的型号数 */
function categoriesPayload() {
  const catBrands = {};
  for (const c of CATS) catBrands[c.id] = c.brands || [];
  return {
    stats: TREE.stats,
    leafCounts: LEAF_COUNTS,
    groups: TREE.groups.map((g) => ({
      id: g.id, name: g.name, icon: g.icon,
      bases: g.bases.map((b) => ({
        id: b.id, name: b.name, icon: b.icon,
        count: LEAF_COUNTS[b.id] || 0,
        brands: catBrands[b.id] || [],
        leaves: [{ id: b.id, name: b.name, count: LEAF_COUNTS[b.id] || 0 }]
          .concat((b.variants || []).map((v) => {
            const lid = b.id + '-' + v.slug;
            const cross = (b.cross || []).map((c) => {
              const cid = lid + '-' + c.slug;
              return { id: cid, name: b.name + ' · ' + v.label + ' ' + c.label, count: LEAF_COUNTS[cid] || 0 };
            });
            const self = { id: lid, name: b.name + ' · ' + v.label, count: LEAF_COUNTS[lid] || 0 };
            return b.cross && b.cross.length ? cross : [self];
          }).flat())
      }))
    }))
  };
}

let HOME_CACHE = null;
function homePayload() {
  if (HOME_CACHE) return HOME_CACHE;
  const curated = PRODUCTS.filter((p) => p.source === 'curated');
  const editors = curated.slice().sort(SORTERS.score).slice(0, 8);
  const popular = curated.slice().sort(SORTERS.user).slice(0, 8);
  const topPerCat = CATS.map((c) => curated.filter((p) => p.category === c.id).sort(SORTERS.score)[0]).filter(Boolean);

  const byYear = new Map();
  for (const p of PRODUCTS) {
    const y = p.year || 0;
    if (!byYear.has(y)) byYear.set(y, { year: y, count: 0, curated: [], bulk: [] });
    const g = byYear.get(y);
    g.count++;
    if (g.curated.length + g.bulk.length < 8) (p.source === 'curated' ? g.curated : g.bulk).push(p);
  }
  const timeline = Array.from(byYear.values())
    .sort((a, b) => b.year - a.year)
    .map((g) => ({ year: g.year, count: g.count, items: g.curated.concat(g.bulk).slice(0, 8) }));

  HOME_CACHE = {
    stats: { total: PRODUCTS.length, categories: CATS.length, brands: BRANDS.length,
      yearMin: YEAR_MIN, yearMax: YEAR_MAX,
      groups: TREE.stats.groups, bases: TREE.stats.bases, leaves: TREE.stats.leaves },
    categories: CATS, editors: editors, popular: popular, topPerCat: topPerCat, timeline: timeline
  };
  return HOME_CACHE;
}

function timelinePayload() {
  return { years: homePayload().timeline };
}

/* ---------- HTTP ---------- */
const zlib = require('zlib');
/* 协商压缩：大 JSON 响应（搜索结果/首页）用 gzip，省带宽提速
   cache：分层缓存策略 —— 变化极少的端点（meta/categories/brands）可缓存，
   搜索/详情等查询类仍 no-cache 保证实时性 */
function sendJSON(res, obj, status, cache) {
  const body = JSON.stringify(obj);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cache || 'no-cache',
    'Vary': 'Accept-Encoding',
    'X-Content-Type-Options': 'nosniff'
  };
  const ae = String(res.req && res.req.headers['accept-encoding'] || '');
  if (body.length > 1024 && /\bgzip\b/.test(ae)) {
    const gz = zlib.gzipSync(Buffer.from(body, 'utf8'));
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(status || 200, headers);
    res.end(gz);
    return;
  }
  res.writeHead(status || 200, headers);
  res.end(body);
}

/* 公网安全响应头：防 MIME 嗅探 / 点击劫持 / 限制 Referrer */
const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

/* 静态资源缓存策略：带 hash 潜力的长期缓存 + ETag 协商（避免重复传输） */
function serveStatic(req, res, urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath); } catch (e) { rel = urlPath; } /* 非法百分号编码不炸进程 */
  if (rel === '/') rel = '/index.html';
  const abs = path.normalize(path.join(ROOT, rel));
  if (!abs.startsWith(ROOT)) { res.writeHead(403, SEC); res.end('Forbidden'); return; }
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, SEC); res.end('Not Found'); return; }
    const ext = path.extname(abs).toLowerCase();
    /* 数据分片体积大 → 强缓存 7 天；外壳文件短缓存保证更新生效 */
    const isData = abs.indexOf(path.join(ROOT, 'data')) === 0;
    const isAsset = ext === '.css' || ext === '.js';
    const cache = isData ? 'public, max-age=604800'
      : (isAsset ? 'public, max-age=3600' : 'public, max-age=600');
    const etag = 'W/"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, Object.assign({ 'ETag': etag }, SEC)); res.end(); return; }
    res.writeHead(200, Object.assign({
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cache,
      'ETag': etag
    }, SEC));
    fs.createReadStream(abs).pipe(res);
  });
}

function handleAPI(req, res, url) {
  const p = url.pathname;
  const q = url.searchParams;

  if (p === '/api/meta') return sendJSON(res, metaPayload(), 200, 'public, max-age=300');
  if (p === '/api/categories') return sendJSON(res, categoriesPayload(), 200, 'public, max-age=300');
  if (p === '/api/home') return sendJSON(res, homePayload(), 200, 'public, max-age=120');
  if (p === '/api/timeline') return sendJSON(res, timelinePayload(), 200, 'public, max-age=300');

  if (p === '/api/search') {
    const qtext = q.get('q');
    const { list } = searchItems(qtext, q.get('cat'), q.get('leaf'), q.get('brand'), q.get('era'), q.get('source'));
    // 有关键词且未指定其他排序时保持相关度顺序；否则按所选维度排序
    const sortParam = q.get('sort');
    const sorted = (qtext && (!sortParam || sortParam === 'score')) ? list : sortItems(list, sortParam || 'score');
    const pageSize = Math.min(100, Math.max(1, parseInt(q.get('pageSize') || '24', 10) || 24));
    const total = sorted.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(pages, Math.max(1, parseInt(q.get('page') || '1', 10) || 1));
    const items = sorted.slice((page - 1) * pageSize, page * pageSize);
    return sendJSON(res, { total: total, page: page, pageSize: pageSize, items: items });
  }

  if (p === '/api/suggest') {
    const text = String(q.get('q') || '').toLowerCase().trim();
    if (!text) return sendJSON(res, { items: [] });
    /* 别名展开（ps5 → playstation 5）+ 分词 AND 匹配 */
    const toks = tokenize(expandQuery(text));
    const phrase = expandQuery(text).replace(/\s+/g, ' ').trim(); /* 整句保留原始词（不受去噪分词影响） */
    const items = [];
    const seen = new Set();
    const push = (it) => {
      if (seen.has(it.id)) return;
      seen.add(it.id); items.push(it);
    };
    /* 优先：整句前缀/包含于名称；再：全部词命中名称或品牌 */
    for (const it of PRODUCTS) {
      if (items.length >= 7) break;
      if (it._name.indexOf(phrase) === 0) push(it);
    }
    for (const it of PRODUCTS) {
      if (items.length >= 7) break;
      if (it._name.indexOf(phrase) !== -1) push(it);
    }
    if (items.length < 7) {
      outer: for (const it of PRODUCTS) {
        for (const t of toks) {
          if (it._name.indexOf(t) === -1 && it._brand.indexOf(t) === -1) continue outer;
        }
        push(it);
        if (items.length >= 7) break;
      }
    }
    return sendJSON(res, { items: items });
  }

  let m;
  if ((m = p.match(/^\/api\/product\/([^/]+)$/))) {
    const item = hydrate(BY_ID.get(decodeURIComponent(m[1])));
    if (item) item.images = galleryFor(item, item);
    return item ? sendJSON(res, item, 200, 'public, max-age=300') : sendJSON(res, { error: 'not found' }, 404);
  }

  /* 产品海报图：有真实图片返回真实图（302），否则生成 SVG 海报（?v=0/1/2 视觉变体） */
  if ((m = p.match(/^\/api\/image\/([^/]+)$/))) {
    const rec = BY_ID.get(decodeURIComponent(m[1]));
    if (!rec) { res.writeHead(404); res.end('Not Found'); return; }
    const variant = ((parseInt(q.get('v') || '0', 10) || 0) % 3 + 3) % 3; /* 规范化到 0-2，负数/超界不崩 */
    const full = (rec.off != null && DETAIL_FDS.length) ? hydrate(rec) : rec;
    const realImg = (full.images && full.images[variant]) || full.image;
    if (realImg && variant === 0) {
      res.writeHead(302, { 'Location': realImg, 'Cache-Control': 'public, max-age=86400' });
      res.end();
      return;
    }
    const svg = posterSVG(full, variant);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
    res.end(svg);
    return;
  }

  if (p === '/api/products') {
    const ids = String(q.get('ids') || '').split(',').filter(Boolean).slice(0, 50);
    const items = ids.map((id) => hydrate(BY_ID.get(id))).filter(Boolean).map((it) => { it.images = galleryFor(it, it); return it; });
    return sendJSON(res, { items: items }, 200, 'public, max-age=300');
  }

  if (p === '/api/ranking') {
    const cat = q.get('cat');
    const sort = q.get('sort') || 'score';
    const dir = parseInt(q.get('dir') || '-1', 10);
    const cacheKey = (cat || '') + '|' + sort + '|' + dir;
    let sorted = RANK_CACHE.get(cacheKey);
    if (!sorted) {
      let list = PRODUCTS;
      if (cat) list = list.filter((x) => x.category === cat);
      sorted = sortItems(list, sort, dir);
      if (RANK_CACHE.size > 16) RANK_CACHE.delete(RANK_CACHE.keys().next().value);
      RANK_CACHE.set(cacheKey, sorted);
    }
    const pageSize = Math.min(200, Math.max(1, parseInt(q.get('pageSize') || '50', 10) || 50));
    const total = sorted.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(pages, Math.max(1, parseInt(q.get('page') || '1', 10) || 1));
    return sendJSON(res, { total: total, page: page, pageSize: pageSize, items: sorted.slice((page - 1) * pageSize, page * pageSize) }, 200, 'public, max-age=120');
  }

  if (p === '/api/related') {
    const base = BY_ID.get(String(q.get('id') || ''));
    if (!base) return sendJSON(res, { items: [] });
    const items = PRODUCTS.filter((x) => x.category === base.category && x.id !== base.id)
      .sort((a, b) => Math.abs((a.score || 0) - (base.score || 0)) - Math.abs((b.score || 0) - (base.score || 0)))
      .slice(0, 4);
    return sendJSON(res, { items: items });
  }

  /* 品牌专区：品牌目录（跨品类产品数/品类分布/年代跨度） */
  if (p === '/api/brands') {
    const map = new Map();
    for (const x of PRODUCTS) {
      let b = map.get(x.brand);
      if (!b) map.set(x.brand, b = { name: x.brand, count: 0, cats: {}, yearMin: 9999, yearMax: 0, scoreSum: 0, scoreN: 0 });
      b.count++;
      b.cats[x.category] = (b.cats[x.category] || 0) + 1;
      if (x.year) { if (x.year < b.yearMin) b.yearMin = x.year; if (x.year > b.yearMax) b.yearMax = x.year; }
      const sc = Number(x.score);
      if (sc) { b.scoreSum += sc; b.scoreN++; }
    }
    const items = Array.from(map.values()).map((b) => ({
      name: b.name, count: b.count,
      score: b.scoreN ? Math.round((b.scoreSum / b.scoreN) * 10) / 10 : null,
      yearMin: b.yearMin === 9999 ? null : b.yearMin,
      yearMax: b.yearMax || null,
      catCount: Object.keys(b.cats).length,
      topCats: Object.keys(b.cats).sort((a, c) => b.cats[c] - b.cats[a]).slice(0, 3)
    })).sort((a, c) => c.count - a.count);
    return sendJSON(res, { total: items.length, items: items }, 200, 'public, max-age=300');
  }

  /* 品牌详情：该品牌产品（分页 + 品类分布 + 年代跨度） */
  if ((m = p.match(/^\/api\/brand\/([^/]+)$/))) {
    const name = decodeURIComponent(m[1]);
    const list = PRODUCTS.filter((x) => x.brand === name);
    if (!list.length) return sendJSON(res, { error: 'not found' }, 404);
    const catMap = {};
    let yMin = 9999, yMax = 0, scoreSum = 0, scoreN = 0;
    for (const x of list) {
      catMap[x.category] = (catMap[x.category] || 0) + 1;
      if (x.year) { if (x.year < yMin) yMin = x.year; if (x.year > yMax) yMax = x.year; }
      const sc = Number(x.score);
      if (sc) { scoreSum += sc; scoreN++; } /* 均分只统计有编辑评分的型号 */
    }
    const cats = Object.keys(catMap).map((cid) => {
      const c = CATS.find((z) => z.id === cid) || { id: cid, name: cid, icon: '📦' };
      return { id: c.id, name: c.name, icon: c.icon, count: catMap[cid] };
    }).sort((a, c) => c.count - a.count);
    const sort = q.get('sort') || 'score';
    const sorted = sortItems(list, sort, -1);
    const pageSize = Math.min(60, Math.max(1, parseInt(q.get('pageSize') || '24', 10) || 24));
    const total = sorted.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(pages, Math.max(1, parseInt(q.get('page') || '1', 10) || 1));
    return sendJSON(res, {
      brand: name, total: total, page: page, pageSize: pageSize,
      score: scoreN ? Math.round((scoreSum / scoreN) * 10) / 10 : null,
      yearMin: yMin === 9999 ? null : yMin, yearMax: yMax || null,
      cats: cats, items: sorted.slice((page - 1) * pageSize, page * pageSize)
    }, 200, 'public, max-age=180');
  }

  sendJSON(res, { error: 'unknown api' }, 404);
}

/* ---------- 启动 ---------- */
async function main() {
  const args = parseArgs();
  const t0 = Date.now();
  const catMeta = new Map();

  console.log('══ 日理万机 · 在线服务器 ══');
  console.log('  品类注册表：' + TREE.stats.groups + ' 大类 / ' + TREE.stats.bases + ' 品类 / ' + TREE.stats.leaves.toLocaleString() + ' 细分品类');
  const curated = await loadCurated(catMeta);
  PRODUCTS.push.apply(PRODUCTS, curated);
  console.log('  精选产品：' + curated.length + ' 条');

  /* 媒体/图片补充数据：并入精选产品 */
  const enrich = loadEnrich();
  const enrichN = Object.keys(enrich).length;
  if (enrichN) {
    let hit = 0;
    for (const p of PRODUCTS) {
      const e = enrich[p.id];
      if (!e) continue;
      if (e.image) p.image = e.image;
      if (e.images && e.images.length) p.images = e.images;
      if (e.media && e.media.length) { p.media = e.media; hit++; }
    }
    console.log('  媒体补充：' + enrichN + ' 条产品资料（' + hit + ' 条含测评索引）');
  }

  const bulk = await loadBulkIndex(catMeta);
  if (bulk.count) console.log('  海量 SKU：' + bulk.count.toLocaleString() + ' 条（索引 ' + (bulk.ms / 1000).toFixed(1) + 's 载入）');
  else console.log('  海量 SKU：无（运行 tools/generate-bulk.js 生成）');

  finalize(catMeta);
  buildHaystacks();

  /* 详情预热：排行榜头部的海量 SKU 最先被点击，启动后异步读入 LRU，
     首次访问即命中缓存（不阻塞 listen） */
  setTimeout(() => {
    const hot = PRODUCTS.filter((x) => x.source === 'bulk' && x.off != null)
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)).slice(0, 512);
    for (const r of hot) hydrate(r);
    console.log('  详情预热：' + hot.length + ' 条热门 SKU 已入 LRU');
  }, 0);

  const server = http.createServer((req, res) => {
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); res.end(); return; }
    if (url.pathname.startsWith('/api/')) {
      try { handleAPI(req, res, url); } catch (e) { sendJSON(res, { error: e.message }, 500); }
    } else {
      serveStatic(req, res, url.pathname);
    }
  });

  server.listen(args.port, process.env.HOST || '0.0.0.0', () => {
    console.log('  总计：' + PRODUCTS.length.toLocaleString() + ' 条，品类 ' + CATS.length + '（细分 ' + TREE.stats.leaves.toLocaleString() + '），品牌 ' + BRANDS.length);
    console.log('  启动耗时：' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
    console.log('  ▶ http://127.0.0.1:' + args.port + '/');
  });

  process.on('SIGINT', () => { console.log('\n服务已停止'); server.close(); process.exit(0); });
}

main().catch((e) => { console.error(e); process.exit(1); });
