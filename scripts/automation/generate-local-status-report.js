#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'RUNTIME');
const outFile = path.join(outDir, 'LOCAL_STATUS.md');
const nextPath = path.join(root, 'tasks', 'NEXT.md');
const evidencePath = path.join(root, '.codex', 'local-evidence', 'latest.json');

function safeRead(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}
function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const next = safeRead(nextPath);
const evidence = safeReadJson(evidencePath);
const phaseLines = next
  .split('\n')
  .filter((l) => l.startsWith('### Phase ') || (l.startsWith('- [') && l.includes('Phase status')))
  .slice(0, 32);

const now = new Date().toISOString();
const lines = [];
lines.push('# Local Runtime Status');
lines.push('');
lines.push(`Generated: ${now}`);
lines.push('');
if (evidence) {
  lines.push(`Evidence: mode=${evidence.mode} runId=${evidence.runId} overallOk=${evidence.overallOk}`);
  lines.push('');
  lines.push('## Evidence Commands');
  for (const item of evidence.items || []) {
    lines.push(`- ${item.ok ? '[OK]' : '[FAIL]'} \`${item.cmd}\` (${item.durationMs}ms)`);
  }
  lines.push('');
}
lines.push('## Phase Board Snapshot');
for (const l of phaseLines) lines.push(l);
lines.push('');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, lines.join('\n') + '\n');
console.log(`LOCAL_STATUS_REPORT_OK output=${path.relative(root, outFile)}`);
