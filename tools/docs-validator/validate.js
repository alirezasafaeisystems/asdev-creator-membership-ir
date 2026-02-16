#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'README.md',
  'docs/INDEX.md',
  'docs/STYLE_GUIDE.md',
  'docs/PRD.md',
  'docs/API_DB_Deployment.md',
  'docs/Engineering_Playbook.md',
  'docs/ALIGNMENT_REPORT.md',
  'docs/DECISIONS.md',
  'docs/GOVERNANCE.md',
  'docs/CODE_OWNERSHIP.md',
  'docs/CONTRIBUTING.md',
  'docs/POLICIES/SECURITY_POLICY.md',
  'docs/POLICIES/DATA_POLICY.md',
  'docs/POLICIES/DEPENDENCY_POLICY.md',
  'docs/POLICIES/BRANCH_RELEASE_POLICY.md',
  'docs/DEVELOPMENT/01_Local_Dev.md',
  'docs/DEVELOPMENT/02_Coding_Standards.md',
  'docs/DEVELOPMENT/03_Test_Strategy.md',
  'docs/DEVELOPMENT/04_Automation_PhaseRunner.md',
  'docs/DEVELOPMENT/Definition_of_Done.md',
  'docs/DEPLOYMENT/01_Environments.md',
  'docs/DEPLOYMENT/02_Docker_Compose_LocalFirst.md',
  'docs/DEPLOYMENT/03_Release_Runbook.md',
  'docs/ARCHITECTURE/00_System_Overview.md',
  'docs/ARCHITECTURE/01_Modular_Monolith.md',
  'docs/ARCHITECTURE/02_Domain_Model.md',
  'docs/ARCHITECTURE/03_API_Standards.md',
  'docs/ARCHITECTURE/04_Database_Standards.md',
  'docs/ARCHITECTURE/05_Content_Protection.md',
  'docs/ARCHITECTURE/06_Payments_Payouts_Audit.md',
  'docs/ARCHITECTURE/07_Admin_Panel.md',
  'docs/ARCHITECTURE/08_Observability_SRE.md',
  'docs/ARCHITECTURE/09_Admin_Analytics_Monitoring.md',
  'docs/ARCHITECTURE/10_Search_Filtering.md',
  'docs/ARCHITECTURE/Error_Codes.md',
  'docs/ARCHITECTURE/RBAC_Matrix.md',
  'docs/ARCHITECTURE_DECISIONS/ADR-TEMPLATE.md',
  'docs/FRONTEND/01_UI_UX_Standards.md',
  'docs/FRONTEND/02_SEO_Strategy.md',
  'docs/FRONTEND/03_Search_Filter_UX.md',
  'docs/RUNBOOKS/Payment_Issues.md',
  'docs/RUNBOOKS/Download_Issues.md',
  'docs/RUNBOOKS/Payout_Disputes.md',
  'docs/RUNBOOKS/Security_Incident.md',
  'tools/phase-runner/phases.json',
  'tools/phase-runner/run.sh',
  'tools/phase-runner/README.md',
  'tools/docs-validator/validate.js',
  'ops/dashboards/development-dashboard.html',
  'ops/dashboards/deploy-dashboard.html',
  'CHANGELOG.md',
  '.gitignore',
];

const criticalNoPlaceholder = [
  'docs/GOVERNANCE.md',
  'docs/CODE_OWNERSHIP.md',
  'docs/CONTRIBUTING.md',
  'docs/POLICIES/DATA_POLICY.md',
  'docs/POLICIES/DEPENDENCY_POLICY.md',
  'docs/POLICIES/BRANCH_RELEASE_POLICY.md',
  'docs/DEVELOPMENT/01_Local_Dev.md',
  'docs/DEVELOPMENT/02_Coding_Standards.md',
  'docs/DEVELOPMENT/04_Automation_PhaseRunner.md',
  'docs/DEVELOPMENT/Definition_of_Done.md',
];

const root = process.cwd();
const missing = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) missing.push(file);
}

const issues = [];
for (const file of criticalNoPlaceholder) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) continue;
  const content = fs.readFileSync(abs, 'utf8');
  if (/\(Placeholder\)/i.test(content)) {
    issues.push(`${file}: placeholder is not allowed`);
  }
}

const indexPath = path.join(root, 'docs/INDEX.md');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const refs = [...indexContent.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (!ref.includes('/') && !ref.endsWith('.md')) continue;
    const abs = path.join(root, ref);
    if (!fs.existsSync(abs)) issues.push(`docs/INDEX.md: missing referenced path ${ref}`);
  }
}

if (missing.length || issues.length) {
  console.error('DOCS_VALIDATE_FAILED');
  if (missing.length) {
    console.error('Missing required files:');
    for (const file of missing) console.error(` - ${file}`);
  }
  if (issues.length) {
    console.error('Documentation issues:');
    for (const issue of issues) console.error(` - ${issue}`);
  }
  process.exit(2);
}

console.log('DOCS_VALIDATE_OK');
