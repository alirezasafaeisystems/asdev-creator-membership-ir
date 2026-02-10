#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const ignore = new Set(['.git', 'node_modules', 'snapshots']);

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, acc);
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith('.sh') || entry.name.endsWith('.js'))) {
      acc.push(abs);
    }
  }
}

function run(cmd, args) {
  const out = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
  return { ok: out.status === 0, stdout: out.stdout || '', stderr: out.stderr || '' };
}

const files = [];
walk(root, files);

const shFiles = files.filter((f) => f.endsWith('.sh'));
const jsFiles = files.filter((f) => f.endsWith('.js'));

const errors = [];
for (const file of shFiles) {
  const r = run('bash', ['-n', file]);
  if (!r.ok) errors.push(`shell syntax failed: ${path.relative(root, file)}\n${r.stderr.trim()}`);
}
for (const file of jsFiles) {
  const r = run('node', ['--check', file]);
  if (!r.ok) errors.push(`node syntax failed: ${path.relative(root, file)}\n${r.stderr.trim()}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n\n'));
  process.exit(1);
}

console.log(`QUALITY_LINT_OK sh=${shFiles.length} js=${jsFiles.length}`);
