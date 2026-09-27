# HAPPINESS RESTAURANT — Production Deployment Guide

This document outlines the architecture, environment configuration, database requirements, security hardening, and deployment procedures for the **HAPPINESS RESTAURANT** Takeaway Self-Pickup Platform.

---

## 1. System Architecture

```
[ Customer Browser ]
         │
         ▼ (HTTPS)
[ Production Frontend (React + Vite SPA) ]
         │
         ▼ (HTTPS REST API /api/*)
[ Production Backend (Node.js + Express) ]
         │
         ├──────────────────────────┐
         ▼                          ▼
[ MongoDB Atlas Cluster ]   [ Notification Gateways ]
(Mongoose ODM)              ├── WhatsApp Cloud API
                            └── SMS Gateway API
```

- **Frontend**: Single-Page Application built with React 18 and Vite. Deployed to static hosting or CDN (e.g., Nginx, Cloudflare Pages, Vercel, Netlify).
- **Backend**: Stateless Node.js / Express REST API. Deployed to containerized or cloud runtime (e.g., Docker, AWS ECS, Render, Railway, DigitalOcean).
- **Database**: Managed MongoDB Atlas Replica Set (never connected directly to frontend).
- **Ordering Model**: **Strict Counter Takeaway Self-Pickup Only (`orderType: PICKUP`)**. Zero delivery services, zero delivery addresses, zero delivery fees.

---

## 2. Build and Start Commands

### Frontend Production Build
```bash
cd frontend
npm install --production=false
npm run build
```
- Outputs static production bundle to `frontend/dist/`.
- Verify with preview server: `npm run preview`

### Backend Production Start
```bash
cd backend
npm install --production
npm start
```
- Executes `node server.js` using native ES Modules.
- In production, process managers like `pm2` or Docker containers should manage process lifecycle:
  ```bash
  pm2 start server.js --name happiness-backend -i max
  ```

---

## 3. Required Environment Variables

### Frontend (`frontend/.env.production`)
| Variable | Required | Description | Example (Placeholder) |
|---|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | HTTPS URL pointing to backend `/api` | `https://api.happinessrestaurant.com/api` |
| `VITE_RESTAURANT_NAME` | No | Restaurant display name | `HAPPINESS RESTAURANT` |
| `VITE_PICKUP_ONLY` | No | Flag enforcing pickup counter mode | `true` |

> Never expose secrets, database URIs, or private provider tokens in `frontend/.env`. Only public `VITE_` variables are accessible in client JavaScript bundles.

### Backend (`backend/.env`)
| Variable | Required | Description | Example (Placeholder) |
|---|---|---|---|
| `NODE_ENV` | **Yes** | Set to `production` for security headers, strict CORS, and sanitized errors | `production` |
| `PORT` | No | Listening port (default: 5000) | `5000` |
| `CLIENT_URL` | **Yes** | Allowed frontend origin for CORS | `https://happinessrestaurant.com` |
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/happiness_restaurant?retryWrites=true&w=majority` |
| `JWT_SECRET` | **Yes** | Cryptographically random 256-bit secret string | Generate via `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: 1d) | `1d` |
| `ADMIN_NAME` | No | Initial admin name | `Admin Manager` |
| `ADMIN_EMAIL` | **Yes** | Initial admin login email | `admin@happinessrestaurant.com` |
| `ADMIN_PASSWORD` | **Yes** | Initial admin strong password (min 8 chars) | `<strong_random_password>` |
| `WHATSAPP_PROVIDER` | No | Provider type (`mock`, `generic`, `meta`) | `meta` |
| `WHATSAPP_API_URL` | No | Provider endpoint URL | `https://graph.facebook.com/v18.0/<PHONE_ID>/messages` |
| `WHATSAPP_API_KEY` | No | Meta Bearer Token / API Key | `<meta_system_user_token>` |
| `WHATSAPP_SENDER` | No | Registered business phone number ID | `1029384756` |
| `WHATSAPP_READY_TEMPLATE`| No | Approved Meta WhatsApp template name | `order_ready_pickup` |
| `SMS_PROVIDER` | No | Provider type (`mock`, `generic`, `twilio`) | `twilio` |
| `SMS_API_URL` | No | SMS API endpoint | `https://api.twilio.com/2010-04-01/Accounts/<SID>/Messages.json` |
| `SMS_API_KEY` | No | SMS Auth Token / API Key | `<provider_auth_token>` |
| `SMS_SENDER` | No | Sender ID or Alphanumeric ID | `HAPPINESS` |

