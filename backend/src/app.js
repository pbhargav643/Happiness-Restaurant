import express from 'express';
import cors from 'cors';
import { CLIENT_URL, NODE_ENV } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/order.routes.js';
import adminRoutes from './routes/admin.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import customerOrderRoutes from './routes/customer.order.routes.js';
import reviewRoutes from './routes/review.routes.js';
import securityHeaders from './middleware/securityHeaders.js';
import mongoSanitizer from './middleware/mongoSanitizer.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Disable X-Powered-By to prevent server finger-printing
app.disable('x-powered-by');

// Native HTTP Security Headers (Helmet-equivalent)
app.use(securityHeaders);

// CORS configuration (Hardened for development and production)
const configuredOrigins = (CLIENT_URL || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      if (NODE_ENV === 'production') {
        return callback(new Error('CORS origin not allowed'));
      }
      return callback(null, true); // Dev-friendly fallback for local testing
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// Body parsers with safe request size limit (1MB max payload)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL / MongoDB Operator Sanitization ($gt, $ne, $regex, etc.)
app.use(mongoSanitizer);

// Global fallback rate limiter (Bypassed during automated tests)
app.use(apiRateLimiter);

// Health Check Endpoint (Exact path and response)
app.use('/api/health', healthRoutes);

// Foundation Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customer/orders', customerOrderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
