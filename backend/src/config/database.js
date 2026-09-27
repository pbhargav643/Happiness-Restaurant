import mongoose from 'mongoose';
import { MONGODB_URI } from './env.js';

/**
 * MongoDB Mongoose Connection Module
 *
 * Requirements:
 * - Reads connection URI strictly from environment variables
 * - Never hardcodes database credentials
 * - Logs explicit status: "[Database] MongoDB connected successfully" or "[Database] MongoDB connection failed: <error>"
 * - Does not silently swallow connection errors or claim fake connectivity
 */
let cachedPromise = null;

export async function connectDB(customUri = null) {
  // Prevent duplicate connection initialization
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  const uri = customUri !== null ? customUri : (process.env.MONGODB_URI || MONGODB_URI);

  if (!uri) {
    console.error('MONGODB STATUS: NOT CONFIGURED');
    return null;
  }

  try {
    cachedPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    const conn = await cachedPromise;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    cachedPromise = null;
    console.error(`MONGODB STATUS: CONNECTION FAILED - ${error.message}`);
    return null;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected cleanly.');
  } catch (error) {
    console.error(`[Database] MongoDB disconnect error: ${error.message}`);
  }
}

// Runtime connection event monitors
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] MongoDB runtime connection error: ${err.message}`);
});

export { mongoose };
export default connectDB;
