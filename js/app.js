/* ============================================================
   日理万机 · 数码产品百科 — 应用核心 v2
   双模架构：
     · 在线模式 —— 数据走 /api/* 检索接口，支撑 30 万+ 产品
     · 静态降级 —— 直接双击 index.html 时加载 data/*.js 精选分片
   功能：全站搜索 / 筛选排序 / 详情 / 对比 / 排行榜 / 时间线 /
        收藏 / 用户评价 / 深浅主题 / 响应式
   ============================================================ */
(function () {
  'use strict';

  /* ================= 工具 ================= */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  /* 安全解码：非法百分号编码（如 %E0%A4%A）不抛 URIError 导致白屏 */
  const safeDecode = (s) => { try { return decodeURIComponent(s || ''); } catch (e) { return String(s || ''); } };
  const fmtScore = (n) => (typeof n === 'number' ? n.toFixed(1) : '–');
  const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : String(n));

  /* 轻量 Toast 提示 */
  function toast(msg) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动复制地址栏链接'); }
    document.body.removeChild(ta);
  }

  const store = {
    get(k, d) {
      try { const v = JSON.parse(localStorage.getItem('rlwj:' + k)); return v == null ? d : v; }
      catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('rlwj:' + k, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
    }
  };

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

  const PAGE_SIZE = 24;

  const api = {
    async get(path) {
      const r = await fetch(path, { headers: { 'Accept': 'application/json' } });
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

    const bm = new Map();
    DATA.products.forEach((p) => bm.set(p.brand, (bm.get(p.brand) || 0) + 1));
    DATA.brands = Array.from(bm.entries()).sort((a, b) => b[1] - a[1]).map((e) => e[0]);

    const years = DATA.products.map((p) => p.year).filter((y) => typeof y === 'number');
    DATA.meta = {
      total: DATA.products.length,
      curated: DATA.products.length,
      bulk: 0,
      yearMin: years.length ? Math.min.apply(null, years) : null,
      yearMax: years.length ? Math.max.apply(null, years) : null,
      categories: DATA.cats,
      brands: DATA.brands
    };
  }

  function loadShard(file) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = file;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  async function loadStatic() {
    const app = $('#app');
    const manifest = window.DB_MANIFEST;
    if (!manifest || !Array.isArray(manifest.shards)) {
      app.innerHTML = '<div class="empty"><span class="big">⚠️</span>未找到数据清单（data/manifest.js）。</div>';
      return;
    }
    app.innerHTML = '<div class="loading">正在载入产品库…… 0 / ' + manifest.shards.length + ' 个数据分片</div>';
    await Promise.all(manifest.shards.map((s) => loadShard(s.file || s)));
    /* 媒体/图片补充数据 */
    await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => loadShard('data/enrich/media-' + i + '.js')));
    buildStaticDB();
  }

  /* ---- 统一查询接口（页面层只调用这些） ---- */

  const Q = {
    async meta() {
      return DATA.meta;
    },

    async home() {
      if (DATA.online) return api.get('/api/home');
      // 静态模式本地构造
      const curated = DATA.products;
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
        items: ymap.get(y).slice().sort(byYear).slice(0, 8)
      }));
      return {
        stats: {
          total: DATA.meta.total, categories: DATA.cats.length, brands: DATA.brands.length,
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
        return api.get('/api/search?' + q.toString());
      }
      // 静态模式
      let list = DATA.products;
      if (params.cat) list = list.filter((p) => p.category === params.cat);
      if (params.leaf) list = list.filter((p) => p.catLeaf === params.leaf);
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
      const rawToks = String(params.q || '').toLowerCase().split(/[\s,，、;；+]+/)
        .filter((t) => t && !(t.length === 1 && /[a-z0-9]/.test(t)))
        .map((t) => QUERY_ALIAS[t] || t).join(' ').split(/\s+/).filter(Boolean);
      /* 中文长词切双字（「降噪耳机」→ 降噪+耳机） */
      const toks = [];
      rawToks.forEach((t) => {
        if (/^[\u4e00-\u9fa5]+$/.test(t) && t.length >= 4) {
          for (let i = 0; i + 1 < t.length; i += 2) toks.push(t.slice(i, i + 2));
        } else toks.push(t);
      });
      const phrase = rawToks.join(' ');
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
      } else {
        const sorters = {
          score: (a, b) => (b.score || 0) - (a.score || 0) || (b.userScore || 0) - (a.userScore || 0),
          user: (a, b) => (b.userScore || 0) - (a.userScore || 0),
          new: (a, b) => (b.year || 0) - (a.year || 0),
          old: (a, b) => (a.year || 0) - (b.year || 0),
          priceDesc: (a, b) => (b.price || 0) - (a.price || 0),
          priceAsc: (a, b) => (a.price || 0) - (b.price || 0),
          name: (a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN')
        };
        list = list.slice().sort(sorters[params.sort] || sorters.score);
      }
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
        const r = await api.get('/api/suggest?q=' + encodeURIComponent(text));
        return r.items || [];
      }
      const t = text.toLowerCase();
      const hits = DATA.products.filter((p) => {
        const n = String(p.name).toLowerCase(), b = String(p.brand).toLowerCase();
        return n.indexOf(t) !== -1 || b.indexOf(t) !== -1;
      }).sort((a, b) => {
        const an = String(a.name).toLowerCase().indexOf(t) === 0 ? 0 : 1;
        const bn = String(b.name).toLowerCase().indexOf(t) === 0 ? 0 : 1;
        return an - bn || String(a.name).length - String(b.name).length;
      });
      return hits.slice(0, 7);
    },

    async product(id) {
      if (DATA.online) return api.get('/api/product/' + encodeURIComponent(id));
      return DATA.byId[id] || null;
    },

    async byIds(ids) {
      if (!ids.length) return [];
      if (DATA.online) {
        const r = await api.get('/api/products?ids=' + ids.map(encodeURIComponent).join(','));
        return r.items || [];
      }
      return ids.map((id) => DATA.byId[id]).filter(Boolean);
    },

    async ranking(params) {
      if (DATA.online) {
        const q = new URLSearchParams();
        ['cat', 'sort', 'dir', 'page', 'pageSize'].forEach((k) => {
          if (params[k] != null && params[k] !== '') q.set(k, params[k]);
        });
        return api.get('/api/ranking?' + q.toString());
      }
      let list = DATA.products.slice();
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
      if (DATA.online) return api.get('/api/timeline');
      const ymap = new Map();
      DATA.products.forEach((p) => {
        const y = p.year || 0;
        if (!ymap.has(y)) ymap.set(y, []);
        ymap.get(y).push(p);
      });
      return {
        years: Array.from(ymap.keys()).sort((a, b) => b - a).map((y) => ({
          year: y, count: ymap.get(y).length,
          items: ymap.get(y).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8)
        }))
      };
    },

    async related(id) {
      if (DATA.online) return (await api.get('/api/related?id=' + encodeURIComponent(id))).items || [];
      const base = DATA.byId[id];
      if (!base) return [];
      return DATA.products.filter((p) => p.category === base.category && p.id !== id)
        .sort((a, b) => Math.abs((a.score || 0) - (base.score || 0)) - Math.abs((b.score || 0) - (base.score || 0)))
        .slice(0, 4);
    },

    async categories() {
      if (DATA.online) return api.get('/api/categories');
      const tree = window.DB_CATEGORY_TREE;
      if (!tree) return { stats: null, leafCounts: {}, groups: [] };
      const leafCounts = {};
      const catBrand = {};
      DATA.products.forEach((p) => {
        if (p.catLeaf) leafCounts[p.catLeaf] = (leafCounts[p.catLeaf] || 0) + 1;
        const bm = catBrand[p.category] = catBrand[p.category] || {};
        bm[p.brand] = (bm[p.brand] || 0) + 1;
      });
      const brandsOf = (cat) => {
        const bm = catBrand[cat] || {};
        return Object.keys(bm).sort((x, y) => bm[y] - bm[x]).map((b) => ({ name: b, count: bm[b] }));
      };
      return {
        stats: tree.stats, leafCounts: leafCounts,
        groups: tree.groups.map((g) => ({
          id: g.id, name: g.name, icon: g.icon,
          bases: g.bases.map((b) => ({
            id: b.id, name: b.name, icon: b.icon, count: leafCounts[b.id] || 0,
            brands: brandsOf(b.id),
            leaves: [{ id: b.id, name: b.name, count: leafCounts[b.id] || 0 }]
              .concat((b.variants || []).map((v) => ({ id: b.id + '-' + v.slug, name: b.name + ' · ' + v.label, count: leafCounts[b.id + '-' + v.slug] || 0 })))
          }))
        }))
      };
    },

    async brands() {
      if (DATA.online) return api.get('/api/brands');
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
        return api.get('/api/brand/' + encodeURIComponent(name) + (q.toString() ? '?' + q.toString() : ''));
      }
      const list = DATA.products.filter((x) => x.brand === name);
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
      const sorted = list.slice().sort((a, c) => (c.score || 0) - (a.score || 0));
      return {
        brand: name, total: sorted.length,
        score: scoreN ? Math.round((scoreSum / scoreN) * 10) / 10 : null,
        yearMin: yMin === 9999 ? null : yMin, yearMax: yMax || null,
        cats, items: sorted
      };
    }
  };

  /* ================= 本地状态 ================= */

  const state = {
    favorites: store.get('favorites', []),
    compare: store.get('compare', []),
    reviews: store.get('reviews', {}),
    theme: store.get('theme', 'dark')
  };

  function saveState() {
    store.set('favorites', state.favorites);
    store.set('compare', state.compare);
    store.set('reviews', state.reviews);
  }

  const isFav = (id) => state.favorites.indexOf(id) !== -1;
  const inCompare = (id) => state.compare.indexOf(id) !== -1;

  function toggleFav(id) {
    const i = state.favorites.indexOf(id);
    if (i === -1) state.favorites.push(id); else state.favorites.splice(i, 1);
    saveState(); refreshFavButtons();
  }

  function toggleCompare(id) {
    const i = state.compare.indexOf(id);
    if (i !== -1) { state.compare.splice(i, 1); }
    else {
      if (state.compare.length >= 3) { alert('最多同时对比 3 款产品'); return; }
      state.compare.push(id);
    }
    saveState(); refreshCmpButtons(); renderCompareTray();
  }

  function refreshFavButtons() {
    $$('[data-action="fav"]').forEach((b) => {
      const on = isFav(b.getAttribute('data-id'));
      b.classList.toggle('on', on);
      if (b.classList.contains('btn')) b.textContent = on ? '♥ 已收藏' : '♥ 收藏';
    });
  }

  function refreshCmpButtons() {
    $$('[data-action="cmp"]').forEach((b) => {
      const on = inCompare(b.getAttribute('data-id'));
      b.classList.toggle('on', on);
      if (b.classList.contains('btn')) b.textContent = on ? '⇋ 已加入对比' : '⇋ 加入对比';
    });
  }

  /* ================= 路由 ================= */

  function currentRoute() {
    const raw = (location.hash || '').replace(/^#/, '') || '/';
    const idx = raw.indexOf('?');
    const path = idx === -1 ? raw : raw.slice(0, idx);
    const qs = idx === -1 ? '' : raw.slice(idx + 1);
    return {
      parts: path.split('/').filter(Boolean),
      query: new URLSearchParams(qs)
    };
  }

  function hrefWith(patch) {
    const r = currentRoute();
    const q = new URLSearchParams(r.query.toString());
    Object.keys(patch).forEach((k) => {
      const v = patch[k];
      if (v === '' || v == null) q.delete(k); else q.set(k, v);
    });
    const qs = q.toString();
    return '#/' + r.parts.join('/') + (qs ? '?' + qs : '');
  }

  /* ================= 组件 ================= */

  function catIconOf(p) {
    const cats = DATA.online ? (DATA.meta ? DATA.meta.categories : []) : DATA.cats;
    const hit = (cats || []).filter((c) => c.id === p.category)[0];
    return (hit && hit.icon) || '📦';
  }

  /* leaf id（如 sensor-th-zigbee）→ 可读名称 */
  function leafNameOf(leafId, cats) {
    const tree = window.DB_CATEGORY_TREE;
    if (tree && tree.leafById && tree.leafById[leafId]) return tree.leafById[leafId].name;
    /* 回退：找 id 前缀最长的品类（base id 可能带连字符，如 pc-case） */
    let best = null;
    (cats || []).forEach((c) => {
      if (leafId === c.id || leafId.indexOf(c.id + '-') === 0) {
        if (!best || c.id.length > best.id.length) best = c;
      }
    });
    return best ? best.name + ' · ' + leafId : leafId;
  }

  /* ================= 产品图（真实图 / 海报兜底） ================= */

  /* 海报 SVG data-URI（静态模式兜底） */
  function posterURI(p, variant) {
    const name = String(p.name || '');
    const brand = String(p.brand || '');
    let h = 0;
    const id = String(p.id || name) + '#' + (variant || 0);
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const v = variant || 0;
    const hue1 = (h + v * 97) % 360, hue2 = (hue1 + 42 + v * 13) % 360;
    const nameSize = name.length > 18 ? 40 : (name.length > 12 ? 50 : 60);
    const esc2 = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    /* 三种视觉变体：0=正面主视 1=参数视 2=侧视，各自构图/配色不同 */
    const angles = [0, 1, 2];
    const a = angles[v % 3];
    const geo = a === 0
      ? '<rect width="800" height="800" fill="url(#g)"/><circle cx="640" cy="220" r="200" fill="hsla(' + hue2 + ',60%,60%,0.12)"/>'
      : a === 1
        ? '<rect width="800" height="800" fill="url(#g)"/>' + [0, 1, 2, 3].map((i) => '<rect x="72" y="' + (360 + i * 70) + '" width="' + (300 + (i % 2) * 180) + '" height="16" rx="8" fill="hsla(' + hue2 + ',60%,80%,0.22)"/>').join('')
        : '<rect width="800" height="800" fill="url(#g)"/><rect x="72" y="360" width="656" height="220" rx="18" fill="hsla(' + hue2 + ',55%,70%,0.12)"/>';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">' +
      '<defs><linearGradient id="g" x1="' + (a === 2 ? 1 : 0) + '" y1="0" x2="' + (a === 0 ? 1 : 0) + '" y2="1">' +
      '<stop offset="0%" stop-color="hsl(' + hue1 + ',58%,22%)"/>' +
      '<stop offset="55%" stop-color="hsl(' + hue2 + ',62%,30%)"/>' +
      '<stop offset="100%" stop-color="hsl(' + hue1 + ',55%,14%)"/></linearGradient></defs>' + geo +
      '<text x="72" y="200" font-family="sans-serif" font-size="34" fill="hsla(' + hue2 + ',70%,82%,0.9)">' + esc2(brand) + '</text>' +
      '<text x="72" y="300" font-family="sans-serif" font-size="' + nameSize + '" font-weight="700" fill="#fff">' + esc2(name.slice(0, 22)) + '</text>' +
      '<text x="72" y="720" font-family="sans-serif" font-size="30" fill="hsla(' + hue1 + ',60%,85%,0.75)">' + esc2(p.categoryName || '') + ' · ' + esc2(p.year || '') + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* 产品图集：每款产品至少 3 张 —— 真实图片优先，不足用海报变体补足 */
  function galleryOf(p) {
    const id = String(p.id);
    const real = [];
    if (Array.isArray(p.images) && p.images.length) real.push(...p.images.filter(Boolean));
    if (p.image && real.indexOf(p.image) === -1) real.unshift(p.image);
    if (real.length >= 3) return real.slice(0, 6);
    const fill = [];
    for (let v = 0; fill.length < 3; v++) {
      const u = posterURI(p, v);
      if (real.indexOf(u) === -1 && fill.indexOf(u) === -1) fill.push(u);
    }
    return real.concat(fill).slice(0, 6);
  }

  /* 产品图：优先真实图片，其次 API 海报，静态模式本地海报；加载失败自动回退海报 */
  const POSTER_CACHE = {};
  const IMG_REGISTRY = {};
  function posterOf(p) {
    const id = String(p.id);
    if (!POSTER_CACHE[id]) POSTER_CACHE[id] = posterURI(p);
    return POSTER_CACHE[id];
  }
  function productImg(p, alt) {
    let src;
    if (p.image) src = p.image;
    else if (DATA.online) src = '/api/image/' + encodeURIComponent(p.id);
    else src = posterURI(p);
    IMG_REGISTRY[String(p.id)] = p;
    return '<img loading="lazy" src="' + esc(src) + '" alt="' + esc(alt || p.name) + '" ' +
      'onerror="window.__imgFail&&window.__imgFail(this)" data-pid="' + esc(String(p.id)) + '" />';
  }

  /* 产品图集渲染：主图 + 缩略图条（≥3 张），点击切换主图 */
  function productGallery(p) {
    const imgs = galleryOf(p);
    IMG_REGISTRY[String(p.id)] = p;
    return '<div class="gallery" data-pid="' + esc(String(p.id)) + '">' +
      '<div class="gallery-main">' +
        '<img id="gallery-main-img" loading="lazy" src="' + esc(imgs[0]) + '" alt="' + esc(p.name) + '" ' +
        'onerror="window.__imgFail&&window.__imgFail(this)" data-pid="' + esc(String(p.id)) + '" />' +
        '<span class="gallery-count">' + imgs.length + ' 图</span>' +
      '</div>' +
      '<div class="gallery-thumbs">' +
        imgs.map((src, i) =>
          '<img class="gallery-thumb' + (i === 0 ? ' active' : '') + '" loading="lazy" src="' + esc(src) + '" ' +
          'data-action="gallery-thumb" data-src="' + esc(src) + '" alt="' + esc(p.name) + ' 图' + (i + 1) + '" ' +
          'onerror="window.__imgFail&&window.__imgFail(this)" data-pid="' + esc(String(p.id)) + '" />').join('') +
      '</div>' +
    '</div>';
  }
  let HL = [];
  function hlText(text) {
    const escStr = esc(text);
    /* 实体保护：高亮词若命中 &amp; / &#39; 等实体内部，会破坏实体显示；
       按实体分段，只在实体外的片段做高亮 */
    const segs = escStr.split(/(&[a-z]+;|&#\d+;)/i);
    HL.forEach((t) => {
      if (!t) return;
      const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      for (let i = 0; i < segs.length; i += 2) segs[i] = segs[i].replace(re, '<mark class="hl">$1</mark>');
    });
    return segs.join('');
  }

  function productCard(p) {
    const favOn = isFav(p.id) ? ' on' : '';
    const cmpOn = inCompare(p.id) ? ' on' : '';
    const scoreChips = (p.scores || []).slice(0, 3)
      .map((s) => '<span class="badge">' + esc(s[0]) + ' ' + esc(s[1]) + '</span>').join('');
    const demo = p.source === 'bulk' ? '<span class="badge" style="margin-left:6px;font-size:10px;padding:1px 7px">演示</span>' : '';
    return '' +
      '<div class="card product-card" data-link="#/product/' + esc(p.id) + '" role="link" tabindex="0">' +
        '<div class="pc-cover">' +
          productImg(p, p.name) +
          '<div class="pc-year">' + esc(p.year) + '</div>' +
        '</div>' +
        '<div class="pc-body">' +
          '<h3 class="pc-name">' + hlText(p.name) + '</h3>' +
          '<div class="pc-brand">' + hlText(p.brand) + demo + '</div>' +
          '<div class="pc-summary">' + esc(p.summary) + '</div>' +
          '<div class="pc-scores">' + scoreChips + '</div>' +
          '<div class="pc-foot">' +
            '<span class="pc-score"><b>' + fmtScore(p.score) + '</b><span>/10 编辑</span></span>' +
            '<span class="actions">' +
              '<button class="icon-btn' + favOn + '" data-action="fav" data-id="' + esc(p.id) + '" title="收藏">♥</button>' +
              '<button class="icon-btn' + cmpOn + '" data-action="cmp" data-id="' + esc(p.id) + '" title="加入对比">⇋</button>' +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function productGrid(list, cls) {
    return '<div class="grid ' + (cls || 'grid-4') + '">' + (list || []).map(productCard).join('') + '</div>';
  }

  function scoreBars(scores) {
    return '<div class="score-bars">' + (scores || []).map((s) =>
      '<div class="score-row">' +
        '<div class="sb-label">' + esc(s[0]) + '</div>' +
        '<div class="sb-track"><div class="sb-fill" style="width:' + clamp(Number(s[1]) || 0, 0, 100) + '%"></div></div>' +
        '<div class="sb-val">' + esc(s[1]) + '</div>' +
      '</div>').join('') + '</div>';
  }

  function sectionHead(title, sub, moreHref, moreText) {
    return '<div class="section-head"><h2>' + esc(title) + '</h2>' +
      (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') +
      (moreHref ? '<a class="more" href="' + moreHref + '">' + esc(moreText || '查看全部 →') + '</a>' : '') +
      '</div>';
  }

  function pagination(page, pages) {
    if (pages <= 1) return '';
    const btn = (label, p, disabled, cls) =>
      '<button class="btn btn-sm ' + (cls || 'btn-ghost') + '" data-action="page" data-page="' + p + '"' +
      (disabled ? ' disabled style="opacity:.45"' : '') + '>' + label + '</button>';
    return '<div class="pagination">' +
      btn('« 上一页', page - 1, page <= 1) +
      '<span class="muted" style="font-size:13px">第 ' + page + ' / ' + pages + ' 页</span>' +
      btn('下一页 »', page + 1, page >= pages) +
      '</div>';
  }

  /* ================= 页面：首页 ================= */

  /* 热搜词（基于真实型号/品牌，非空想）+ 最近搜索（localStorage） */
  const HOT_WORDS = ['iPhone 4', '徕卡', '降噪耳机', 'PS5', 'RTX 4090', 'AirPods Pro',
    'Find X6', 'Nintendo Switch', '机械键盘', '智能手表', '无人机', '单反相机',
    'Nokia 3310', 'iPod', 'Mavic 3', 'iPad Pro', 'Walkman', 'Kindle'];
  function recentSearches() {
    try { return JSON.parse(localStorage.getItem('riwanji.recent') || '[]'); } catch (e) { return []; }
  }
  function pushRecent(term) {
    if (!term) return;
    try {
      const list = recentSearches().filter((x) => x !== term);
      list.unshift(term);
      localStorage.setItem('riwanji.recent', JSON.stringify(list.slice(0, 8)));
    } catch (e) { /* 忽略 */ }
  }

  async function renderHome() {
    const data = await Q.home();
    const st = data.stats;

    const catCards = (data.categories || []).map((c) =>
      '<a class="card cat-card" href="#/products?cat=' + esc(c.id) + '">' +
        '<span class="cat-icon">' + c.icon + '</span>' +
        '<h3>' + esc(c.name) + '</h3>' +
        '<p>' + esc(c.description) + '</p>' +
        '<span class="badge accent">' + fmtNum(c.count) + ' 款产品</span>' +
      '</a>').join('');

    const recent = recentSearches();
    const searchChips =
      (recent.length
        ? '<div class="hot-row"><span class="hot-label">最近搜索</span>' +
            recent.map((t) =>
              '<a class="hot-chip hot-recent" href="#/products?q=' + encodeURIComponent(t) + '">' +
                '<span class="hot-dot"></span>' + esc(t) + '</a>').join('') +
            '<button class="hot-clear" data-action="clear-recent" title="清空最近搜索">✕</button>' +
          '</div>'
        : '') +
      '<div class="hot-row"><span class="hot-label">热门搜索</span>' +
        HOT_WORDS.map((t) =>
          '<a class="hot-chip" href="#/products?q=' + encodeURIComponent(t) + '">' + esc(t) + '</a>').join('') +
      '</div>';

    const timelinePreview = '<div class="timeline">' + (data.timeline || []).slice(0, 3).map((g) =>
      '<div class="tl-year"><h3>' + esc(g.year) + '</h3><div class="tl-items">' +
      (g.items || []).slice(0, 6).map((p) =>
        '<a class="tl-item" href="#/product/' + esc(p.id) + '">' +
          '<span class="tl-emoji">' + catIconOf(p) + '</span>' +
          '<span><b>' + esc(p.name) + '</b><span>' + esc(p.brand) + ' · ' + esc(p.categoryName || '') + '</span></span>' +
        '</a>').join('') +
      '</div></div>').join('') + '</div>';

    return '' +
      '<section class="hero">' +
        '<h1><span class="grad">日理万机</span>，读懂每一台机器</h1>' +
        '<p class="lead">手机、平板、耳机、相机、笔记本、手表、游戏机、音箱…… 从参数规格到主客观评测，' +
        '从编辑评分到用户口碑，把每一台值得记录的数码产品收进一页。</p>' +
        '<div class="hero-search">' +
          '<input id="hero-search" type="search" placeholder="试试搜索：iPhone 4、徕卡、降噪耳机、2013……" aria-label="搜索产品" />' +
          '<button class="btn btn-primary" data-action="hero-search">搜索</button>' +
        '</div>' +
        searchChips +
        '<div class="hero-stats">' +
          '<div class="stat"><b>' + fmtNum(st.total) + '</b><span>收录产品</span></div>' +
          '<div class="stat"><b>' + fmtNum(st.leaves != null ? st.leaves : st.categories) + '</b><span>细分品类</span></div>' +
          '<div class="stat"><b>' + fmtNum(st.brands) + '</b><span>品牌</span></div>' +
          '<div class="stat"><b>' + esc(st.yearMin) + '–' + esc(st.yearMax) + '</b><span>年份跨度</span></div>' +
        '</div>' +
      '</section>' +

      '<section class="section">' +
        sectionHead('按品类浏览', '从这里开始探索', '#/products', '全部产品 →') +
        '<div class="grid grid-4">' + catCards + '</div>' +
      '</section>' +

      '<section class="section">' +
        sectionHead('编辑精选', '综合评分最高的产品', '#/ranking', '完整榜单 →') +
        productGrid(data.editors) +
      '</section>' +

      '<section class="section">' +
        sectionHead('口碑之选', '用户评分最高的产品', '#/ranking', '完整榜单 →') +
        productGrid(data.popular) +
      '</section>' +

      '<section class="section">' +
        sectionHead('品类之王', '每个品类里编辑评分最高的那一台', '#/ranking') +
        productGrid(data.topPerCat) +
      '</section>' +

      '<section class="section">' +
        sectionHead('穿越时间线', '看看每一年诞生了什么', '#/timeline', '完整时间线 →') +
        timelinePreview +
      '</section>';
  }

  /* ================= 页面：产品列表 / 搜索 ================= */

  async function renderProducts(query) {
    const q = (query.get('q') || '').trim();
    const cat = query.get('cat') || '';
    const leaf = query.get('leaf') || '';
    const brand = query.get('brand') || '';
    const era = query.get('era') || '';
    const sort = query.get('sort') || 'score';
    const page = parseInt(query.get('page') || '1', 10) || 1;

    const meta = await Q.meta();
    const cats = meta.categories || [];
    const brands = meta.brands || [];

    const res = await Q.search({ q, cat, leaf, brand, era, sort, page, pageSize: PAGE_SIZE });

    const catChips = ['<button class="chip' + (cat || leaf ? '' : ' on') + '" data-filter="cat" data-value="">全部品类</button>']
      .concat(cats.map((c) =>
        '<button class="chip' + (cat === c.id && !leaf ? ' on' : '') + '" data-filter="cat" data-value="' + esc(c.id) + '">' +
        c.icon + ' ' + esc(c.name) + '</button>')).join('');

    /* 当前品类下的细分叶子筛选 */
    let leafChips = '';
    const curCat = cats.filter((c) => c.id === cat)[0];
    if (curCat && (curCat.leaves || []).length > 1) {
      leafChips = '<div class="filter-bar" style="padding:10px 14px">' +
        ['<button class="chip' + (leaf ? '' : ' on') + '" data-filter="leaf" data-value="">全部细分</button>']
        .concat(curCat.leaves.map((l) =>
          '<button class="chip' + (leaf === l.id ? ' on' : '') + '" data-filter="leaf" data-value="' + esc(l.id) + '">' +
          esc(l.name) + ' <span class="muted">' + fmtNum(l.count) + '</span></button>')).join('') +
        '</div>';
    }

    const brandOptions = ['<option value="">全部品牌</option>']
      .concat(brands.slice(0, 200).map((b) =>
        '<option value="' + esc(b) + '"' + (brand === b ? ' selected' : '') + '>' + esc(b) + '</option>')).join('');

    const eraOptions = [
      ['', '全部年份'], ['2020s', '2020 年至今'], ['2010s', '2010–2019'],
      ['2000s', '2000–2009'], ['pre', '2000 年以前']
    ].map((e) => '<option value="' + e[0] + '"' + (era === e[0] ? ' selected' : '') + '>' + e[1] + '</option>').join('');

    const sortOptions = [
      ['score', '综合评分'], ['user', '用户评分'], ['new', '年份新→旧'],
      ['old', '年份旧→新'], ['priceDesc', '价格高→低'], ['priceAsc', '价格低→高'], ['name', '名称 A→Z']
    ].map((e) => '<option value="' + e[0] + '"' + (sort === e[0] ? ' selected' : '') + '>' + e[1] + '</option>').join('');

    const body = (res.items && res.items.length)
      ? (HL = q.toLowerCase().split(/\s+/).filter(Boolean), productGrid(res.items)) + pagination(res.page, Math.max(1, Math.ceil(res.total / res.pageSize)))
      : '<div class="empty"><span class="big">🕳️</span>没有找到匹配的产品。<br />试试更换关键词或清除筛选条件。</div>';
    HL = [];

    return '' +
      '<div class="page-head">' +
        '<h1>' + (q ? '搜索：' + esc(q) : (leaf ? esc(leafNameOf(leaf, cats)) : (cat ? esc((cats.filter((c) => c.id === cat)[0] || {}).name || cat) : '全部产品'))) + '</h1>' +
        '<p>' + (q ? '在 ' + fmtNum(meta.total) + ' 款产品中搜索' : '共收录 ' + fmtNum(meta.total) + ' 款产品，持续扩展中') + '</p>' +
      '</div>' +
      '<div class="filter-bar">' +
        catChips +
        '<span class="spacer"></span>' +
        '<select data-filter="brand" aria-label="品牌">' + brandOptions + '</select>' +
        '<select data-filter="era" aria-label="年代">' + eraOptions + '</select>' +
        '<select data-filter="sort" aria-label="排序">' + sortOptions + '</select>' +
      '</div>' +
      leafChips +
      '<div class="filter-bar" style="padding:10px 14px">' +
        '<span class="result-count">共 ' + fmtNum(res.total) + ' 个结果</span>' +
      '</div>' +
      body;
  }

  /* ================= 页面：产品详情 ================= */

  async function renderProduct(id) {
    const p = await Q.product(id);
    if (!p || p.error) {
      return '<div class="empty"><span class="big">🔍</span>没有找到该产品。<br /><a class="btn btn-primary" href="#/products" style="margin-top:14px">返回全部产品</a></div>';
    }
    document.title = p.name + ' —— 日理万机';

    const related = await Q.related(id);
    const specRows = (p.specs || []).map((s) =>
      '<tr><th>' + esc(s[0]) + '</th><td>' + esc(s[1]) + '</td></tr>').join('');
    const pros = (p.pros || []).map((x) => '<li>' + esc(x) + '</li>').join('');
    const cons = (p.cons || []).map((x) => '<li>' + esc(x) + '</li>').join('');
    const demo = p.source === 'bulk' ? '<span class="badge">演示数据</span>' : '';

    return '' +
      '<nav class="breadcrumb">' +
        '<a href="#/">首页</a><span class="sep">/</span>' +
        '<a href="#/products?cat=' + esc(p.category) + '">' + esc(p.categoryName || '') + '</a><span class="sep">/</span>' +
        '<span>' + esc(p.name) + '</span>' +
      '</nav>' +

      '<div class="detail-hero">' +
        '<div class="detail-main">' +
          '<div class="detail-photo">' + productGallery(p) + '</div>' +
          '<h1>' + esc(p.name) + '</h1>' +
          '<div class="detail-meta">' +
            '<span class="badge accent">' + esc(p.brand) + '</span>' +
            '<span class="badge">' + esc(p.year) + '</span>' +
            '<span class="badge">' + esc(p.priceText || '') + '</span>' +
            demo +
            (p.tags || []).map((t) => '<span class="badge">' + esc(t) + '</span>').join('') +
          '</div>' +
          '<p class="detail-summary">' + esc(p.summary) + '</p>' +
          '<div class="detail-actions">' +
            '<button class="btn' + (isFav(p.id) ? ' active' : '') + '" data-action="fav" data-id="' + esc(p.id) + '">♥ ' + (isFav(p.id) ? '已收藏' : '收藏') + '</button>' +
            '<button class="btn' + (inCompare(p.id) ? ' active' : '') + '" data-action="cmp" data-id="' + esc(p.id) + '">⇋ ' + (inCompare(p.id) ? '已加入对比' : '加入对比') + '</button>' +
            '<button class="btn btn-ghost" data-action="copy-link" data-id="' + esc(p.id) + '">🔗 复制链接</button>' +
            '<a class="btn btn-ghost" href="#/products?cat=' + esc(p.category) + '">更多' + esc(p.categoryName || '产品') + '</a>' +
          '</div>' +
        '</div>' +
        '<aside class="detail-side">' +
          '<div class="score-panel">' +
            '<h3>综合评分</h3>' +
            '<div class="big-scores">' +
              '<div class="big-score"><b>' + fmtScore(p.score) + '</b><span>编辑评分</span></div>' +
              '<div class="big-score"><b>' + fmtScore(p.userScore) + '</b><span>用户评分</span></div>' +
            '</div>' +
            scoreBars(p.scores) +
          '</div>' +
        '</aside>' +
      '</div>' +

      '<div class="review-grid">' +
        '<div class="review-card"><h3><span class="pc-tag obj">客观</span>客观评测</h3><p>' + esc(p.review && p.review.objective) + '</p></div>' +
        '<div class="review-card"><h3><span class="pc-tag sub">主观</span>主观点评</h3><p>' + esc(p.review && p.review.subjective) + '</p></div>' +
      '</div>' +

      renderMedia(p) +

      '<section class="section">' +
        sectionHead('参数规格') +
        '<input id="spec-filter" class="spec-filter" type="search" placeholder="🔍 速查参数：输入关键词过滤（如 屏幕 / 电池 / 接口）" aria-label="过滤参数" />' +
        '<table class="spec-table"><tbody id="spec-body">' + specRows + '</tbody></table>' +
      '</section>' +

      '<div class="pros-cons">' +
        '<div class="card"><h3 style="color:var(--good)">👍 优点</h3><ul class="pros">' + pros + '</ul></div>' +
        '<div class="card"><h3 style="color:var(--bad)">👎 不足</h3><ul class="cons">' + cons + '</ul></div>' +
      '</div>' +

      renderUserReviews(p) +

      '<section class="section">' +
        sectionHead('相关产品', '同品类中评分接近的产品') +
        productGrid(related) +
      '</section>';
  }

  /* 网络测评与媒体索引（权威机构 / 媒体评测 / 视频博主 / 社区口碑） */
  function mediaLinksFor(p) {
    if (p.media && p.media.length) return p.media;
    /* 无真实测评索引 → 提供全网搜索直达链接（真实可用入口，不杜撰） */
    const q = encodeURIComponent(p.name + ' 评测');
    return [
      { kind: 'video', title: 'B 站搜索「' + p.name + ' 评测」', source: 'bilibili', url: 'https://search.bilibili.com/all?keyword=' + q },
      { kind: 'video', title: 'YouTube 搜索「' + p.name + ' review」', source: 'YouTube', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(p.name + ' review') },
      { kind: 'community', title: '知乎搜索「' + p.name + '」', source: '知乎', url: 'https://www.zhihu.com/search?q=' + encodeURIComponent(p.name) },
      { kind: 'institution', title: 'Google 搜索「' + p.name + ' 评测」', source: 'Google', url: 'https://www.google.com/search?q=' + q }
    ];
  }

  function renderMedia(p) {
    const list = mediaLinksFor(p);
    if (!list.length) return '';
    const KIND_META = {
      institution: ['🏛️', '权威机构'], review: ['📰', '媒体评测'],
      video: ['🎬', '视频评测'], community: ['💬', '社区口碑'],
      web: ['🔗', '官方/相关']
    };
    const groups = {};
    list.forEach((m) => {
      const k = KIND_META[m.kind] ? m.kind : 'review';
      (groups[k] = groups[k] || []).push(m);
    });
    const order = ['institution', 'review', 'video', 'community', 'web'];
    return '' +
      '<section class="section media-section">' +
        sectionHead('网络评测与口碑', '视频博主、媒体与权威机构测评索引 · 点击跳转原文') +
        order.filter((k) => groups[k]).map((k) =>
          '<div class="media-group">' +
            '<h3 class="media-kind">' + KIND_META[k][0] + ' ' + KIND_META[k][1] + '<i>' + groups[k].length + '</i></h3>' +
            '<div class="media-list">' + groups[k].map((m) =>
              '<a class="media-item" href="' + esc(m.url) + '" target="_blank" rel="noopener noreferrer">' +
                '<span class="media-title">' + esc(m.title) + '</span>' +
                '<span class="media-src">' + esc(m.source) + (m.author ? ' · ' + esc(m.author) : '') + '</span>' +
                '<span class="media-go">↗</span>' +
              '</a>').join('') +
            '</div>' +
          '</div>').join('') +
        '<p class="media-note">链接均来自公开网络；如遇失效可使用站内搜索找到同名产品替代来源。</p>' +
      '</section>';
  }

  function renderUserReviews(p) {
    const list = (state.reviews[p.id] || []);
    const items = list.length
      ? list.slice().reverse().map((r) =>
          '<div class="review-item">' +
            '<div class="r-head"><span class="r-name">' + esc(r.name || '匿名用户') + '</span>' +
            '<span class="r-score">' + esc(r.score) + '/10</span></div>' +
            '<div class="r-date">' + esc(r.date) + '</div>' +
            '<p>' + esc(r.text) + '</p>' +
          '</div>').join('')
      : '<div class="empty" style="padding:34px">还没有用户评价，来写第一条吧 ✍️</div>';

    return '' +
      '<section class="user-reviews">' +
        '<h2>用户评价（' + list.length + '）</h2>' +
        '<form class="review-form" id="review-form" data-id="' + esc(p.id) + '">' +
          '<div class="row">' +
            '<input name="name" maxlength="20" placeholder="你的昵称（可留空）" />' +
            '<select name="score">' +
              Array.from({ length: 10 }, (_, i) => '<option value="' + (10 - i) + '"' + (10 - i === 8 ? ' selected' : '') + '>' + (10 - i) + ' 分</option>').join('') +
            '</select>' +
          '</div>' +
          '<textarea name="text" maxlength="500" required placeholder="说说你对 ' + esc(p.name) + ' 的看法……（将保存在本机浏览器）"></textarea>' +
          '<div><button class="btn btn-primary" type="submit">发布评价</button></div>' +
        '</form>' +
        items +
      '</section>';
  }

  /* ================= 页面：对比 ================= */

  async function renderCompare() {
    const list = await Q.byIds(state.compare.filter(Boolean));

    const picker =
      '<div class="compare-picker">' +
        '<input id="cmp-search" type="search" placeholder="搜索产品名称或品牌，点选加入对比……" style="height:44px;padding:0 15px;border-radius:12px;border:1px solid var(--border-strong);background:var(--card);color:var(--text);font-size:13.5px;outline:none;flex:1;max-width:380px" />' +
        '<button class="btn btn-ghost" data-action="cmp-clear-all">清空对比</button>' +
      '</div>' +
      '<div id="cmp-suggest"></div>';

    if (!list.length) {
      return '' +
        '<div class="page-head"><h1>产品对比</h1><p>最多选择 3 款产品，逐项对比参数与评分</p></div>' +
        picker +
        '<div class="empty"><span class="big">⚖️</span>还没有选择对比产品。<br />在产品卡片上点击 ⇋ 按钮，或用上方搜索框添加。</div>';
    }

    const dimMap = new Map();
    list.forEach((p) => (p.scores || []).forEach((s) => dimMap.set(s[0], true)));
    const dims = Array.from(dimMap.keys());

    const specKeyMap = new Map();
    list.forEach((p) => (p.specs || []).forEach((s) => specKeyMap.set(s[0], true)));
    const specKeys = Array.from(specKeyMap.keys());

    const specOf = (p, key) => {
      const hit = (p.specs || []).filter((s) => s[0] === key)[0];
      return hit ? hit[1] : '–';
    };
    const dimOf = (p, key) => {
      const hit = (p.scores || []).filter((s) => s[0] === key)[0];
      return hit ? hit[1] : null;
    };
    const best = (vals, higherBetter) => {
      const nums = vals.filter((v) => typeof v === 'number');
      if (!nums.length) return null;
      return higherBetter ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
    };

    const headerRow = '<tr><th>产品</th>' + list.map((p) =>
      '<td><div class="ct-name">' + esc(p.name) + '</div>' +
      '<div class="muted" style="font-size:11.5px">' + esc(p.brand) + ' · ' + esc(p.year) + '</div>' +
      '<button class="ct-remove" data-action="cmp" data-id="' + esc(p.id) + '" title="移出对比">✕</button></td>').join('') + '</tr>';

    const scoreRow = (label, vals, suffix) => {
      const b = best(vals, true);
      return '<tr><td>' + esc(label) + '</td>' + vals.map((v) =>
        '<td' + (typeof v === 'number' && v === b ? ' class="best"' : '') + '>' +
        (typeof v === 'number' ? fmtScore(v) + (suffix || '') : '–') +
        (typeof v === 'number' ? '<div class="mini-bar"><i style="width:' + clamp(v, 0, 100) + '%"></i></div>' : '') +
        '</td>').join('') + '</tr>';
    };

    const rows = [
      '<tr><td>品类</td>' + list.map((p) => '<td>' + esc(p.categoryName || '') + '</td>').join('') + '</tr>',
      scoreRow('编辑评分', list.map((p) => p.score), ' /10'),
      scoreRow('用户评分', list.map((p) => p.userScore), ' /10'),
      '<tr><td>上市年份</td>' + list.map((p) => '<td>' + esc(p.year) + '</td>').join('') + '</tr>',
      '<tr><td>上市价格</td>' + list.map((p) =>
        '<td' + (p.price === best(list.map((x) => x.price), false) ? ' class="best"' : '') + '>' +
        esc(p.priceText || '–') + '</td>').join('') + '</tr>'
    ].concat(
      dims.map((d) => scoreRow(d, list.map((p) => dimOf(p, d)))),
      specKeys.map((k) => {
        const vals = list.map((p) => specOf(p, k));
        /* 差异高亮：该项取值不唯一时，全部单元格加 diff 淡描边，方便逐项比对 */
        const uniq = new Set(vals.map((v) => String(v)));
        const diffCls = (list.length > 1 && uniq.size > 1) ? ' class="diff"' : '';
        return '<tr><td>' + esc(k) + '</td>' + vals.map((v) => '<td' + diffCls + '>' + esc(v) + '</td>').join('') + '</tr>';
      }),
      ['<tr><td>优点</td>' + list.map((p) => '<td style="text-align:left;font-size:12.5px">' +
        (p.pros || []).map((x) => '✓ ' + esc(x)).join('<br />') + '</td>').join('') + '</tr>',
       '<tr><td>不足</td>' + list.map((p) => '<td style="text-align:left;font-size:12.5px">' +
        (p.cons || []).map((x) => '✕ ' + esc(x)).join('<br />') + '</td>').join('') + '</tr>']
    );

    return '' +
      '<div class="page-head"><h1>产品对比</h1><p>已选 ' + list.length + ' / 3 款产品（绿色为该项最优，淡黄底色为存在差异的参数项）</p></div>' +
      picker +
      '<table class="compare-table"><thead>' + headerRow + '</thead><tbody>' + rows.join('') + '</tbody></table>';
  }

  /* ================= 页面：排行榜 ================= */

  async function renderRanking(query) {
    const cat = query.get('cat') || '';
    const sort = query.get('sort') || 'score';
    const dir = parseInt(query.get('dir') || '-1', 10);
    const page = parseInt(query.get('page') || '1', 10) || 1;

    const meta = await Q.meta();
    const res = await Q.ranking({ cat, sort, dir, page, pageSize: 50 });

    const th = (label, k) => {
      const isSorted = sort === k;
      return '<th class="' + (isSorted ? 'sorted' : '') + '" data-action="rank-sort" data-key="' + k + '">' +
        label + (isSorted ? (dir === -1 ? ' ↓' : ' ↑') : '') + '</th>';
    };

    const medals = ['🥇', '🥈', '🥉'];
    const rows = (res.items || []).map((p, i) =>
      '<tr>' +
        '<td class="num">' + (medals[i] || ((res.page - 1) * res.pageSize + i + 1)) + '</td>' +
        '<td class="rank-name"><a href="#/product/' + esc(p.id) + '">' + esc(p.name) + '</a>' +
          '<span class="muted">' + esc(p.brand) + ' · ' + esc(p.categoryName || '') + '</span></td>' +
        '<td class="num">' + esc(p.year) + '</td>' +
        '<td class="num" style="color:var(--accent);font-weight:700">' + fmtScore(p.score) + '</td>' +
        '<td class="num">' + fmtScore(p.userScore) + '</td>' +
        '<td class="num">' + esc(p.priceText || '–') + '</td>' +
      '</tr>').join('');

    const catChips = ['<button class="chip' + (cat ? '' : ' on') + '" data-filter="cat" data-value="">全部</button>']
      .concat((meta.categories || []).map((c) =>
        '<button class="chip' + (cat === c.id ? ' on' : '') + '" data-filter="cat" data-value="' + esc(c.id) + '">' +
        c.icon + ' ' + esc(c.name) + '</button>')).join('');

    return '' +
      '<div class="page-head"><h1>排行榜</h1><p>点击表头切换排序维度，共 ' + fmtNum(res.total) + ' 款产品</p></div>' +
      '<div class="filter-bar">' + catChips + '</div>' +
      '<table class="rank-table"><thead><tr>' +
        '<th style="width:56px">#</th>' +
        th('产品', 'name') +
        th('年份', 'year') +
        th('编辑评分', 'score') +
        th('用户评分', 'userScore') +
        th('上市价格', 'price') +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      pagination(res.page, Math.max(1, Math.ceil(res.total / res.pageSize)));
  }

  /* ================= 页面：时间线 ================= */

  async function renderTimeline() {
    const data = await Q.timeline();
    const years = data.years || [];
    if (!years.length) return '<div class="empty"><span class="big">⏳</span>暂无时间线数据</div>';
    return '' +
      '<div class="page-head"><h1>产品时间线</h1><p>从 ' + years[years.length - 1].year + ' 年到 ' + years[0].year +
      ' 年，' + fmtNum(years.reduce((n, y) => n + (y.count || 0), 0)) + ' 款产品的诞生轨迹</p></div>' +
      '<div class="timeline">' + years.map((g) =>
        '<div class="tl-year"><h3>' + esc(g.year) + '</h3><div class="tl-items">' +
        (g.items || []).map((p) =>
          '<a class="tl-item" href="#/product/' + esc(p.id) + '">' +
            '<span class="tl-emoji">' + catIconOf(p) + '</span>' +
            '<span><b>' + esc(p.name) + '</b><span>' + esc(p.brand) + ' · ' + esc(p.categoryName || '') + '</span></span>' +
          '</a>').join('') +
        '</div></div>').join('') + '</div>';
  }

  /* ================= 页面：收藏 ================= */

  async function renderFavorites() {
    const list = await Q.byIds(state.favorites);
    return '' +
      '<div class="page-head"><h1>我的收藏</h1><p>收藏保存在本机浏览器，共 ' + list.length + ' 款</p></div>' +
      (list.length ? productGrid(list) :
        '<div class="empty"><span class="big">🤍</span>还没有收藏任何产品。<br />在产品卡片上点击 ♥ 按钮添加收藏。</div>');
  }

  /* ================= 页面：品类大全 ================= */

  async function renderCategories() {
    const data = await Q.categories();
    const st = data.stats || {};
    const groups = data.groups || [];
    const leafCounts = data.leafCounts || {};
    return '' +
      '<div class="page-head"><h1>品类大全</h1><p>' +
      (st.groups ? (st.groups + ' 个大类 · ' + st.bases + ' 个品类 · ' + fmtNum(st.leaves) + ' 个细分品类，每一款型号都有独立档案') : '全品类导航') +
      '</p></div>' +
      groups.map((g) =>
        '<section class="cat-group">' +
          '<h2 class="cat-group-title"><span class="cat-group-icon">' + g.icon + '</span>' + esc(g.name) + '</h2>' +
          '<div class="cat-base-grid">' +
            g.bases.map((b) => {
              const leaves = (b.leaves || []).filter((l) => l.count > 0);
              const shown = leaves.slice(0, 12);
              const brands = (b.brands || []).slice(0, 10);
              return '<div class="cat-base-card">' +
                '<a class="cat-base-head" href="#/products?cat=' + esc(b.id) + '">' +
                  '<span class="cat-base-icon">' + b.icon + '</span>' +
                  '<b>' + esc(b.name) + '</b>' +
                  '<span class="cat-base-count">' + fmtNum(b.count) + ' 款</span>' +
                '</a>' +
                (brands.length
                  ? '<div class="cat-brand-row">' +
                      '<span class="cat-brand-label">按品牌</span>' +
                      brands.map((br) =>
                        '<a class="cat-leaf-chip" href="#/products?cat=' + esc(b.id) + '&brand=' + encodeURIComponent(br.name) + '">' +
                          esc(br.name) + '<i>' + fmtNum(br.count) + '</i></a>').join('') +
                      ((b.brands || []).length > brands.length
                        ? '<a class="cat-leaf-chip cat-leaf-more" href="#/products?cat=' + esc(b.id) + '">其余 ' + ((b.brands || []).length - brands.length) + ' 个品牌 ›</a>'
                        : '') +
                    '</div>'
                  : '') +
                '<div class="cat-leaf-list">' +
                  shown.map((l) =>
                    '<a class="cat-leaf-chip' + (l.id === b.id ? ' cat-leaf-root' : '') + '" href="#/products?leaf=' + esc(l.id) + '">' +
                      esc(l.name) + '<i>' + fmtNum(l.count) + '</i></a>').join('') +
                  (leaves.length > shown.length
                    ? '<a class="cat-leaf-chip cat-leaf-more" href="#/products?cat=' + esc(b.id) + '">其余 ' + (leaves.length - shown.length) + ' 个细分 ›</a>'
                    : '') +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</section>').join('');
  }

  /* ================= 页面：品牌 ================= */

  async function renderBrands() {
    const data = await Q.brands();
    const items = data.items || [];
    return '' +
      '<div class="page-head"><h1>品牌专区</h1><p>' +
      fmtNum(data.total || items.length) + ' 个品牌，按收录型号数排序，覆盖 ' +
      fmtNum(DATA.meta.total) + ' 款产品。点击进入品牌专属档案。</p></div>' +
      '<div class="brand-grid">' +
        items.map((b) =>
          '<a class="brand-card reveal" href="#/brand/' + encodeURIComponent(b.name) + '">' +
            '<div class="brand-card-head">' +
              '<span class="brand-logo">' + esc((b.name || '?').slice(0, 2).toUpperCase()) + '</span>' +
              '<div class="brand-card-meta">' +
                '<b>' + esc(b.name) + '</b>' +
                '<span class="muted">' + (b.yearMin ? b.yearMin + '–' + b.yearMax : '年代不详') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="brand-card-stats">' +
              '<div><b>' + fmtNum(b.count) + '</b><span>型号</span></div>' +
              '<div><b>' + fmtNum(b.catCount) + '</b><span>品类</span></div>' +
              '<div><b>' + esc(b.score || '—') + '</b><span>均分</span></div>' +
            '</div>' +
            '<div class="brand-card-cats">' +
              (b.topCats || []).map((cid) => {
                const c = (DATA.cats.find((z) => z.id === cid) || { name: cid, icon: '📦' });
                return '<span class="badge">' + c.icon + ' ' + esc(c.name) + '</span>';
              }).join('') +
            '</div>' +
          '</a>').join('') +
      '</div>';
  }

  async function renderBrand(name, query) {
    const sort = query.sort || 'score';
    const page = parseInt(query.page || '1', 10) || 1;
    const data = await Q.brand(name, { sort, page, pageSize: PAGE_SIZE });
    if (data.error) return '<div class="empty"><span class="big">🔍</span>未找到该品牌。</div>';
    const pages = Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || PAGE_SIZE)));
    return '' +
      '<div class="page-head">' +
        '<h1>' + esc(data.brand) + '</h1>' +
        '<p>' + fmtNum(data.total) + ' 款型号' +
          (data.yearMin ? ' · ' + data.yearMin + '–' + data.yearMax : '') +
          ' · 均分 ' + esc(data.score || '—') + '</p>' +
      '</div>' +
      (data.cats && data.cats.length
        ? '<div class="brand-cat-row">' +
            '<span class="cat-brand-label">按品类</span>' +
            data.cats.map((c) =>
              '<a class="cat-leaf-chip" href="#/products?cat=' + esc(c.id) + '&brand=' + encodeURIComponent(data.brand) + '">' +
                c.icon + ' ' + esc(c.name) + '<i>' + fmtNum(c.count) + '</i></a>').join('') +
          '</div>'
        : '') +
      '<div class="toolbar">' +
        '<div class="sort-tabs">' +
          [['score', '评分'], ['user', '口碑'], ['new', '最新'], ['priceDesc', '价格↓']].map(([k, label]) =>
            '<button class="btn btn-sm ' + (sort === k ? 'btn-primary' : 'btn-ghost') + '" data-action="sort" data-sort="' + k + '">' + label + '</button>').join('') +
        '</div>' +
        '<span class="result-count">共 ' + fmtNum(data.total) + ' 个结果</span>' +
      '</div>' +
      productGrid(data.items || []) +
      pagination(page, pages);
  }

  /* ================= 页面：关于 ================= */

  async function renderAbout() {
    const meta = await Q.meta();
    return '' +
      '<div class="page-head"><h1>关于「日理万机」</h1><p>数码产品百科全书 · 数据驱动 · 持续扩展</p></div>' +
      '<div class="about-grid">' +
        '<div class="card"><h3>📖 这是什么</h3>' +
          '<p>「日理万机」收录手机、平板、耳机、相机、笔记本、智能手表、游戏机、音箱等品类的数码产品，' +
          '提供详细参数、客观评测、主观点评、编辑评分、用户口碑与横向对比。当前收录 <b>' + fmtNum(meta.total) +
          '</b> 款产品、<b>' + (meta.categories || []).length + '</b> 个品类、<b>' + (meta.brands || []).length + '</b> 个品牌。</p></div>' +

        '<div class="card"><h3>🧱 如何扩展新品类 / 新产品</h3>' +
          '<ol class="steps">' +
            '<li>在 <code>data/</code> 目录新建或追加数据文件（结构见 README）</li>' +
            '<li>用 <code>tools/import.js</code> 把 CSV / JSONL 批量转成分片数据</li>' +
            '<li>运行 <code>tools/build-manifest.js</code> 与 <code>tools/validate.js</code> 校验</li>' +
            '<li>大批量数据走 <code>data/bulk/bulk-index.jsonl</code> + 分片详情，由在线服务器提供检索</li>' +
          '</ol></div>' +

        '<div class="card"><h3>🔍 搜索说明</h3>' +
          '<p>搜索覆盖产品名称、品牌、标签、参数表等字段，支持多关键词（空格分隔）与中英文混搜。' +
          '关键词先按名称、品牌、标签加权排序，全部未命中时自动降级为模糊匹配，尽量保证"搜得到"。' +
          '标注「演示」的条目为架构压测用的合成数据，真实产品数据持续导入中。</p></div>' +

        '<div class="card"><h3>🖼️ 图片与测评索引</h3>' +
          '<p>真实产品配有实拍/官方图片，并罗列公开网络上的权威机构评测、媒体评测、视频博主测评与社区口碑' +
          '（标题 + 原文链接）。图片与测评链接均来自公开资料整理，若遇链接失效，产品页底部提供' +
          '全网搜索直达入口。合成演示产品使用程序生成的海报图与搜索直达链接，并明确标注。</p></div>' +

        '<div class="card"><h3>⚖️ 数据与版权</h3>' +
          '<p>产品参数为公开事实信息，评测与观点文字均为原创撰写。用户评价保存在你自己的浏览器' +
          '（localStorage），不会上传。数据仅供参考，购买请以厂商官方信息为准。</p></div>' +
      '</div>';
  }

  /* ================= 对比浮条 ================= */

  function renderCompareTray() {
    const tray = $('#compare-tray');
    const items = $('#compare-tray-items');
    if (!tray || !items) return;
    const ids = state.compare.filter(Boolean);
    tray.hidden = !ids.length;
    if (DATA.online) {
      Q.byIds(ids).then((list) => {
        items.innerHTML = list.map((p) =>
          '<span class="compare-chip">' + catIconOf(p) + ' ' + esc(p.name) +
          '<button data-action="cmp" data-id="' + esc(p.id) + '" title="移出对比">✕</button></span>').join('');
      });
    } else {
      items.innerHTML = ids.map((id) => DATA.byId[id]).filter(Boolean).map((p) =>
        '<span class="compare-chip">' + catIconOf(p) + ' ' + esc(p.name) +
        '<button data-action="cmp" data-id="' + esc(p.id) + '" title="移出对比">✕</button></span>').join('');
    }
  }

  /* ================= 渲染调度 ================= */

  function setActiveNav(name) {
    $$('#main-nav a').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('data-nav') === name);
    });
  }

  async function renderRoute() {
    const r = currentRoute();
    const app = $('#app');
    const head = r.parts[0] || '';

    /* 路由切换：滚动复位 + 轻量加载骨架，避免白屏闪烁 */
    if (window.scrollTo) window.scrollTo(0, 0);
    app.classList.remove('page-enter');
    app.innerHTML = '<div class="loading" style="min-height:320px">正在加载</div>';

    /* 文档标题随路由更新（收藏夹/分享/SEO 友好） */
    const TITLES = {
      '': '日理万机 —— 数码产品百科全书',
      products: '全部产品', search: '搜索结果', compare: '产品对比', ranking: '排行榜',
      timeline: '产品时间线', favorites: '我的收藏', categories: '品类大全',
      brands: '品牌专区', about: '关于本站'
    };
    document.title = (head === 'product' ? (safeDecode(r.parts[1]) + ' —— 日理万机')
      : head === 'brand' ? (safeDecode(r.parts[1]) + ' 品牌馆 —— 日理万机')
        : (TITLES[head] || '页面不存在') + (TITLES[head] ? ' —— 日理万机' : ''));

    try {
      if (head === '') { app.innerHTML = await renderHome(); setActiveNav('home'); }
      else if (head === 'products' || head === 'search') { app.innerHTML = await renderProducts(r.query); setActiveNav('products'); }
      else if (head === 'product') { app.innerHTML = await renderProduct(safeDecode(r.parts[1])); setActiveNav('products'); }
      else if (head === 'compare') { app.innerHTML = await renderCompare(); setActiveNav('compare'); }
      else if (head === 'ranking') { app.innerHTML = await renderRanking(r.query); setActiveNav('ranking'); }
      else if (head === 'timeline') { app.innerHTML = await renderTimeline(); setActiveNav('timeline'); }
      else if (head === 'favorites') { app.innerHTML = await renderFavorites(); setActiveNav('favorites'); }
      else if (head === 'categories') { app.innerHTML = await renderCategories(); setActiveNav('categories'); }
      else if (head === 'brands') { app.innerHTML = await renderBrands(); setActiveNav('brands'); }
      else if (head === 'brand') { app.innerHTML = await renderBrand(safeDecode(r.parts[1]), r.query); setActiveNav('brands'); }
      else if (head === 'about') { app.innerHTML = await renderAbout(); setActiveNav('about'); }
      else {
        app.innerHTML = '<div class="empty"><span class="big">🧭</span>页面不存在。<br />' +
          '<a class="btn btn-primary" href="#/" style="margin-top:14px">回到首页</a></div>';
        setActiveNav('');
      }
    } catch (e) {
      app.innerHTML = '<div class="empty"><span class="big">⚠️</span>页面加载失败：' + esc(e.message) + '</div>';
    }

    /* 入场动画（降级：无 rAF 环境直接加类） */
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => app.classList.add('page-enter'));
    } else app.classList.add('page-enter');
    refreshFavButtons();
    refreshCmpButtons();
    renderCompareTray();
    revealOnScroll();
  }

  /* 滚动渐显（首屏外的卡片进入视口时淡入） */
  let revealObserver = null;
  function revealOnScroll() {
    if (!('IntersectionObserver' in window)) return;
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('revealed');
          revealObserver.unobserve(en.target);
        }
      });
    }, { rootMargin: '60px 0px' });
    $$('#app .card, #app .tl-item, #app .review-card').forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(i % 8, 7) * 40 + 'ms';
      revealObserver.observe(el);
    });
  }

  /* ================= 事件 ================= */

  /* 图片加载失败 → 回退到本地海报（绝不出现破图） */
  window.__imgFail = function (img) {
    const p = IMG_REGISTRY[img.getAttribute('data-pid')];
    if (!p) return;
    img.onerror = null; /* 防止海报也失败时死循环 */
    const poster = posterOf(p);
    img.src = poster;
    /* 同步 data-src：图集缩略图回退后，点击切换不再带出失效 URL */
    if (img.hasAttribute('data-src')) img.setAttribute('data-src', poster);
  };

  function bindGlobalEvents() {
    // 主题切换
    const themeBtn = $('#theme-toggle');
    themeBtn.textContent = state.theme === 'dark' ? '🌙' : '☀️';
    themeBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      store.set('theme', state.theme);
      document.documentElement.setAttribute('data-theme', state.theme);
      themeBtn.textContent = state.theme === 'dark' ? '🌙' : '☀️';
    });

    // 移动端菜单
    $('#menu-toggle').addEventListener('click', () => {
      $('#main-nav').classList.toggle('open');
    });
    $('#main-nav').addEventListener('click', (e) => {
      if (e.target.tagName === 'A') $('#main-nav').classList.remove('open');
    });

    // 全局搜索框 + 建议（防抖 + 键盘导航）
    const input = $('#global-search');
    const box = $('#search-suggest');
    let suggestTimer = null;
    let sugIndex = -1;
    let sugSeq = 0; /* 竞态防护：旧请求的响应序号过期则丢弃 */

    function renderSuggest(items, q) {
      box.innerHTML = items.map((p) =>
        '<div class="suggest-item" data-goto="#/product/' + esc(p.id) + '">' +
          '<span>' + catIconOf(p) + '</span>' +
          '<span class="s-name"><b>' + esc(p.name) + '</b> · ' + esc(p.brand) + '</span>' +
          '<span class="s-cat">' + esc(p.categoryName || '') + '</span>' +
        '</div>').join('') +
        '<div class="suggest-item" data-goto="#/products?q=' + encodeURIComponent(q) + '">' +
          '<span>🔎</span><span class="s-name">查看 “' + esc(q) + '” 的全部结果</span></div>';
      box.hidden = false;
      sugIndex = -1;
    }

    function moveSuggest(delta) {
      const items = box.querySelectorAll('.suggest-item');
      if (!items.length || box.hidden) return;
      sugIndex = (sugIndex + delta + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('active', i === sugIndex));
      items[sugIndex].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', () => {
      clearTimeout(suggestTimer);
      const q = input.value.trim();
      if (!q) { box.hidden = true; sugSeq++; return; }
      const seq = ++sugSeq;
      suggestTimer = setTimeout(async () => {
        const hits = await Q.suggest(q);
        if (seq !== sugSeq) return; /* 有更新的输入已发出，丢弃过期响应 */
        if (!hits.length) { box.hidden = true; return; }
        renderSuggest(hits, q);
      }, 120);
    });
    input.addEventListener('blur', () => { setTimeout(() => { box.hidden = true; }, 180); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSuggest(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSuggest(-1); }
      else if (e.key === 'Escape') { box.hidden = true; }
      else if (e.key === 'Enter') {
        const items = box.querySelectorAll('.suggest-item');
        if (sugIndex >= 0 && items[sugIndex]) {
          e.preventDefault();
          box.hidden = true;
          input.blur();
          location.hash = items[sugIndex].getAttribute('data-goto');
        } else if (input.value.trim()) {
          box.hidden = true;
          pushRecent(input.value.trim());
          location.hash = '#/products?q=' + encodeURIComponent(input.value.trim());
        }
      }
    });

    // 对比浮条清空
    $('#compare-clear').addEventListener('click', () => {
      state.compare = [];
      saveState(); refreshCmpButtons(); renderCompareTray(); renderRoute();
    });

    // 全局委托点击
    document.addEventListener('click', (e) => {
      const goto = e.target.closest('[data-goto]');
      if (goto) {
        const gh = goto.getAttribute('data-goto');
        if (gh.indexOf('#/products?q=') === 0) pushRecent(safeDecode(gh.slice('#/products?q='.length)));
        location.hash = gh;
        return;
      }

      const act = e.target.closest('[data-action]');
      if (act) {
        const action = act.getAttribute('data-action');
        const id = act.getAttribute('data-id');

        if (action === 'fav') {
          toggleFav(id);
          if (currentRoute().parts[0] === 'product') renderRoute();
          return;
        }
        if (action === 'cmp') {
          toggleCompare(id);
          const head = currentRoute().parts[0];
          if (head === 'product' || head === 'compare') renderRoute();
          return;
        }
        if (action === 'cmp-clear-all') {
          state.compare = [];
          saveState(); refreshCmpButtons(); renderCompareTray(); renderRoute();
          return;
        }
        if (action === 'page') {
          location.hash = hrefWith({ page: act.getAttribute('data-page') });
          return;
        }
        if (action === 'rank-sort') {
          const key = act.getAttribute('data-key');
          const cur = currentRoute();
          const same = (cur.query.get('sort') || 'score') === key;
          const dir = same && parseInt(cur.query.get('dir') || '-1', 10) === -1 ? 1 : -1;
          location.hash = hrefWith({ sort: key, dir: String(dir), page: '' });
          return;
        }
        if (action === 'sort') {
          const key = act.getAttribute('data-sort');
          location.hash = hrefWith({ sort: key, page: '' });
          return;
        }
        if (action === 'hero-search') {
          const v = ($('#hero-search') || {}).value || '';
          if (v.trim()) { pushRecent(v.trim()); location.hash = '#/products?q=' + encodeURIComponent(v.trim()); }
          return;
        }
        if (action === 'gallery-thumb') {
          const src = act.getAttribute('data-src');
          const main = document.getElementById('gallery-main-img');
          if (main && src) {
            main.src = src;
            (act.parentNode || document).querySelectorAll('.gallery-thumb').forEach((t) => t.classList.remove('active'));
            act.classList.add('active');
          }
          return;
        }
        if (action === 'clear-recent') {
          try { localStorage.removeItem('riwanji.recent'); } catch (e) { /* 忽略 */ }
          renderRoute();
          return;
        }
        if (action === 'copy-link') {
          const url = location.origin + location.pathname + '#/product/' + id;
          const done = () => toast('已复制产品链接');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
          } else fallbackCopy(url, done);
          return;
        }
      }

      // 筛选 chip
      const chip = e.target.closest('[data-filter]');
      if (chip && chip.tagName === 'BUTTON') {
        const key = chip.getAttribute('data-filter');
        const val = chip.getAttribute('data-value');
        const patch = { page: '' };
        patch[key] = val;
        if (key === 'cat') patch.leaf = ''; // 换品类时清掉细分筛选
        location.hash = hrefWith(patch);
        return;
      }

      // 整卡可点击
      const link = e.target.closest('[data-link]');
      if (link) location.hash = link.getAttribute('data-link');
    });

    // 键盘可达性
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const link = e.target.closest && e.target.closest('[data-link]');
        if (link) location.hash = link.getAttribute('data-link');
        if (e.target.id === 'hero-search') {
          const v = e.target.value.trim();
          if (v) location.hash = '#/products?q=' + encodeURIComponent(v);
        }
      }
      // 全局快捷键：/ 聚焦搜索框（不在输入框内时）；Esc 从搜索框移开焦点
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if (e.key === '/' && !typing) {
        const gs = document.getElementById('global-search');
        if (gs) { e.preventDefault(); gs.focus(); gs.select(); }
      }
    });

    // 下拉筛选
    document.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-filter]');
      if (sel && sel.tagName === 'SELECT') {
        const key = sel.getAttribute('data-filter');
        const patch = { page: '' };
        patch[key] = sel.value;
        location.hash = hrefWith(patch);
      }
    });

    // 对比页搜索框（输入即建议，点选加入）+ 参数速查过滤
    let cmpTimer = null;
    document.addEventListener('input', (e) => {
      if (e.target.id === 'spec-filter') {
        const t = e.target.value.trim().toLowerCase();
        $$('#spec-body tr').forEach((tr) => {
          tr.style.display = (!t || tr.textContent.toLowerCase().indexOf(t) !== -1) ? '' : 'none';
        });
        return;
      }
      if (e.target.id !== 'cmp-search') return;
      clearTimeout(cmpTimer);
      const q = e.target.value.trim();
      const box = $('#cmp-suggest');
      if (!box) return;
      if (!q) { box.innerHTML = ''; return; }
      cmpTimer = setTimeout(async () => {
        const hits = await Q.suggest(q);
        box.innerHTML = hits.length
          ? '<div class="suggest" style="position:static;max-width:560px;margin-bottom:14px">' + hits.map((p) =>
              '<div class="suggest-item" data-action="cmp" data-id="' + esc(p.id) + '">' +
                '<span>' + catIconOf(p) + '</span>' +
                '<span class="s-name"><b>' + esc(p.name) + '</b> · ' + esc(p.brand) + '</span>' +
                '<span class="s-cat">＋ 加入对比</span>' +
              '</div>').join('') + '</div>'
          : '';
      }, 140);
    });

    // 用户评价表单
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('#review-form');
      if (!form) return;
      e.preventDefault();
      const id = form.getAttribute('data-id');
      const name = (form.querySelector('[name="name"]').value || '').trim() || '匿名用户';
      const score = form.querySelector('[name="score"]').value;
      const text = (form.querySelector('[name="text"]').value || '').trim();
      if (!text) return;
      (state.reviews[id] = state.reviews[id] || []).push({
        name, score, text,
        date: new Date().toISOString().slice(0, 10)
      });
      saveState();
      renderRoute();
    });

    window.addEventListener('hashchange', renderRoute);
  }

  /* ================= 启动 ================= */

  async function boot() {
    // 1) 先探测在线 API
    try {
      const meta = await api.get('/api/meta');
      if (meta && typeof meta.total === 'number') {
        DATA.online = true;
        DATA.meta = meta;
      }
    } catch (e) { /* 无服务端 → 静态降级 */ }

    // 2) 静态降级：加载精选分片
    if (!DATA.online) await loadStatic();

    // 3) 进入应用
    bindGlobalEvents();
    renderRoute();
  }

  boot();
})();
