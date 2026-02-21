# 07 Admin Panel

## Admin Surfaces
- API: `/api/v1/admin/*`
- Web: `/admin/ops` (ops summary viewer)

## RBAC
- roles: `platform_admin`, `support_admin`, `auditor`
- enforcement: session token + role check on each admin route

## Admin Capabilities
- payments overview/details/events
- audit trail query
- ops summary (`asdev.membership.ops.summary.v1`)
- pending payment reconciliation trigger
