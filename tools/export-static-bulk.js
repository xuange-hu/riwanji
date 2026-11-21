#!/usr/bin/env node
/* ============================================================
   tools/export-static-bulk.js
   从 data/bulk/bulk-detail-*.jsonl 流式导出热门 SKU → data/gen/*.js
   供 Gitee Pages 等纯静态托管使用（静态模式自动加载 manifest 中的 gen 分片）。
   选取策略：每品类按评分取候选池 → 品牌轮转（品牌多样性最大化）→ 定额截取。
   用法：node tools/export-static-bulk.js [--count 10000] [--per-shard 200]
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BULK = path.join(DATA, 'bulk');
const GEN = path.join(DATA, 'gen');

const args = process.argv.slice(2);
const argNum = (name, dft) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : dft;
};
const COUNT = argNum('count', 10000);
const PER_SHARD = argNum('per-shard', 200);
const POOL_PER_CAT = Math.max(200, Math.ceil(COUNT / 60) * 3); /* 候选池：配额的 ~3 倍 */

/* ---- 1. 类目元数据：区块头（categoryName/icon/description）----
   优先沿用精选分片里的类目描述，缺失的从 categories.js 树补 icon/name */
const catMeta = {}; /* baseId -> {categoryName, icon, description} */
const catCode = fs.readFileSync(path.join(ROOT, 'data', 'categories.js'), 'utf8');
const treeWin = {};
new Function('window', catCode)(treeWin);
const tree = treeWin.DB_CATEGORY_TREE || { groups: [] };
for (const g of tree.groups || []) for (const b of g.bases || []) {
  catMeta[b.id] = catMeta[b.id] || { categoryName: b.name, icon: b.icon || '📦', description: '' };
}
/* 精选分片的类目描述更完整，覆盖进来 */
for (const f of fs.readdirSync(path.join(ROOT, 'data'))) {
  if (!f.endsWith('.js') || ['manifest.js', 'categories.js', 'brand-alias.js'].includes(f)) continue;
  try {
    const w = {};
    new Function('window', fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'))(w);
    for (const c of w.DB_CHUNKS || []) {
      catMeta[c.category] = {
        categoryName: c.categoryName || (catMeta[c.category] || {}).categoryName || c.category,
        icon: c.icon || (catMeta[c.category] || {}).icon || '📦',
        description: c.description || (catMeta[c.category] || {}).description || ''
      };
    }
  } catch (e) { /* 跳过损坏分片 */ }
}

/* ---- 2. 流式扫描 bulk 明细，每品类保留评分前 POOL_PER_CAT 的候选 ---- */
async function scan() {
  const pool = new Map(); /* category -> [rec,...] 保持按 score 降序 */
  for (const f of fs.readdirSync(BULK).filter((x) => /^bulk-detail-\d+\.jsonl$/.test(x)).sort()) {
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(BULK, f)), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      let p;
      try { p = JSON.parse(line); } catch (e) { continue; }
      const cat = p.category || 'other';
      const seen = pool.get(cat) || [];
      if (seen.length >= POOL_PER_CAT && (p.score || 0) <= (seen[seen.length - 1].score || 0)) continue;
      seen.push(p);
      seen.sort((a, b) => (b.score || 0) - (a.score || 0));
      if (seen.length > POOL_PER_CAT) seen.pop();
      pool.set(cat, seen);
    }
  }
  return pool;
}

/* ---- 3. 品牌轮转选取：同品牌隔开，最大化品牌多样性 ---- */
function brandRoundRobin(list, quota) {
  const byBrand = new Map();
  for (const p of list) {
    const k = p.brand || '其他';
    if (!byBrand.has(k)) byBrand.set(k, []);
    byBrand.get(k).push(p); /* 已按 score 降序 */
  }
  const brands = Array.from(byBrand.keys()).sort((a, b) => byBrand.get(b).length - byBrand.get(a).length);
  const out = [];
  for (let round = 0; out.length < quota; round++) {
    let got = false;
    for (const b of brands) {
      const arr = byBrand.get(b);
      if (arr.length > round) { out.push(arr[round]); got = true; if (out.length >= quota) break; }
    }
    if (!got) break;
  }
  return out;
}

