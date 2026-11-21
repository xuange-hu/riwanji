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
    const on = a.getAttribute('data-nav') === name;
    a.classList.toggle('active', on);
    /* 问题 66：当前页 aria-current="page"，不只靠视觉高亮 */
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* 路由渲染序号（问题 5）：旧路由的异步渲染晚到时直接丢弃，不覆盖新页面 */
let ROUTE_TOKEN = 0;
let ROUTE_FIRST = true; /* 问题 38：首次渲染不抢焦点，之后的导航把焦点送进主内容 */

async function renderRoute(keepScroll) {
  const tk = ++ROUTE_TOKEN;
  const r = currentRoute();
  const app = $('#app');
  const head = r.parts[0] || '';
  /* keepScroll：局部刷新（收藏/对比态变更）保留滚动位置，不把用户甩回页首（问题 9） */
  const savedY = keepScroll ? (window.scrollY || window.pageYOffset || 0) : 0;

  /* 问题 P2-23：局部刷新会整块替换 app.innerHTML，销毁当前焦点元素。
     渲染前记录焦点元素签名，渲染后按签名恢复，避免焦点掉回 body。 */
  let focusSig = null;
  if (keepScroll && document.activeElement && document.activeElement !== document.body && document.activeElement !== app) {
    const ae = document.activeElement;
    if (ae.id) focusSig = { id: ae.id };
    else if (ae.getAttribute && ae.getAttribute('data-action')) {
      focusSig = { action: ae.getAttribute('data-action'), id: ae.getAttribute('data-id') };
    }
  }

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
  const shortTitle = head === 'product' ? safeDecode(r.parts[1])
    : head === 'brand' ? (safeDecode(r.parts[1]) + ' 品牌馆')
      : (TITLES[head] || '页面不存在');
  const newTitle = (head === 'product' ? (safeDecode(r.parts[1]) + ' —— 日理万机')
    : head === 'brand' ? (safeDecode(r.parts[1]) + ' 品牌馆 —— 日理万机')
      : (TITLES[head] || '页面不存在') + (TITLES[head] ? ' —— 日理万机' : ''));

  /* 问题 P3-2：先过竞态校验再写标题，防止旧异步请求晚到把标题改回旧路由；
     问题 P3-41：路由播报用短标题，避免与 document.title 完全重复造成冗余播报。 */
  if (tk !== ROUTE_TOKEN) return;
  document.title = newTitle;
  const live = document.getElementById('route-live');
  if (live) live.textContent = shortTitle;

  try {
    let html = '';
    let navKey = '';
    if (head === '') { html = await renderHome(); navKey = 'home'; }
    else if (head === 'products' || head === 'search') { html = await renderProducts(r.query); navKey = 'products'; }
    else if (head === 'product') { html = await renderProduct(safeDecode(r.parts[1])); navKey = 'products'; }
    else if (head === 'compare') { html = await renderCompare(r.query); navKey = 'compare'; }
    else if (head === 'ranking') { html = await renderRanking(r.query); navKey = 'ranking'; }
    else if (head === 'timeline') { html = await renderTimeline(); navKey = 'timeline'; }
    else if (head === 'favorites') { html = await renderFavorites(r.query); navKey = 'favorites'; }
    else if (head === 'categories') { html = await renderCategories(); navKey = 'categories'; }
    else if (head === 'brands') { html = await renderBrands(r.query); navKey = 'brands'; }
    else if (head === 'brand') { html = await renderBrand(safeDecode(r.parts[1]), r.query); navKey = 'brands'; }
    else if (head === 'about') { html = await renderAbout(); navKey = 'about'; }
    else {
      /* P3-32：装饰 emoji 隔离读屏；P2-25：空态补语义化 h1 */
      html = '<div class="empty"><span class="big" aria-hidden="true">🧭</span><h1>页面不存在</h1>' +
        '<a class="btn btn-primary" href="#/" style="margin-top:14px">回到首页</a></div>';
      navKey = '';
    }
    if (tk !== ROUTE_TOKEN) return; /* 竞态丢弃（问题 5） */
    app.innerHTML = html;
    setActiveNav(navKey);
  } catch (e) {
    if (tk !== ROUTE_TOKEN) return;
    /* P3-32 emoji 隔离；P2-25 空态补 h1 */
    app.innerHTML = '<div class="empty"><span class="big" aria-hidden="true">⚠️</span><h1>页面加载失败</h1>' + esc(e.message) + '</div>';
  }
  if (tk !== ROUTE_TOKEN) return;

  /* 入场动画（降级：无 rAF 环境直接加类） */
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => app.classList.add('page-enter'));
  } else app.classList.add('page-enter');
  if (keepScroll && window.scrollTo) window.scrollTo(0, savedY);
  /* 问题 38：SPA 焦点管理——真实导航后把焦点移入主内容（不触发滚动），
     键盘/读屏用户不必每次重穿页头；局部刷新（keepScroll）不抢焦点 */
  if (!keepScroll && !ROUTE_FIRST && app.focus) {
    try { app.focus({ preventScroll: true }); } catch (e) { app.focus(); }
  }
  /* P2-23：局部刷新后按签名恢复焦点（收藏/对比/笔记删除/发布等按钮），
     焦点元素被 innerHTML 销毁时兜底回到 #app，不再掉到 body 丢失键盘位置 */
  if (keepScroll && focusSig) {
    let target = null;
    if (focusSig.id) target = document.getElementById(focusSig.id);
    if (!target && focusSig.action) {
      target = $$('[data-action="' + focusSig.action + '"]').filter((el) =>
        el.getAttribute('data-id') === focusSig.id)[0] || null;
    }
    if (target && target.focus) {
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    } else if (app.focus) {
      try { app.focus({ preventScroll: true }); } catch (e) { app.focus(); }
    }
  }
  ROUTE_FIRST = false;
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
  /* P1-2：品牌专区卡片（.brand-card）模板自带 reveal 但旧选择器未包含，
     导致 revealed 永不添加、24 张卡片永久透明。这里纳入观察范围。 */
  $$('#app .card, #app .tl-item, #app .review-card, #app .brand-card').forEach((el, i) => {
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
  downloadJSON(payload, 'riwanji-' + kind + '-' + localDate() + '.json');
  toast(kind === 'favorites' ? '收藏已导出为 JSON 文件' : '对比数据已导出为 JSON 文件');
}

/* 图片加载失败 → 回退到本地海报（绝不出现破图）。
   问题 79：不再依赖内联 onerror，由 document 级 error 委托调用（严格 CSP 友好） */
window.__imgFail = function (img) {
  const p = IMG_REGISTRY[img.getAttribute('data-pid')];
  if (!p) return;
  /* P2-3：若当前 src 已是海报仍失败，直接停止，避免 data: URI 反复触发死循环。
     不再永久摘除 data-pid（旧实现摘标后图集切换主图二次失败就无兜底）。 */
  if (img.getAttribute('data-fallback') === '1') return;
  if (window.__rlwjDiag) window.__rlwjDiag.imgFail++;
  img.setAttribute('data-fallback', '1');
  const poster = posterOf(p);
  img.src = poster;
  /* 同步 data-src：图集缩略图回退后，点击切换不再带出失效 URL */
  if (img.hasAttribute('data-src')) img.setAttribute('data-src', poster);
};

function bindGlobalEvents() {
  /* 问题 79：图片失败统一委托（捕获阶段 error 事件不冒泡，必须用捕获），
     取代模板内联 onerror，为严格 CSP 让路 */
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.getAttribute && t.getAttribute('data-pid')) window.__imgFail(t);
  }, true);

  /* 启动写回（问题 21）：应用计算的主题必须落回 DOM，否则预载值与实际状态脱节 */
  document.documentElement.setAttribute('data-theme', state.theme);
  // 主题切换（问题 68）：三态循环 跟随系统 → 浅色 → 深色 → 跟随系统
  const themeBtn = $('#theme-toggle');
  const themeTitle = () => store.get('themeAuto', true) ? '主题：跟随系统（点击切换）'
    : (state.theme === 'dark' ? '主题：深色（点击切换）' : '主题：浅色（点击切换）');
  const syncThemeBtn = () => {
    const icon = store.get('themeAuto', true) ? '◐' : (state.theme === 'dark' ? '🌙' : '☀️');
    themeBtn.innerHTML = '<span aria-hidden="true">' + icon + '</span>'; /* 问题 78：装饰 emoji 不进读屏 */
    themeBtn.setAttribute('title', themeTitle());
    themeBtn.setAttribute('aria-label', themeTitle());
  };
  syncThemeBtn();
  themeBtn.addEventListener('click', () => {
    const auto = store.get('themeAuto', true);
    if (auto) {
      /* 自动 → 固定为当前主题的反色 */
      store.set('themeAuto', false);
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    } else if (state.theme === 'light') {
      state.theme = 'dark';
    } else {
      /* 手动深色 → 回到跟随系统 */
      store.set('themeAuto', true);
      state.theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    store.set('theme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
    syncThemeBtn();
  });

  /* 系统主题跟随（问题 28）：用户未手动切换时响应系统深浅色变化 */
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const applySys = (light) => {
      if (!store.get('themeAuto', true)) return;
      state.theme = light ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      syncThemeBtn();
    };
    if (mq.addEventListener) mq.addEventListener('change', (e) => applySys(e.matches));
  }
  /* 问题 P3-2：document.title 更新 + aria-live 双重播报已改为短标题（见 renderRoute） */

  /* 多标签同步（问题 28）：其他标签页改收藏/对比/主题/笔记时本页跟随。
     P2-2：主题类变化只更新外观不重绘 DOM（旧实现无条件 renderRoute 打断输入、
     销毁未提交笔记）；P3-6：补同步 showDemo/recent。 */
  const dirtyForm = () => {
    const f = $('#review-form');
    if (!f) return false;
    return !!(f.querySelector('[name="name"]').value.trim() ||
      f.querySelector('[name="text"]').value.trim() || f.querySelector('[name="score"]').value);
  };
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key.indexOf('rlwj:') !== 0) return;
    try {
      const v = e.newValue == null ? null : JSON.parse(e.newValue);
      const k = e.key.slice(5);
      /* 主题类：只同步外观，绝不重绘（避免打断输入 / 丢失未提交笔记） */
      if (k === 'theme') {
        if (typeof v === 'string' && (v === 'light' || v === 'dark')) {
          state.theme = v;
          document.documentElement.setAttribute('data-theme', v);
        }
        syncThemeBtn();
        return;
      }
      if (k === 'themeAuto') { syncThemeBtn(); return; }
      if (k === 'recent') return; /* 最近搜索只在首页展示，交给下次导航读取，不打断当前输入 */

      if (k === 'showDemo' && typeof v === 'boolean') {
        state.showDemo = v;
        if (v) ensureBulk().then(() => renderRoute(true), () => renderRoute(true));
        else renderRoute(true);
        return;
      }
      if (k === 'favorites' && v) { state.favorites = v; refreshFavButtons(); }
      else if (k === 'compare' && v) { state.compare = v; refreshCmpButtons(); renderCompareTray(); }
      else if (k === 'reviews' && v) { state.reviews = v; }
      else return;

      /* P2-2：仅收藏/对比/笔记页需要重绘列表；脏表单存在时跳过，保护未提交内容 */
      const head = currentRoute().parts[0];
      if (['favorites', 'compare', 'product'].indexOf(head) === -1) return;
      if (dirtyForm()) return;
      renderRoute(true);
    } catch (err) { /* 忽略坏数据 */ }
  });

  // 移动端菜单（问题 36：视觉态与 aria-expanded 必须同步；Escape 关闭并归还焦点）
  const menuBtn = $('#menu-toggle');
  const nav = $('#main-nav');
  const closeMenu = (refocus) => {
    nav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (refocus) menuBtn.focus();
  };
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') closeMenu(false); /* 点导航链接后同步 aria-expanded */
  });

  // 全局搜索框 + 建议（防抖 + 键盘导航）
  const input = $('#global-search');
  const box = $('#search-suggest');
  let suggestTimer = null;
  let sugIndex = -1;
  let sugSeq = 0; /* 竞态防护：旧请求的响应序号过期则丢弃 */

  /* 问题 33：combobox 状态机——aria-expanded / aria-activedescendant / aria-selected 全程同步 */
  function hideSuggest() {
    box.hidden = true;
    if (input.setAttribute) input.setAttribute('aria-expanded', 'false');
    if (input.removeAttribute) input.removeAttribute('aria-activedescendant');
    sugIndex = -1;
  }

  function renderSuggest(items, q) {
    box.setAttribute('role', 'listbox');
    /* P2-8：重新渲染建议列表时统一清掉上一次的 aria-activedescendant，
       否则读屏会把键盘焦点播报成已不存在的旧选项 */
    if (input.removeAttribute) input.removeAttribute('aria-activedescendant');
    box.innerHTML = items.map((p, i) =>
      '<div class="suggest-item" role="option" id="sug-opt-' + i + '" aria-selected="false" data-goto="#/product/' + esc(p.id) + '">' +
        '<span aria-hidden="true">' + catIconOf(p) + '</span>' +
        '<span class="s-name"><b>' + esc(p.name) + '</b> · ' + esc(p.brand) +
        (isDemo(p) ? ' <span class="badge" style="font-size:9px;padding:0 5px">演示</span>' : '') + '</span>' +
        '<span class="s-cat">' + esc(p.categoryName || '') + '</span>' +
      '</div>').join('') +
      '<div class="suggest-item" role="option" id="sug-opt-' + items.length + '" aria-selected="false" data-goto="#/products?q=' + encodeURIComponent(q) + '">' +
      '<span aria-hidden="true">🔎</span><span class="s-name">查看 “' + esc(q) + '” 的全部结果</span></div>';
    box.hidden = false;
    if (input.setAttribute) input.setAttribute('aria-expanded', 'true');
    sugIndex = -1;
  }

  function moveSuggest(delta) {
    const items = box.querySelectorAll('.suggest-item');
    if (!items.length || box.hidden) return;
    sugIndex = (sugIndex + delta + items.length) % items.length;
    items.forEach((el, i) => {
      const on = i === sugIndex;
      el.classList.toggle('active', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && input.setAttribute) input.setAttribute('aria-activedescendant', el.id);
    });
    items[sugIndex].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', () => {
    clearTimeout(suggestTimer);
    const q = input.value.trim();
    if (!q) { hideSuggest(); sugSeq++; return; }
    const seq = ++sugSeq;
    suggestTimer = setTimeout(async () => {
      let hits = [];
      try { hits = await Q.suggest(q); } catch (err) { hideSuggest(); return; } /* 问题 18：失败不留旧联想 */
      if (seq !== sugSeq) return; /* 有更新的输入已发出，丢弃过期响应 */
      if (!hits.length) { hideSuggest(); return; }
      renderSuggest(hits, q);
    }, 120);
  });
  /* P3-8：保存 blur 定时器 id，重复 focus/blur 时先清除，避免叠加冗余调度 */
  let blurTimer = null;
  input.addEventListener('focus', () => { if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; } });
  input.addEventListener('blur', () => {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(() => { hideSuggest(); blurTimer = null; }, 180);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSuggest(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSuggest(-1); }
    else if (e.key === 'Escape') { hideSuggest(); }
    else if (e.key === 'Enter') {
      const items = box.querySelectorAll('.suggest-item');
      if (sugIndex >= 0 && items[sugIndex]) {
        e.preventDefault();
        const gh = items[sugIndex].getAttribute('data-goto') || '';
        /* P3-3：键盘选中「查看全部结果」同样写入最近搜索，与鼠标点击行为一致 */
        if (gh.indexOf('#/products?q=') === 0) pushRecent(safeDecode(gh.slice('#/products?q='.length)));
        hideSuggest();
        input.blur();
        location.hash = gh;
      } else if (input.value.trim()) {
        hideSuggest();
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
    /* P1-1：skip-link 的 href="#app" 会被 hashchange 当成路由 'app' 落入 404。
       拦截后直接聚焦 #app（已有 tabindex=-1），不污染 URL。 */
    const skip = e.target.closest('[data-skip]');
    if (skip) {
      e.preventDefault();
      const target = document.getElementById(skip.getAttribute('data-skip')) || $('#app');
      if (target && target.focus) {
        try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
      }
      return;
    }

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
        /* 收藏页需同步列表与计数（问题 19）；保留滚动位置 */
        if (currentRoute().parts[0] === 'favorites') renderRoute(true);
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
          renderRoute(true); /* 问题 38：局部开关不把用户甩回页首 */
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
          /* P2-3：切换主图 src 时清除兜底标记，让新图失败后能再次回退海报 */
          main.removeAttribute('data-fallback');
          main.src = src;
          (act.parentNode || document).querySelectorAll('.gallery-thumb').forEach((t) => {
            t.classList.remove('active');
            t.removeAttribute('aria-current'); /* 问题 37：当前缩略图同步 aria-current */
          });
          act.classList.add('active');
          act.setAttribute('aria-current', 'true');
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
        const url = shareBase() + '#/compare?ids=' + ids;
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
        const url = shareBase() + '#/favorites?ids=' + ids;
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
        renderRoute(true); /* 问题 38：局部操作保留滚动位置 */
        toastUndo('已清空最近搜索', () => {
          try { localStorage.setItem('rlwj:recent', JSON.stringify(snap)); } catch (e) { /* 忽略 */ }
          renderRoute(true);
        });
        return;
      }
      if (action === 'copy-link') {
        /* P3-4：product id 编码，避免特殊字符破坏 hash 结构 */
        const url = shareBase() + '#/product/' + encodeURIComponent(id);
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
      if (v) { pushRecent(v); location.hash = '#/products?q=' + encodeURIComponent(v); } /* 问题 74：键盘路径同样写最近搜索 */
    }
    // 跳页输入框回车（问题 26）
    if (e.key === 'Enter' && e.target && e.target.id === 'page-goto') {
      const v = parseInt(e.target.value, 10);
      const max = parseInt(e.target.getAttribute('max'), 10);
      if (v >= 1 && v <= max) location.hash = hrefWith({ page: String(v) });
      else toast('请输入 1–' + max + ' 之间的页码'); /* 问题 75：非法页码给出反馈 */
      return;
    }
    // 品牌目录搜索框回车（问题 26）
    if (e.key === 'Enter' && e.target && e.target.id === 'brand-filter') {
      location.hash = hrefWith({ bq: e.target.value.trim(), page: '' });
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
    // Escape：关闭移动菜单并把焦点归还给菜单按钮（问题 36）
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      closeMenu(true);
      return;
    }
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
  let cmpSeq = 0; /* P2-7：与全局搜索 sugSeq 同理，防旧请求晚返回覆盖新建议 */
  document.addEventListener('input', (e) => {
    if (e.target.id === 'spec-filter') {
      const t = e.target.value.trim().toLowerCase();
      let shown = 0;
      $$('#spec-body tr').forEach((tr) => {
        const hit = !t || tr.textContent.toLowerCase().indexOf(t) !== -1;
        tr.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      /* 无匹配提示（问题 75）：不再只留一片空白 */
      const body = $('#spec-body');
      let none = body && body.querySelector('#spec-no-match');
      if (body) {
        if (!shown && t && !none) {
          none = document.createElement('tr');
          none.id = 'spec-no-match';
          none.innerHTML = '<td colspan="99" style="text-align:center;opacity:.6;padding:18px">没有匹配「' + esc(t) + '」的参数</td>';
          body.appendChild(none);
        } else if ((shown || !t) && none) {
          none.parentNode.removeChild(none);
        }
      }
      return;
    }
    if (e.target.id !== 'cmp-search') return;
    clearTimeout(cmpTimer);
    const q = e.target.value.trim();
    const box = $('#cmp-suggest');
    if (!box) return;
    if (!q) { cmpSeq++; box.innerHTML = ''; return; }
    const seq = ++cmpSeq;
    cmpTimer = setTimeout(async () => {
      let hits = [];
      try { hits = await Q.suggest(q); } catch (err) { box.innerHTML = ''; return; } /* 问题 18：失败不留旧联想 */
      if (seq !== cmpSeq) return; /* P2-7：丢弃过期响应，防误加入产品 */
      box.innerHTML = hits.length
        ? '<div class="suggest" style="position:static;max-width:560px;margin-bottom:14px">' + hits.map((p) =>
            /* 问题 32：建议项可聚焦（role=button + tabindex），Enter/Space 走全局动作委托 */
            '<div class="suggest-item" role="button" tabindex="0" aria-label="把 ' + esc(p.name) + ' 加入对比" data-action="cmp" data-id="' + esc(p.id) + '">' +
              '<span aria-hidden="true">' + catIconOf(p) + '</span>' +
              '<span class="s-name"><b>' + esc(p.name) + '</b> · ' + esc(p.brand) + '</span>' +
              '<span class="s-cat">＋ 加入对比</span>' +
            '</div>').join('') + '</div>'
        : '';
    }, 140);
  });

  // 用户评价表单（问题 35：字段级错误——aria-invalid + 内联错误 + 焦点引导，不再只有 Toast）
  function setFieldError(form, fieldName, msg) {
    const field = form && form.querySelector('[name="' + fieldName + '"]');
    if (!field) return;
    const err = field.id ? form.querySelector('#' + field.id + '-err') : null;
    if (msg) {
      field.setAttribute('aria-invalid', 'true');
      if (err) { err.textContent = msg; err.hidden = false; }
    } else {
      field.removeAttribute('aria-invalid');
      if (err) err.hidden = true;
    }
  }
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('#review-form');
    if (!form) return;
    e.preventDefault();
    const id = form.getAttribute('data-id');
    const nameEl = form.querySelector('[name="name"]');
    const scoreEl = form.querySelector('[name="score"]');
    const textEl = form.querySelector('[name="text"]');
    const name = (nameEl.value || '').trim() || '匿名用户';
    const score = scoreEl.value;
    const text = (textEl.value || '').trim();
    setFieldError(form, 'score', score ? '' : '请先选择评分');
    setFieldError(form, 'text', text ? '' : '写点什么再发布吧');
    if (!score) { scoreEl.focus(); return; }
    if (!text) { textEl.focus(); return; }
    (state.reviews[id] = state.reviews[id] || []).push({
      name, score, text,
      date: localDate()
    });
    saveState();
    renderRoute(true); /* 问题 38：发布笔记保留滚动位置，不回顶 */
    toast('笔记已保存在本机浏览器');
  });
  /* 修正输入即清除对应字段错误态 */
  document.addEventListener('input', (e) => {
    const f = e.target.closest && e.target.closest('#review-form [aria-invalid="true"]');
    if (f && f.name) setFieldError(formOf(f), f.name, '');
  });
  function formOf(el) { return el.form || el.closest('form'); }

  /* hashchange 是真实导航：必须回顶（问题 4），不能把事件对象当 keepScroll */
  window.addEventListener('hashchange', () => renderRoute(false));
}

/* ================= 启动 ================= */

async function boot() {
  // 1) 先探测在线 API
  /* API 探测：静态托管包（build-dist 注入 RLWJ_API=false）彻底跳过，避免每次启动一个必现 404。
     P2-19：移除 ?api=1 强制开启分支——旧实现任何访客加参数即可探测 API，
     静态托管多一次 404、双模部署可被强制切到联网模式。需要验证在线模式请用源码版（RLWJ_API 未冻结）。 */
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
    const ok = await loadStatic();
    if (!ok) return; /* 数据清单缺失（问题 16）：保留友好提示，不进入路由 */
    if (demoVisible()) await ensureBulk();
  }

  // 3) 进入应用
  bindGlobalEvents();
  renderRoute();
}

boot();
