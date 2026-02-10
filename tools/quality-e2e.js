#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'patreon-iran-e2e-'));
const cloneDir = path.join(tmpRoot, 'repo');

function run(cmd, args, cwd) {
  const out = spawnSync(cmd, args, { cwd, stdio: 'pipe', encoding: 'utf8' });
  if (out.status !== 0) {
    console.error((out.stdout || '') + (out.stderr || ''));
    process.exit(out.status || 1);
  }
  return out;
}

run('bash', ['-lc', `cp -a "${root}" "${cloneDir}"`], root);
run('rm', ['-rf', path.join(cloneDir, '.git')], cloneDir);
run('git', ['init', '-q'], cloneDir);
run('git', ['config', 'user.name', 'quality-e2e'], cloneDir);
run('git', ['config', 'user.email', 'quality-e2e@example.com'], cloneDir);
run('git', ['checkout', '-b', 'quality/e2e'], cloneDir);
run('git', ['add', '-A'], cloneDir);
run('git', ['commit', '-m', 'quality e2e baseline'], cloneDir);

// Execute real phase-runner workflow on cloned repo to avoid mutating the working tree.
run('bash', ['tools/phase-runner/run.sh', 'P0'], cloneDir);

const manifest = path.join(cloneDir, 'snapshots/P0/manifest.json');
const report = path.join(cloneDir, 'snapshots/P0/report.md');
if (!fs.existsSync(manifest) || !fs.existsSync(report)) {
  console.error('E2E_FAIL: expected snapshot artifacts are missing');
  process.exit(1);
}

const tagsOut = run('git', ['tag', '--list', 'phase-P0-*'], cloneDir).stdout.trim();
if (!tagsOut) {
  console.error('E2E_FAIL: expected phase-P0 tag was not created');
  process.exit(1);
}

fs.rmSync(tmpRoot, { recursive: true, force: true });
console.log('QUALITY_E2E_OK');
