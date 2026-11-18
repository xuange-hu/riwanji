/* js/data.js — 数据层：静态分片装载 / 懒加载 / 统一查询接口 Q（app.js 拆分模块 2/7）
   加载序：util → data → state → router → components → pages → app */
'use strict';

/* ================= 数据层（在线 API / 静态双模） ================= */

const DATA = {
  online: false,
  meta: null,        // { total, categories, brands, yearMin, yearMax }
  // 静态模式数据
  products: [],
  byId: {},
  cats: [],
  catById: {},
  brands: []
};

const PAGE_SIZE = CONFIG.PAGE_SIZE;

/* 排序器共用（问题 3/13/77）：搜索、品牌页、产品列表统一口径，勿再各自内联复制 */
const SORTERS = {
  score: (a, b) => (b.score || 0) - (a.score || 0) || (b.userScore || 0) - (a.userScore || 0),
  user: (a, b) => (b.userScore || 0) - (a.userScore || 0),
  new: (a, b) => (b.year || 0) - (a.year || 0),
  old: (a, b) => (a.year || 0) - (b.year || 0),
  priceDesc: (a, b) => (b.price || 0) - (a.price || 0),
  priceAsc: (a, b) => (a.price || 0) - (b.price || 0),
  name: (a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN')
};

const api = {
  async get(path) {
    /* 演示可见性透传（问题 42）：在线模式下服务端按 demo 参数过滤 */
    const sep = path.indexOf('?') === -1 ? '?' : '&';
    const url = path + sep + 'demo=' + (typeof demoVisible === 'function' && demoVisible() ? '1' : '0');
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
};

/* ---- 静态模式数据装载 ---- */

function buildHaystack(p) {
  const alias = (window.BRAND_ALIAS && window.BRAND_ALIAS[p.brand]) ? ' ' + window.BRAND_ALIAS[p.brand] : '';
  return [
    p.name, p.brand + alias, p.summary, p.categoryName, String(p.year || ''),
    (p.tags || []).join(' '),
    (p.specs || []).map((s) => s.join(' ')).join(' '),
    (p.pros || []).join(' '), (p.cons || []).join(' ')
  ].join(' ').toLowerCase();
}

/* 本地图片覆盖表（N17）：url → img/… 本地路径；热链防盗链/失效的最终兜底 */
const IMG_LOCAL = window.DB_MEDIA_LOCAL || {};
function locU(u) { return (typeof u === 'string' && IMG_LOCAL[u]) ? IMG_LOCAL[u] : u; }

function buildStaticDB() {
  const chunks = window.DB_CHUNKS || [];
  const catMap = new Map();
  const idSet = new Set();
  DATA.products = [];

  chunks.forEach((c) => {
    if (!c || !Array.isArray(c.products)) return;
    if (!catMap.has(c.category)) {
      catMap.set(c.category, {
        id: c.category, name: c.categoryName || c.category,
        icon: c.icon || '📦', description: c.description || '', count: 0
      });
    }
    const cat = catMap.get(c.category);
    c.products.forEach((p) => {
      if (!p || !p.id || !p.name) return;
      if (idSet.has(p.id)) return;
      idSet.add(p.id);
      p.category = p.category || c.category;
      p.categoryName = cat.name;
      p.source = p.source || 'curated';
      p._hay = buildHaystack(p);
      DATA.products.push(p);
      cat.count++;
    });
  });

  /* bulk 轻索引合并（问题 3）：列表/搜索/排序用轻量字段即可，详情/对比走 ensureFull 懒补全 */
  const bulkIdx = window.DB_BULK_INDEX;
  if (Array.isArray(bulkIdx) && bulkIdx.length) {
    const bcats = window.DB_BULK_CATS || {};
    Object.keys(bcats).forEach((k) => {
      if (!catMap.has(k)) {
        catMap.set(k, { id: k, name: bcats[k].name || k, icon: bcats[k].icon || '📦', description: bcats[k].description || '', count: 0 });
      }
    });
    bulkIdx.forEach((e) => {
      if (!e || !e.id || idSet.has(e.id)) return;
      idSet.add(e.id);
      const cat = catMap.get(e.category);
      const p = Object.assign({}, e);
      p.categoryName = cat ? cat.name : (e.categoryName || e.category);
      p.source = e.source || 'bulk';
      p._lite = true;
      p._shard = e.shard;
      p._hay = buildHaystack(p);
      DATA.products.push(p);
      if (cat) cat.count++;
    });
  }

  DATA.cats = Array.from(catMap.values());
  DATA.catById = {};
  DATA.cats.forEach((c) => { DATA.catById[c.id] = c; });

  /* 每个品类的细分叶子（供列表页细分筛选），与在线模式口径一致 */
  const leafByCat = {};
  DATA.products.forEach((p) => {
    if (!p.catLeaf) return;
    const m = leafByCat[p.category] = leafByCat[p.category] || {};
    m[p.catLeaf] = (m[p.catLeaf] || 0) + 1;
  });
  const tree = window.DB_CATEGORY_TREE;
  const baseById = {};
  if (tree) (tree.groups || []).forEach((g) => (g.bases || []).forEach((b) => { baseById[b.id] = b; }));
  DATA.cats.forEach((c) => {
    const b = baseById[c.id];
    const counts = leafByCat[c.id] || {};
    const leaves = [{ id: c.id, name: c.name, count: counts[c.id] || c.count }];
    if (b) {
      (b.variants || []).forEach((v) => {
        const lid = b.id + '-' + v.slug;
        leaves.push({ id: lid, name: b.name + ' · ' + v.label, count: counts[lid] || 0 });
      });
    }
    c.leaves = leaves.filter((l) => l.count > 0);
  });
  DATA.byId = {};
  DATA.products.forEach((p) => { DATA.byId[p.id] = p; });

  /* 媒体/图片补充数据（data/enrich/*.js → window.DB_MEDIA） */
  const MEDIA = window.DB_MEDIA || {};
  Object.keys(MEDIA).forEach((id) => {
    const p = DATA.byId[id];
    if (!p) return;
    const e = MEDIA[id];
    if (e.image) p.image = e.image;
    if (e.images && e.images.length) p.images = e.images;
    if (e.media && e.media.length) p.media = e.media;
  });

  /* 本地图片覆盖（N17）：优先级最高，热链 URL → img/ 本地路径 */
  DATA.products.forEach((p) => {
    if (p.image) p.image = locU(p.image);
    if (p.images && p.images.length) p.images = p.images.map(locU);
  });

  const bm = new Map();
  DATA.products.forEach((p) => bm.set(p.brand, (bm.get(p.brand) || 0) + 1));
  DATA.brands = Array.from(bm.entries()).sort((a, b) => b[1] - a[1]).map((e) => e[0]);

  const years = DATA.products.map((p) => p.year).filter((y) => typeof y === 'number');
  const bulkCount = DATA.products.reduce((n, p) => n + (isDemo(p) ? 1 : 0), 0);
  /* 统计口径单源（N9）：目录级数字一律取 manifest.stats（build-manifest 全量实算），
     首页/品类页/关于页/品牌页不再各算各的；轻索引懒加载未到位时数字也一致 */
  const CS = (window.DB_MANIFEST && window.DB_MANIFEST.stats) || {};
  DATA.meta = {
    total: CS.total != null ? CS.total : DATA.products.length,
    curated: CS.curated != null ? CS.curated : DATA.products.length - bulkCount,
    bulk: CS.bulk != null ? CS.bulk : bulkCount,
    yearMin: CS.yearMin != null ? CS.yearMin : (years.length ? Math.min.apply(null, years) : null),
    yearMax: CS.yearMax != null ? CS.yearMax : (years.length ? Math.max.apply(null, years) : null),
    leaves: CS.leavesWithProducts != null ? CS.leavesWithProducts : null,
    catalog: CS,
    categories: DATA.cats,
    brands: DATA.brands
  };
}

/* ---- 懒加载补全（问题 3）：轻索引产品首次进详情/对比时拉完整分片 ---- */
const FULL_LOADED = new Set();
const FULL_LOADING = new Map(); /* 分片加载中的 Promise（问题 71）：同分片并发补全不再重复注入脚本 */
async function ensureFull(p) {
  if (!p || DATA.online || !p._lite) return p;
  const f = p._shard;
  if (f && !FULL_LOADED.has(f)) {
    let lp = FULL_LOADING.get(f);
    if (!lp) {
      lp = loadShard(f).then((ok) => { if (ok) FULL_LOADED.add(f); FULL_LOADING.delete(f); return ok; });
      FULL_LOADING.set(f, lp);
    }
    await lp;
  }
  const chunks = window.DB_CHUNKS || [];
  for (const c of chunks) {
    for (const full of (c.products || [])) {
      if (!full || full.id !== p.id) continue;
      /* 媒体补充字段随对象替换保留 */
      if (p.image && !full.image) full.image = p.image;
      if (p.images && !full.images) full.images = p.images;
      if (p.media && !full.media) full.media = p.media;
      /* 本地图片覆盖（N17）：分片里的热链同样映射到 img/ */
      if (full.image) full.image = locU(full.image);
      if (full.images && full.images.length) full.images = full.images.map(locU);
      full.category = full.category || p.category;
      full.categoryName = full.categoryName || p.categoryName;
      full.source = full.source || p.source;
      full._hay = buildHaystack(full);
      const i = DATA.products.indexOf(p);
      if (i >= 0) DATA.products[i] = full; else DATA.products.push(full);
      DATA.byId[p.id] = full;
      return full;
    }
  }
  return p; /* 分片缺失时轻索引条目仍可渲染（降级不空白） */
}

function loadShard(file) {
  /* 失败自动重试 1 次 + 超时兜底（问题 6/16）：stalled 请求不再让页面永远停在加载态 */
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => { if (!done) { done = true; clearTimeout(timer); resolve(ok); } };
    const timer = setTimeout(() => {
      DIAG.shardFail++;
      console.warn('[rlwj] 数据分片加载超时：' + file);
      toast('数据分片加载超时：' + file + '（可刷新重试）');
      finish(false);
    }, 20000);
    const attempt = (left) => {
      const s = document.createElement('script');
      s.src = file;
      s.onload = () => { DIAG.shardOk++; finish(true); };
      s.onerror = () => {
        if (left > 0) { attempt(left - 1); return; }
        DIAG.shardFail++;
        console.warn('[rlwj] 数据分片加载失败：' + file);
        toast('数据分片加载失败：' + file + '（可刷新重试）');
        finish(false);
      };
      document.head.appendChild(s);
    };
    attempt(1);
  });
}

