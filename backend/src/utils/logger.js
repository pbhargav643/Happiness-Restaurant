/**
 * Standardized Logger Utility
 */
export const logger = {
  info: (msg) => console.log(`[Restaurant Server] ${msg}`),
  warn: (msg) => console.warn(`[Restaurant Server] ⚠️ ${msg}`),
  error: (msg) => console.error(`[Restaurant Server] ❌ ${msg}`),
  db: (msg) => console.log(`[Database] ${msg}`),
};

export default logger;
