#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const roadmapPath = path.join(root, 'docs/ROADMAP_PHASED.md');
const statusPath = path.join(root, 'docs/PROJECT_STATUS.md');
const nextPath = path.join(root, 'tasks/NEXT.md');
const routesPath = path.join(root, 'apps/api/src/routes.ts');
const paymentsPath = path.join(root, 'apps/api/src/payments.ts');
const adminPath = path.join(root, 'apps/api/src/admin.ts');
const rateLimitPath = path.join(root, 'apps/api/src/rateLimit.ts');
const serverPath = path.join(root, 'apps/api/src/server.ts');
const schemaPath = path.join(root, 'apps/api/db/schema.sql');
const webCreatorsPagePath = path.join(root, 'apps/web/app/creators/page.tsx');
const webCreatorSlugPagePath = path.join(root, 'apps/web/app/creators/[slug]/page.tsx');
const webSitemapPath = path.join(root, 'apps/web/app/sitemap.ts');
const localStartPath = path.join(root, 'scripts/automation/local-stack-start.sh');
const localStopPath = path.join(root, 'scripts/automation/local-stack-stop.sh');
const localStatusPath = path.join(root, 'scripts/automation/local-stack-status.sh');
const performancePath = path.join(root, 'tools/quality-performance.js');
const contractsPath = path.join(root, 'tools/contracts-check.js');
const smokeAllPath = path.join(root, 'scripts/automation/smoke-all.sh');
const evidenceLatestPath = path.join(root, '.codex/local-evidence/latest.json');
const evidenceRootPath = path.join(root, '.codex/local-evidence');
const docsIndexPath = path.join(root, 'docs/INDEX.md');

if (!fs.existsSync(roadmapPath)) {
  console.error(`ERROR: missing ${roadmapPath}`);
  process.exit(1);
}

const roadmap = fs.readFileSync(roadmapPath, 'utf8');
const status = fs.existsSync(statusPath) ? fs.readFileSync(statusPath, 'utf8') : '';
const routes = fs.existsSync(routesPath) ? fs.readFileSync(routesPath, 'utf8') : '';
const payments = fs.existsSync(paymentsPath) ? fs.readFileSync(paymentsPath, 'utf8') : '';
const admin = fs.existsSync(adminPath) ? fs.readFileSync(adminPath, 'utf8') : '';
const rateLimit = fs.existsSync(rateLimitPath) ? fs.readFileSync(rateLimitPath, 'utf8') : '';
const server = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, 'utf8') : '';
const schema = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';
const webCreatorsPage = fs.existsSync(webCreatorsPagePath) ? fs.readFileSync(webCreatorsPagePath, 'utf8') : '';
const webCreatorSlugPage = fs.existsSync(webCreatorSlugPagePath) ? fs.readFileSync(webCreatorSlugPagePath, 'utf8') : '';
const webSitemap = fs.existsSync(webSitemapPath) ? fs.readFileSync(webSitemapPath, 'utf8') : '';
const localStart = fs.existsSync(localStartPath) ? fs.readFileSync(localStartPath, 'utf8') : '';
const localStop = fs.existsSync(localStopPath) ? fs.readFileSync(localStopPath, 'utf8') : '';
const localStatus = fs.existsSync(localStatusPath) ? fs.readFileSync(localStatusPath, 'utf8') : '';
const performance = fs.existsSync(performancePath) ? fs.readFileSync(performancePath, 'utf8') : '';
const contracts = fs.existsSync(contractsPath) ? fs.readFileSync(contractsPath, 'utf8') : '';
const smokeAll = fs.existsSync(smokeAllPath) ? fs.readFileSync(smokeAllPath, 'utf8') : '';
const docsIndex = fs.existsSync(docsIndexPath) ? fs.readFileSync(docsIndexPath, 'utf8') : '';
const evidenceLatest = fs.existsSync(evidenceLatestPath) ? JSON.parse(fs.readFileSync(evidenceLatestPath, 'utf8')) : null;

function readJsonIfExists(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

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
    if (payload && payload.mode === 'all' && payload.overallOk === true && Array.isArray(payload.items)) {
      return payload;
    }
  }
  return null;
}