async function loadStatic() {
  const app = $('#app');
  const manifest = window.DB_MANIFEST;
  if (!manifest || !Array.isArray(manifest.shards)) {
    app.innerHTML = '<div class="empty"><span class="big">⚠️</span>未找到数据清单（data/manifest.js）。</div>';
    return false; /* 清单缺失：中断启动（问题 16），提示不被后续渲染覆盖 */
  }
  const enrichFiles = (manifest.enrich && manifest.enrich.length)
    ? manifest.enrich
    : [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => 'data/enrich/media-' + i + '.js');
  /* N3 冷启动：演示轻索引（≈5.4MB，单请求 14s+）不再门控首屏——
     演示数据默认隐藏，首屏只载精选分片 + enrich（35 片，≈1.3MB），
     需要演示数据时由 ensureBulk() 按需加载 */
  const totalShards = manifest.shards.length + enrichFiles.length;
  app.innerHTML = '<div class="loading">正在载入产品库…… <span id="load-progress">0 / ' + totalShards + '</span> 个数据分片</div>';
  /* 进度随分片装载实时更新（原实现只写一次文案，用户无法区分加载中与卡死） */
  let loadedCount = 0;
  const tickProgress = () => {
    loadedCount += 1;
    const el = document.getElementById('load-progress');
    if (el) el.textContent = loadedCount + ' / ' + totalShards;
  };
  await Promise.all(manifest.shards.map((s) => loadShard(s.file || s).then(tickProgress)));
  /* 媒体/图片补充数据：清单由 build-manifest 写入 manifest.enrich（原硬编码 1..12，越界产生 404） */
  await Promise.all(enrichFiles.map((f) => loadShard(f).then(tickProgress)));
  buildStaticDB();
  return true;
}

