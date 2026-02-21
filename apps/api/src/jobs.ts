import type { PoolClient } from 'pg';
import type { Db } from './db';
import { createPaymentGatewayAdapter } from './payments';
import { auditEvent } from './audit';

export type JobType =
  | 'MEMBERSHIP_PAYMENT_RECONCILE'
  | 'MEMBERSHIP_SUBSCRIPTION_EXPIRE'
  | 'MEMBERSHIP_DOWNLOAD_TOKEN_CLEANUP';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export type JobRow = {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  run_at: string;
  timeout_ms: number;
  locked_at: string | null;
  locked_by: string | null;
};

export type WorkerHandlers = Record<JobType, (job: JobRow) => Promise<void>>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempts: number) {
  const base = Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts));
  return base + Math.floor(Math.random() * 300);
}

export async function enqueueJob(
  db: Db,
  input: {
    type: JobType;
    payload?: Record<string, unknown>;
    runAt?: Date;
    timeoutMs?: number;
    maxAttempts?: number;
  },
) {
  const r = await db.pool.query(
    `INSERT INTO jobs (type, payload, run_at, timeout_ms, max_attempts, status)
     VALUES ($1, $2::jsonb, $3, $4, $5, 'QUEUED')
     RETURNING *`,
    [
      input.type,
      JSON.stringify(input.payload || {}),
      input.runAt || new Date(),
      Math.max(1_000, Number(input.timeoutMs || 5 * 60_000)),
      Math.max(1, Number(input.maxAttempts || 3)),
    ],
  );
  return r.rows[0] as JobRow;
}

