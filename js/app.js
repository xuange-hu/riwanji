/* ============================================================
   日理万机 · 数码产品百科 — 应用核心 v2
   双模架构：
     · 在线模式 —— 数据走 /api/* 检索接口，支撑 30 万+ 产品
     · 静态降级 —— 直接双击 index.html 时加载 data/*.js 精选分片
   功能：全站搜索 / 筛选排序 / 详情 / 对比 / 排行榜 / 时间线 /
        收藏 / 用户评价 / 深浅主题 / 响应式
   ============================================================ */

/* 模块化拆分（问题 40）：经典脚本按依赖序加载（file:// 双击兼容，不用 ES module）
     util → data → state → router → components → pages → app（本文件）
   ============================================================ */
'use strict';

/* ================= 渲染调度 ================= */

function setActiveNav(name) {
  $$('#main-nav a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-nav') === name);
  });
}

async function renderRoute(keepScroll) {
  const r = currentRoute();
  const app = $('#app');
  const head = r.parts[0] || '';
  /* keepScroll：局部刷新（收藏/对比态变更）保留滚动位置，不把用户甩回页首（问题 9） */
  const savedY = keepScroll ? (window.scrollY || window.pageYOffset || 0) : 0;

  /* 路由切换：滚动复位 + 轻量加载骨架，避免白屏闪烁 */
  if (!keepScroll && window.scrollTo) window.scrollTo(0, 0);
  app.classList.remove('page-enter');
  app.innerHTML = '<div class="loading" style="min-height:320px">正在加载</div>';

  /* 文档标题随路由更新（收藏夹/分享/SEO 友好） */
  const TITLES = {
    '': '数码产品百科全书',
    products: '全部产品', search: '搜索结果', compare: '产品对比', ranking: '排行榜',
    timeline: '产品时间线', favorites: '我的收藏', categories: '品类大全',
    brands: '品牌专区', about: '关于本站'
  };
  document.title = (head === 'product' ? (safeDecode(r.parts[1]) + ' —— 日理万机')
    : head === 'brand' ? (safeDecode(r.parts[1]) + ' 品牌馆 —— 日理万机')
      : (TITLES[head] || '页面不存在') + (TITLES[head] ? ' —— 日理万机' : ''));

  /* 路由播报（问题 17）：aria-live 告知读屏用户页面已切换 */
  const live = document.getElementById('route-live');
  if (live) live.textContent = document.title;

  try {
    if (head === '') { app.innerHTML = await renderHome(); setActiveNav('home'); }
    else if (head === 'products' || head === 'search') { app.innerHTML = await renderProducts(r.query); setActiveNav('products'); }
    else if (head === 'product') { app.innerHTML = await renderProduct(safeDecode(r.parts[1])); setActiveNav('products'); }
    else if (head === 'compare') { app.innerHTML = await renderCompare(r.query); setActiveNav('compare'); }
    else if (head === 'ranking') { app.innerHTML = await renderRanking(r.query); setActiveNav('ranking'); }
    else if (head === 'timeline') { app.innerHTML = await renderTimeline(); setActiveNav('timeline'); }
    else if (head === 'favorites') { app.innerHTML = await renderFavorites(r.query); setActiveNav('favorites'); }
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
  if (keepScroll && window.scrollTo) window.scrollTo(0, savedY);
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

/* JSON 文件下载（问题 30：收藏/对比导出） */
function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 0);
}