/* ---- 演示数据按需装载（N3）：开演示开关 / 访问演示产品时才拉轻索引 ---- */
let BULK_READY = false;
let BULK_LOADING = null;
function ensureBulk() {
  if (BULK_READY) return Promise.resolve(true);
  if (BULK_LOADING) return BULK_LOADING;
  const manifest = window.DB_MANIFEST;
  const indexFile = manifest && manifest.index;
  const bulkFiles = ((manifest && manifest.bulk) || []).map((s) => s.file || s);
  const primary = indexFile ? [indexFile] : bulkFiles;
  if (!primary.length) return Promise.resolve(false);
  const tryLoad = (files) => Promise.all(files.map((f) => loadShard(f)));
  BULK_LOADING = tryLoad(primary).then((rs) => {
    let ok = rs.every(Boolean);
    /* 轻索引失败回退完整 bulk 分片（问题 16）：演示数据不因单文件失败整体归零 */
    const finish = (good) => {
      BULK_READY = good;
      if (good) buildStaticDB();
      return good;
    };
    if (!ok && indexFile && bulkFiles.length) return tryLoad(bulkFiles).then((rs2) => finish(rs2.every(Boolean)));
    return finish(ok);
  }).finally(() => { BULK_LOADING = null; });
  return BULK_LOADING;
}

