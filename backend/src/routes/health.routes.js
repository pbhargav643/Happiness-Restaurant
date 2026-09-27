import express from 'express';
import mongoose from 'mongoose';
import connectDB, { getLastDbError } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  await connectDB();

  const readyState = mongoose.connection.readyState;
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.status(200).json({
    success: true,
    message: 'Restaurant API is running',
    database: {
      status: stateMap[readyState] || 'unknown',
      readyState,
      hasUri: Boolean(process.env.MONGODB_URI),
      error: getLastDbError(),
    },
  });
});

export default router;