---

## 4. MongoDB Atlas Production Requirement

1. **Cluster Provisioning**:
   - MongoDB Atlas M0 (Free Tier) or M10+ Dedicated Cluster.
   - Recommended Region: `ap-south-1` (Mumbai) for minimum latency to Bilimora, Gujarat.
2. **Network Security**:
   - Add production server elastic IP address to Atlas Network Access Whitelist.
   - If hosting on AWS/Render/Railway dynamic IP, use secure Atlas VPC peering or strictly restrict by user authentication.
3. **Database User & Permissions**:
   - Create a dedicated database user with `readWrite` access scoped strictly to the `happiness_restaurant` database.
   - Use a strong, random password with URL-encoded special characters if applicable.
4. **Index Verification**:
   - The application automatically verifies indexes on startup:
     - `MenuItem`: `slug` (unique), `category`, `isAvailable`
     - `Order`: `orderId` (unique), `customerUser`, `status`, `createdAt`
     - `CustomerUser`: `email` (unique), `mobile` (unique)
     - `Admin`: `email` (unique)
     - `NotificationLog`: `orderId`, `channel`, `status`, `createdAt`

---

## 5. CORS Production Configuration

The backend CORS configuration in `backend/src/app.js` is hardened for production:
- In production (`NODE_ENV=production`), incoming requests must match `CLIENT_URL` (or comma-separated list of approved domains).
- Wildcard `origin: "*"` is **strictly prohibited** when `credentials: true`.
- Localhost domains are restricted during production mode.
- Preflight `OPTIONS` requests are handled automatically with explicit allowed methods: `GET, POST, PATCH, PUT, DELETE, OPTIONS`.

---

## 6. HTTPS & Security Headers

