#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();

function run(cmd, args) {
  const out = spawnSync(cmd, args, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  if (out.status !== 0) {
    console.error((out.stdout || '') + (out.stderr || ''));
    process.exit(out.status || 1);
  }
}

// Unit-level checks for core local modules/scripts.
run('node', ['tools/docs-validator/validate.js']);
run('node', ['tools/security/validate-sensitive-policies.js']);

const requiredFiles = [
  'tools/phase-runner/run.sh',
  'tools/phase-runner/phases.json',
  'ops/scripts/backup_db.sh',
  'ops/scripts/restore_db.sh',
];
for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`UNIT_FAIL: missing file ${rel}`);
    process.exit(1);
  }
}

console.log('QUALITY_UNIT_OK');