async function main() {
  console.log('扫描 bulk 明细（约 3.5GB 流式）……');
  const pool = await scan();
  const cats = Array.from(pool.keys()).sort();
  const totalPool = cats.reduce((s, c) => s + pool.get(c).length, 0);
  console.log('候选池：' + cats.length + ' 个类目 / ' + totalPool.toLocaleString() + ' 条（每类目 ≤' + POOL_PER_CAT + '）');

  /* 配额：按类目均分，余数补给大类目 */
  const quota = Math.floor(COUNT / cats.length);
  let remainder = COUNT - quota * cats.length;
  const selected = [];
  for (const c of cats) {
    const q = quota + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    selected.push(...brandRoundRobin(pool.get(c), q));
  }
  /* 字段规范化：score/userScore 转数值（bulk 原始为字符串），校验器要求数值 */
  for (const p of selected) {
    p.score = typeof p.score === 'number' ? p.score : parseFloat(p.score) || 0;
    p.userScore = typeof p.userScore === 'number' ? p.userScore : parseFloat(p.userScore) || 0;
  }
  console.log('已选取：' + selected.length.toLocaleString() + ' 条（目标 ' + COUNT.toLocaleString() + '）');

  /* ---- 4. 原子导出（P1-9）：先写临时目录，校验非空且条数达标后原子替换 data/gen/ ----
     原实现先 fs.unlinkSync 删光 data/gen/*.js 再写分片，中途异常即 10000 条演示数据全丢且无回滚。
     现在临时目录与 gen 同级（data/.gen-tmp-xxx），避免临时目录位于 gen 内导致 rename 自嵌套。 */
  const TMP = path.join(DATA, '.gen-tmp-' + process.pid + '-' + Date.now());
  const safeRm = (p) => { try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) { /* noop */ } };
  let backup = null;
  try {
    fs.mkdirSync(TMP, { recursive: true });
    /* 按类目分组写区块 */
    const byCat = new Map();
    for (const p of selected) {
      const k = p.category || 'other';
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k).push(p);
    }
    let shard = 0, written = 0, files = 0;
    let buf = [];
    const flush = () => {
      if (!buf.length) return;
      shard++;
      const code = '/* 静态托管扩充分片 ' + shard + '（热门 SKU · 由 tools/export-static-bulk.js 生成） */\n' +
        'window.DB_CHUNKS = window.DB_CHUNKS || [];\n' +
        buf.map((c) => 'window.DB_CHUNKS.push(' + JSON.stringify(c) + ');').join('\n') + '\n';
      fs.writeFileSync(path.join(TMP, 'bulk-static-' + String(shard).padStart(2, '0') + '.js'), code);
      files++;
      buf = [];
    };
    for (const c of cats) {
      const list = byCat.get(c) || [];
      if (!list.length) continue;
      const meta = catMeta[c] || { categoryName: list[0].catName || c, icon: '📦', description: '' };
      for (let i = 0; i < list.length; i += PER_SHARD) {
        buf.push({
          category: c,
          categoryName: meta.categoryName,
          icon: meta.icon,
          description: meta.description,
          products: list.slice(i, i + PER_SHARD)
        });
        written += Math.min(PER_SHARD, list.length - i);
        if (buf.length >= 6) flush(); /* 每文件 6 个区块 ≈ 1200 条 */
      }
      flush();
    }
    flush();

    /* 校验：分片非空、数量与条数达标（默认 ≥90% COUNT）；不满足则中止且完全不动原 data/gen/ */
    const tmpFiles = fs.readdirSync(TMP).filter((f) => f.endsWith('.js'));
    if (!tmpFiles.length || written < Math.floor(COUNT * 0.9)) {
      throw new Error('导出校验失败：分片 ' + files + ' 个 / ' + written + ' 条（目标 ' + COUNT + '）');
    }
    for (const f of tmpFiles) {
      if (fs.statSync(path.join(TMP, f)).size <= 0) throw new Error('空分片：' + f);
    }

    /* 原子替换：rename 原 gen → 备份；rename 临时 → gen；成功删备份，任一步失败回滚 */
    if (fs.existsSync(GEN)) {
      backup = GEN + '.bak-' + Date.now();
      fs.renameSync(GEN, backup);
    }
    try {
      fs.renameSync(TMP, GEN);
    } catch (e) {
      if (backup && !fs.existsSync(GEN) && fs.existsSync(backup)) fs.renameSync(backup, GEN);
      throw e;
    }
    if (backup) safeRm(backup);
    console.log('输出：data/gen/ 共 ' + files + ' 个分片 / ' + written.toLocaleString() + ' 条（原子替换完成）');
  } catch (e) {
    /* 异常时保留/回滚原数据：只清理临时目录，备份若存在则 rename 回来，绝不删除原 gen */
    if (backup && !fs.existsSync(GEN) && fs.existsSync(backup)) {
      try { fs.renameSync(backup, GEN); } catch (_) { /* noop */ }
    }
    safeRm(TMP);
    console.error('导出失败，已保留原 data/gen/：' + (e && e.message));
    process.exit(1);
  }
  /* 问题 58：导出后必须重建清单 + 演示轻索引（漏掉任一步都会造成
     「分片条目数 ≠ 索引条目数 ≠ 页面运行数」的数据漂移） */
  console.log('下一步：node tools/build-manifest.js && node tools/build-index.js');
}
main().catch((e) => { console.error(e); process.exit(1); });
