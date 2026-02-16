"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDb = createDb;
exports.runMigrations = runMigrations;
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function createDb(databaseUrl) {
    const pool = new pg_1.Pool({
        connectionString: databaseUrl,
    });
    return {
        pool,
        close: async () => {
            await pool.end();
        },
    };
}
async function runMigrations(db) {
    const schemaPath = path_1.default.join(__dirname, '..', 'db', 'schema.sql');
    const sql = fs_1.default.readFileSync(schemaPath, 'utf8');
    await db.pool.query(sql);
}
