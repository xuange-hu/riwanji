#!/usr/bin/env node
/* ============================================================
   tools/audit-dist.js — 对构建产物 dist/ 跑完整回归（P2-37）

   root 四件套全绿不代表产物正确：dist/index.html 多注入 boot-config.js，
   sitemap.xml / feed.xml / p/*.html 由 prerender.js 重写。
   本脚本在 dist/ 目录内运行四件套（使用 build-dist 复制进去的同版工具），
   任一失败即以非 0 退出，供 `npm run audit:dist` 与 CI 门禁使用。

   用法： node tools/audit-dist.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'tools', 'validate.js'))) {
  console.error('audit-dist：dist/tools 不存在，请先运行 node tools/build-dist.js');
  process.exit(1);
}

const STEPS = [
  ['validate.js', '数据校验'],
  ['stats.js', '统计口径', ['--check']],
  ['docs-assert.js', '文档数字一致性'],
  ['smoke-test.js', '渲染回归'],
  ['static-audit.js', '静态托管审计']
];

let failed = 0;
for (const [tool, label, extra = []] of STEPS) {
  console.log('\n════ ' + label + '（dist 产物）════');
  const r = spawnSync(process.execPath, [path.join(DIST, 'tools', tool), ...extra], {
    cwd: DIST, stdio: 'inherit'
  });
  if (r.status !== 0) { console.error('✗ ' + label + ' 失败（exit ' + r.status + '）'); failed++; }
  else console.log('✓ ' + label + ' 通过');
}

console.log('\n' + (failed
  ? 'audit-dist：' + failed + ' 项失败'
  : 'audit-dist：全部 ' + STEPS.length + ' 项通过（dist 产物）'));
process.exit(failed ? 1 : 0);
