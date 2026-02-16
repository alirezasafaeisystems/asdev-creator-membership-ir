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
  registerBasicRateLimit(app, { windowMs: 60_000, max: 240 });

  const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://${config.host}:${config.port}`;
  registerPublicRoutes(app, db, { publicBaseUrl, paymentGateway: config.paymentGateway });
  registerAdminRoutes(app, db, { adminApiKey: config.adminApiKey });

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

