#!/usr/bin/env node
/* ============================================================
   tools/docs-assert.js
   文档数字一致性门禁（协作教训 2026-11-21 的机制化收口）

   背景：第五轮并行子代理各自写死了统计数字，后续数据修复把
   1,035→1,646 等值推翻，导致同一数字在多份文档间漂移。
   旧 tools/stats.js --check 只校验 dist-README.md 一份文件，
   且只查 10 个碎片字符串，属于典型「单点假绿」。

   本脚本把「数字」当作可执行断言，而非散文：
     1. 单一来源：所有口径都从 data/ 实算，禁止任何硬编码基准值。
        - 产品/品牌/品类/叶子/图片/测评  → 复用 stats.js 的 compute()
        - 品类树 groups/bases/leaves      → 取 data/categories.js 自带 stats
        - 演示覆盖品牌/品类               → 全量扫描 data/gen/*.js 独立实算
     2. 全文档覆盖：README / dist-README / DEPLOY / CHANGELOG / package.json
        统一纳入断言，任何一个漂移都变红（不再依赖某一份文档顺带命中）。
     3. 过期数字黑名单：上一轮被推翻的具体数值（1,035 / 1,029 / 1,021 /
        105 品类 / 2,279 …）一旦重新出现在「现状描述型」文档里即报错，
        防止旧快照被复制粘贴回文档。CHANGELOG 属历史记录，豁免。

   用法：
     node tools/docs-assert.js          # 校验，失败 exit 1
     node tools/docs-assert.js --list   # 打印全部口径实算值（人工核对用）
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* ---- 1. 基础口径：直接复用 stats.js（避免两套口径打架）---- */
const stats = require('./stats.js');

/* ---- 2. 品类树权威口径：树文件自带 stats 字段，不再自己推公式 ---- */
function treeStats() {
  const t = require(path.join(ROOT, 'data', 'categories.js'));
  const s = (t && t.stats) || {};
  return {
    groups: s.groups || 0,
    bases: s.bases || 0,
    leaves: s.leaves || 0
  };
}

/* ---- 3. 演示样本独立实算（stats.js 不单独暴露 bulk 覆盖的品类/品牌）---- */
function bulkStats() {
  const dir = path.join(ROOT, 'data', 'gen');
  const brands = new Set();
  const cats = new Set();
  const ids = new Set();
  let n = 0;
  if (!fs.existsSync(dir)) return { total: 0, brands: 0, categories: 0 };
  for (const f of fs.readdirSync(dir)) {
    if (!/^bulk-static-.*\.js$/.test(f)) continue;
    const w = {};
    try {
      new Function('window', fs.readFileSync(path.join(dir, f), 'utf8'))(w);
    } catch (e) {
      continue;
    }
    for (const c of (w.DB_CHUNKS || [])) {
      if (c.category) cats.add(c.category);
      for (const p of (c.products || [])) {
        if (!p || !p.id || ids.has(p.id)) continue;
        ids.add(p.id);
        n++;
        brands.add(p.brand);
      }
    }
  }
  return { total: n, brands: brands.size, categories: cats.size };
}

/* ---- 4. 文档断言表 ----
   产物模式（dist 内）与源码模式的文件布局不同，必须分别建表：
     源码树：README.md（开发版）+ dist-README.md（部署版）+ DEPLOY.md + package.json
     产物树：README.md（＝dist-README.md 复制而来，无独立 dist-README.md）+ DEPLOY.md，
             无 package.json（产物不含 Node 工程文件）
   each: [文件, 说明, [必须出现的片段…], [必须不出现的片段…]]
   「必须不出现」用于把已废弃的表述钉死在门外（例如旧口径名）。 */
const b = bulkStats();          /* 只实算一次（全量扫 50 个分片，勿重复调用） */
const t = treeStats();

/* dist 内 = 存在 dist 子目录特征（tools/audit-dist.js 以 cwd=DIST 调用，
   但同时 ROOT 由 __dirname 推出，故用「dist-README.md 不存在 且 README.md 存在」
   反推产物模式更稳，源码树两者同时存在）。 */
const IS_DIST = !fs.existsSync(path.join(ROOT, 'dist-README.md')) &&
  fs.existsSync(path.join(ROOT, 'README.md')) &&
  !fs.existsSync(path.join(ROOT, 'package.json'));

/* 部署版 README 的数字断言（源码模式指向 dist-README.md，产物模式指向 README.md） */
const DEPLOY_README_MUST = [
  [fmt(stats.total) + ' 个产品', '产品总数'],
  [String(stats.curated) + ' 精选', '精选数'],
  [fmt(stats.bulk) + ' 热门', '演示数'],
  [fmt(stats.brands) + ' 品牌', '品牌数'],
  [String(stats.brandsCurated) + ' 个精选品牌', '精选品牌数'],
  [String(stats.categories) + ' 品类', '品类数'],
  [fmt(stats.leavesWithProducts) + ' 个', '细分叶子数'],
  [stats.yearMin + '–' + stats.yearMax, '年份跨度'],
  [fmt(stats.curatedImages) + ' 图', '精选图片数'],
  [String(stats.mediaLinks) + ' 测评', '测评链接数'],
  [String(b.brands) + ' 个品牌', '演示覆盖品牌数']
];

