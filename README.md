# StackPay API

A Fintech-as-a-Service infrastructure API that gives developers a single integration point for payments, identity verification, OTP messaging, wallet operations, and webhook management — replacing separate Paystack, Flutterwave, Mono, Termii, and SendGrid integrations.

Built as a portfolio project targeting Nigerian fintech engineering roles (Mono, Paystack, Flutterwave, Termii, Anchor).

**Live API:** `https://stackpay-api.onrender.com`
**Swagger Docs:** `https://stackpay-api.onrender.com/docs`
**GitHub:** `https://github.com/Chrix-Dev/StackPay-Api`

---

## The Core Concept

Without StackPay, a developer building a Nigerian fintech product has to:

- Integrate Paystack separately for payments
- Integrate Termii separately for OTP/SMS
- Integrate Mono separately for bank data
- Build their own wallet system
- Build their own KYC flow
- Handle webhooks from multiple providers separately

With StackPay, a developer signs up, gets an API key, and one API handles everything. StackPay routes to the right provider internally and returns clean, consistent responses regardless of which provider handled the request.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | NestJS + TypeScript | Enforced module structure scales across 9+ feature modules without becoming unmaintainable |
| Database | PostgreSQL (Supabase) | Financial data is inherently relational. ACID transactions guarantee atomic money movement |
| ORM | Prisma v5 | Schema-first migrations, type-safe queries, Prisma enums enforce valid states at the DB level |
| Cache / Queue | Redis (Upstash) + Bull | Redis for sub-millisecond OTP storage and quota counters. Bull for async webhook delivery with retry logic |
| Auth | JWT (15min access) + Refresh Tokens | Short-lived access tokens limit blast radius of token theft. Refresh token rotation detects stolen tokens |
| Payments | Paystack + Flutterwave | Provider pattern — both implement the same interface, making future providers a single file addition |
| Logging | Pino | Fastest Node.js logger. JSON output in production, pretty-printed in development. Automatic HTTP request logging |
| CI/CD | GitHub Actions + Render | Every push runs 51 tests before deploying. Failed tests block deployment |
| Deployment | Docker + Render | Containerized for environment consistency |

---

## Key Engineering Decisions

**Provider pattern for payments**
Both Paystack and Flutterwave implement a `PaymentProvider` interface with `initializePayment()`, `verifyPayment()`, and `verifyWebhookSignature()`. `PaymentsService` selects the provider at runtime based on the `provider` field in the request. Adding a third provider (Stripe, Monnify) requires zero changes to existing service code — just a new class implementing the interface.

**Refresh token rotation**
Access tokens expire in 15 minutes. Refresh tokens expire in 7 days and are stored as SHA256 hashes in the database — never raw. On every use, the old refresh token is immediately revoked and a new pair is issued. If a stolen refresh token is used before the legitimate developer, their next attempt fails — a signal of compromise. This matches AzaPay's token architecture exactly.

**API keys hashed with bcrypt**
API keys are stored as bcrypt hashes, shown to the developer only once at creation. If the database is breached, raw keys cannot be recovered. When validating an incoming key, we compare the bcrypt hash of the incoming value against stored hashes. Test keys (`sk_test_`) and live keys (`sk_live_`) are distinguished at the prefix level and tracked via a `KeyEnvironment` enum at the database level.

**Per-key monthly quotas via Redis atomic INCR**
Every API key request increments a Redis counter scoped to `quota:usage:{keyId}:{year}:{month}`. The counter TTL is set to expire at the end of the month automatically. FREE tier allows 1,000 requests/month, PRO allows 10,000. Quota enforcement happens at the guard level before any business logic runs, so zero-compute rejection on quota-exceeded requests.

**Webhook delivery with exponential backoff**
Outbound webhook delivery is queued via Bull (Redis-backed). Failed deliveries retry 3 times with exponential backoff (5s → 10s → 20s). Every delivery attempt upserts a `WebhookDelivery` row so the `attempts` counter reflects actual Bull retries, not just final status. Outgoing events are signed with HMAC-SHA256 using a per-webhook secret (`whsec_`) so developers can verify events actually came from StackPay.

**Atomic wallet transfers**
All wallet operations use Prisma's `$transaction()` — debit sender, credit receiver, and create transaction records either all succeed or all roll back. Idempotency keys prevent double-processing from network retries. PINs are hashed with bcrypt, and wallets lock after 3 failed PIN attempts, requiring admin intervention to unlock.

**Money stored as Decimal, not Float**
`0.1 + 0.2 = 0.30000000000000004` in IEEE 754 floating point. All balance and amount columns use `Decimal @db.Decimal(20, 2)` — PostgreSQL's exact numeric type. This is the same approach used by Paystack and every production financial system.

