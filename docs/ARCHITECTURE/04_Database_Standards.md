# 04 Database Standards

## Storage Rules
- PostgreSQL as single source of truth.
- UUID primary keys.
- explicit indexes for high-cardinality lookup paths.

## Integrity Rules
- unique constraints for idempotency and deduplication.
- enum-like status fields enforced in service logic.
- write audit/payment events for critical state transitions.

## Performance Rules
- index callback and payment lookup keys (`gateway`, `gateway_ref`).
- index queue scan keys (`status`, `run_at`).
- avoid unbounded list endpoints; enforce limits.
