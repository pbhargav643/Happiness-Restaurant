# Restaurant Foods — Backend Service

Enterprise Node.js and Express RESTful API foundation with MongoDB/Mongoose database architecture for the Restaurant Foods Online Self-Pickup Ordering Platform.

## Architecture

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Mongoose database connection module
│   │   └── env.js               # Centralized environment variable configuration
│   ├── controllers/             # API request controllers (foundations)
│   ├── middleware/
│   │   └── errorHandler.js      # Centralized error handler returning standardized JSON
│   ├── models/                  # Mongoose domain models
│   │   ├── Admin.js             # Administrator schema
│   │   ├── MenuItem.js          # Physical menu item schema
│   │   ├── Order.js             # Strict Self-Pickup order schema
│   │   ├── RestaurantSettings.js# Store & pickup configuration schema
│   │   └── NotificationLog.js   # Audit log schema for notifications
│   ├── routes/                  # API routers
│   │   ├── health.routes.js     # Health check router (/api/health)
│   │   ├── auth.routes.js       # Authentication router (/api/auth)
│   │   ├── menu.routes.js       # Menu catalog router (/api/menu)
│   │   ├── order.routes.js      # Order processing router (/api/orders)
│   │   ├── admin.routes.js      # Admin operations router (/api/admin)
│   │   ├── settings.routes.js   # Store settings router (/api/settings)
│   │   └── notification.routes.js # Notification log router (/api/notifications)
│   ├── services/                # Business logic services (foundations)
│   └── utils/                   # Shared logging and response utilities
├── tests/                       # Automated test suites
│   ├── health.test.js
│   ├── database.test.js
│   └── models/
│       ├── order.test.js
│       └── menu-item.test.js
├── app.js                       # Express app configuration & middleware pipeline
├── server.js                    # Server startup entry point
├── package.json
├── .env.example
└── .gitignore
```

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server listening port | `5000` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/restaurant_foods` |
| `NODE_ENV` | Application environment | `development` |
| `CLIENT_URL` | Frontend client origin for CORS | `http://localhost:3000` |

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

## Endpoints (Foundation)

- `GET /api/health` — Returns HTTP 200 health check status
- `GET /api/auth/status` — Authentication foundation status
- `GET /api/menu` — Menu items endpoint
- `GET /api/orders` — Orders endpoint (Strict Self-Pickup)
- `GET /api/admin/dashboard-summary` — Admin dashboard summary
- `GET /api/settings` — Restaurant pickup settings
- `GET /api/notifications/logs` — Notification dispatch audit logs