**Dual authentication — JWT + API keys**
Dashboard-facing endpoints (auth, keys, dashboard, admin) require JWT. Service endpoints (payments, messaging, identity, wallet) accept both JWT and API keys via a `CombinedAuthGuard`. When a request carries `x-api-key`, the guard validates the key, checks quota, and attaches `req.user` in the same shape as JWT auth — controllers don't know or care which method was used.

**Structured logging with Pino**
All `console.log` calls replaced with Pino structured logging. PII (BVN, NIN) is masked in logs (`1234****`). Every HTTP request is automatically logged with method, URL, status code, and response time via `pino-http`. In production, output is JSON. In development, output is human-readable and colorized.

---

## Features

### Authentication
- Register with email and password
- Email verification (token returned in development, emailed in production)
- Login → returns 15-minute access token + 7-day refresh token
- Refresh token rotation — new pair issued on every refresh, old token revoked
- Logout with refresh token revocation
- Get current developer profile

### API Keys
- Generate test keys (`sk_test_`) and live keys (`sk_live_`)
- Keys stored as bcrypt hashes — shown only once at creation
- Revoke keys
- Per-key usage analytics (total requests, today, this month, success rate, last used)
- Per-key monthly quotas (FREE: 1,000/month, PRO: 10,000/month)
- Admin can upgrade developer plan

### Payments
- Initialize payment — Paystack or Flutterwave, unified response
- Verify payment by reference
- Receive and verify webhooks from both providers (HMAC signature verification)
- List available payment providers
- Test keys route to test payment mode

### Messaging
- Send OTP via SMS, WhatsApp, or Email (simulated Termii/SendGrid — swap in real keys)
- Verify OTP (stored in Redis with 5-minute TTL, deleted after successful verification)
- Rate limited: 5 OTP sends per minute

### Identity
- BVN verification (simulated Smile ID — raw BVN never persisted)
- NIN verification (simulated NIBSS)
- Bank account resolution (real Paystack API — returns account name from account number + bank code)

### Webhooks
- Register webhook URLs
- StackPay signs outgoing events with HMAC-SHA256 (`x-stackpay-signature`)
- Bull queue with exponential backoff retry (5s → 10s → 20s, 3 attempts)
- Delivery history with attempt tracking
- Send test event to verify endpoint is working

### Wallet
- Auto-created on first access
- Fund, transfer, withdraw
- Transaction PIN (bcrypt hashed, wallet locks after 3 failed attempts)
- Change PIN (requires current PIN)
- Idempotency keys on all mutations
- Transaction history with pagination, filtering by type and date range
- Wallet unlock via admin

### Dashboard
- Usage stats (total requests, success rate, error rate, active keys, active webhooks)
- Request logs (last 100)
- Audit logs (key revocations, PIN changes, wallet unlocks)

### Admin
- Platform dashboard (total developers, transaction volume, webhook delivery stats)
- List and view all developers
- Toggle developer account status
- Unlock locked wallets
- View all transactions
- View webhook delivery failures
- Upgrade developer plan (FREE → PRO)
- Admin accounts created via seed script, no public registration endpoint

---

## API Endpoints

```
AUTH
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/logout
  POST   /api/v1/auth/verify-email/:token
  GET    /api/v1/auth/me

API KEYS
  GET    /api/v1/keys
  POST   /api/v1/keys
  PATCH  /api/v1/keys/:id/revoke
  GET    /api/v1/keys/:id/usage
  GET    /api/v1/keys/:id/quota

PAYMENTS
  POST   /api/v1/payments/initialize
  GET    /api/v1/payments/verify/:reference
  POST   /api/v1/payments/webhook
  GET    /api/v1/payments/providers

MESSAGING
  POST   /api/v1/messaging/otp/send
  POST   /api/v1/messaging/otp/verify

IDENTITY
  POST   /api/v1/identity/bvn/verify
  POST   /api/v1/identity/nin/verify
  POST   /api/v1/identity/bank/resolve

WEBHOOKS
  GET    /api/v1/webhooks
  POST   /api/v1/webhooks
  DELETE /api/v1/webhooks/:id
  GET    /api/v1/webhooks/:id/deliveries
  POST   /api/v1/webhooks/:id/test

WALLET
  GET    /api/v1/wallet/me
  POST   /api/v1/wallet/pin
  POST   /api/v1/wallet/pin/change
  POST   /api/v1/wallet/fund
  POST   /api/v1/wallet/transfer
  POST   /api/v1/wallet/withdraw
  GET    /api/v1/wallet/transactions
  GET    /api/v1/wallet/transactions/:id

DASHBOARD
  GET    /api/v1/dashboard/stats
  GET    /api/v1/dashboard/logs
  GET    /api/v1/dashboard/logs/:id
  GET    /api/v1/dashboard/audit-logs

ADMIN
  GET    /api/v1/admin/dashboard
  GET    /api/v1/admin/developers
  GET    /api/v1/admin/developers/:id
  PATCH  /api/v1/admin/developers/:id/toggle
  PATCH  /api/v1/admin/developers/:id/unlock-wallet
  PATCH  /api/v1/admin/developers/:id/plan
  GET    /api/v1/admin/transactions
  GET    /api/v1/admin/webhooks/deliveries
```

