import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export type Db = {
  pool: Pool;
  close: () => Promise<void>;
};

export function createDb(databaseUrl: string): Db {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  return {
    pool,
    close: async () => {
      await pool.end();
    },
  };
}

export async function runMigrations(db: Db) {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await db.pool.query(sql);
}

