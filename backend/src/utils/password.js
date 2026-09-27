import crypto from 'node:crypto';

let bcryptModule = null;
try {
  // Dynamically attempt to import bcryptjs if installed
  const mod = await import('bcryptjs');
  bcryptModule = mod.default || mod;
} catch {
  // bcryptjs not installed; standard crypto fallback will be used
}

/**
 * Standard Cryptographic Fallback for Password Hashing
 * Uses PBKDF2 with 100,000 iterations and HMAC-SHA512
 */
function hashWithCrypto(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyWithCrypto(password, storedHash) {
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }
  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const originalHash = parts[3];
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

/**
 * Hash a plaintext password securely.
 *
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Secure password hash
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (bcryptModule && typeof bcryptModule.hash === 'function') {
    return bcryptModule.hash(password, 10);
  }

  return hashWithCrypto(password);
}

/**
 * Compare a plaintext password with a stored password hash.
 *
 * @param {string} password - Plaintext password
 * @param {string} storedHash - Stored hash (bcrypt or pbkdf2)
 * @returns {Promise<boolean>} True if password matches hash
 */
export async function comparePassword(password, storedHash) {
  if (!password || !storedHash || typeof password !== 'string' || typeof storedHash !== 'string') {
    return false;
  }

  // Check if hash is a bcrypt hash ($2a$, $2b$, $2y$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    if (bcryptModule && typeof bcryptModule.compare === 'function') {
      return bcryptModule.compare(password, storedHash);
    }
    return false;
  }

  // Check PBKDF2 hash fallback
  if (storedHash.startsWith('pbkdf2$')) {
    return verifyWithCrypto(password, storedHash);
  }

  return false;
}

export default {
  hashPassword,
  comparePassword,
};
