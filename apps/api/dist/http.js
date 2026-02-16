"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.getTraceId = getTraceId;
exports.registerApiBasics = registerApiBasics;
exports.requireJson = requireJson;
const crypto_1 = __importDefault(require("crypto"));
class ApiError extends Error {
    code;
    details;
    statusCode;
    constructor(code, message, statusCode = 400, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.ApiError = ApiError;
function getTraceId(req) {
    return req.headers['x-trace-id'] || crypto_1.default.randomUUID();
}
function registerApiBasics(app) {
    app.addHook('onRequest', async (req, reply) => {
        const traceId = getTraceId(req);
        reply.header('x-trace-id', traceId);
        req.traceId = traceId;
    });
    app.setErrorHandler((err, req, reply) => {
        const traceId = req.traceId || getTraceId(req);
        if (err instanceof ApiError) {
            const body = {
                code: err.code,
                message: err.message,
                details: err.details,
                traceId,
            };
            reply.status(err.statusCode).send(body);
            return;
        }
        const body = {
            code: 'INTERNAL_ERROR',
            message: 'Unexpected error',
            traceId,
        };
        reply.status(500).send(body);
    });
    app.get('/health', async () => ({ ok: true }));
}
function requireJson(reply) {
    reply.header('content-type', 'application/json; charset=utf-8');
}