/* ---- 统一查询接口（页面层只调用这些） ---- */

const Q = {
  async meta() {
    return DATA.meta;
  },

  async home() {
    if (DATA.online) return api.get('api/home');
    if (demoVisible()) await ensureBulk(); /* 榜单要含演示时先补载（N3） */
    // 静态模式本地构造（默认不含演示数据，问题 4：榜单不被合成样本污染）
    const curated = visibleProducts();
    const byScore = (a, b) => (b.score || 0) - (a.score || 0);
    const byUser = (a, b) => (b.userScore || 0) - (a.userScore || 0);
    const byYear = (a, b) => (b.year || 0) - (a.year || 0);
    const editors = curated.slice().sort(byScore).slice(0, 8);
    const popular = curated.slice().sort(byUser).slice(0, 8);
    const topPerCat = DATA.cats.map((c) =>
      curated.filter((p) => p.category === c.id).sort(byScore)[0]).filter(Boolean);
    const ymap = new Map();
    curated.forEach((p) => {
      const y = p.year || 0;
      if (!ymap.has(y)) ymap.set(y, []);
      ymap.get(y).push(p);
    });
    const timeline = Array.from(ymap.keys()).sort((a, b) => b - a).map((y) => ({
      year: y, count: ymap.get(y).length,
      all: ymap.get(y).slice().sort(byYear), /* 全量保留，页面可展开（问题 27） */
      items: ymap.get(y).slice().sort(byYear).slice(0, CONFIG.TIMELINE_PREVIEW)
    }));
    const catalog = DATA.meta.catalog || {};
    return {
      stats: {
        total: DATA.meta.total, curated: DATA.meta.curated, bulk: DATA.meta.bulk,
        categories: catalog.categories != null ? catalog.categories : DATA.cats.length,
        leaves: DATA.meta.leaves,
        brands: catalog.brands != null ? catalog.brands : DATA.brands.length,
        yearMin: DATA.meta.yearMin, yearMax: DATA.meta.yearMax
      },
      categories: DATA.cats, editors, popular, topPerCat, timeline
    };
  },

  async search(params) {
    if (DATA.online) {
      const q = new URLSearchParams();
      ['q', 'cat', 'leaf', 'brand', 'era', 'source', 'sort', 'page', 'pageSize'].forEach((k) => {
        if (params[k] != null && params[k] !== '') q.set(k, params[k]);
      });
      return api.get('api/search?' + q.toString());
    }
    // 静态模式：演示数据默认过滤；source=bulk/curated 可显式指定（问题 4）
    if (params.source === 'bulk' || demoVisible()) await ensureBulk(); /* N3：演示数据按需装载 */
    let list = params.source === 'bulk' ? DATA.products.filter(isDemo)
      : params.source === 'curated' ? DATA.products.filter((p) => !isDemo(p))
        : visibleProducts();
    if (params.cat) list = list.filter((p) => p.category === params.cat);
    /* leaf 口径（问题 12）：精选产品无 catLeaf 时归入根叶子（= 基础品类），与品类页计数一致 */
    if (params.leaf) list = list.filter((p) => (p.catLeaf || p.category) === params.leaf);
    if (params.brand) list = list.filter((p) => p.brand === params.brand);
    if (params.era) {
      list = list.filter((p) => {
        const y = p.year || 0;
        if (params.era === '2020s') return y >= 2020;
        if (params.era === '2010s') return y >= 2010 && y < 2020;
        if (params.era === '2000s') return y >= 2000 && y < 2010;
        if (params.era === 'pre') return y < 2000;
        return true;
      });
    }
    /* 常见型号别名展开（与服务端一致），让「ps5」也能搜到 PlayStation 5 */
    var QUERY_ALIAS = {
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
      'headphone': '耳机', 'headphones': '耳机', 'earbuds': '耳机', 'earphone': '耳机',
      'camera': '相机', 'laptop': '笔记本', 'notebook': '笔记本', 'phone': '手机', 'smartphone': '手机',
      'watch': '手表', 'smartwatch': '智能手表', 'tablet': '平板电脑',
      'speaker': '音箱', 'keyboard': '键盘', 'mouse': '鼠标', 'drone': '无人机', 'tv': '电视',
      'console': '游戏机', 'monitor': '显示器', 'router': '路由器', 'ssd': '固态硬盘', 'gpu': '显卡',
      'cpu': '处理器', 'printer': '打印机', 'projector': '投影'
    };
    /* 分词：按字符类型切边界（「iphone手机」→ iphone + 手机），中英混排不再整段落空（问题 7） */
    const segs = String(params.q || '').toLowerCase().split(/[\s,，、;；+]+/)
      .map((t) => t.replace(/[^一-龥a-z0-9.\-]+/g, ''))
      .filter((t) => t && !(t.length === 1 && /[a-z0-9]/.test(t)));
    const rawToks = [];
    segs.forEach((seg) => {
      const parts = seg.match(/[一-龥]+|[a-z0-9][a-z0-9.\-]*/g) || [seg];
      parts.forEach((p) => { if (p && !(p.length === 1 && /[a-z0-9]/.test(p))) rawToks.push(QUERY_ALIAS[p] || p); });
    });
    /* 单字符查询兜底（问题 14）：用户明确输入 "x"/"4" 时不被去噪规则吞成空查询 */
    if (!rawToks.length && params.q && String(params.q).trim()) {
      const only = String(params.q).trim().toLowerCase().replace(/[^一-龥a-z0-9.\-]+/g, '');
      if (only) rawToks.push(only);
    }
    const normToks = rawToks.join(' ').split(/\s+/).filter(Boolean);
    /* 中文滑动双字（「降噪耳机」→ 降噪/噪耳/耳机），2 字整词保留，拉丁整词不动 */
    const toks = [];
    normToks.forEach((t) => {
      if (/^[一-龥]+$/.test(t) && t.length >= 3) {
        for (let i = 0; i + 1 < t.length; i++) toks.push(t.slice(i, i + 2));
      } else toks.push(t);
    });
    const phrase = normToks.join(' ');
    if (toks.length) {
      const scored = [];
      list.forEach((p) => {
        let s = 0, all = true, nameHits = 0, brandHits = 0, strongHit = false;
        const cat = (String(p.categoryName || '') + ' ' + String(p.subcat || '') + ' ' + String(p.catName || '')).toLowerCase();
        for (const t of toks) {
          const name = String(p.name).toLowerCase(), brand = String(p.brand).toLowerCase();
          const tags = (p.tags || []).join(' ').toLowerCase();
          const catWord = cat.indexOf(t) !== -1; /* 品类词降权，防止通名刷榜 */
          if (name.indexOf(t) !== -1) { s += catWord ? 6 : 12; nameHits++; strongHit = true; }
          else if (brand.indexOf(t) !== -1) { s += 6; brandHits++; strongHit = true; }
          else if (tags.indexOf(t) !== -1) { s += 5; strongHit = true; }
          else if (catWord) { s += 4; strongHit = true; }
          else if (p._hay.indexOf(t) !== -1) s += 2;
          else { all = false; break; }
        }
        if (!all) return;
        const name = String(p.name).toLowerCase();
        const catPhrase = cat.indexOf(phrase) !== -1;
        if (name.indexOf(phrase) !== -1) s += catPhrase ? 8 : 30;
        else if (p._hay.indexOf(phrase) !== -1) s += 8;
        if (catPhrase) s += 20; /* 整句是品类词 → 全品类加权，真实产品靠评分胜出 */
        if (name === phrase) s += 25;
        /* 全词名称命中加权，但查询全是品类词时跳过（通名不刷分） */
        const allCatWords = toks.every((t) => cat.indexOf(t) !== -1);
        if (nameHits === toks.length && !allCatWords) s += 15;
        if (p.source !== 'bulk') s += strongHit ? 25 : 8;
        scored.push([p, s]);
      });
      if (scored.length) {
        scored.sort((a, b) => b[1] - a[1] ||
          (b[0].source !== 'bulk') - (a[0].source !== 'bulk') ||
          String(a[0].name).length - String(b[0].name).length ||
          (b[0].score || 0) - (a[0].score || 0));
        list = scored.map((x) => x[0]);
      } else {
        /* OR 降级：至少命中一半词 */
        const need = Math.ceil(toks.length / 2);
        const or = [];
        list.forEach((p) => {
          let hits = 0, s = 0;
          toks.forEach((t) => {
            if (String(p.name).toLowerCase().indexOf(t) !== -1) { hits++; s += 4; }
            else if (String(p.brand).toLowerCase().indexOf(t) !== -1) { hits++; s += 2; }
            else if (p._hay.indexOf(t) !== -1) { hits++; s += 1; }
          });
          if (hits < need) return;
          if (String(p.name).toLowerCase().indexOf(phrase) !== -1) s += 10;
          if (p.source !== 'bulk') s += 8;
          or.push([p, s]);
        });
        or.sort((a, b) => b[1] - a[1] || String(a[0].name).length - String(b[0].name).length);
        list = or.map((x) => x[0]);
      }
    }
    /* 显式排序统一出口（问题 13）：带关键词且 sort=score 时保持相关度顺序，其余显式排序一律生效 */
    const sorters = SORTERS;
    const sk = params.sort || 'score';
    if (!toks.length || sk !== 'score') list = list.slice().sort(sorters[sk] || sorters.score);
    const pageSize = params.pageSize || PAGE_SIZE;
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(pages, Math.max(1, parseInt(params.page || 1, 10) || 1));
    return { total, page, pageSize, items: list.slice((page - 1) * pageSize, page * pageSize) };
  },

  async suggest(q) {
    const text = String(q || '').trim();
    if (!text) return [];
    if (DATA.online) {
      const r = await api.get('api/suggest?q=' + encodeURIComponent(text));
      return r.items || [];
    }
    const t = text.toLowerCase();
    /* 品牌别名反查：搜「苹果」也能联想 Apple 系（BRAND_ALIAS: 品牌 → 别名串） */
    const aliasBrands = [];
    const BA = window.BRAND_ALIAS || {};
    Object.keys(BA).forEach((brand) => {
      const words = (brand + ' ' + BA[brand]).toLowerCase().split(/\s+/).filter(Boolean);
      if (words.some((w) => w === t || w.indexOf(t) === 0)) aliasBrands.push(brand);
    });
    const pool = visibleProducts(); /* 联想不给演示数据引流（问题 4） */
    const direct = pool.filter((p) => {
      const n = String(p.name).toLowerCase(), b = String(p.brand).toLowerCase();
      return n.indexOf(t) !== -1 || b.indexOf(t) !== -1;
    });
    const seen = {};
    const hits = direct.concat(aliasBrands.length
      ? pool.filter((p) => aliasBrands.indexOf(p.brand) !== -1)
        .sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 4)
      : []).filter((p) => (seen[p.id] ? false : (seen[p.id] = true)));
    hits.sort((a, b) => {
      const an = String(a.name).toLowerCase().indexOf(t) === 0 ? 0 : 1;
      const bn = String(b.name).toLowerCase().indexOf(t) === 0 ? 0 : 1;
      return an - bn || String(a.name).length - String(b.name).length;
    });
    return hits.slice(0, 7);
  },

  async product(id) {
    if (DATA.online) return api.get('api/product/' + encodeURIComponent(id));
    const hit = DATA.byId[id];
    if (hit) return ensureFull(hit);
    /* 分享链接可能指向演示产品：轻索引未装载时按需补载后重查（N3） */
    if (!BULK_READY && await ensureBulk()) {
      const h2 = DATA.byId[id];
      if (h2) return ensureFull(h2);
    }
    return null;
  },

  async byIds(ids) {
    if (!ids.length) return [];
    if (DATA.online) {
      const r = await api.get('api/products?ids=' + ids.map(encodeURIComponent).join(','));
      return r.items || [];
    }
    let list = ids.map((id) => DATA.byId[id]).filter(Boolean);
    if (list.length < ids.length && !BULK_READY && await ensureBulk()) {
      list = ids.map((id) => DATA.byId[id]).filter(Boolean);
    }
    return list;
  },

  async ranking(params) {
    if (DATA.online) {
      const q = new URLSearchParams();
      ['cat', 'sort', 'dir', 'page', 'pageSize'].forEach((k) => {
        if (params[k] != null && params[k] !== '') q.set(k, params[k]);
      });
      return api.get('api/ranking?' + q.toString());
    }
    let list = visibleProducts().slice(); /* 榜单默认剔除演示数据（问题 4） */
    if (params.cat) list = list.filter((p) => p.category === params.cat);
    const key = params.sort || 'score';
    const dir = parseInt(params.dir != null ? params.dir : -1, 10) || -1;
    list.sort((a, b) => {
      const va = a[key], vb = b[key];
      if (typeof va === 'string') return dir * va.localeCompare(String(vb), 'zh-CN');
      return dir * ((va || 0) - (vb || 0));
    });
    const pageSize = params.pageSize || 50;
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(pages, Math.max(1, parseInt(params.page || 1, 10) || 1));
    return { total, page, pageSize, items: list.slice((page - 1) * pageSize, page * pageSize) };
  },

  async timeline() {
    if (DATA.online) return api.get('api/timeline');
    const ymap = new Map();
    visibleProducts().forEach((p) => {
      const y = p.year || 0;
      if (!ymap.has(y)) ymap.set(y, []);
      ymap.get(y).push(p);
    });
    return {
      years: Array.from(ymap.keys()).sort((a, b) => b - a).map((y) => {
        const sorted = ymap.get(y).sort((a, b) => (b.score || 0) - (a.score || 0));
        return {
          year: y, count: sorted.length,
          all: sorted.slice(), /* 全量保留，页面可展开（问题 27） */
          items: sorted.slice(0, CONFIG.TIMELINE_PREVIEW)
        };
      })
    };
  },

  async related(id) {
    if (DATA.online) return (await api.get('api/related?id=' + encodeURIComponent(id))).items || [];
    const base = DATA.byId[id];
    if (!base) return [];
    return visibleProducts().filter((p) => p.category === base.category && p.id !== id)
      .sort((a, b) => Math.abs((a.score || 0) - (base.score || 0)) - Math.abs((b.score || 0) - (base.score || 0)))
      .slice(0, 4);
  },

  async categories() {
    if (DATA.online) return api.get('api/categories');
    const tree = window.DB_CATEGORY_TREE;
    if (!tree) return { stats: null, leafCounts: {}, catCounts: {}, groups: [] };
    const leafCounts = {};
    const catCounts = {};
    const catBrand = {};
    /* 计数与列表页同池同口径（问题 12）：基础品类卡按 category 计数，细分叶子按 catLeaf（精选归根叶子） */
    visibleProducts().forEach((p) => {
      const leafKey = p.catLeaf || p.category;
      if (leafKey) leafCounts[leafKey] = (leafCounts[leafKey] || 0) + 1;
      if (p.category) catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      const bm = catBrand[p.category] = catBrand[p.category] || {};
      bm[p.brand] = (bm[p.brand] || 0) + 1;
    });
    const brandsOf = (cat) => {
      const bm = catBrand[cat] || {};
      return Object.keys(bm).sort((x, y) => bm[y] - bm[x]).map((b) => ({ name: b, count: bm[b] }));
    };
    return {
      stats: tree.stats, leafCounts: leafCounts, catCounts: catCounts,
      groups: tree.groups.map((g) => ({
        id: g.id, name: g.name, icon: g.icon,
        bases: g.bases.map((b) => ({
          id: b.id, name: b.name, icon: b.icon, count: catCounts[b.id] || 0,
          brands: brandsOf(b.id),
          leaves: [{ id: b.id, name: b.name, count: catCounts[b.id] || 0 }]
            .concat((b.variants || []).map((v) => ({ id: b.id + '-' + v.slug, name: b.name + ' · ' + v.label, count: leafCounts[b.id + '-' + v.slug] || 0 })))
        }))
      }))
    };
  },

  async brands() {
    if (DATA.online) return api.get('api/brands');
    /* 静态模式：本地聚合品牌目录 */
    const map = new Map();
    DATA.products.forEach((x) => {
      let b = map.get(x.brand);
      if (!b) map.set(x.brand, b = { name: x.brand, count: 0, cats: {}, yearMin: 9999, yearMax: 0, scoreSum: 0, scoreN: 0 });
      b.count++;
      b.cats[x.category] = (b.cats[x.category] || 0) + 1;
      if (x.year) { if (x.year < b.yearMin) b.yearMin = x.year; if (x.year > b.yearMax) b.yearMax = x.year; }
      const sc = Number(x.score);
      if (sc) { b.scoreSum += sc; b.scoreN++; }
    });
    const items = Array.from(map.values()).map((b) => ({
      name: b.name, count: b.count,
      score: b.scoreN ? Math.round((b.scoreSum / b.scoreN) * 10) / 10 : null,
      yearMin: b.yearMin === 9999 ? null : b.yearMin, yearMax: b.yearMax || null,
      catCount: Object.keys(b.cats).length,
      topCats: Object.keys(b.cats).sort((a, c) => b.cats[c] - b.cats[a]).slice(0, 3)
    })).sort((a, c) => c.count - a.count);
    return { total: items.length, items };
  },

  async brand(name, params) {
    if (DATA.online) {
      const q = new URLSearchParams();
      ['sort', 'page', 'pageSize'].forEach((k) => { if (params && params[k] != null) q.set(k, params[k]); });
      return api.get('api/brand/' + encodeURIComponent(name) + (q.toString() ? '?' + q.toString() : ''));
    }
    /* 跟随演示开关（问题 3）：隐藏演示数据时品牌页同样只展示真实精选 */
    const list = visibleProducts().filter((x) => x.brand === name);
    const catMap = {};
    let yMin = 9999, yMax = 0, scoreSum = 0, scoreN = 0;
    list.forEach((x) => {
      catMap[x.category] = (catMap[x.category] || 0) + 1;
      if (x.year) { if (x.year < yMin) yMin = x.year; if (x.year > yMax) yMax = x.year; }
      const sc = Number(x.score);
      if (sc) { scoreSum += sc; scoreN++; }
    });
    const catIndex = new Map(DATA.cats.map((c) => [c.id, c]));
    const cats = Object.keys(catMap).map((cid) => {
      const c = catIndex.get(cid) || { id: cid, name: cid, icon: '📦' };
      return { id: c.id, name: c.name, icon: c.icon, count: catMap[cid] };
    }).sort((a, c) => c.count - a.count);
    /* 排序 + 分页（问题 3）：sort 取 SORTERS，items 只回当前页 */
    const sk = (params && params.sort) || 'score';
    const sorted = list.slice().sort(SORTERS[sk] || SORTERS.score);
    const pageSize = (params && params.pageSize) || PAGE_SIZE;
    const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const page = Math.min(pages, Math.max(1, parseInt((params && params.page) || 1, 10) || 1));
    return {
      brand: name, total: sorted.length, page: page, pageSize: pageSize, pages: pages,
      score: scoreN ? Math.round((scoreSum / scoreN) * 10) / 10 : null,
      yearMin: yMin === 9999 ? null : yMin, yearMax: yMax || null,
      cats, items: sorted.slice((page - 1) * pageSize, page * pageSize)
    };
  }
};

