#!/usr/bin/env node
/* ============================================================
   tools/smoke-test.js
   无浏览器冒烟测试：用微型 DOM 桩在 Node 里真实执行
   data/*.js + js/app.js，把每个页面渲染一遍并断言输出。

   用法： node tools/smoke-test.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
const failures = [];

function ok(cond, label) {
  if (cond) { passed++; console.log('  ✓ ' + label); }
  else { failures.push(label); console.log('  ✗ ' + label); }
}

/* ---------- 微型 DOM 桩 ---------- */

function makeEl(id) {
  const el = {
    id: id || '',
    tagName: 'DIV',
    innerHTML: '',
    textContent: '',
    value: '',
    hidden: false,
    style: {},
    attrs: {},
    classList: {
      _set: new Set(),
      toggle(c, on) { if (on) el.classList._set.add(c); else el.classList._set.delete(c); },
      add(c) { el.classList._set.add(c); },
      remove(c) { el.classList._set.delete(c); },
      contains(c) { return el.classList._set.has(c); }
    },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return el.attrs[k] == null ? null : el.attrs[k]; },
    addEventListener() {},
    appendChild() {},
    closest() { return null; },
    querySelector() { return makeEl(''); },
    querySelectorAll() { return []; }
  };
  return el;
}

const elRegistry = {};
['#app', '#theme-toggle', '#menu-toggle', '#main-nav', '#search-suggest',
 '#global-search', '#compare-tray', '#compare-tray-items', '#compare-clear',
 '#hero-search'].forEach((id) => { elRegistry[id] = makeEl(id); });

const docHandlers = {};
const winHandlers = {};

const documentStub = {
  documentElement: makeEl('html'),
  head: {
    // manifest 驱动的分片加载：直接在沙盒里执行文件内容
    appendChild(script) {
      const file = path.join(ROOT, script.src);
      setImmediate(() => {
        if (!fs.existsSync(file)) { if (script.onerror) script.onerror(); return; }
        try {
          const code = fs.readFileSync(file, 'utf8');
          new Function('window', code)(windowStub);
          if (script.onload) script.onload();
        } catch (e) {
          console.log('  [加载失败] ' + script.src + '：' + e.message);
          if (script.onerror) script.onerror();
        }
      });
    }
  },
  querySelector(sel) { return elRegistry[sel] || makeEl(''); },
  getElementById(id) {
    const k = '#' + id;
    return elRegistry[k] || (elRegistry[k] = makeEl(k));
  },
  querySelectorAll() { return []; },
  createElement() { return makeEl(''); },
  addEventListener(type, fn) { (docHandlers[type] = docHandlers[type] || []).push(fn); }
};

const storage = {};
const windowStub = {
  addEventListener(type, fn) { (winHandlers[type] = winHandlers[type] || []).push(fn); },
  scrollTo() {},
  DB_CHUNKS: undefined
};

const locationStub = { hash: '#/' };
const localStorageStub = {
  getItem(k) { return storage[k] == null ? null : storage[k]; },
  setItem(k, v) { storage[k] = String(v); }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 执行应用 ---------- */

async function main() {
  console.log('══════ 冒烟测试 ══════');

  const manifestCode = fs.readFileSync(path.join(ROOT, 'data', 'manifest.js'), 'utf8');
  new Function('window', manifestCode)(windowStub);

  const appCode = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
  new Function('window', 'document', 'location', 'localStorage', 'alert', 'console',
    appCode)(windowStub, documentStub, locationStub, localStorageStub,
    (m) => { throw new Error('alert: ' + m); }, console);

  await sleep(120); // 等待分片异步加载 + boot 完成
  /* 静态分片较多时 buildStaticDB 耗时上升，轮询等待 boot 注册路由（上限 10s） */
  for (let i = 0; i < 500 && !(winHandlers['hashchange'] || []).length; i++) await sleep(20);

  const appEl = elRegistry['#app'];
  ok(appEl.innerHTML.length > 800, '首页渲染成功（输出 ' + appEl.innerHTML.length + ' 字符）');
  ok(appEl.innerHTML.indexOf('日理万机') !== -1, '首页包含站名');
  ok(appEl.innerHTML.indexOf('hero-stats') !== -1, '首页包含统计区');

  // 找一个产品 id 用于详情页测试
  const chunks = windowStub.DB_CHUNKS || [];
  const all = [];
  chunks.forEach((c) => (c.products || []).forEach((p) => all.push(p)));
  ok(all.length > 0, '数据分片已载入（' + all.length + ' 个产品）');
  const sample = all[0];

  const hashChange = (winHandlers['hashchange'] || [])[0];
  ok(typeof hashChange === 'function', 'hashchange 路由已注册');

  const routes = [
    ['#/products', '全部产品', '产品列表页'],
    ['#/products?cat=' + (sample.category || ''), '结果', '品类筛选页'],
    ['#/products?q=' + encodeURIComponent(sample.name), sample.name.split(' ')[0], '搜索结果页'],
    ['#/product/' + sample.id, '参数规格', '产品详情页'],
    ['#/compare', '产品对比', '对比页'],
    ['#/categories', '品类大全', '品类大全页'],
    ['#/ranking', '排行榜', '排行榜页'],
    ['#/timeline', '时间线', '时间线页'],
    ['#/favorites', '收藏', '收藏页'],
    ['#/about', '关于', '关于页'],
    ['#/no-such-page', '页面不存在', '404 页']
  ];

  for (const [hash, marker, label] of routes) {
    locationStub.hash = hash;
    try {
      await hashChange();
      ok(appEl.innerHTML.indexOf(marker) !== -1, label + '（' + hash + '）渲染正常');
    } catch (e) {
      ok(false, label + '（' + hash + '）渲染异常：' + e.message);
    }
  }

  // 搜索加权逻辑（通过详情页产品名反查）
  locationStub.hash = '#/products?q=' + encodeURIComponent('iPhone');
  await hashChange();
  ok(appEl.innerHTML.indexOf('iPhone') !== -1, '搜索 “iPhone” 命中结果');

  console.log('');
  console.log('通过 ' + passed + ' 项，失败 ' + failures.length + ' 项');
  if (failures.length) {
    failures.forEach((f) => console.log('  ✗ ' + f));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