const evidenceAll = evidenceLatest && evidenceLatest.mode === 'all' ? evidenceLatest : findMostRecentAllEvidence();
const phaseMatches = [...roadmap.matchAll(/^##\s+Phase\s+(\d+)\s+-\s+(.+)$/gm)];

if (phaseMatches.length === 0) {
  console.error('ERROR: no phases found in docs/ROADMAP_PHASED.md');
  process.exit(1);
}

const doneSignals = [
  'Quality and governance gates are green',
  'Real smoke flow is validated',
];
const baselineDone = doneSignals.every((s) => status.includes(s));

function evidenceHasOk(pattern) {
  if (!evidenceLatest || !Array.isArray(evidenceLatest.items)) return false;
  return evidenceLatest.items.some((x) => x.ok === true && typeof x.cmd === 'string' && x.cmd.includes(pattern));
}
function evidenceAllHasOk(pattern) {
  if (!evidenceAll || !Array.isArray(evidenceAll.items)) return false;
  return evidenceAll.items.some((x) => x.ok === true && typeof x.cmd === 'string' && x.cmd.includes(pattern));
}

const gatesCoreOk =
  evidenceHasOk('pnpm -w docs:validate') &&
  evidenceHasOk('pnpm -w lint') &&
  evidenceHasOk('pnpm -w typecheck') &&
  evidenceHasOk('pnpm -w local-first:scan') &&
  evidenceHasOk('pnpm -w test') &&
  evidenceHasOk('pnpm -w build');
const smokeAllOk = evidenceHasOk('pnpm -w smoke:all') || evidenceAllHasOk('pnpm -w smoke:all');
const contractsOk = evidenceHasOk('pnpm -w contracts:check') || evidenceAllHasOk('pnpm -w contracts:check');
const perfOk = evidenceHasOk('pnpm -w perf:check') || evidenceAllHasOk('pnpm -w perf:check');
const regressionOk =
  (evidenceHasOk('pnpm -w test:integration') && evidenceHasOk('pnpm -w test:e2e')) ||
  (evidenceAllHasOk('pnpm -w test:integration') && evidenceAllHasOk('pnpm -w test:e2e'));
const syncNextOk = evidenceHasOk('pnpm -w roadmap:sync-next');
const docsIndexAligned =
  evidenceHasOk('pnpm -w docs:validate') &&
  docsIndex.includes('docs/DEVELOPMENT/03_Test_Strategy.md') &&
  docsIndex.includes('docs/DEVELOPMENT/Definition_of_Done.md');
const localFirstEnforced = evidenceHasOk('pnpm -w local-first:scan');

const phaseChecks = {
  '1': {
    cancel: routes.includes("/api/v1/subscriptions/cancel"),
    paymentById: routes.includes("/api/v1/payments/:id"),
    dbHealth: routes.includes("/api/v1/health/db"),
  },
  '2': {
    adapter: payments.includes('createIdpayAdapter') && payments.includes('createPaymentGatewayAdapter'),
    signature: payments.includes('PAYMENT_WEBHOOK_SIGNATURE_INVALID') && payments.includes('x-gateway-signature'),
    reconcile: admin.includes("/api/v1/payments/reconcile") && admin.includes('summary') && admin.includes('payment.reconcile'),
  },
  '3': {
    rbac: admin.includes('requireAdminRole') && !admin.includes("x-admin-key") && admin.includes('platform_admin'),
    roles: admin.includes('support_admin') && admin.includes('auditor'),
    rateLimit:
      rateLimit.includes('policies') &&
      server.includes('pattern: /^\\/api\\/v1\\/auth\\//') &&
      server.includes('pattern: /^\\/api\\/v1\\/payments\\/[^/]+\\/callback/') &&
      server.includes('/callback'),
  },
  '4': {
    storage: schema.includes('CREATE TABLE IF NOT EXISTS contents'),
    download: (routes.includes("/api/v1/download/:token") || routes.includes("/api/v1/download/*")) && routes.includes("/api/v1/content/:id/access-token"),
    membership: routes.includes('Active subscription required') && routes.includes("status='ACTIVE'"),
  },
  '5': {
    publicPages:
      webCreatorsPage.includes('کشف کریتور') &&
      webCreatorSlugPage.includes('generateMetadata') &&
      routes.includes("/api/v1/creators/:slug/plans"),
    searchFilter: routes.includes("/api/v1/creators") && routes.includes("req.query?.q"),
    seo: webSitemap.includes('export default async function sitemap') && webCreatorSlugPage.includes('application/ld+json'),
  },
  '6': {
    localRuntime:
      (localStart.includes('pnpm api:dev') || localStart.includes('pnpm -C apps/api dev')) &&
      (localStart.includes('pnpm dev') || localStart.includes('pnpm -C apps/web dev')) &&
      localStop.includes('STOPPED') &&
      localStatus.includes('running'),
    opsChecklist: routes.includes("/api/v1/health/db"),
    releaseFlow: localStart.includes('LOCAL_STACK_STARTED') && localStop.includes('STOPPED'),
  },
  '7': {
    perf: performance.includes('PERF_OK') && performance.includes('WEB_STATIC_MAX_BYTES'),
    regression: smokeAll.includes('SMOKE_ALL_OK') && smokeAll.includes('smoke:content-download'),
    drift: contracts.includes('CONTRACTS_OK') && contracts.includes('missing route marker'),
  },
};

const phaseTasks = {
  '0': [
    'Validate baseline gates: docs, lint, typecheck, local-first, test, build',
    'Keep DoD/Test Strategy and docs index aligned',
    'Avoid external runtime dependencies (local-first enforcement)',
  ],
  '1': [
    'Implement `POST /api/v1/subscriptions/cancel` + audit event',
    'Implement `GET /api/v1/payments/:id` for owner',
    'Add `GET /api/v1/health/db` and callback hardening tests',
  ],
  '2': [
    'Implement real payment adapter + provider error mapping',
    'Validate webhook/callback signature',
    'Implement reliable reconciliation report path',
  ],
  '3': [
    'Replace `x-admin-key` with session-based RBAC',
    'Enforce roles (`platform_admin`, `support_admin`, `auditor`)',
    'Harden rate limits for auth and callback routes',
  ],
  '4': [
    'Implement protected content storage strategy',
    'Implement `GET /api/v1/download/:token` with short-lived tokens',
    'Enforce membership check in content delivery flow',
  ],
  '5': [
    'Build public creator pages (SSR/SSG)',
    'Add creators/plans search and filter',
    'Apply SEO baseline: metadata + sitemap',
  ],
  '6': [
    'Run `apps/api` and `apps/web` with local runtime scripts (no Docker)',
    'Complete operational health checks and runbook alignment',
    'Finalize release verification and stop/start rollback checklist',
  ],
  '7': [
    'Enforce performance budget checks',
    'Add regression-focused hardening for critical flows',
    'Control docs/API drift with recurring validation',
  ],
};

const today = new Date().toISOString().slice(0, 10);
const lines = [];
lines.push('# Next Tasks (Phased, No Timeline)');
lines.push('');
lines.push(`> Updated: ${today}`);
lines.push('> Rule: this plan is phase-based and has no calendar deadline.');
lines.push('');
lines.push('## Auto Baseline');
lines.push(`- [${baselineDone ? 'x' : ' '}] Baseline verification from \`docs/PROJECT_STATUS.md\``);
lines.push(`- [${syncNextOk ? 'x' : ' '}] Keep this file generated by automation (\`pnpm -w roadmap:sync-next\`)`);
lines.push('');
lines.push('## Phase Execution Board');

for (const m of phaseMatches) {
  const phaseId = m[1];
  const phaseName = m[2].trim();
  const checks = phaseChecks[phaseId] || null;
  const done =
    (phaseId === '0' && baselineDone && gatesCoreOk) ||
    (phaseId === '1' && checks && checks.cancel && checks.paymentById && checks.dbHealth && smokeAllOk) ||
    (phaseId === '2' && checks && checks.adapter && checks.signature && checks.reconcile && smokeAllOk) ||
    (phaseId === '3' && checks && checks.rbac && checks.roles && checks.rateLimit && smokeAllOk) ||
    (phaseId === '4' && checks && checks.storage && checks.download && checks.membership && smokeAllOk) ||
    (phaseId === '5' && checks && checks.publicPages && checks.searchFilter && checks.seo && gatesCoreOk) ||
    (phaseId === '6' && checks && checks.localRuntime && checks.opsChecklist && checks.releaseFlow && gatesCoreOk) ||
    (phaseId === '7' && checks && checks.perf && checks.regression && checks.drift && contractsOk && perfOk && regressionOk && smokeAllOk);
  lines.push(`### Phase ${phaseId} - ${phaseName}`);
  lines.push(`- [${done ? 'x' : ' '}] Phase status`);
  const tasks = phaseTasks[phaseId] || ['Define concrete tasks for this phase'];
  for (const t of tasks) {
    let taskDone = false;
    if (phaseId === '1') {
      if (t.includes('subscriptions/cancel')) taskDone = Boolean(checks?.cancel);
      if (t.includes('payments/:id')) taskDone = Boolean(checks?.paymentById);
      if (t.includes('health/db')) taskDone = Boolean(checks?.dbHealth);
    }
    if (phaseId === '0') {
      if (t.includes('Validate baseline gates')) taskDone = gatesCoreOk;
      if (t.includes('DoD/Test Strategy')) taskDone = docsIndexAligned;
      if (t.includes('external runtime dependencies')) taskDone = localFirstEnforced;
    }
    if (phaseId === '2') {
      if (t.includes('real payment adapter')) taskDone = Boolean(checks?.adapter);
      if (t.includes('webhook/callback signature')) taskDone = Boolean(checks?.signature);
      if (t.includes('reconciliation report')) taskDone = Boolean(checks?.reconcile);
    }
    if (phaseId === '3') {
      if (t.includes('session-based RBAC')) taskDone = Boolean(checks?.rbac);
      if (t.includes('Enforce roles')) taskDone = Boolean(checks?.roles);
      if (t.includes('rate limits')) taskDone = Boolean(checks?.rateLimit);
    }
    if (phaseId === '4') {
      if (t.includes('storage strategy')) taskDone = Boolean(checks?.storage);
      if (t.includes('download/:token')) taskDone = Boolean(checks?.download);
      if (t.includes('membership check')) taskDone = Boolean(checks?.membership);
    }
    if (phaseId === '5') {
      if (t.includes('public creator pages')) taskDone = Boolean(checks?.publicPages);
      if (t.includes('search and filter')) taskDone = Boolean(checks?.searchFilter);
      if (t.includes('SEO baseline')) taskDone = Boolean(checks?.seo);
    }
    if (phaseId === '6') {
      if (t.includes('local runtime scripts')) taskDone = Boolean(checks?.localRuntime);
      if (t.includes('health checks')) taskDone = Boolean(checks?.opsChecklist);
      if (t.includes('release verification')) taskDone = Boolean(checks?.releaseFlow);
    }
    if (phaseId === '7') {
      if (t.includes('performance budget')) taskDone = Boolean(checks?.perf);
      if (t.includes('regression-focused')) taskDone = Boolean(checks?.regression);
      if (t.includes('docs/API drift')) taskDone = Boolean(checks?.drift);
    }
    lines.push(`- [${taskDone ? 'x' : ' '}] ${t}`);
  }
  lines.push('');
}

lines.push('## Required Gates Before Closing Any Phase');
lines.push(`- [${evidenceHasOk('pnpm -w docs:validate') ? 'x' : ' '}] \`pnpm -w docs:validate\``);
lines.push(`- [${evidenceHasOk('pnpm -w lint') ? 'x' : ' '}] \`pnpm -w lint\``);
lines.push(`- [${evidenceHasOk('pnpm -w typecheck') ? 'x' : ' '}] \`pnpm -w typecheck\``);
lines.push(`- [${evidenceHasOk('pnpm -w local-first:scan') ? 'x' : ' '}] \`pnpm -w local-first:scan\``);
lines.push(`- [${evidenceHasOk('pnpm -w test') ? 'x' : ' '}] \`pnpm -w test\``);
lines.push(`- [${evidenceHasOk('pnpm -w build') ? 'x' : ' '}] \`pnpm -w build\``);
lines.push('');
lines.push('## Automation Commands');
lines.push('- `pnpm -w roadmap:sync-next`');
lines.push('- `pnpm -w evidence:record`');
lines.push('- `pnpm -w evidence:record:gates`');
lines.push('- `pnpm -w evidence:record:smoke`');
lines.push('- `pnpm -w test:integration`');
lines.push('- `pnpm -w test:e2e`');
lines.push('- `pnpm -w smoke:mock-payment` (requires `DATABASE_URL`)');
lines.push('');

fs.writeFileSync(nextPath, `${lines.join('\n')}\n`);
console.log(`SYNC_NEXT_OK phases=${phaseMatches.length} output=${path.relative(root, nextPath)}`);
