// 03-shared/queue-worker/engine.ts
// DB-backed queue engine (Prisma + Postgres)
// هدف: ساده، قابل لانچ سریع، بدون نیاز به Redis/RabbitMQ برای MVP.
//
// نکته: در production ممکن است بخواهید BullMQ/Temporal/... جایگزین کنید.
// اما این Engine برای لانچ و رشد اولیه عالی است.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type JobRow = {
  id: string;
  type: string;
  payload: any;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  timeoutMs: number;
};

export type JobHandler = (job: JobRow, signal: AbortSignal) => Promise<void>;

export type WorkerLoopOptions = {
  workerId: string;
  handlers: Record<string, JobHandler>;
  idleSleepMs?: number;
  leaseMs?: number; // job lease (lock)
};

export function backoffMs(attemptIndex: number) {
  // attemptIndex: 0 برای اولین fail → backoff کوتاه‌تر
  const base = Math.min(60_000, 1_000 * 2 ** attemptIndex);
  const jitter = Math.floor(Math.random() * 500);
  return base + jitter;
}

export async function runWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error(`TIMEOUT_${timeoutMs}ms`)), timeoutMs);

  try {
    return await fn(ac.signal);
  } finally {
    clearTimeout(t);
  }
}

export async function enqueueJob(params: {
  type: string;
  payload: any;
  runAt?: Date;
  timeoutMs?: number;
  maxAttempts?: number;
}) {
  const { type, payload } = params;
  const runAt = params.runAt ?? new Date();
  const timeoutMs = params.timeoutMs ?? 10 * 60_000;
  const maxAttempts = params.maxAttempts ?? 3;

  return prisma.job.create({
    data: {
      type,
      payload,
      runAt,
      timeoutMs,
      maxAttempts,
      status: "QUEUED",
    },
  });
}

export async function acquireNextJob(workerId: string, leaseMs: number): Promise<JobRow | null> {
  // NOTE: این query طوری نوشته شده که:
  // - یک job آماده اجرا را pick کند
  // - یا یک job RUNNING که lock آن منقضی شده (crash worker) را reclaim کند
  //
  // Postgres: FOR UPDATE SKIP LOCKED برای همزمانی چند worker.

  const job = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<JobRow[]>`
      SELECT *
      FROM "Job"
      WHERE
        ("status" = 'QUEUED' AND "runAt" <= now())
        OR
        ("status" = 'RUNNING' AND "lockedAt" IS NOT NULL
          AND "lockedAt" < (now() - (${leaseMs}::text || ' milliseconds')::interval))
      ORDER BY "runAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!rows.length) return null;
    const picked = rows[0];

    await tx.job.update({
      where: { id: picked.id },
      data: {
        status: "RUNNING",
        lockedAt: new Date(),
        lockedBy: workerId,
      },
    });

    return picked;
  });

  return job;
}

export async function heartbeat(jobId: string, workerId: string) {
  // برای jobهای طولانی، هر N ثانیه یکبار heartbeat بزنید تا reclaim نشوند.
  await prisma.job.update({
    where: { id: jobId },
    data: { lockedAt: new Date(), lockedBy: workerId },
  });
}

export async function completeJob(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "SUCCEEDED", lockedAt: null, lockedBy: null, lastError: null },
  });
}

export async function failOrRetryJob(job: JobRow, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);

  const attemptsNext = job.attempts + 1;
  const shouldFail = attemptsNext >= job.maxAttempts;

  await prisma.job.update({
    where: { id: job.id },
    data: shouldFail
      ? {
          status: "FAILED",
          attempts: attemptsNext,
          lastError: message,
          lockedAt: null,
          lockedBy: null,
        }
      : {
          status: "QUEUED",
          attempts: attemptsNext,
          lastError: message,
          lockedAt: null,
          lockedBy: null,
          runAt: new Date(Date.now() + backoffMs(job.attempts)),
        },
  });
}

export async function workerLoop(opts: WorkerLoopOptions) {
  const idleSleepMs = opts.idleSleepMs ?? 500;
  const leaseMs = opts.leaseMs ?? 10 * 60_000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await acquireNextJob(opts.workerId, leaseMs);

    if (!job) {
      await new Promise((r) => setTimeout(r, idleSleepMs));
      continue;
    }

    const handler = opts.handlers[job.type];
    if (!handler) {
      await failOrRetryJob(job, new Error(`UNKNOWN_JOB_TYPE_${job.type}`));
      continue;
    }

    try {
      await runWithTimeout((signal) => handler(job, signal), job.timeoutMs);
      await completeJob(job.id);
    } catch (e) {
      await failOrRetryJob(job, e);
    }
  }
}
