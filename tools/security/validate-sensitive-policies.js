#!/usr/bin/env node
const fs = require('fs');

const checks = [
  {
    file: 'docs/ARCHITECTURE/RBAC_Matrix.md',
    patterns: [/rbac/i, /admin/i, /endpoint/i],
  },
  {
    file: 'docs/ARCHITECTURE/06_Payments_Payouts_Audit.md',
    patterns: [/payment/i, /payout/i, /audit/i, /idempotent/i],
  },
  {
    file: 'docs/ARCHITECTURE/08_Observability_SRE.md',
    patterns: [/observability|sre/i, /analytics|telemetry/i, /alert/i],
  },
  {
    file: 'docs/POLICIES/SECURITY_POLICY.md',
    patterns: [/secret/i, /incident|vulnerability|access/i],
  },
  {
    file: 'docs/POLICIES/DATA_POLICY.md',
    patterns: [/sensitive|restricted/i, /retention|mask/i],
  },
  {
    file: 'docs/RUNBOOKS/Security_Incident.md',
    patterns: [/triage/i, /containment/i, /postmortem/i],
  },
  {
    file: 'docs/ARCHITECTURE/Error_Codes.md',
    patterns: [/AUTH_/i, /PAYMENT_/i, /PAYOUT_/i],
  },
];

const failures = [];
for (const check of checks) {
  if (!fs.existsSync(check.file)) {
    failures.push(`${check.file}: missing file`);
    continue;
  }
  const content = fs.readFileSync(check.file, 'utf8');
  for (const pattern of check.patterns) {
    if (!pattern.test(content)) {
      failures.push(`${check.file}: missing pattern ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error('SENSITIVE_POLICY_VALIDATE_FAILED');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('SENSITIVE_POLICY_VALIDATE_OK');
