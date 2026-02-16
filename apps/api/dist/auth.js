"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUp = signUp;
exports.signIn = signIn;
exports.createSession = createSession;
exports.getUserBySession = getUserBySession;
const http_1 = require("./http");
const security_1 = require("./security");
async function signUp(db, input) {
    const passwordHash = (0, security_1.hashPassword)(input.password);
    try {
        const r = await db.pool.query(`INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, role, name`, [input.email.toLowerCase(), passwordHash, input.name || '']);
        return r.rows[0];
    }
    catch (e) {
        if (String(e?.code) === '23505') {
            throw new http_1.ApiError('AUTH_EMAIL_EXISTS', 'Email already exists', 409);
        }
        throw e;
    }
}
async function signIn(db, input) {
    const r = await db.pool.query(`SELECT id, email, role, name, password_hash FROM users WHERE email=$1`, [input.email.toLowerCase()]);
    if (r.rowCount !== 1)
        throw new http_1.ApiError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);
    const row = r.rows[0];
    if (!(0, security_1.verifyPassword)(input.password, row.password_hash)) {
        throw new http_1.ApiError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);
    }
    return { id: row.id, email: row.email, role: row.role, name: row.name };
}
async function createSession(db, userId) {
    const token = (0, security_1.randomToken)(32);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // 14d
    await db.pool.query(`INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`, [userId, token, expiresAt]);
    return { token, expiresAt: expiresAt.toISOString() };
}
async function getUserBySession(db, token) {
    const r = await db.pool.query(`SELECT u.id, u.email, u.role, u.name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now()`, [token]);
    if (r.rowCount !== 1)
        return null;
    return r.rows[0];
}
