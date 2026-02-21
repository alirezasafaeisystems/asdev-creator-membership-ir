#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const roadmapPath = path.join(root, 'docs/ROADMAP_PRODUCTION_PHASED.md');
const outPath = path.join(root, 'tasks/NEXT_PRODUCTION.md');
const evidenceLatestPath = path.join(root, '.codex/local-evidence/latest.json');
const evidenceRootPath = path.join(root, '.codex/local-evidence');
const routesPath = path.join(root, 'apps/api/src/routes.ts');
const serverPath = path.join(root, 'apps/api/src/server.ts');
const smokeIdpayPath = path.join(root, 'scripts/automation/smoke-idpay-callback.sh');
const dbBackupPath = path.join(root, 'scripts/automation/db-backup.sh');
const dbRestorePath = path.join(root, 'scripts/automation/db-restore.sh');
const packageJsonPath = path.join(root, 'package.json');
const productionEvidenceRootPath = path.join(root, '.codex/production-evidence');

if (!fs.existsSync(roadmapPath)) {
  console.error(`ERROR: missing ${roadmapPath}`);
  process.exit(1);
}

const roadmap = fs.readFileSync(roadmapPath, 'utf8');
const phaseMatches = [...roadmap.matchAll(/^##\s+Production Phase\s+([A-Z])\s+-\s+(.+)$/gm)];
if (phaseMatches.length === 0) {
  console.error('ERROR: no production phases found');
  process.exit(1);
}

function readJsonIfExists(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const evidenceLatest = readJsonIfExists(evidenceLatestPath);
function findMostRecentAllEvidence() {
  if (!fs.existsSync(evidenceRootPath)) return null;
  const dirs = fs
    .readdirSync(evidenceRootPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();
  for (const d of dirs) {
    const payload = readJsonIfExists(path.join(evidenceRootPath, d, 'result.json'));
    if (payload && payload.mode === 'all' && payload.overallOk === true && Array.isArray(payload.items)) return payload;
  }
  return null;
}
const evidenceAll = evidenceLatest && evidenceLatest.mode === 'all' ? evidenceLatest : findMostRecentAllEvidence();
const routes = fs.existsSync(routesPath) ? fs.readFileSync(routesPath, 'utf8') : '';
const server = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, 'utf8') : '';
const smokeIdpay = fs.existsSync(smokeIdpayPath) ? fs.readFileSync(smokeIdpayPath, 'utf8') : '';
const packageJson = fs.existsSync(packageJsonPath) ? fs.readFileSync(packageJsonPath, 'utf8') : '';

function hasProductionEvidenceTag(tag) {
  if (!fs.existsSync(productionEvidenceRootPath)) return false;
  const entries = fs.readdirSync(productionEvidenceRootPath, { withFileTypes: true });
  return entries.some((e) => e.isDirectory() && e.name.endsWith(`-${tag}`) && fs.existsSync(path.join(productionEvidenceRootPath, e.name, 'summary.md')));
}

function hasOk(payload, pattern) {
  if (!payload || !Array.isArray(payload.items)) return false;
  return payload.items.some((x) => x.ok === true && typeof x.cmd === 'string' && x.cmd.includes(pattern));
}

const gates = {
  docs: hasOk(evidenceLatest, 'pnpm -w docs:validate') || hasOk(evidenceAll, 'pnpm -w docs:validate'),
  lint: hasOk(evidenceLatest, 'pnpm -w lint') || hasOk(evidenceAll, 'pnpm -w lint'),
  typecheck: hasOk(evidenceLatest, 'pnpm -w typecheck') || hasOk(evidenceAll, 'pnpm -w typecheck'),
  localFirst: hasOk(evidenceLatest, 'pnpm -w local-first:scan') || hasOk(evidenceAll, 'pnpm -w local-first:scan'),
  test: hasOk(evidenceLatest, 'pnpm -w test') || hasOk(evidenceAll, 'pnpm -w test'),
  build: hasOk(evidenceLatest, 'pnpm -w build') || hasOk(evidenceAll, 'pnpm -w build'),
  contracts: hasOk(evidenceLatest, 'pnpm -w contracts:check') || hasOk(evidenceAll, 'pnpm -w contracts:check'),
  perf: hasOk(evidenceLatest, 'pnpm -w perf:check') || hasOk(evidenceAll, 'pnpm -w perf:check'),
  smokeAll: hasOk(evidenceLatest, 'pnpm -w smoke:all') || hasOk(evidenceAll, 'pnpm -w smoke:all'),
  evidenceAll:
    (evidenceLatest && evidenceLatest.mode === 'all' && evidenceLatest.overallOk === true) ||
    (evidenceAll && evidenceAll.mode === 'all' && evidenceAll.overallOk === true) ||
    hasOk(evidenceLatest, 'pnpm -w evidence:record') ||
    hasOk(evidenceAll, 'pnpm -w evidence:record'),
};

const phaseDone = {
  A:
    gates.docs &&
    gates.contracts &&
    routes.includes('webhook_receipts') &&
    routes.includes('payment.callback_replay') &&
    smokeIdpay.includes('replayed=true') &&
    hasProductionEvidenceTag('phase-a'),
  B:
    gates.docs &&
    fs.existsSync(dbBackupPath) &&
    fs.existsSync(dbRestorePath) &&
    packageJson.includes('"db:backup"') &&
    packageJson.includes('"db:restore"') &&
    hasProductionEvidenceTag('phase-b'),
  C:
    gates.docs &&
    server.includes('X-Content-Type-Options') &&
    server.includes('X-Frame-Options') &&
    server.includes('Referrer-Policy') &&
    server.includes('Permissions-Policy'),
  D: gates.docs && gates.contracts && gates.perf && hasProductionEvidenceTag('phase-d'),
  E: gates.docs && gates.build && gates.smokeAll && hasProductionEvidenceTag('phase-e'),
  F: gates.perf && gates.build && hasProductionEvidenceTag('phase-f'),
  G: gates.contracts && gates.localFirst && gates.docs && hasProductionEvidenceTag('phase-g'),
};

const lines = [];
lines.push('# Next Production Tasks (No Timeline)');
lines.push('');
lines.push(`> Updated: ${new Date().toISOString().slice(0, 10)}`);
lines.push('> Rule: production phases close only with evidence-backed exits.');
lines.push('');
lines.push('## Production Phase Board');
for (const m of phaseMatches) {
  const id = m[1];
  const title = m[2].trim();
  const status = Boolean(phaseDone[id] || false);
  const implemented = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(id) ? status : false;
  const validated = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(id) ? status : false;
  lines.push(`### Production Phase ${id} - ${title}`);
  lines.push(`- [${status ? 'x' : ' '}] Phase status`);
  lines.push(`- [${implemented ? 'x' : ' '}] Implement scope items for Phase ${id}`);
  lines.push(`- [${validated ? 'x' : ' '}] Validate exit criteria for Phase ${id}`);
  lines.push('');
}

lines.push('## Global Production Gates');
lines.push(`- [${gates.docs ? 'x' : ' '}] \`pnpm -w docs:validate\``);
lines.push(`- [${gates.lint ? 'x' : ' '}] \`pnpm -w lint\``);
lines.push(`- [${gates.typecheck ? 'x' : ' '}] \`pnpm -w typecheck\``);
lines.push(`- [${gates.localFirst ? 'x' : ' '}] \`pnpm -w local-first:scan\``);
lines.push(`- [${gates.test ? 'x' : ' '}] \`pnpm -w test\``);
lines.push(`- [${gates.build ? 'x' : ' '}] \`pnpm -w build\``);
lines.push(`- [${gates.contracts ? 'x' : ' '}] \`pnpm -w contracts:check\``);
lines.push(`- [${gates.perf ? 'x' : ' '}] \`pnpm -w perf:check\``);
lines.push(`- [${gates.smokeAll ? 'x' : ' '}] \`pnpm -w smoke:all\``);
lines.push(`- [${gates.evidenceAll ? 'x' : ' '}] \`pnpm -w evidence:record\``);
lines.push('');

lines.push('## Automation Commands');
lines.push('- `pnpm -w roadmap:sync-next:production`');
lines.push('- `pnpm -w run:local:full`');
lines.push('- `pnpm -w autopilot:phase-loop`');
lines.push('- `pnpm -w autopilot:daemon:start`');
lines.push('');

fs.writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`SYNC_NEXT_PRODUCTION_OK phases=${phaseMatches.length} output=${path.relative(root, outPath)}`);
