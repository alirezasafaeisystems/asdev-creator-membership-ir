# Decisions

## Active Architectural Decisions
1. Start with modular monolith for speed and control.
2. Enforce local-first runtime boundaries in CI/local gates.
3. Keep payment callbacks idempotent and auditable.
4. Use session-based RBAC for admin surfaces.
5. Use DB-backed worker jobs for operational maintenance.

## Decision Change Policy
- Any decision that changes security, payment semantics, or schema contracts must update:
  - `docs/ARCHITECTURE/*`
  - `docs/PROJECT_STATUS.md`
  - relevant runbooks
