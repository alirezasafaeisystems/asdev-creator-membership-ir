"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing env var: ${name}`);
    return value;
}
exports.config = {
    port: Number(process.env.PORT || 4000),
    host: process.env.HOST || '127.0.0.1',
    databaseUrl: process.env.DATABASE_URL || '',
    sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-session-secret',
    adminApiKey: process.env.ADMIN_API_KEY || '',
    paymentGateway: process.env.PAYMENT_GATEWAY || 'mock',
    paymentGatewayBaseUrl: process.env.PAYMENT_GATEWAY_BASE_URL || '',
    required,
};
