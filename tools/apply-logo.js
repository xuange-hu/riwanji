#!/usr/bin/env node
/* ============================================================
   tools/apply-logo.js
   生成「芯片像素日」logo（favicon + 站内 logo）写入 index.html。
   图形规格：
     - 64×64 视口，芯片封装（圆角矩形 body + 四边 10 引脚 + 左上 pin-1 定位点）
     - 「日」字由 22 块像素拼成（5 列 × 7 行网格），右下角缺一块（持续生长梗）
     - 品牌渐变 #5b8cff → #22d3ee，像素白色
   用法：node tools/apply-logo.js   （幂等，可重复跑）
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');

/* ---- 像素网格：5 列 × 7 行，cell=5，块 4.4，缝隙 0.6 ---- */
const X0 = 19.5, Y0 = 14.5, CELL = 5, BLK = 4.4, OFF = 0.3;
const px = (c, r) =>
  `<rect x="${(X0 + c * CELL + OFF).toFixed(1)}" y="${(Y0 + r * CELL + OFF).toFixed(1)}" width="${BLK}" height="${BLK}" rx="0.8"/>`;

const cells = [];
for (let r = 0; r <= 6; r++) cells.push([0, r]);                 // 左竖 7 块
for (let r = 0; r <= 5; r++) cells.push([4, r]);                 // 右竖 6 块（缺右下 (4,6)）
for (const r of [0, 3, 6]) for (let c = 1; c <= 3; c++) cells.push([c, r]); // 上/中/下横各 3 块
const pixels = cells.map(([c, r]) => px(c, r)).join('');

/* ---- 引脚 10 根：上下各 3、左右各 2，与 body 重叠 3px 保证连为一体 ---- */
const pins = [
  [21, 5, 4, 8], [30, 5, 4, 8], [39, 5, 4, 8],
  [21, 51, 4, 8], [30, 51, 4, 8], [39, 51, 4, 8],
  [5, 21, 8, 4], [5, 39, 8, 4],
  [51, 21, 8, 4], [51, 39, 8, 4],
].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"/>`).join('');

const svgInner =
  `<defs><linearGradient id="rlwjLogoGrad" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="#5b8cff"/><stop offset="1" stop-color="#22d3ee"/>` +
  `</linearGradient></defs>` +
  `<g fill="url(#rlwjLogoGrad)">${pins}</g>` +
  `<rect x="10" y="10" width="44" height="44" rx="9" fill="url(#rlwjLogoGrad)"/>` +
  `<circle cx="16.5" cy="16.5" r="2" fill="#fff" opacity="0.85"/>` +
  `<g fill="#fff">${pixels}</g>`;

const inlineSvg =
  `<svg class="logo-mark" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
  svgInner + `</svg>`;

/* favicon：data URI 编码（引号转单引号，< > # 与空格百分号编码） */
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${svgInner}</svg>`;
const favicon =
  'data:image/svg+xml,' +
  faviconSvg
    .replace(/"/g, "'")
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/#/g, '%23')
    .replace(/ /g, '%20');

/* ---- 写入 index.html（先写临时文件再原子替换） ---- */
let html = fs.readFileSync(FILE, 'utf8');
const before = html;

html = html.replace(
  /<link rel="icon" href="data:image\/svg\+xml,[^"]*" \/>/,
  `<link rel="icon" href="${favicon}" />`
);
html = html.replace(
  /<span class="logo-mark">[\s\S]*?<\/span>/,
  inlineSvg
);

if (html === before) {
  console.error('未匹配到 favicon 或 logo-mark，放弃写入');
  process.exit(1);
}
const tmp = FILE + '.tmp';
fs.writeFileSync(tmp, html);
fs.renameSync(tmp, FILE);
console.log('logo 已写入 index.html');
console.log('favicon 长度 =', favicon.length, '像素块 =', cells.length);
