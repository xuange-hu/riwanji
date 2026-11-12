#!/usr/bin/env node
/* ============================================================
   tools/import.js
   批量导入产品数据：把 CSV / JSONL 转成分片数据文件（data/*.js）。
   支持十万级条目：导入时做字段规范化与去重，输出按分片文件组织。

   用法：
     node tools/import.js <输入文件...> --category phone \
         [--category-name 手机] [--icon 📱] [--out data/gen/phone-3.js] [--force]

   输入格式 1：JSONL —— 每行一个 JSON 产品对象，字段与 data/*.js 中的
     产品结构完全一致（specs/scores 为 [键,值] 数组对）。

   输入格式 2：CSV —— 表头包含 id,name,brand,year,priceText,price,tags,
     summary,specs,scores,score,userScore,pros,cons,objective,subjective
     复合字段用 | 分隔，specs/scores 用 键:值 表示：
       tags      = 经典|功能机|超长续航
       specs     = 屏幕:单色屏 84×48|处理器:..."
       scores    = 性能:20|续航:95
       pros/cons = 优点一|优点二|优点三
       objective/subjective 直接写文本（不要包含 |）
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const args = { inputs: [], category: '', categoryName: '', icon: '', out: '', force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--category') args.category = argv[++i];
    else if (a === '--category-name') args.categoryName = argv[++i];
    else if (a === '--icon') args.icon = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--force') args.force = true;
    else if (!a.startsWith('--')) args.inputs.push(a);
  }
  return args;
}

function splitCsvLine(line) {
  // 支持 "..." 引号包裹（内部可含逗号与 | ）
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function pairs(str) {
  // "键:值|键:值" -> [[键, 值], ...]
  return String(str || '').split('|').filter(Boolean).map((kv) => {
    const i = kv.indexOf(':');
    return i === -1 ? [kv, ''] : [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
  });
}

function list(str) {
  return String(str || '').split('|').map((s) => s.trim()).filter(Boolean);
}

function csvToProduct(cols, header) {
  const row = {};
  header.forEach((h, i) => { row[h] = cols[i] == null ? '' : cols[i]; });
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: '', // 由命令行 --category 决定
    year: parseInt(row.year, 10),
    priceText: row.priceText,
    price: parseFloat(row.price),
    tags: list(row.tags),
    summary: row.summary,
    specs: pairs(row.specs),
    scores: pairs(row.scores).map((s) => [s[0], Number(s[1])]),
    score: parseFloat(row.score),
    userScore: parseFloat(row.userScore),
    pros: list(row.pros),
    cons: list(row.cons),
    review: { objective: row.objective, subjective: row.subjective }
  };
}

function jsonlToProduct(obj) {
  return obj;
}

function validateProduct(p, at) {
  const errs = [];
  if (!p.id) errs.push(at + '：缺 id');
  if (!p.name) errs.push(at + '：缺 name');
  if (!p.brand) errs.push(at + '：缺 brand');
  if (!p.year) errs.push(at + '：缺 year');
  if (!Array.isArray(p.specs) || !p.specs.length) errs.push(at + '：specs 为空');
  if (typeof p.score !== 'number') errs.push(at + '：score 不是数值');
  return errs;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.inputs.length || !args.category) {
    console.error('用法： node tools/import.js <输入文件...> --category <品类id> [--category-name 名称] [--icon 图标] [--out 输出文件] [--force]');
    process.exit(2);
  }

  const categoryName = args.categoryName || args.category;
  const icon = args.icon || '📦';
  const products = [];
  const errors = [];

  args.inputs.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    const text = fs.readFileSync(file, 'utf8');
    if (ext === '.jsonl' || ext === '.ndjson') {
      text.split(/\r?\n/).forEach((line, i) => {
        const t = line.trim();
        if (!t) return;
        try {
          const p = jsonlToProduct(JSON.parse(t));
          p.category = args.category;
          errors.push.apply(errors, validateProduct(p, path.basename(file) + ':' + (i + 1)));
          products.push(p);
        } catch (e) {
          errors.push(path.basename(file) + ':' + (i + 1) + ' JSON 解析失败 — ' + e.message);
        }
      });
    } else if (ext === '.csv') {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const header = splitCsvLine(lines[0]);
      lines.slice(1).forEach((line, i) => {
        const p = csvToProduct(splitCsvLine(line), header);
        p.category = args.category;
        errors.push.apply(errors, validateProduct(p, path.basename(file) + ':' + (i + 2)));
        products.push(p);
      });
    } else {
      errors.push(file + '：不支持的格式（仅 .jsonl / .ndjson / .csv）');
    }
  });

  // 全局去重
  const seen = new Set();
  const deduped = products.filter((p) => {
    if (seen.has(p.id)) { errors.push('重复 id 被丢弃：' + p.id); return false; }
    seen.add(p.id);
    return true;
  });

  if (errors.length) {
    console.error('校验发现 ' + errors.length + ' 个问题：');
    errors.slice(0, 40).forEach((e) => console.error('  ✗ ' + e));
    if (errors.some((e) => e.indexOf('缺 ') !== -1 || e.indexOf('为空') !== -1)) {
      console.error('已中止导入。');
      process.exit(1);
    }
  }

  const outRel = args.out || ('data/gen/' + args.category + '-import-' + Date.now() + '.js');
  const outPath = path.join(ROOT, outRel);
  if (fs.existsSync(outPath) && !args.force) {
    console.error('输出文件已存在：' + outRel + '（用 --force 覆盖）');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const chunk = {
    category: args.category,
    categoryName: categoryName,
    icon: icon,
    description: categoryName + '产品合集（批量导入）',
    products: deduped
  };
  const code = '/* 由 tools/import.js 自动生成 */\n' +
    'window.DB_CHUNKS = window.DB_CHUNKS || [];\n' +
    'window.DB_CHUNKS.push(' + JSON.stringify(chunk, null, 2) + ');\n';
  fs.writeFileSync(outPath, code, 'utf8');

  console.log('✓ 已导入 ' + deduped.length + ' 个产品 → ' + outRel);
  console.log('下一步： node tools/build-manifest.js && node tools/validate.js');
}

main();
