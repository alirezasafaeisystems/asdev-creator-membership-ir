#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const staticDir = path.join(root, 'apps/web/.next/static');
const maxBytes = Number(process.env.WEB_STATIC_MAX_BYTES || 2_800_000);

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push({ path: p, size: st.size });
  }
  return out;
}

if (!fs.existsSync(staticDir)) {
  console.log('PERF_SKIP missing apps/web/.next/static (run build first)');
  process.exit(0);
}

const files = walk(staticDir).filter((f) => f.path.endsWith('.js') || f.path.endsWith('.css'));
const total = files.reduce((n, f) => n + f.size, 0);
if (total > maxBytes) {
  console.error(`PERF_FAIL static_bytes=${total} limit=${maxBytes}`);
  process.exit(1);
}
console.log(`PERF_OK static_bytes=${total} limit=${maxBytes} files=${files.length}`);
