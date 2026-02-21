import type { Db } from './db';
import { ApiError } from './http';
import { hashPassword, randomToken, verifyPassword } from './security';
import { normalizeEmail } from './normalize';

export type AuthUser = { id: string; email: string; role: string; name: string };

export async function signUp(db: Db, input: { email: string; password: string; name?: string }) {
  const email = normalizeEmail(input.email);
  const passwordHash = hashPassword(input.password);
  try {
    const r = await db.pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, role, name`,
      [email, passwordHash, input.name || ''],
    );
    return r.rows[0] as AuthUser;
  } catch (e: any) {
    if (String(e?.code) === '23505') {
      throw new ApiError('AUTH_EMAIL_EXISTS', 'Email already exists', 409);
    }
    throw e;
  }
}

export async function signIn(db: Db, input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const r = await db.pool.query(
    `SELECT id, email, role, name, password_hash FROM users WHERE email=$1`,
    [email],
  );
  if (r.rowCount !== 1) throw new ApiError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);
  const row = r.rows[0] as any;
  if (!verifyPassword(input.password, row.password_hash)) {
    throw new ApiError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }
  return { id: row.id, email: row.email, role: row.role, name: row.name } as AuthUser;
}

export async function createSession(db: Db, userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // 14d
  await db.pool.query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt],
  );
  // Keep a bounded number of active sessions per user.
  await db.pool.query(
    `DELETE FROM sessions
      WHERE user_id=$1
        AND id IN (
          SELECT id FROM sessions
           WHERE user_id=$1
           ORDER BY created_at DESC
           OFFSET 20
        )`,
    [userId],
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function getUserBySession(db: Db, token: string): Promise<AuthUser | null> {
  const r = await db.pool.query(
    `SELECT u.id, u.email, u.role, u.name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now()`,
    [token],
  );
  if (r.rowCount !== 1) return null;
  return r.rows[0] as AuthUser;
}

export async function getUserById(db: Db, userId: string): Promise<AuthUser | null> {
  const r = await db.pool.query(
    `SELECT id, email, role, name FROM users WHERE id=$1`,
    [userId],
  );
  if (r.rowCount !== 1) return null;
  return r.rows[0] as AuthUser;
}

export async function revokeSession(db: Db, token: string): Promise<boolean> {
  const r = await db.pool.query(`DELETE FROM sessions WHERE token=$1 RETURNING id`, [token]);
  return r.rowCount === 1;
}

export async function revokeAllSessions(db: Db, userId: string): Promise<number> {
  const r = await db.pool.query(`DELETE FROM sessions WHERE user_id=$1 RETURNING id`, [userId]);
  return Number(r.rowCount || 0);
}

export async function rotateSession(db: Db, token: string) {
  const removed = await db.pool.query(
    `DELETE FROM sessions WHERE token=$1 AND expires_at > now() RETURNING user_id`,
    [token],
  );
  if (removed.rowCount !== 1) throw new ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
  const userId = String(removed.rows[0].user_id);
  const session = await createSession(db, userId);
  return { userId, session };
}