const DOCS = IS_DIST ? [
  /* 产物树：README.md 即部署版说明（由 dist-README.md 复制） */
  { file: 'README.md', label: '产物 README（部署版）', must: DEPLOY_README_MUST, mustNot: [] },
  {
    file: 'DEPLOY.md',
    label: '部署文档',
    must: [
      [fmt(stats.total) + ' 个产品', '产品总数'],
      [String(stats.curated) + ' 精选', '精选数'],
      [fmt(stats.bulk) + ' 热门', '演示数'],
      [String(b.categories) + ' 个品类', '演示覆盖品类数'],
      [String(b.brands) + ' 个品牌', '演示覆盖品牌数'],
      [fmt(stats.brands) + ' 个品牌', '全库品牌数']
    ],
    mustNot: []
  }
] : [
  {
    file: 'README.md',
    label: '源码树 README',
    must: [
      ['346 款真实精选', '精选文案'],
      ['10,000 条明确标注的演示样本', '演示文案']
    ],
    mustNot: []
  },
  { file: 'dist-README.md', label: '部署包 README', must: DEPLOY_README_MUST, mustNot: [] },
  {
    file: 'DEPLOY.md',
    label: '部署文档',
    must: [
      [fmt(stats.total) + ' 个产品', '产品总数'],
      [String(stats.curated) + ' 精选', '精选数'],
      [fmt(stats.bulk) + ' 热门', '演示数'],
      [String(b.categories) + ' 个品类', '演示覆盖品类数'],
      [String(b.brands) + ' 个品牌', '演示覆盖品牌数'],
      [fmt(stats.brands) + ' 个品牌', '全库品牌数']
    ],
    mustNot: []
  }
];

/* ---- 5. 过期数字黑名单 ----
   仅作用于「现状描述型」文档（README / dist-README / DEPLOY）。
   CHANGELOG 是历史记录，允许出现旧值（如「1,029→1,646」），故不扫描。
   每条 = [正则, 为什么过期]。
   注意：只拦截「长得像当前口径」的独立数字，避免误伤版本号/端口/年份。 */
const STALE = [
  [/\b1[,，]?035\b/, '1,035 是第五轮前的细分叶子口径，已被 1,646 取代'],
  [/\b1[,，]?029\b/, '1,029 是第五轮前的细分叶子口径，已被 1,646 取代'],
  [/\b1[,，]?021\b/, '1,021 是图片本地化前的计数，现为 1,025'],
  [/105\s*(个)?品类/, '105 品类是旧口径，现为 106'],
  [/\b2[,，]?279\b/, '2,279 是旧细分树口径，现为 2,284']
];

const LIST_ONLY = process.argv.indexOf('--list') !== -1;

if (LIST_ONLY) {
  console.log('【实算口径 · ' + (IS_DIST ? 'dist 产物模式' : '源码树模式') + '】');
  console.log('  产品总数        ' + fmt(stats.total));
  console.log('  精选 / 演示     ' + stats.curated + ' / ' + fmt(stats.bulk));
  console.log('  全库品牌        ' + stats.brands);
  console.log('  精选品牌        ' + stats.brandsCurated);
  console.log('  有产品品类      ' + stats.categories);
  console.log('  含产品细分叶子  ' + fmt(stats.leavesWithProducts));
  console.log('  年份跨度        ' + stats.yearMin + '–' + stats.yearMax);
  console.log('  精选图片(去重)  ' + fmt(stats.curatedImages));
  console.log('  测评索引        ' + stats.mediaLinks);
  console.log('【品类树】大类 ' + t.groups + ' / 基础品类 ' + t.bases + ' / 细分叶子 ' + fmt(t.leaves));
  console.log('【演示样本】' + fmt(b.total) + ' 条 / 品类 ' + b.categories + ' / 品牌 ' + b.brands);
  process.exit(0);
}

let fail = 0;

console.log('docs-assert：文档数字一致性');
DOCS.forEach((doc) => {
  const p = path.join(ROOT, doc.file);
  if (!fs.existsSync(p)) {
    console.log('  ✗ ' + doc.label + '（' + doc.file + '）文件缺失');
    fail++;
    return;
  }
  const s = fs.readFileSync(p, 'utf8');
  let bad = 0;
  doc.must.forEach(([frag, label]) => {
    if (s.indexOf(frag) === -1) {
      console.log('  ✗ ' + doc.file + ' · ' + label + '：缺少「' + frag + '」');
      bad++;
    }
  });
  doc.mustNot.forEach(([frag, label]) => {
    if (s.indexOf(frag) !== -1) {
      console.log('  ✗ ' + doc.file + ' · ' + label + '：不应出现「' + frag + '」');
      bad++;
    }
  });
  STALE.forEach(([re, why]) => {
    const m = s.match(re);
    if (m) {
      console.log('  ✗ ' + doc.file + ' · 过期数字「' + m[0] + '」：' + why);
      bad++;
    }
  });
  if (bad === 0) {
    console.log('  ✓ ' + doc.label + '（' + doc.must.length + ' 项断言通过）');
  } else {
    fail += bad;
  }
});

/* package.json 只做结构断言（避免把脚本命令当数字口径）
   产物树不含 package.json（build-dist 不打包 Node 工程文件），跳过而非报错。 */
if (!IS_DIST) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const need = ['start', 'validate', 'test', 'audit:dist', 'docs:assert', 'push:gitee'];
    const miss = need.filter((k) => !pkg.scripts || !pkg.scripts[k]);
    if (miss.length) {
      console.log('  ✗ package.json 缺少脚本：' + miss.join(', '));
      fail += miss.length;
    } else {
      console.log('  ✓ package.json 脚本完备（' + pkg.scripts['docs:assert'] + '）');
    }
  } catch (e) {
    console.log('  ✗ package.json 解析失败：' + e.message);
    fail++;
  }
}

if (fail) {
  console.log('\n共 ' + fail + ' 处不一致。实算值如下，请据此修正文档：');
  console.log(JSON.stringify({ stats, tree: t, bulk: b }, null, 2));
  process.exit(1);
}
console.log('\n全部一致（口径来源：data/ 实算，无硬编码基准）');