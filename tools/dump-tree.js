/* dump-tree.js — 完整摊开品类树：每组每品类的细分变体，供人工核对缺口 */
const T = require('../data/categories.js');
for (const g of T.groups) {
  console.log('\n【' + g.icon + ' ' + g.name + '】 (' + g.id + ')');
  for (const b of g.bases) {
    const leaves = T.leaves.filter((l) => l.baseId === b.id);
    const variants = leaves.filter((l) => l.variant).map((l) => l.variant);
    console.log('  ' + b.icon + ' ' + b.name + ' [' + b.id + '] kind=' + b.kind + ' 品牌=' + (b.brands || []).length + ' 细分=' + leaves.length);
    console.log('      变体: ' + (variants.join('、') || '(无)'));
  }
}
console.log('\n═══ 统计: ' + T.stats.groups + ' 组 / ' + T.stats.bases + ' 品类 / ' + T.stats.leaves + ' 细分 ═══');
