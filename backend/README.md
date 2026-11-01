# Backend — API Server

Fastify + TypeScript + Prisma + Neon PostgreSQL backend for Appambattu Mutta Mittai.

## Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | Public | Health check |
| GET | /api/products | Public | List all products with prices |
| POST | /api/otp/send | Public | Send OTP to phone |
| POST | /api/otp/verify | Public | Verify OTP |
| POST | /api/orders | Public | Create order (requires verified OTP) |
| GET | /api/orders/:id | Public | Get order status |
| POST | /api/payments/i-have-paid | Public | Mark payment as submitted |
| GET | /api/config/qr-url | Public | Get GPay QR image URL |
| POST | /api/auth/login | Admin | Login |
| POST | /api/auth/logout | Admin | Logout |
| GET | /api/auth/me | Admin | Check session |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/orders | Admin | Orders list with filters |
| PATCH | /api/admin/orders/:id/status | Admin | Update order status |
| GET | /api/admin/export/csv | Admin | Download orders CSV |
| PATCH | /api/products/:id | Admin | Update product price/stock |
| POST | /api/config/qr-url | Admin | Set QR image URL |

## Environment Variables
Copy `.env.example` → `.env` for local dev.

## Database
Neon PostgreSQL. Run migrations: `npx prisma migrate deploy`
Seed products: `npm run db:seed`

## Deployment
Deploy to Render. See `../docs/DEPLOYMENT.md`.
