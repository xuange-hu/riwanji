/* js/pages.js — 页面渲染：首页 / 列表 / 详情 / 对比 / 排行 / 时间线 / 收藏 / 品类 / 品牌 / 关于（app.js 拆分模块 6/7）
   加载序：util → data → state → router → components → pages → app */
'use strict';

/* ================= 页面：首页 ================= */

/* 热搜词（基于真实型号/品牌，非空想）+ 最近搜索（localStorage） */
/* 热搜词（问题 46）：以在售品类/品牌为主，压降怀旧词占比，词条均可在库内命中 */
const HOT_WORDS = ['降噪耳机', '智能手表', '机械键盘', '游戏本', '无人机', '单反相机',
  'iPad Pro', 'AirPods Pro', 'RTX 4090', 'PS5', 'Nintendo Switch', '固态硬盘',
  '4K 显示器', '投影仪', '移动电源', '机械轴', 'Switch OLED', 'Kindle'];
function recentSearches() {
  try {
    /* 存储前缀统一（问题 29）：旧键 riwanji.recent 一次性迁移 */
    const cur = localStorage.getItem('rlwj:recent');
    if (cur != null) return JSON.parse(cur) || [];
    const legacy = localStorage.getItem('riwanji.recent');
    if (legacy != null) {
      localStorage.setItem('rlwj:recent', legacy);
      localStorage.removeItem('riwanji.recent');
      return JSON.parse(legacy) || [];
    }
    return [];
  } catch (e) { return []; }
}
function pushRecent(term) {
  if (!term) return;
  try {
    const list = recentSearches().filter((x) => x !== term);
    list.unshift(term);
    localStorage.setItem('rlwj:recent', JSON.stringify(list.slice(0, CONFIG.RECENT_MAX)));
  } catch (e) { /* 忽略 */ }
}

