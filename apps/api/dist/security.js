"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.randomToken = randomToken;
exports.hmacSha256Base64Url = hmacSha256Base64Url;
const crypto_1 = __importDefault(require("crypto"));
function hashPassword(password) {
    const salt = crypto_1.default.randomBytes(16);
    const derivedKey = crypto_1.default.scryptSync(password, salt, 32);
    return `scrypt$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
}
function verifyPassword(password, hash) {
    const parts = hash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt')
        return false;
    const salt = Buffer.from(parts[1], 'base64');
    const expected = Buffer.from(parts[2], 'base64');
    const derivedKey = crypto_1.default.scryptSync(password, salt, expected.length);
    return crypto_1.default.timingSafeEqual(derivedKey, expected);
}
function randomToken(bytes = 32) {
    return crypto_1.default.randomBytes(bytes).toString('base64url');
}
function hmacSha256Base64Url(secret, value) {
    return crypto_1.default.createHmac('sha256', secret).update(value).digest('base64url');
}
