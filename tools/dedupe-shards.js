/* 一次性：从旧分片中移除与 data/vintage.js 重复的低参数产品（vintage.js 版本参数 25-28 行更全） */
const fs = require('fs');

const jobs = [
  ['data/phone.js', ['nokia-3310']],
  ['data/console-2.js', ['sega-mega-drive', 'nintendo-famicom', 'atari-2600']],
];

for (const [file, ids] of jobs) {
  let text = fs.readFileSync(file, 'utf8');
  for (const id of ids) {
    const idPos = text.indexOf(`      id: "${id}",`);
    if (idPos === -1) { console.log('未找到', file, id); continue; }
    const start = text.lastIndexOf('\n    {', idPos) + 1;
    let end = text.indexOf('\n    },', idPos);
    if (end === -1) end = text.indexOf('\n    }', idPos);
    else end += '\n    },'.length;
    // 连同后面的换行一起删
    if (text[end] === '\n') end += 1;
    text = text.slice(0, start) + text.slice(end);
    console.log('已移除', file, id);
  }
  // 清理可能残留的 "},\n  ]" 前多余逗号：products 数组结尾若出现 ",\n  ]" 则去逗号
  text = text.replace(/,\s*\n(\s*)\]\)/, '\n$1])');
  fs.writeFileSync(file, text);
}
console.log('完成');
