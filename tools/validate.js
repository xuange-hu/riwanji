#!/usr/bin/env node
/* ============================================================
   tools/validate.js
   校验 data/*.js 全部数据分片的结构与内容质量。
   用法： node tools/validate.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const REQUIRED_FIELDS = ['id', 'name', 'brand', 'category', 'year', 'tags', 'summary',
  'specs', 'scores', 'score', 'userScore', 'pros', 'cons', 'review'];

function loadChunk(file) {
  const code = fs.readFileSync(file, 'utf8');
  const window = {};
  new Function('window', code)(window);
  return window.DB_CHUNKS || [];
}

/* data/enrich/*.js → DB_MEDIA（图片/测评补充，参与完整性检查） */
function loadEnrich() {
  const dir = path.join(DATA_DIR, 'enrich');
  const merged = {};
  if (!fs.existsSync(dir)) return merged;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    try {
      const window = {};
      new Function('window', 'module', fs.readFileSync(path.join(dir, f), 'utf8'))(window, {});
      Object.assign(merged, window.DB_MEDIA || {});
    } catch (e) { /* 忽略损坏的 enrich 文件 */ }
  }
  return merged;
}

function strLen(s) {
  // 中英混合计数：按字符数
  return String(s == null ? '' : s).length;
}

function listShards() {
  const top = fs.readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.js') && f !== 'manifest.js' && f !== 'brand-alias.js' && f !== 'categories.js')
    .map((f) => ({ abs: path.join(DATA_DIR, f), rel: 'data/' + f }));
  const genDir = path.join(DATA_DIR, 'gen');
  const gen = fs.existsSync(genDir)
    ? fs.readdirSync(genDir).filter((f) => f.endsWith('.js'))
      .map((f) => ({ abs: path.join(genDir, f), rel: 'data/gen/' + f }))
    : [];
  return top.concat(gen).sort((a, b) => a.rel.localeCompare(b.rel));
}

