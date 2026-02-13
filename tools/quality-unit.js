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

run('node', ['tools/docs-validator/validate.js']);
run('node', ['tools/security/validate-sensitive-policies.js']);

const requiredFiles = [
  'tools/phase-runner/run.sh',
  'tools/phase-runner/phases.json',
  'ops/scripts/backup_db.sh',
  'ops/scripts/restore_db.sh',
  'ops/dashboards/development-dashboard.html',
  'ops/dashboards/deploy-dashboard.html',
];
for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`UNIT_FAIL: missing file ${rel}`);
    process.exit(1);
  }
}

const backup = fs.readFileSync(path.join(root, 'ops/scripts/backup_db.sh'), 'utf8');
if (!/pg_dump/.test(backup) || /TODO/.test(backup)) {
  console.error('UNIT_FAIL: backup_db.sh must implement pg_dump and contain no TODO');
  process.exit(1);
}

const restore = fs.readFileSync(path.join(root, 'ops/scripts/restore_db.sh'), 'utf8');
if (!/pg_restore/.test(restore) || /TODO/.test(restore)) {
  console.error('UNIT_FAIL: restore_db.sh must implement pg_restore and contain no TODO');
  process.exit(1);
}

console.log('QUALITY_UNIT_OK');