async function withTx<T>(db: Db, fn: (client: PoolClient) => Promise<T>) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function acquireNextJob(db: Db, workerId: string, leaseMs: number): Promise<JobRow | null> {
  return withTx(db, async (client) => {
    const candidate = await client.query(
      `SELECT *
         FROM jobs
        WHERE
          (status='QUEUED' AND run_at <= now())
          OR
          (status='RUNNING' AND locked_at IS NOT NULL AND locked_at < now() - ($1::int || ' milliseconds')::interval)
        ORDER BY run_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
      [leaseMs],
    );
    if (candidate.rowCount !== 1) return null;
    const row = candidate.rows[0] as JobRow;
    await client.query(
      `UPDATE jobs
          SET status='RUNNING',
              locked_at=now(),
              locked_by=$2,
              updated_at=now()
        WHERE id=$1`,
      [row.id, workerId],
    );
    return row;
  });
}

async function completeJob(db: Db, jobId: string) {
  await db.pool.query(
    `UPDATE jobs
        SET status='SUCCEEDED',
            locked_at=NULL,
            locked_by=NULL,
            last_error=NULL,
            updated_at=now()
      WHERE id=$1`,
    [jobId],
  );
}

async function failOrRetryJob(db: Db, job: JobRow, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const attemptsNext = Number(job.attempts || 0) + 1;
  const shouldFail = attemptsNext >= Number(job.max_attempts || 1);
  if (shouldFail) {
    await db.pool.query(
      `UPDATE jobs
          SET status='FAILED',
              attempts=$2,
              last_error=$3,
              locked_at=NULL,
              locked_by=NULL,
              updated_at=now()
        WHERE id=$1`,
      [job.id, attemptsNext, message],
    );
    return;
  }
  await db.pool.query(
    `UPDATE jobs
        SET status='QUEUED',
            attempts=$2,
            last_error=$3,
            run_at=$4,
            locked_at=NULL,
            locked_by=NULL,
            updated_at=now()
      WHERE id=$1`,
    [job.id, attemptsNext, message, new Date(Date.now() + backoffMs(job.attempts))],
  );
}

async function runWithTimeout<T>(task: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`JOB_TIMEOUT_${timeoutMs}ms`)), timeoutMs);
    task()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function workerLoop(
  db: Db,
  opts: { workerId: string; leaseMs?: number; idleSleepMs?: number; handlers: WorkerHandlers },
) {
  const leaseMs = opts.leaseMs ?? 10 * 60_000;
  const idleSleepMs = opts.idleSleepMs ?? 750;
  while (true) {
    const job = await acquireNextJob(db, opts.workerId, leaseMs);
    if (!job) {
      await sleep(idleSleepMs);
      continue;
    }

    const handler = opts.handlers[job.type];
    if (!handler) {
      await failOrRetryJob(db, job, new Error(`UNKNOWN_JOB_TYPE_${job.type}`));
      continue;
    }

    try {
      await runWithTimeout(() => handler(job), Number(job.timeout_ms || 300_000));
      await completeJob(db, job.id);
    } catch (e) {
      await failOrRetryJob(db, job, e);
    }
  }
}

export function createMembershipHandlers(
  db: Db,
  opts: {
    publicBaseUrl: string;
    paymentGatewayBaseUrl: string;
    paymentGatewayWebhookSecret: string;
    paymentGatewayTimeoutMs: number;
  },
): WorkerHandlers {
  return {
    async MEMBERSHIP_PAYMENT_RECONCILE(job) {
      const staleMinutes = Math.max(60, Number(job.payload?.staleMinutes || 60));
      const failAfterHours = Math.max(24, Number(job.payload?.failAfterHours || 48));
      const pending = await db.pool.query(
        `SELECT *
           FROM payments
          WHERE status='PENDING'
            AND created_at < now() - ($1::int || ' minutes')::interval
          ORDER BY created_at ASC
          LIMIT 100`,
        [staleMinutes],
      );

      for (const p of pending.rows as any[]) {
        if (!p.gateway_ref) continue;
        const adapter = createPaymentGatewayAdapter({
          gatewayId: String(p.gateway),
          baseUrl: opts.paymentGatewayBaseUrl || opts.publicBaseUrl,
          webhookSecret: opts.paymentGatewayWebhookSecret,
          timeoutMs: opts.paymentGatewayTimeoutMs,
        });

        if (!adapter.reconcilePending) continue;
        const rec = await adapter.reconcilePending({
          gatewayRef: String(p.gateway_ref),
          amount: Number(p.amount || 0),
          currency: String(p.currency || 'IRR'),
        });

        if (rec.result === 'failed') {
          await db.pool.query(`UPDATE payments SET status='FAILED' WHERE id=$1`, [p.id]);
        }
      }

      await db.pool.query(
        `UPDATE payments
            SET status='FAILED'
          WHERE status='PENDING'
            AND created_at < now() - ($1::int || ' hours')::interval`,
        [failAfterHours],
      );
    },

    async MEMBERSHIP_SUBSCRIPTION_EXPIRE() {
      await db.pool.query(
        `UPDATE subscriptions
            SET status='EXPIRED',
                updated_at=now()
          WHERE status='ACTIVE'
            AND current_period_end IS NOT NULL
            AND current_period_end < now()`,
      );
    },

    async MEMBERSHIP_DOWNLOAD_TOKEN_CLEANUP() {
      // Token system is stateless HMAC today; cleanup is done through audit retention policy.
      await db.pool.query(
        `DELETE FROM audit_events
          WHERE action='content.access_token.issue'
            AND created_at < now() - interval '30 days'`,
      );
    },
  };
}

export async function enqueueMembershipOpsJobs(db: Db) {
  const jobs: JobType[] = [
    'MEMBERSHIP_PAYMENT_RECONCILE',
    'MEMBERSHIP_SUBSCRIPTION_EXPIRE',
    'MEMBERSHIP_DOWNLOAD_TOKEN_CLEANUP',
  ];
  const results: JobRow[] = [];
  for (const type of jobs) {
    const created = await enqueueJob(db, { type });
    results.push(created);
  }
  await auditEvent(db, {
    actorUserId: null,
    action: 'jobs.membership_ops.enqueued',
    entityType: 'job',
    payload: { count: results.length, ids: results.map((x) => x.id), types: results.map((x) => x.type) },
    traceId: `jobs-${Date.now()}`,
  });
  return results;
}
