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
    (0, rateLimit_1.registerBasicRateLimit)(app, { windowMs: 60_000, max: 240 });
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://${config_1.config.host}:${config_1.config.port}`;
    (0, routes_1.registerPublicRoutes)(app, db, { publicBaseUrl, paymentGateway: config_1.config.paymentGateway });
    (0, admin_1.registerAdminRoutes)(app, db, { adminApiKey: config_1.config.adminApiKey });
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
