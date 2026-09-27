import 'dotenv/config';
import { PORT, NODE_ENV } from './src/config/env.js';
import connectDB from './src/config/database.js';
import { seedAdmin } from './src/utils/seedAdmin.js';
import { seedMenu } from './src/utils/seedMenu.js';
import app from './app.js';

// Connect to MongoDB
const conn = await connectDB();
if (!conn) {
  console.warn('[Restaurant Server] Warning: Server started without active MongoDB connection.');
} else {
  // Idempotent initial Admin seed check
  try {
    await seedAdmin();
  } catch (seedErr) {
    console.warn('[Restaurant Server] Admin seed note:', seedErr.message);
  }

  // Idempotent initial Menu seed check (144 verified physical menu card dishes)
  try {
    await seedMenu();
  } catch (menuSeedErr) {
    console.warn('[Restaurant Server] Menu seed note:', menuSeedErr.message);
  }
}



// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`[Restaurant Server] Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`[Restaurant Server] Health check available at http://localhost:${PORT}/api/health`);
});

// Graceful process termination handlers
process.on('SIGTERM', () => {
  console.log('[Restaurant Server] SIGTERM received. Closing server gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Restaurant Server] SIGINT received. Closing server gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

export default server;
