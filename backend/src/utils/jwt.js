import crypto from 'node:crypto';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js';

let jwtModule = null;
try {
  const mod = await import('jsonwebtoken');
  jwtModule = mod.default || mod;
} catch {
  // jsonwebtoken not installed; standard RFC 7519 HMAC-SHA256 fallback will be used
}

/**
 * Base64Url helpers for RFC 7519 JWT
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Parse expiration string (e.g. '1d', '24h', '3600', 86400) to seconds
 */
function parseExpiresIn(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;
  if (!expiresIn) return 86400; // default 1 day

  const match = String(expiresIn).match(/^(\d+)([smhd])?$/);
  if (!match) return 86400;

  const num = parseInt(match[1], 10);
  const unit = match[2] || 's';

  switch (unit) {
    case 's': return num;
    case 'm': return num * 60;
    case 'h': return num * 3600;
    case 'd': return num * 86400;
    default: return num;
  }
}

/**
 * Fallback HMAC-SHA256 (HS256) implementation
 */
function signHS256(payload, secret, expiresIn) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const ttl = parseExpiresIn(expiresIn);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + ttl,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signatureInput);
  const signature = base64UrlEncode(hmac.digest());

  return `${signatureInput}.${signature}`;
}

function verifyHS256(token, secret) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signatureInput);
  const expectedSignature = base64UrlEncode(hmac.digest());

  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid token signature');
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error('Malformed token payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    const expErr = new Error('Token has expired');
    expErr.name = 'TokenExpiredError';
    expErr.expiredAt = new Date(payload.exp * 1000);
    throw expErr;
  }

  return payload;
}

/**
 * Generate a JWT with minimum required payload
 *
 * @param {Object} payload - Token claims (e.g. { sub: admin._id, role: 'ADMIN' })
 * @param {Object} options - Options (e.g. expiresIn)
 * @returns {string} Signed JWT token string
 */
export function generateToken(payload, options = {}) {
  const secret = JWT_SECRET;
  const expiresIn = options.expiresIn || JWT_EXPIRES_IN || '1d';

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  if (jwtModule && typeof jwtModule.sign === 'function') {
    return jwtModule.sign(payload, secret, { expiresIn });
  }

  return signHS256(payload, secret, expiresIn);
}

/**
 * Verify and decode a JWT token
 *
 * @param {string} token - Bearer JWT token
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token) {
  const secret = JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  if (jwtModule && typeof jwtModule.verify === 'function') {
    return jwtModule.verify(token, secret);
  }

  return verifyHS256(token, secret);
}

/**
 * Decode token payload without verifying signature (for inspections)
 */
export function decodeToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

export default {
  generateToken,
  verifyToken,
  decodeToken,
};
