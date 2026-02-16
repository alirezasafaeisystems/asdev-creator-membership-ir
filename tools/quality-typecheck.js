#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const phasesPath = path.join(root, 'tools/phase-runner/phases.json');
const pkgPath = path.join(root, 'package.json');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const phasesData = JSON.parse(fs.readFileSync(phasesPath, 'utf8'));
if (!Array.isArray(phasesData.phases) || phasesData.phases.length === 0) {
  fail('TYPECHECK_FAIL: phases[] missing or empty');
}

const phaseIds = new Set();
for (const phase of phasesData.phases) {
  if (!phase || typeof phase !== 'object') fail('TYPECHECK_FAIL: invalid phase item');
  if (!phase.id || typeof phase.id !== 'string') fail('TYPECHECK_FAIL: phase.id missing');
  if (phaseIds.has(phase.id)) fail(`TYPECHECK_FAIL: duplicate phase id ${phase.id}`);
  phaseIds.add(phase.id);

  if (!phase.name || typeof phase.name !== 'string') fail(`TYPECHECK_FAIL: phase ${phase.id} name missing`);
  if (!Array.isArray(phase.docsToUpdate) || phase.docsToUpdate.length === 0) {
    fail(`TYPECHECK_FAIL: phase ${phase.id} docsToUpdate missing`);
  }
  for (const doc of phase.docsToUpdate) {
    const abs = path.join(root, doc);
    if (!fs.existsSync(abs)) fail(`TYPECHECK_FAIL: missing docsToUpdate file ${doc}`);
  }

  if (!Array.isArray(phase.gates) || phase.gates.length === 0) {
    fail(`TYPECHECK_FAIL: phase ${phase.id} gates missing`);
  }
  const gateIds = new Set();
  for (const gate of phase.gates) {
    if (!gate.id || !gate.cmd) fail(`TYPECHECK_FAIL: phase ${phase.id} gate invalid`);
    if (gateIds.has(gate.id)) fail(`TYPECHECK_FAIL: phase ${phase.id} duplicate gate id ${gate.id}`);
    gateIds.add(gate.id);
    if (typeof gate.cmd !== 'string' || gate.cmd.trim().length === 0) {
      fail(`TYPECHECK_FAIL: phase ${phase.id} gate ${gate.id} has empty cmd`);
    }
    const nodeMatch = gate.cmd.match(/^node\s+([^\s]+\.js)\s*$/);
    if (nodeMatch) {
      const target = path.join(root, nodeMatch[1]);
      if (!fs.existsSync(target)) {
        fail(`TYPECHECK_FAIL: phase ${phase.id} gate ${gate.id} target missing ${nodeMatch[1]}`);
      }
    }
  }

  if (!phase.nextTasksTemplate || typeof phase.nextTasksTemplate !== 'string') {
    fail(`TYPECHECK_FAIL: phase ${phase.id} nextTasksTemplate missing`);
  }
  const templateAbs = path.join(root, phase.nextTasksTemplate);
  if (!fs.existsSync(templateAbs)) {
    fail(`TYPECHECK_FAIL: nextTasksTemplate missing ${phase.nextTasksTemplate}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
for (const key of ['lint', 'typecheck', 'test:unit', 'test:integration', 'test:e2e', 'docs:validate']) {
  const script = pkg.scripts?.[key];
  if (!script || typeof script !== 'string') fail(`TYPECHECK_FAIL: package.json scripts.${key} missing`);
  if (/TODO/i.test(script)) fail(`TYPECHECK_FAIL: package.json scripts.${key} still contains TODO`);
}

const criticalDocs = [
  'docs/GOVERNANCE.md',
  'docs/CODE_OWNERSHIP.md',
  'docs/CONTRIBUTING.md',
  'docs/POLICIES/DATA_POLICY.md',
  'docs/POLICIES/DEPENDENCY_POLICY.md',
  'docs/POLICIES/BRANCH_RELEASE_POLICY.md',
  'docs/DEVELOPMENT/Definition_of_Done.md',
];
for (const doc of criticalDocs) {
  const abs = path.join(root, doc);
  if (!fs.existsSync(abs)) fail(`TYPECHECK_FAIL: missing critical doc ${doc}`);
  const content = fs.readFileSync(abs, 'utf8');
  if (/\(Placeholder\)/i.test(content)) {
    fail(`TYPECHECK_FAIL: placeholder remains in critical doc ${doc}`);
  }
}

console.log(`QUALITY_TYPECHECK_OK phases=${phasesData.phases.length}`);
