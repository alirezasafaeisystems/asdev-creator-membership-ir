"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const config_1 = require("./config");
const db_1 = require("./db");
const http_1 = require("./http");
const rateLimit_1 = require("./rateLimit");
const routes_1 = require("./routes");
const admin_1 = require("./admin");
async function main() {
    if (!config_1.config.databaseUrl) {
        throw new Error('DATABASE_URL is required (use ops/compose.local.yml postgres for local dev)');
    }
    const db = (0, db_1.createDb)(config_1.config.databaseUrl);
    await (0, db_1.runMigrations)(db);
    const app = (0, fastify_1.default)({ logger: true });
    (0, http_1.registerApiBasics)(app);
    (0, rateLimit_1.registerBasicRateLimit)(app, {
        windowMs: 60_000,
        max: 240,
        policies: [
            { pattern: /^\/api\/v1\/auth\//, max: 30, windowMs: 60_000 },
            { pattern: /^\/api\/v1\/payments\/[^/]+\/callback/, max: 20, windowMs: 60_000 },
        ],
    });
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://${config_1.config.host}:${config_1.config.port}`;
    (0, routes_1.registerPublicRoutes)(app, db, {
        publicBaseUrl,
        paymentGateway: config_1.config.paymentGateway,
        paymentGatewayBaseUrl: config_1.config.paymentGatewayBaseUrl,
        paymentGatewayWebhookSecret: config_1.config.paymentGatewayWebhookSecret,
        paymentGatewayTimeoutMs: config_1.config.paymentGatewayTimeoutMs,
        sessionSecret: config_1.config.sessionSecret,
        contentStorageRoot: config_1.config.contentStorageRoot,
    });
    (0, admin_1.registerAdminRoutes)(app, db, {
        publicBaseUrl,
        paymentGatewayBaseUrl: config_1.config.paymentGatewayBaseUrl,
        paymentGatewayWebhookSecret: config_1.config.paymentGatewayWebhookSecret,
        paymentGatewayTimeoutMs: config_1.config.paymentGatewayTimeoutMs,
    });
    app.addHook('onSend', async (req, reply, payload) => {
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
    await app.listen({ port: config_1.config.port, host: config_1.config.host });
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
