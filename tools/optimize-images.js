#!/usr/bin/env node
'use strict';
// JPG/PNG originals are immutable. Only a successful full build publishes the catalog.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const img = path.join(root, 'dist', 'img');
const output = path.join(root, 'data', 'img-meta.js');
const sharp = require('sharp');
const args = process.argv.slice(2);
const report = args.includes('--report');
const pos = args.indexOf('--limit');
if (pos !== -1 && !/^[1-9]\d*$/.test(args[pos + 1] || '')) throw new Error('--limit requires a positive integer');
const atomic = (file, data) => {
  const temp = `${file}.${process.pid}.tmp`;
  try { fs.writeFileSync(temp, data, {flag:'wx'}); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
};
async function main() {
  const files = fs.readdirSync(img).filter(f => /\.(?:jpe?g|png)$/i.test(f) && !/-thumb\.(?:jpe?g|png)$/i.test(f)).sort();
  if (!files.length) throw new Error('No source images');
  const meta = Object.create(null);
  let failures = 0, written = 0;
  for (const f of files.slice(0, pos === -1 ? files.length : Number(args[pos + 1]))) {
    try {
      const id = path.parse(f).name, source = path.join(img, f);
      if (meta[id]) throw new Error('Duplicate image basename');
      const md = await sharp(source).metadata();
      const swap = md.orientation >= 5 && md.orientation <= 8;
      const entry = {w:swap ? md.height : md.width, h:swap ? md.width : md.height, src:'img/' + f};
      for (const [key,suffix,edge,format,quality] of [['webp','.webp',1600,'webp',80],['thumb','-thumb.jpg',400,'jpeg',80],['thumbWebp','-thumb.webp',400,'webp',76]]) {
        const dest = path.join(img,id + suffix);
        let valid = false;
        if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(source).mtimeMs) {
          try { const d = await sharp(fs.readFileSync(dest)).metadata(); const scale = Math.min(1,edge / Math.max(entry.w, entry.h)); valid = d.format === format && Math.max(d.width,d.height) === Math.min(edge,Math.max(entry.w,entry.h)) && Math.abs(d.width-entry.w*scale) <= 1 && Math.abs(d.height-entry.h*scale) <= 1; } catch (_) { /* regenerate invalid variant */ }
        }
        if (!valid) {
          if (report) throw new Error('Missing/stale/invalid: ' + path.basename(dest));
          const buf = await sharp(source).rotate().resize({width:edge,height:edge,fit:'inside',withoutEnlargement:true}).toFormat(format,{quality}).toBuffer();
          atomic(dest,buf); written++;
        }
        entry[key] = 'img/' + id + suffix;
      }
      meta[id] = entry;
    } catch(e) { failures++; console.error(f + ': ' + e.message); }
  }
  if (!report && pos === -1 && !failures) atomic(output, 'window.DB_IMG_META = ' + JSON.stringify(meta) + ';\n');
  console.log(`sources=${files.length} verified=${Object.keys(meta).length} variantsWritten=${written} failures=${failures}`);
  if (failures) process.exitCode = 1;
}
main().catch(e => {console.error(e.message); process.exitCode=1;});
