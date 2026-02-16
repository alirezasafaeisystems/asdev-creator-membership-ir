import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';

export type ApiErrorShape = {
  code: string;
  message: string;
  details?: unknown;
  traceId: string;
};

export class ApiError extends Error {
  code: string;
  details?: unknown;
  statusCode: number;
  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function getTraceId(req: FastifyRequest): string {
  return (req.headers['x-trace-id'] as string) || crypto.randomUUID();
}

export function registerApiBasics(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    const traceId = getTraceId(req);
    reply.header('x-trace-id', traceId);
    (req as any).traceId = traceId;
  });

  app.setErrorHandler((err, req, reply) => {
    const traceId = (req as any).traceId || getTraceId(req);
    if (err instanceof ApiError) {
      const body: ApiErrorShape = {
        code: err.code,
        message: err.message,
        details: err.details,
        traceId,
      };
      reply.status(err.statusCode).send(body);
      return;
    }
    const body: ApiErrorShape = {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error',
      traceId,
    };
    reply.status(500).send(body);
  });

  app.get('/health', async () => ({ ok: true }));
}

export function requireJson(reply: FastifyReply) {
  reply.header('content-type', 'application/json; charset=utf-8');
}