The application includes native enterprise security headers in `backend/src/middleware/securityHeaders.js`:
- **HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains` (enforces HTTPS transmission for 1 year).
- **MIME Sniffing**: `X-Content-Type-Options: nosniff`.
- **Clickjacking**: `X-Frame-Options: SAMEORIGIN`.
- **Referrer Policy**: `Referrer-Policy: strict-origin-when-cross-origin`.
- **Content Security Policy (CSP)**: Disallows unauthorized external scripts and framing while allowing Google Fonts and secure HTTPS endpoints.
- **X-Powered-By**: Server fingerprinting header disabled via `app.disable('x-powered-by')`.

---

## 7. Single Page Application (SPA) Routing Fallback

Because React Router manages client-side routing (`/menu`, `/cart`, `/checkout`, `/orders`, `/track-order`, `/admin/*`), production web servers must return `index.html` for all unknown routes (HTTP 200 fallback).

### Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name happinessrestaurant.com;

    root /var/www/happiness-restaurant/frontend/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Assets Caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Reverse Proxy to Node.js Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Vercel / Netlify Configuration
- **Vercel (`vercel.json`)**:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- **Netlify (`public/_redirects`)**:
  ```
  /*    /index.html   200
  ```

---

## 8. Notification Provider Configuration

Notification dispatch occurs automatically when an admin advances an order to `READY_FOR_PICKUP`.
- **Decoupled Architecture**: Notification dispatch is isolated inside `try/catch`. If WhatsApp or SMS services fail or are unconfigured, the order remains in `READY_FOR_PICKUP` status and order processing is **not** broken.
- **Audit Logging**: Every dispatch attempt is logged to `NotificationLog` collection with timestamp, recipient, payload, status (`SENT`, `FAILED`, or `NOT CONFIGURED`), and error message.
- **Unconfigured Mode**: If `WHATSAPP_API_KEY` or `SMS_API_KEY` is not provided, the service logs `status: NOT CONFIGURED` and safely exits without error.

---

## 9. Initial Administrator Setup

1. Configure `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `backend/.env`.
2. On initial backend startup, `server.js` executes `seedAdmin()`.
3. If no administrator exists in the database, the account is created and password hashed with bcrypt (salt rounds: 10).
4. If an administrator already exists, `seedAdmin()` safely skips seeding (idempotent; existing passwords and credentials are never overwritten).
5. Passwords are never logged or exposed in API responses.

---

## 10. Health Check & Uptime Monitoring

- **Endpoint**: `GET /api/health`
- **Expected Response**: HTTP 200
  ```json
  {
    "success": true,
    "message": "Restaurant API is running"
  }
  ```
- **Security**: The health endpoint strictly omits database connection strings, stack traces, and internal server paths. It is safe for external uptime ping services (e.g., UptimeRobot, BetterUptime, AWS Route 53 Health Checks).

---

## 11. Database Backup & Disaster Recovery

### Automated MongoDB Atlas Snapshots
- Enable Atlas Automated Daily Cloud Backups with a 7-day retention policy.
- Test point-in-time restore (PITR) procedures quarterly.

### Manual Backup Command (`mongodump`)
Execute before deploying any application or schema updates:
```bash
mongodump --uri="<MONGODB_URI>" --out="/backups/happiness_db_$(date +%Y%m%d_%H%M%S)"
```

### Restore Command (`mongorestore`)
```bash
mongorestore --uri="<MONGODB_URI>" --drop /backups/happiness_db_<timestamp>/happiness_restaurant
```

> Never execute destructive database scripts (`dropDatabase`, `deleteMany({})`, or reset scripts) on production databases. Historical order records and customer profiles must remain intact.

### Environment Configuration Backup Procedure
1. Store production `.env` files securely offsite in an encrypted secrets manager (e.g., AWS Secrets Manager, Doppler, 1Password Secrets Automation, or HashiCorp Vault).
2. Never commit production `.env` files to Git.
3. Keep an offline, GPG-encrypted backup of production environment configurations with versioned release tags:
   ```bash
   tar -czf - backend/.env frontend/.env.production | gpg -c -o happiness_env_backup_$(date +%Y%m%d).tar.gz.gpg
   ```

### Deployment Rollback Procedures

#### Frontend Rollback
1. If hosting on static hosting or CDN (Nginx / Cloudflare / Vercel / Netlify):
   - Instant Rollback: Switch web server symlink or CDN deployment pointer to the previous build directory.
     ```bash
     ln -sfn /var/www/happiness-restaurant/releases/v1.0.0 /var/www/happiness-restaurant/current
     sudo systemctl reload nginx
     ```
   - On Vercel / Netlify: Promote the previous successful deployment via dashboard or CLI (`vercel rollback`).

#### Backend Rollback
1. Keep the previous application release artifact or container image tagged in your container registry (e.g., `happiness-backend:v1.0.0`).
2. Roll back the running service immediately:
   ```bash
   # PM2 process rollback
   pm2 restart happiness-backend --update-env
   # Docker / Container rollback
   docker stop happiness-backend && docker run -d --name happiness-backend -p 5000:5000 --env-file /etc/happiness/backend.env happiness-backend:v1.0.0
   ```
3. Database compatibility: Schema migrations are strictly additive; rollback does not require schema changes.

---

## 12. Pre-Deployment Verification Checklist

Before announcing production availability to customers:

- [ ] 1. **Environment Separation**: `NODE_ENV=production` set in backend environment.
- [ ] 2. **HTTPS Configured**: SSL/TLS certificates active on both frontend and backend domains.
- [ ] 3. **CORS Configured**: `CLIENT_URL` points strictly to the production frontend domain.
- [ ] 4. **MongoDB Connected**: MongoDB Atlas connection verified with TLS enabled and IP whitelisted.
- [ ] 5. **Admin Seeded**: Admin user verified in database; default passwords rotated.
- [ ] 6. **Physical Menu Seeded**: All 144 physical menu items present with positive prices and unique slugs.
- [ ] 7. **Asset Integrity**: All 156 images present in `frontend/dist/images/` without 404 errors.
- [ ] 8. **Pickup-Only Mode**: Verified zero delivery options, addresses, or delivery fee calculations exist.
- [ ] 9. **Order Pricing Authority**: Server-side price calculation verified (frontend prices never trusted).
- [ ] 10. **Error Masking**: Production errors return generic messages; stack traces and paths redacted.
- [ ] 11. **Health Check**: `GET /api/health` returns HTTP 200 from external network.
- [ ] 12. **SPA Fallback**: Direct URL navigation to `/menu`, `/cart`, `/orders`, `/admin` works without 404.
- [ ] 13. **Customer Flow**: End-to-end test of register -> login -> add to cart -> checkout -> pickup token generation.
- [ ] 14. **Admin Flow**: End-to-end test of admin login -> view orders -> mark PREPARING -> mark READY -> mark PICKED_UP.
- [ ] 15. **Notification Safeguards**: Verified order advancement succeeds even if WhatsApp/SMS credentials are blank.