/* 导出收藏/对比为 JSON（含完整参数，可再导入他处或留档） */
async function exportProducts(ids, kind) {
  const base = await Q.byIds(ids);
  const list = DATA.online ? base : await Promise.all(base.map((p) => ensureFull(p)));
  const payload = {
    app: 'riwanji', kind: kind, version: 1,
    exportedAt: new Date().toISOString(),
    count: list.length,
    items: list.map((p) => ({
      id: p.id, name: p.name, brand: p.brand,
      category: p.categoryName || p.category, year: p.year,
      priceText: p.priceText || '', score: p.score, userScore: p.userScore,
      scores: p.scores || [], specs: p.specs || [], pros: p.pros || [], cons: p.cons || []
    }))
  };
  downloadJSON(payload, 'riwanji-' + kind + '-' + new Date().toISOString().slice(0, 10) + '.json');
  toast(kind === 'favorites' ? '收藏已导出为 JSON 文件' : '对比数据已导出为 JSON 文件');
}

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
    store.set('themeAuto', false); /* 手动切换后不再跟随系统（问题 28） */
    document.documentElement.setAttribute('data-theme', state.theme);
    themeBtn.textContent = state.theme === 'dark' ? '🌙' : '☀️';
  });

  /* 系统主题跟随（问题 28）：用户未手动切换时响应系统深浅色变化 */
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const applySys = (light) => {
      if (!store.get('themeAuto', true)) return;
      state.theme = light ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      const tb = $('#theme-toggle');
      if (tb) tb.textContent = state.theme === 'dark' ? '🌙' : '☀️';
    };
    if (mq.addEventListener) mq.addEventListener('change', (e) => applySys(e.matches));
  }
  /* 多标签同步（问题 28）：其他标签页改收藏/对比/主题/笔记时本页跟随 */
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key.indexOf('rlwj:') !== 0) return;
    try {
      const v = e.newValue == null ? null : JSON.parse(e.newValue);
      const k = e.key.slice(5);
      if (k === 'theme' && v) {
        state.theme = v;
        document.documentElement.setAttribute('data-theme', v);
        const tb = $('#theme-toggle');
        if (tb) tb.textContent = v === 'dark' ? '🌙' : '☀️';
      } else if (k === 'favorites' && v) { state.favorites = v; refreshFavButtons(); }
      else if (k === 'compare' && v) { state.compare = v; refreshCmpButtons(); renderCompareTray(); }
      else if (k === 'reviews' && v) { state.reviews = v; }
      else return;
      renderRoute(true);
    } catch (err) { /* 忽略坏数据 */ }
  });

  // 移动端菜单
  $('#menu-toggle').addEventListener('click', () => {
    const nav = $('#main-nav');
    nav.classList.toggle('open');
    $('#menu-toggle').setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
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
    box.setAttribute('role', 'listbox');
    box.innerHTML = items.map((p) =>
      '<div class="suggest-item" role="option" data-goto="#/product/' + esc(p.id) + '">' +
        '<span>' + catIconOf(p) + '</span>' +
        '<span class="s-name"><b>' + esc(p.name) + '</b> · ' + esc(p.brand) +
        (isDemo(p) ? ' <span class="badge" style="font-size:9px;padding:0 5px">演示</span>' : '') + '</span>' +
        '<span class="s-cat">' + esc(p.categoryName || '') + '</span>' +
      '</div>').join('') +
      '<div class="suggest-item" role="option" data-goto="#/products?q=' + encodeURIComponent(q) + '">' +
        '<span>🔎</span><span class="s-name">查看 “' + esc(q) + '” 的全部结果</span></div>';
    box.hidden = false;
    if (input.setAttribute) input.setAttribute('aria-expanded', 'true');
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
  input.addEventListener('blur', () => { setTimeout(() => { box.hidden = true; if (input.setAttribute) input.setAttribute('aria-expanded', 'false'); }, 180); });
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
    const snap = state.compare.slice();
    state.compare = [];
    saveState(); refreshCmpButtons(); renderCompareTray(); renderRoute(true);
    toastUndo('已清空对比', () => {
      state.compare = snap;
      saveState(); refreshCmpButtons(); renderCompareTray(); renderRoute(true);
    });
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
        toggleFav(id); /* 按钮态由 refreshFavButtons 局部更新，不整页重渲染甩回页首（问题 9） */
        return;
      }
      if (action === 'cmp') {
        toggleCompare(id);
        /* 仅对比页内容真正变化时重绘，且保留滚动位置 */
        if (currentRoute().parts[0] === 'compare') renderRoute(true);
        return;
      }
      if (action === 'cmp-clear-all') {
        const snap = state.compare.slice();
        state.compare = [];
        saveState(); refreshCmpButtons(); renderCompareTray(); renderRoute(true);
        toastUndo('已清空对比', () => {
          state.compare = snap;
          saveState(); refreshCmpButtons(); renderCompareTray(); renderRoute(true);
        });
        return;
      }
      if (action === 'toggle-demo') {
        const next = !state.showDemo;
        const done = (ok) => {
          state.showDemo = next;
          store.set('showDemo', state.showDemo);
          renderRoute();
          toast(ok === false ? '演示数据加载失败，可刷新重试' : (state.showDemo ? '演示数据已显示' : '演示数据已隐藏'));
        };
        /* N3：开启演示时按需装载轻索引（默认隐藏 → 首屏从未为它付过加载成本） */
        if (next) ensureBulk().then(done, () => done(false)); else done();
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
      if (action === 'tl-more') {
        const y = act.getAttribute('data-year');
        if (state.tlOpen.has(y)) state.tlOpen.delete(y); else state.tlOpen.add(y);
        renderRoute(true);
        return;
      }
      if (action === 'cmp-diff') {
        state.cmpDiff = act.getAttribute('data-value') === '1';
        renderRoute(true);
        return;
      }
      if (action === 'cmp-share') {
        const ids = state.compare.filter(Boolean).map(encodeURIComponent).join(',');
        const url = location.origin + location.pathname + '#/compare?ids=' + ids;
        const done = () => toast('对比链接已复制，可直接发给朋友');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
        else fallbackCopy(url, done);
        return;
      }
      /* 问题 30：收藏/对比导出与收藏分享 */
      if (action === 'fav-export') {
        const ids = state.favorites.filter(Boolean);
        if (!ids.length) { toast('还没有可导出的收藏'); return; }
        exportProducts(ids, 'favorites');
        return;
      }
      if (action === 'fav-share') {
        const ids = state.favorites.filter(Boolean).map(encodeURIComponent).join(',');
        const url = location.origin + location.pathname + '#/favorites?ids=' + ids;
        const done = () => toast('收藏链接已复制，对方打开即可导入同款清单');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
        else fallbackCopy(url, done);
        return;
      }
      if (action === 'cmp-export') {
        const ids = state.compare.filter(Boolean);
        if (!ids.length) { toast('还没有可导出的对比产品'); return; }
        exportProducts(ids, 'compare');
        return;
      }
      if (action === 'review-del') {
        const rid = act.getAttribute('data-id');
        const idx = parseInt(act.getAttribute('data-idx'), 10);
        const arr = state.reviews[rid] || [];
        const snapshot = arr.slice();
        if (idx >= 0 && idx < arr.length) {
          arr.splice(idx, 1);
          saveState();
          renderRoute(true);
          toastUndo('已删除本机笔记', () => {
            state.reviews[rid] = snapshot;
            saveState();
            renderRoute(true);
          });
        }
        return;
      }
      if (action === 'fav-clear-all') {
        const snap = state.favorites.slice();
        state.favorites = [];
        saveState(); refreshFavButtons(); renderRoute(true);
        toastUndo('已清空收藏', () => {
          state.favorites = snap;
          saveState(); refreshFavButtons(); renderRoute(true);
        });
        return;
      }
      if (action === 'clear-recent') {
        /* 可撤销（问题 31）：快照保留 5 秒 */
        const snap = recentSearches();
        try { localStorage.removeItem('rlwj:recent'); localStorage.removeItem('riwanji.recent'); } catch (e) { /* 忽略 */ }
        renderRoute();
        toastUndo('已清空最近搜索', () => {
          try { localStorage.setItem('rlwj:recent', JSON.stringify(snap)); } catch (e) { /* 忽略 */ }
          renderRoute();
        });
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

  // 键盘可达性（N13：卡片键盘导航交给标题真实链接，这里不再劫持 Enter/Space，
  // 避免「Enter 在 ♥ 按钮上既收藏又跳详情」的嵌套交互冲突）
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'hero-search') {
      const v = e.target.value.trim();
      if (v) location.hash = '#/products?q=' + encodeURIComponent(v);
    }
    // 跳页输入框回车（问题 26）
    if (e.key === 'Enter' && e.target && e.target.id === 'page-goto') {
      const v = parseInt(e.target.value, 10);
      const max = parseInt(e.target.getAttribute('max'), 10);
      if (v >= 1 && v <= max) location.hash = hrefWith({ page: String(v) });
      return;
    }
    // 非按钮动作项（图集缩略图等）Enter、Space 触发（问题 17）
    if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') && e.target && e.target.closest) {
      const actEl = e.target.closest('[data-action]');
      if (actEl && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(actEl.tagName)) {
        e.preventDefault();
        actEl.click();
        return;
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
    if (!text) { toast('写点什么再发布吧'); return; }
    if (!score) { toast('请先给个评分'); return; }
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
  /* API 探测：静态托管包（build-dist 注入 RLWJ_API=false）直接跳过，避免每次启动一个必现 404 */
  if (window.RLWJ_API !== false) {
    try {
      const meta = await api.get('api/meta');
      if (meta && typeof meta.total === 'number') {
        DATA.online = true;
        DATA.meta = meta;
      }
    } catch (e) { /* 无服务端 → 静态降级 */ }
  }

  // 2) 静态降级：加载精选分片（演示轻索引按需装载，N3）
  if (!DATA.online) {
    await loadStatic();
    if (demoVisible()) await ensureBulk();
  }

  // 3) 进入应用
  bindGlobalEvents();
  renderRoute();
}

boot();
