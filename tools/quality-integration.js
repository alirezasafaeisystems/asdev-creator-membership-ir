#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const phases = JSON.parse(fs.readFileSync(path.join(root, 'tools/phase-runner/phases.json'), 'utf8')).phases;

function runGate(cmd) {
  const out = spawnSync(cmd, { cwd: root, shell: true, stdio: 'pipe', encoding: 'utf8' });
  return { ok: out.status === 0, output: (out.stdout || '') + (out.stderr || '') };
}

for (const phase of phases) {
  for (const gate of phase.gates || []) {
    const result = runGate(gate.cmd);
    if (!result.ok) {
      console.error(`INTEGRATION_FAIL phase=${phase.id} gate=${gate.id} cmd=${gate.cmd}`);
      console.error(result.output.trim());
      process.exit(1);
    }
  }
}

console.log(`QUALITY_INTEGRATION_OK phases=${phases.length}`);
