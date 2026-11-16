/* js/util.js — 工具层：DOM 查询 / 转义 / 提示 / 本地存储（app.js 拆分模块 1/7）
   加载序：util → data → state → router → components → pages → app */
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

/* 可撤销 Toast（问题 31）：5 秒内点「撤销」回滚快照 */
function toastUndo(msg, undoFn) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.innerHTML = '';
  el.appendChild(document.createTextNode(msg + ' '));
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = '撤销';
  b.className = 'toast-undo';
  b.addEventListener('click', () => {
    el.classList.remove('show');
    undoFn();
  });
  el.appendChild(b);
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 5000);
}

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

/* 集中配置（问题 41）：散落的魔法数字统一收口 */
const CONFIG = {
  PAGE_SIZE: 24,         /* 列表每页条数 */
  TIMELINE_PREVIEW: 8,   /* 时间线每年默认展示条数 */
  RECENT_MAX: 8,         /* 最近搜索保留条数 */
  COMPARE_MAX: 3         /* 对比上限 */
};

/* 诊断计数器（问题 42）：线上静默失败可观测，关于页有面板 */
const DIAG = { shardOk: 0, shardFail: 0, imgFail: 0 };
window.__rlwjDiag = DIAG;

const store = {
  get(k, d) {
    try { const v = JSON.parse(localStorage.getItem('rlwj:' + k)); return v == null ? d : v; }
    catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('rlwj:' + k, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
  }
};

