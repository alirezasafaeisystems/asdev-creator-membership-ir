import type { Db } from './db';

export async function auditEvent(db: Db, input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: unknown;
  traceId: string;
}) {
  await db.pool.query(
    `INSERT INTO audit_events (actor_user_id, action, entity_type, entity_id, payload, trace_id)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      input.actorUserId ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      JSON.stringify(input.payload ?? {}),
      input.traceId,
    ],
  );
}

