import connectDB from '../src/config/database.js';
import { seedAdmin } from '../src/utils/seedAdmin.js';
import { seedMenu } from '../src/utils/seedMenu.js';
import app from '../src/app.js';

let isInitialized = false;

export default async function handler(req, res) {
  try {
    await connectDB();
    if (!isInitialized) {
      try {
        await seedAdmin();
        await seedMenu();
      } catch (seedErr) {
        console.warn('[Vercel Serverless] Seed warning:', seedErr.message);
      }
      isInitialized = true;
    }
  } catch (err) {
    console.error('[Vercel Serverless] Database connection error:', err);
  }
  return app(req, res);
}