function main() {
  const files = listShards();
  const ENRICH = loadEnrich();

  const errors = [];
  const warnings = [];
  const idIndex = new Map();
  let total = 0;
  let mediaHits = 0;

  for (const { abs, rel: f } of files) {
    let chunks;
    try {
      chunks = loadChunk(abs);
    } catch (e) {
      errors.push(f + '：语法/执行错误 — ' + e.message);
      continue;
    }

    chunks.forEach((c, ci) => {
      if (!c.category) errors.push(f + '：第 ' + (ci + 1) + ' 个 chunk 缺少 category');
      if (!c.categoryName) warnings.push(f + '：第 ' + (ci + 1) + ' 个 chunk 缺少 categoryName');

      (c.products || []).forEach((p, pi) => {
        const at = f + ' → ' + (p.id || ('#' + pi));
        total++;

        REQUIRED_FIELDS.forEach((k) => {
          if (p[k] == null) errors.push(at + '：缺少字段 ' + k);
        });

        if (p.id) {
          if (idIndex.has(p.id)) errors.push(at + '：id 重复（也出现在 ' + idIndex.get(p.id) + '）');
          else idIndex.set(p.id, f);
          if (!/^[a-z0-9-]+$/.test(p.id)) warnings.push(at + '：id 含非常规字符');
        }
        if (p.category && c.category && p.category !== c.category) {
          errors.push(at + '：category 与外层不一致（' + p.category + ' vs ' + c.category + '）');
        }
        if (Array.isArray(p.tags) && (p.tags.length < 2 || p.tags.length > 6)) {
          warnings.push(at + '：tags 数量为 ' + p.tags.length + '（建议 3-5）');
        }
        if (Array.isArray(p.specs)) {
          if (p.specs.length < 5) warnings.push(at + '：specs 仅 ' + p.specs.length + ' 项');
          p.specs.forEach((s) => {
            if (!Array.isArray(s) || s.length !== 2) errors.push(at + '：specs 项不是 [键, 值] 二元组');
          });
        } else if (p.specs != null) errors.push(at + '：specs 不是数组');

        if (Array.isArray(p.scores)) {
          p.scores.forEach((s) => {
            if (!Array.isArray(s) || s.length !== 2) errors.push(at + '：scores 项不是 [维度, 分值] 二元组');
            else if (typeof s[1] !== 'number' || s[1] < 0 || s[1] > 100) errors.push(at + '：scores 分值越界 ' + s[1]);
          });
        } else if (p.scores != null) errors.push(at + '：scores 不是数组');

        if (typeof p.score !== 'number' || p.score < 0 || p.score > 10) errors.push(at + '：score 应为 0-10 数值');
        if (typeof p.userScore !== 'number' || p.userScore < 0 || p.userScore > 10) errors.push(at + '：userScore 应为 0-10 数值');
        if (Array.isArray(p.pros) && p.pros.length < 2) warnings.push(at + '：pros 少于 2 条');
        if (Array.isArray(p.cons) && p.cons.length < 1) warnings.push(at + '：cons 为空');

        if (p.review && typeof p.review === 'object') {
          /* bulk 海量 SKU 的 review 为紧凑生成文本，长度建议仅适用于精选产品 */
          const isBulk = p.source === 'bulk';
          ['objective', 'subjective'].forEach((k) => {
            const len = strLen(p.review[k]);
            if (!isBulk && len < 80) warnings.push(at + '：review.' + k + ' 仅 ' + len + ' 字（建议 120-200）');
            if (!isBulk && len > 260) warnings.push(at + '：review.' + k + ' 达 ' + len + ' 字（建议 120-200）');
          });
        } else if (p.review != null) {
          errors.push(at + '：review 不是含 objective/subjective 的对象');
        }

        /* 图片与测评索引（image / media，可选但越新要求越高；enrich 补充数据也计入） */
        const ex = ENRICH[p.id] || {};
        const img = p.image || ex.image;
        const med = (p.media && p.media.length ? p.media : ex.media) || [];
        if (img != null && !/^https?:\/\//.test(img)) {
          errors.push(at + '：image 不是 http(s) 图片直链');
        }
        if (med.length) {
          mediaHits++;
          med.forEach((m, mi) => {
            const mat = at + ' → media[' + mi + ']';
            if (!m || typeof m !== 'object') { errors.push(mat + '：不是对象'); return; }
            if (!m.title) errors.push(mat + '：缺少 title');
            if (!m.url || !/^https?:\/\//.test(m.url)) errors.push(mat + '：url 非法（必须 http(s) 真实链接）');
            if (!['institution', 'review', 'video', 'community', 'web'].includes(m.kind)) {
              errors.push(mat + '：kind 非法（institution/review/video/community/web）');
            }
          });
        }
        /* 图片要求随年代递增（仅精选产品；bulk 海量 SKU 设计上用海报变体兜底图集） */
        if (typeof p.year === 'number' && p.source !== 'bulk') {
          if (p.year >= 2020 && !img) {
            warnings.push(at + '：' + p.year + ' 年产品缺少图片（新产品图片要求更高）');
          } else if (p.year >= 2015 && !img && !med.length) {
            warnings.push(at + '：' + p.year + ' 年产品缺少图片与测评索引');
          }
        }
      });
    });
  }

  console.log('══════ 数据校验报告 ══════');
  console.log('分片文件：' + files.length + ' 个，产品：' + total + ' 个，唯一 id：' + idIndex.size + ' 个');
  console.log('含测评索引：' + mediaHits + ' 个，enrich 补充：' + Object.keys(ENRICH).length + ' 个');
  console.log('错误 ' + errors.length + ' 条，警告 ' + warnings.length + ' 条');
  if (errors.length) {
    console.log('\n— 错误 —');
    errors.forEach((e) => console.log('  ✗ ' + e));
  }
  if (warnings.length) {
    console.log('\n— 警告 —');
    warnings.slice(0, 60).forEach((w) => console.log('  ! ' + w));
    if (warnings.length > 60) console.log('  …… 其余 ' + (warnings.length - 60) + ' 条警告已省略');
  }
  process.exit(errors.length ? 1 : 0);
}

main();
