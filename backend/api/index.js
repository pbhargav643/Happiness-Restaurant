import connectDB from '../src/config/database.js';
import app from '../src/app.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Vercel Serverless] DB connection error:', err);
  }
  return app(req, res);
}
