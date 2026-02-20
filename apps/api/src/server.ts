import Fastify from 'fastify';
import { config } from './config';
import { createDb, runMigrations } from './db';
import { registerApiBasics } from './http';
import { registerBasicRateLimit } from './rateLimit';
import { registerPublicRoutes } from './routes';
import { registerAdminRoutes } from './admin';

async function main() {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required (use ops/compose.local.yml postgres for local dev)');
  }

  const db = createDb(config.databaseUrl);
  await runMigrations(db);

  const app = Fastify({ logger: true });
  registerApiBasics(app);
  registerBasicRateLimit(app, {
    windowMs: 60_000,
    max: 240,
    policies: [
      { pattern: /^\/api\/v1\/auth\//, max: 30, windowMs: 60_000 },
      { pattern: /^\/api\/v1\/payments\/[^/]+\/callback/, max: 20, windowMs: 60_000 },
    ],
  });

  const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://${config.host}:${config.port}`;
  registerPublicRoutes(app, db, {
    publicBaseUrl,
    paymentGateway: config.paymentGateway,
    paymentGatewayBaseUrl: config.paymentGatewayBaseUrl,
    paymentGatewayWebhookSecret: config.paymentGatewayWebhookSecret,
    paymentGatewayTimeoutMs: config.paymentGatewayTimeoutMs,
    sessionSecret: config.sessionSecret,
    contentStorageRoot: config.contentStorageRoot,
  });
  registerAdminRoutes(app, db, {
    publicBaseUrl,
    paymentGatewayBaseUrl: config.paymentGatewayBaseUrl,
    paymentGatewayWebhookSecret: config.paymentGatewayWebhookSecret,
    paymentGatewayTimeoutMs: config.paymentGatewayTimeoutMs,
  });

  app.addHook('onSend', async (req: any, reply: any, payload: any) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    const proto = String(req.headers?.['x-forwarded-proto'] || '').toLowerCase();
    if (proto.includes('https')) {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return payload;
  });

  app.addHook('onClose', async () => {
    await db.close();
  });

  await app.listen({ port: config.port, host: config.host });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
