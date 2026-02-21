import { config } from './config';
import { createDb, runMigrations } from './db';
import { createMembershipHandlers, workerLoop } from './jobs';

async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required');
  const db = createDb(config.databaseUrl);
  await runMigrations(db);

  const workerId = process.env.WORKER_ID || `membership-worker-${process.pid}`;
  const handlers = createMembershipHandlers(db, {
    publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://${config.host}:${config.port}`,
    paymentGatewayBaseUrl: config.paymentGatewayBaseUrl,
    paymentGatewayWebhookSecret: config.paymentGatewayWebhookSecret,
    paymentGatewayTimeoutMs: config.paymentGatewayTimeoutMs,
  });

  await workerLoop(db, { workerId, handlers });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
