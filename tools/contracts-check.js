#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const routes = fs.readFileSync(path.join(root, 'apps/api/src/routes.ts'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'apps/api/src/admin.ts'), 'utf8');

const required = [
  "/api/v1/auth/refresh",
  "/api/v1/auth/signout",
  "/api/v1/auth/signout-all",
  "/api/v1/subscriptions/checkout",
  "/api/v1/subscriptions/cancel",
  "/api/v1/payments/:id",
  "/api/v1/payments/:gateway/callback",
  "/api/v1/creators",
  "/api/v1/creators/:slug",
  "/api/v1/creators/:slug/plans",
  "/api/v1/download/*",
  "/api/v1/content/:id/access-token",
];

for (const marker of required) {
  if (!routes.includes(marker)) {
    console.error(`CONTRACTS_FAIL missing route marker: ${marker}`);
    process.exit(1);
  }
}

if (!admin.includes('/api/v1/admin/payments') || !admin.includes('/api/v1/payments/reconcile')) {
  console.error('CONTRACTS_FAIL missing admin route markers');
  process.exit(1);
}
if (!admin.includes('/api/v1/admin/payments/:id/events')) {
  console.error('CONTRACTS_FAIL missing admin payment events route marker');
  process.exit(1);
}
if (!admin.includes('/api/v1/admin/overview')) {
  console.error('CONTRACTS_FAIL missing admin overview route marker');
  process.exit(1);
}

console.log('CONTRACTS_OK');
