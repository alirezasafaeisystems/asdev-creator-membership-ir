# RBAC Matrix

This RBAC document defines admin roles, endpoint access boundaries, and least-privilege enforcement.

| Role | Admin capability | Endpoint scope |
|---|---|---|
| platform_admin | full admin control | `/api/v1/admin/*`, `POST /api/v1/payments/reconcile` |
| support_admin | limited admin support | `GET /api/v1/admin/payments*`, `POST /api/v1/payments/reconcile` |
| auditor | read-only admin views | `GET /api/v1/admin/payments*`, `GET /api/v1/admin/audit` |
