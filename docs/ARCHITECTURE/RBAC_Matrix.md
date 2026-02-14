# RBAC Matrix

This RBAC document defines admin roles, endpoint access boundaries, and least-privilege enforcement.

| Role | Admin capability | Endpoint scope |
|---|---|---|
| platform_admin | full admin control | /api/admin/* |
| support_admin | limited admin support | /api/support/* |
| auditor | read-only admin views | /api/audit/* |