async function renderHome() {
  const data = await Q.home();
  const st = data.stats;

  const catCards = (data.categories || []).slice(0, 12).map((c) =>
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
        '<span><b>' + esc(p.name) + (isDemo(p) ? ' <span class="badge" style="font-size:9px;padding:0 5px">演示</span>' : '') + '</b><span>' + esc(p.brand) + ' · ' + esc(p.categoryName || '') + '</span></span>' +
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
        '<div class="stat"><b>' + fmtNum(st.curated != null ? st.curated : st.total) + '</b><span>真实精选</span></div>' +
        '<div class="stat"><b>' + fmtNum(st.leaves != null ? st.leaves : st.categories) + '</b><span>细分品类</span></div>' +
        '<div class="stat"><b>' + fmtNum(st.brands) + '</b><span>品牌</span></div>' +
        '<div class="stat"><b>' + esc(st.yearMin) + '–' + esc(st.yearMax) + '</b><span>年份跨度</span></div>' +
      '</div>' +
      '<div class="demo-bar muted">演示（合成）数据 ' + fmtNum(st.bulk || 0) + ' 条（品牌/年份统计含演示样本），当前' +
        (demoVisible() ? '已显示' : '已隐藏') +
        ' <button class="chip' + (demoVisible() ? ' on' : '') + '" data-action="toggle-demo">' +
        (demoVisible() ? '隐藏演示数据' : '显示演示数据') + '</button></div>' +
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
      productGrid((data.topPerCat || []).slice(0, 12)) +
      (data.topPerCat && data.topPerCat.length > 12
        ? '<div style="margin-top:14px"><a class="btn btn-ghost" href="#/ranking">查看全部 ' + data.topPerCat.length + ' 个品类 →</a></div>'
        : '') +
    '</section>' +

    '<section class="section">' +
      sectionHead('穿越时间线', '看看每一年诞生了什么', '#/timeline', '完整时间线 →') +
      timelinePreview +
    '</section>';
}

/* 零结果引导：拆词重试提示 + 换词建议（问题 38） */
async function emptyWithSuggest(q) {
  let extra = '';
  if (q) {
    const first = q.split(/[\s,，、;；+]+/).filter(Boolean)[0] || q;
    const sugs = (await Q.suggest(first)).slice(0, 5);
    if (sugs.length) {
      extra += '<div class="empty-suggest"><p class="muted">换个词试试：</p>' +
        sugs.map((s) => '<a class="chip" href="#/product/' + esc(s.id) + '">' + catIconOf(s) + ' ' + esc(s.name) + '</a>').join('') + '</div>';
    }
    if (/[一-龥]/.test(q) && /[a-z0-9]/i.test(q)) {
      const splitQ = q.replace(/([一-龥])([a-z0-9])/gi, '$1 $2').replace(/([a-z0-9])([一-龥])/gi, '$1 $2');
      if (splitQ !== q) extra += '<p class="muted">可试试拆词搜索：<a href="#/products?q=' + encodeURIComponent(splitQ) + '">' + esc(splitQ) + '</a></p>';
    }
  }
  return '<div class="empty"><span class="big">🕳️</span>没有找到匹配的产品。<br />试试更换关键词或清除筛选条件。' + extra + '</div>';
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
    .concat(brands.map((b) => /* 全量品牌，修复 201/656 静默截断（问题 11） */
      '<option value="' + esc(b) + '"' + (brand === b ? ' selected' : '') + '>' + esc(b) + '</option>')).join('');

  const eraOptions = [
    ['', '全部年份'], ['2020s', '2020 年至今'], ['2010s', '2010–2019'],
    ['2000s', '2000–2009'], ['pre', '2000 年以前']
  ].map((e) => '<option value="' + e[0] + '"' + (era === e[0] ? ' selected' : '') + '>' + e[1] + '</option>').join('');

  const sortOptions = [
    ['score', '综合评分'], ['user', '用户评分'], ['new', '年份新→旧'],
    ['old', '年份旧→新'], ['priceDesc', '价格高→低'], ['priceAsc', '价格低→高'], ['name', '名称 A→Z']
  ].map((e) => '<option value="' + e[0] + '"' + (sort === e[0] ? ' selected' : '') + '>' + e[1] + '</option>').join('');

  let body;
  if (res.items && res.items.length) {
    HL = q.toLowerCase().split(/\s+/).filter(Boolean);
    body = productGrid(res.items) + pagination(res.page, Math.max(1, Math.ceil(res.total / res.pageSize)));
  } else {
    body = await emptyWithSuggest(q);
  }
  HL = [];

  return '' +
    '<div class="page-head">' +
      '<h1>' + (q ? '搜索：' + esc(q) : (leaf ? esc(leafNameOf(leaf, cats)) : (cat ? esc((cats.filter((c) => c.id === cat)[0] || {}).name || cat) : '全部产品'))) + '</h1>' +
      '<p>' + (q ? '在 ' + fmtNum(meta.curated || meta.total) + ' 款真实产品中搜索' : '共收录 ' + fmtNum(meta.curated || meta.total) + ' 款真实精选产品' +
        ((meta.bulk || 0) ? '，另有 ' + fmtNum(meta.bulk) + ' 条演示数据' + (demoVisible() ? '' : '（已隐藏）') : '')) + '</p>' +
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
      '<span class="spacer"></span>' +
      '<button class="chip' + (demoVisible() ? ' on' : '') + '" data-action="toggle-demo">' +
      (demoVisible() ? '演示数据：显示中' : '演示数据：已隐藏') + '</button>' +
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
  /* 无真实测评索引 → 提供全网搜索直达链接。
     问题 13：一律标 kind='search'（全网搜索直达），不再伪装成
     「权威机构/视频评测/社区口碑」分组——搜索链接不是测评原文 */
  const q = encodeURIComponent(p.name + ' 评测');
  return [
    { kind: 'search', title: 'B 站搜索「' + p.name + ' 评测」', source: 'bilibili', url: 'https://search.bilibili.com/all?keyword=' + q },
    { kind: 'search', title: 'YouTube 搜索「' + p.name + ' review」', source: 'YouTube', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(p.name + ' review') },
    { kind: 'search', title: '知乎搜索「' + p.name + '」', source: '知乎', url: 'https://www.zhihu.com/search?q=' + encodeURIComponent(p.name) },
    { kind: 'search', title: 'Google 搜索「' + p.name + ' 评测」', source: 'Google', url: 'https://www.google.com/search?q=' + q }
  ];
}

function renderMedia(p) {
  const list = mediaLinksFor(p);
  if (!list.length) return '';
  const KIND_META = {
    institution: ['🏛️', '权威机构'], review: ['📰', '媒体评测'],
    video: ['🎬', '视频评测'], community: ['💬', '社区口碑'],
    web: ['🔗', '官方/相关'], search: ['🔎', '全网搜索直达']
  };
  /* 全部是搜索兜底（无收录原文）→ 标题/脚注如实说明，不冒充测评索引 */
  const onlySearch = list.every((m) => m.kind === 'search');
  const groups = {};
  list.forEach((m) => {
    const k = KIND_META[m.kind] ? m.kind : 'review';
    (groups[k] = groups[k] || []).push(m);
  });
  const order = ['institution', 'review', 'video', 'community', 'web', 'search'];
  return '' +
    '<section class="section media-section">' +
      sectionHead('网络评测与口碑', onlySearch
        ? '本站暂未收录该产品的评测原文 · 以下为全网搜索直达入口'
        : '视频博主、媒体与权威机构测评索引 · 点击跳转原文') +
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
      '<p class="media-note">' + (onlySearch
        ? '以上链接为各平台搜索直达（非本站收录的测评原文）；真实评测索引持续补充中。'
        : '链接均来自公开网络；如遇失效可使用站内搜索找到同名产品替代来源。') + '</p>' +
    '</section>';
}

function renderUserReviews(p) {
  const list = (state.reviews[p.id] || []);
  const items = list.length
    ? list.slice().reverse().map((r, ri) =>
        '<div class="review-item">' +
          '<div class="r-head"><span class="r-name">' + esc(r.name || '匿名用户') + '</span>' +
          '<span class="r-score">' + esc(r.score) + '/10</span>' +
          '<button class="review-del" data-action="review-del" data-id="' + esc(p.id) + '" data-idx="' + (list.length - 1 - ri) + '" aria-label="删除这条笔记">✕</button></div>' +
          '<div class="r-date">' + esc(r.date) + '</div>' +
          '<p>' + esc(r.text) + '</p>' +
        '</div>').join('')
    : '<div class="empty" style="padding:34px">还没有本机笔记，来写第一条吧 ✍️</div>';

  return '' +
    '<section class="user-reviews">' +
      '<h2>我的本机笔记（' + list.length + '）<span class="muted" style="font-size:11.5px;font-weight:400"> · 仅保存在本机浏览器，不上传、不同步</span></h2>' +
      '<form class="review-form" id="review-form" data-id="' + esc(p.id) + '">' +
        '<div class="row">' +
          '<input name="name" maxlength="20" placeholder="你的昵称（可留空）" />' +
          '<select name="score">' +
            '<option value="" disabled selected>给个分</option>' +
            Array.from({ length: 10 }, (_, i) => '<option value="' + (10 - i) + '">' + (10 - i) + ' 分</option>').join('') +
          '</select>' +
        '</div>' +
        '<textarea name="text" maxlength="500" required placeholder="说说你对 ' + esc(p.name) + ' 的看法……（将保存在本机浏览器）"></textarea>' +
        '<div><button class="btn btn-primary" type="submit">发布评价</button></div>' +
      '</form>' +
      items +
    '</section>';
}

/* ================= 页面：对比 ================= */

async function renderCompare(query) {
  /* 分享链接导入（问题 30）：#/compare?ids=a,b,c 直接还原对比组合 */
  if (query && query.get('ids')) {
    const ids = query.get('ids').split(',').map(safeDecode).filter(Boolean).slice(0, CONFIG.COMPARE_MAX);
    let changed = false;
    ids.forEach((id) => { if (state.compare.indexOf(id) === -1) { state.compare.push(id); changed = true; } });
    if (changed) {
      state.compare = state.compare.slice(-CONFIG.COMPARE_MAX);
      saveState();
      renderCompareTray();
    }
  }
  const base = await Q.byIds(state.compare.filter(Boolean));
  /* 对比需要完整 specs/评分维度：轻索引产品先懒补全（问题 3） */
  const list = DATA.online ? base : await Promise.all(base.map((p) => ensureFull(p)));

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

  /* N16：表头产品列用 th scope=col（原 td 丢失列头语义），行首标签列 th scope=row */
  const headerRow = '<tr><th scope="col">产品</th>' + list.map((p) =>
    '<th scope="col"><div class="ct-name">' + esc(p.name) + (isDemo(p) ? ' <span class="badge" style="font-size:9px;padding:0 5px">演示</span>' : '') + '</div>' +
    '<div class="muted" style="font-size:11.5px">' + esc(p.brand) + ' · ' + esc(p.year) + '</div>' +
    '<button class="ct-remove" data-action="cmp" data-id="' + esc(p.id) + '" title="移出对比">✕</button></th>').join('') + '</tr>';

  const scoreRow = (label, vals, suffix) => {
    const b = best(vals, true);
    return '<tr><th scope="row">' + esc(label) + '</th>' + vals.map((v) =>
      '<td' + (typeof v === 'number' && v === b ? ' class="best"' : '') + '>' +
      (typeof v === 'number' ? fmtScore(v) + (suffix || '') : '–') +
      (typeof v === 'number' ? '<div class="mini-bar"><i style="width:' + clamp(v, 0, 100) + '%"></i></div>' : '') +
      '</td>').join('') + '</tr>';
  };

  const rowObj = (html, diff) => ({ html: html, diff: !!diff });
  const uniqOf = (vals) => new Set(vals.map((v) => String(v))).size > 1;
  const rows = [
    rowObj('<tr><th scope="row">品类</th>' + list.map((p) => '<td>' + esc(p.categoryName || '') + '</td>').join('') + '</tr>',
      uniqOf(list.map((p) => p.categoryName || ''))),
    rowObj(scoreRow('编辑评分', list.map((p) => p.score), ' /10'), uniqOf(list.map((p) => p.score))),
    rowObj(scoreRow('用户评分', list.map((p) => p.userScore), ' /10'), uniqOf(list.map((p) => p.userScore))),
    rowObj('<tr><th scope="row">上市年份</th>' + list.map((p) => '<td>' + esc(p.year) + '</td>').join('') + '</tr>',
      uniqOf(list.map((p) => p.year))),
    rowObj('<tr><th scope="row">上市价格</th>' + list.map((p) =>
      '<td' + (p.price === best(list.map((x) => x.price), false) ? ' class="best"' : '') + '>' +
      esc(p.priceText || '–') + '</td>').join('') + '</tr>',
      uniqOf(list.map((p) => p.price)))
  ].concat(
    dims.map((d) => rowObj(scoreRow(d, list.map((p) => dimOf(p, d))), uniqOf(list.map((p) => dimOf(p, d))))),
    specKeys.map((k) => {
      const vals = list.map((p) => specOf(p, k));
      /* 差异高亮：该项取值不唯一时，全部单元格加 diff 淡描边，方便逐项比对 */
      const uniq = new Set(vals.map((v) => String(v)));
      const diff = list.length > 1 && uniq.size > 1;
      const diffCls = diff ? ' class="diff"' : '';
      return rowObj('<tr><th scope="row">' + esc(k) + '</th>' + vals.map((v) => '<td' + diffCls + '>' + esc(v) + '</td>').join('') + '</tr>', diff);
    }),
    [rowObj('<tr><th scope="row">优点</th>' + list.map((p) => '<td style="text-align:left;font-size:12.5px">' +
      (p.pros || []).map((x) => '✓ ' + esc(x)).join('<br />') + '</td>').join('') + '</tr>', false),
     rowObj('<tr><th scope="row">不足</th>' + list.map((p) => '<td style="text-align:left;font-size:12.5px">' +
      (p.cons || []).map((x) => '✕ ' + esc(x)).join('<br />') + '</td>').join('') + '</tr>', false)]
  );
  const shownRows = (state.cmpDiff && list.length > 1) ? rows.filter((r) => r.diff) : rows;
  const diffCount = rows.filter((r) => r.diff).length;
  const crossCat = new Set(list.map((p) => p.category)).size > 1;
  const diffToggle = list.length > 1
    ? '<div class="filter-bar">' +
        '<button class="chip' + (state.cmpDiff ? '' : ' on') + '" data-action="cmp-diff" data-value="0">全部参数</button>' +
        '<button class="chip' + (state.cmpDiff ? ' on' : '') + '" data-action="cmp-diff" data-value="1">只看差异（' + diffCount + ' 项）</button>' +
        '<button class="chip" data-action="cmp-share">🔗 复制对比链接</button>' +
        '<button class="chip" data-action="cmp-export">⬇ 导出 JSON</button>' +
      '</div>'
    : '<div class="filter-bar"><button class="chip" data-action="cmp-share">🔗 复制对比链接</button>' +
      '<button class="chip" data-action="cmp-export">⬇ 导出 JSON</button></div>';

  return '' +
    '<div class="page-head"><h1>产品对比</h1><p>已选 ' + list.length + ' / ' + CONFIG.COMPARE_MAX + ' 款产品（绿色为该项最优，淡黄底色为存在差异的参数项）' +
    (crossCat ? ' · <b style="color:#eab308">跨品类对比：参数取并集，缺失项显示 –</b>' : '') + '</p></div>' +
    picker + diffToggle +
    (state.cmpDiff && !shownRows.length ? '<div class="empty">所选产品参数完全一致</div>' : '') +
    '<div class="table-scroll"><table class="compare-table"><thead>' + headerRow + '</thead><tbody>' +
    shownRows.map((r) => r.html).join('') + '</tbody></table></div>';
}

/* ================= 页面：排行榜 ================= */

async function renderRanking(query) {
  const cat = query.get('cat') || '';
  const sort = query.get('sort') || 'score';
  const dir = parseInt(query.get('dir') || '-1', 10);
  const page = parseInt(query.get('page') || '1', 10) || 1;

  const meta = await Q.meta();
  const res = await Q.ranking({ cat, sort, dir, page, pageSize: 50 });

  /* 表头排序按钮化（问题 10）：th 内真实 button，键盘可 Tab 可回车 */
  const th = (label, k) => {
    const isSorted = sort === k;
    return '<th class="' + (isSorted ? 'sorted' : '') + '"' +
      (isSorted ? ' aria-sort="' + (dir === -1 ? 'descending' : 'ascending') + '"' : '') + '>' +
      '<button class="th-sort" data-action="rank-sort" data-key="' + k + '">' +
      label + (isSorted ? (dir === -1 ? ' ↓' : ' ↑') : '') + '</button></th>';
  };

  const medals = ['🥇', '🥈', '🥉'];
  const rows = (res.items || []).map((p, i) =>
    '<tr>' +
      '<td class="num">' + (medals[(res.page - 1) * res.pageSize + i] || ((res.page - 1) * res.pageSize + i + 1)) +
        (medals[(res.page - 1) * res.pageSize + i] ? '<span class="sr-only">第 ' + ((res.page - 1) * res.pageSize + i + 1) + ' 名</span>' : '') + '</td>' +
      '<td class="rank-name"><a href="#/product/' + esc(p.id) + '">' + esc(p.name) + '</a>' +
        (isDemo(p) ? ' <span class="badge" style="font-size:9px;padding:0 5px">演示</span>' : '') +
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
    '<div class="table-scroll">' +
    '<table class="rank-table"><thead><tr>' +
      '<th style="width:56px">#</th>' +
      th('产品', 'name') +
      th('年份', 'year') +
      th('编辑评分', 'score') +
      th('用户评分', 'userScore') +
      th('上市价格', 'price') +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
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
    '<div class="timeline">' + years.map((g) => {
      const open = state.tlOpen.has(String(g.year));
      const items = (open && g.all && g.all.length) ? g.all : (g.items || []);
      const total = (g.all && g.all.length) ? g.all.length : items.length;
      const more = total > items.length
        ? '<button class="btn btn-ghost btn-sm" data-action="tl-more" data-year="' + esc(g.year) + '" style="margin:6px 0 2px 28px">展开全年 ' + total + ' 款 →</button>'
        : (open ? '<button class="btn btn-ghost btn-sm" data-action="tl-more" data-year="' + esc(g.year) + '" style="margin:6px 0 2px 28px">收起 ↑</button>' : '');
      return '<div class="tl-year"><h3>' + esc(g.year) + '</h3><div class="tl-items">' +
      items.map((p) =>
        '<a class="tl-item" href="#/product/' + esc(p.id) + '">' +
          '<span class="tl-emoji">' + catIconOf(p) + '</span>' +
          '<span><b>' + esc(p.name) + (isDemo(p) ? ' <span class="badge" style="font-size:9px;padding:0 5px">演示</span>' : '') + '</b><span>' + esc(p.brand) + ' · ' + esc(p.categoryName || '') + '</span></span>' +
        '</a>').join('') +
      more +
      '</div></div>';
    }).join('') + '</div>';
}

/* ================= 页面：收藏 ================= */

async function renderFavorites(query) {
  /* 问题 30：分享链接导入 #/favorites?ids=a,b,c（与对比页同款），导出见 fav-export */
  if (query && query.get('ids')) {
    const ids = query.get('ids').split(',').map(safeDecode).filter(Boolean);
    let changed = false;
    ids.forEach((id) => {
      if (id && state.favorites.indexOf(id) === -1) { state.favorites.push(id); changed = true; }
    });
    if (changed) { saveState(); refreshFavButtons(); }
  }
  const list = await Q.byIds(state.favorites);
  return '' +
    '<div class="page-head"><h1>我的收藏</h1><p>收藏保存在本机浏览器，共 ' + list.length + ' 款 · 可导出 JSON 或复制分享链接</p>' +
    (list.length
      ? '<div class="filter-bar" style="margin-top:10px">' +
          '<button class="btn btn-ghost btn-sm" data-action="fav-export">⬇ 导出 JSON</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="fav-share">🔗 复制收藏链接</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="fav-clear-all">清空收藏</button>' +
        '</div>'
      : '') + '</div>' +
    (list.length ? productGrid(list) :
      '<div class="empty"><span class="big">🤍</span>还没有收藏任何产品。<br />在产品卡片上点击 ♥ 按钮添加收藏。</div>');
}

/* ================= 页面：品类大全 ================= */

async function renderCategories() {
  const data = await Q.categories();
  /* N9：口径单源——分类规模数字取 manifest.stats（实算），不再用手写 tree.stats */
  const cat = (DATA.meta && DATA.meta.catalog) || {};
  const groups = data.groups || [];
  const leafCounts = data.leafCounts || {};
  return '' +
    '<div class="page-head"><h1>品类大全</h1><p>' +
    (cat.groups != null
      ? (fmtNum(cat.groups) + ' 个大类 · ' + fmtNum(cat.categories) + ' 个有产品收录的品类 · ' +
         fmtNum(cat.leavesWithProducts) + ' 个细分有产品收录（分类树登记 ' + fmtNum(cat.leaves) + ' 个细分），每一款型号都有独立档案')
      : '全品类导航') +
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
  const cat = (DATA.meta && DATA.meta.catalog) || {};
  return '' +
    '<div class="page-head"><h1>品牌专区</h1><p>' +
    '全库 ' + fmtNum(cat.brands != null ? cat.brands : (data.total || items.length)) + ' 个品牌（含演示样本），当前显示 ' +
    fmtNum(data.total || items.length) + ' 个' + (demoVisible() ? '' : '真实') + '品牌，按收录型号数排序，覆盖 ' +
    fmtNum(DATA.meta.total) + ' 款产品档案。点击进入品牌专属档案。</p></div>' +
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
  const cat = meta.catalog || {};
  return '' +
    '<div class="page-head"><h1>关于「日理万机」</h1><p>数码产品百科全书 · 数据驱动 · 持续扩展</p></div>' +
    '<div class="about-grid">' +
      '<div class="card"><h3>🩺 诊断面板（本机会话）</h3>' +
        '<p>数据分片加载：成功 <b>' + DIAG.shardOk + '</b> / 失败 <b>' + DIAG.shardFail + '</b>；' +
        '图片加载失败降级为本地海报 <b>' + DIAG.imgFail + '</b> 次。' +
        (DIAG.shardFail ? '<br /><b style="color:#eab308">存在分片加载失败，刷新可重试；失败文件名见浏览器控制台 warn。</b>' : '') +
        '</p></div>' +

      '<div class="card"><h3>📖 这是什么</h3>' +
        '<p>「日理万机」收录手机、平板、耳机、相机、笔记本、智能手表、游戏机、音箱等品类的数码产品，' +
        '提供详细参数、客观评测、主观点评、编辑评分、用户口碑与横向对比。当前收录 <b>' + fmtNum(meta.total) +
        '</b> 款产品（' + fmtNum(meta.curated) + ' 真实精选 + ' + fmtNum(meta.bulk) + ' 条明确标注的演示样本）、<b>' +
        fmtNum(cat.categories != null ? cat.categories : (meta.categories || []).length) + '</b> 个品类、<b>' +
        fmtNum(cat.brands != null ? cat.brands : (meta.brands || []).length) + '</b> 个品牌。</p></div>' +

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

