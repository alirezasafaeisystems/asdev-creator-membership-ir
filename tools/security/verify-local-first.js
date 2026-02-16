#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetDirs = ['apps', 'modules']
  .map((d) => path.join(root, d))
  .filter((abs) => fs.existsSync(abs) && fs.statSync(abs).isDirectory());

const ignoreDirs = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.cache',
]);

const scanExtensions = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '.scss',
  '.html',
  '.json',
  '.yml',
  '.yaml',
]);

const rules = [
  { id: 'next_font_google', re: /next\/font\/google/g },
  { id: 'google_fonts_api', re: /https?:\/\/fonts\.googleapis\.com/gi },
  { id: 'google_fonts_static', re: /https?:\/\/fonts\.gstatic\.com/gi },
  { id: 'jsdelivr', re: /https?:\/\/cdn\.jsdelivr\.net/gi },
  { id: 'unpkg', re: /https?:\/\/unpkg\.com/gi },
  { id: 'cdnjs', re: /https?:\/\/cdnjs\.cloudflare\.com/gi },
  { id: 'googletagmanager', re: /https?:\/\/www\.googletagmanager\.com/gi },
  { id: 'google_analytics', re: /https?:\/\/www\.google-analytics\.com/gi },
  { id: 'external_script_tag', re: /<script[^>]+src=["']https?:\/\/[^"']+/gi },
  { id: 'external_link_tag', re: /<link[^>]+href=["']https?:\/\/[^"']+/gi },
  { id: 'css_import_url', re: /@import\s+url\(\s*["']https?:\/\/[^"')]+["']\s*\)/gi },
];

function shouldIgnoreDir(dirName) {
  return ignoreDirs.has(dirName);
}

function* walk(dirAbs) {
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      yield* walk(path.join(dirAbs, entry.name));
      continue;
    }
    if (!entry.isFile()) continue;
    const abs = path.join(dirAbs, entry.name);
    if (!scanExtensions.has(path.extname(entry.name))) continue;
    yield abs;
  }
}

function findLineCol(text, index) {
  const prefix = text.slice(0, index);
  const lines = prefix.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

const matches = [];
let filesScanned = 0;

for (const dir of targetDirs) {
  for (const fileAbs of walk(dir)) {
    filesScanned += 1;
    let content;
    try {
      content = fs.readFileSync(fileAbs, 'utf8');
    } catch {
      continue;
    }

    for (const rule of rules) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(content))) {
        const { line, col } = findLineCol(content, m.index);
        matches.push({
          rule: rule.id,
          file: path.relative(root, fileAbs),
          line,
          col,
          snippet: String(m[0]).slice(0, 160),
        });
      }
    }
  }
}

if (matches.length > 0) {
  console.error('LOCAL_FIRST_SCAN_FAILED');
  for (const m of matches.slice(0, 100)) {
    console.error(` - ${m.rule}: ${m.file}:${m.line}:${m.col} ${m.snippet}`);
  }
  if (matches.length > 100) console.error(`... and ${matches.length - 100} more`);
  process.exit(1);
}

console.log(`LOCAL_FIRST_SCAN_OK files=${filesScanned}`);