---

## Authentication

StackPay uses two authentication methods depending on the context:

**JWT (Bearer token)** — for dashboard-style access (managing keys, viewing logs, admin actions)
```
Authorization: Bearer <access_token>
```

**API Key** — for programmatic service calls from a developer's backend
```
x-api-key: sk_test_xxxxxxxx
```

Endpoints for payments, messaging, identity, and wallet accept both methods via a `CombinedAuthGuard`. If `x-api-key` is present, it takes priority over Bearer.

---

## Running Locally

### Prerequisites
- Node.js v20+
- A PostgreSQL database (Supabase free tier works)
- A Redis instance (Upstash free tier works)
- Paystack test account

### Setup

```bash
git clone https://github.com/Chrix-Dev/StackPay-Api.git
cd StackPay-Api
npm install
npx prisma generate
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PAYSTACK_SECRET_KEY=sk_test_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
REDIS_URL=rediss://...
NODE_ENV=development
PORT=3000
ADMIN_EMAIL=admin@stackpay.dev
ADMIN_PASSWORD=your-admin-password
```

### Run migrations

```bash
npx prisma migrate deploy
```

### Create admin user

```bash
npm run seed:admin
```

### Start server

```bash
npm run start:dev
```

Visit `http://localhost:3000/docs` for Swagger UI.

---

## Testing

```bash
# Unit tests (37 tests)
npm run test

# E2E tests (14 tests)
npm run test:e2e

# All tests
npm run test && npm run test:e2e
```

### Test coverage

| File | What's tested |
|---|---|
| `auth.service.spec.ts` | Register, login, email verification, refresh token rotation, logout |
| `wallet.service.spec.ts` | Fund, transfer, insufficient balance, idempotency, PIN validation, wallet lockout |
| `keys.service.spec.ts` | Create key, revoke key, validate key via bcrypt, quota info |
| `payments.service.spec.ts` | Provider selection (Paystack/Flutterwave), webhook signature verification |
| `app.e2e-spec.ts` | Auth flow, wallet flow, dashboard, identity, messaging |

Tests run automatically on every push via GitHub Actions. Deployment is blocked if any test fails.

---

## CI/CD

GitHub Actions pipeline on every push to `main`:

1. Install dependencies
2. Generate Prisma client
3. Run unit tests (37)
4. Run E2E tests (14)
5. Build application
6. Deploy to Render (only if all tests pass)

---

## Database Schema

```
Developer         — auth, profile, plan (FREE/PRO), role (USER/ADMIN)
ApiKey            — hashed keys, environment (TEST/LIVE), per-key request logs
RefreshToken      — hashed tokens, expiry, revocation flag
RequestLog        — every API call with method, path, status, duration, apiKeyId
AuditLog          — sensitive actions (key revocation, PIN change, wallet unlock)
Webhook           — registered developer URLs, HMAC signing secret
WebhookDelivery   — delivery attempts, status codes, retry count
Wallet            — balance (Decimal), PIN (bcrypt), lockout state
WalletTransaction — type (CREDIT/DEBIT), status, idempotency key, reference
```

---

## What I'd Add in Production

- **Real Termii integration** — replace simulated SMS/WhatsApp OTP delivery
- **Real SendGrid integration** — replace simulated email OTP and email verification
- **API key fast-lookup** — store a plain-text key prefix for O(1) DB lookup before bcrypt comparison. Current implementation loops all keys which won't scale past ~1,000 active keys
- **Webhook secret rotation** — endpoint for developers to rotate their `whsec_` without deleting and re-registering
- **Sentry error tracking** — structured errors with stack traces and developer context
- **Read replicas** — transaction history and dashboard queries against a replica, mutations against primary
- **CBN KYC tiers** — tiered transaction limits (Tier 1/2/3) based on verified identity level, aligned with CBN guidelines
- **Celery-equivalent for Python services** — if the platform expanded to Python microservices

---

## Author

Built by [Umunna Chibuenyim Christian](https://github.com/Chrix-Dev)

Backend Engineer at Naimexi — building fintech APIs and market intelligence systems for Nigerian FMCG retail.