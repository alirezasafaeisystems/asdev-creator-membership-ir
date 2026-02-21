import { config } from './config';
import { createDb, runMigrations } from './db';
import { enqueueMembershipOpsJobs } from './jobs';

async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required');
  const db = createDb(config.databaseUrl);
  await runMigrations(db);
  const jobs = await enqueueMembershipOpsJobs(db);
  await db.close();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, count: jobs.length, jobs: jobs.map((j) => ({ id: j.id, type: j.type })) }, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
