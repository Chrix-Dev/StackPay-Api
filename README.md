# StackPay-Api

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

**A fintech infrastructure platform for wallet management, payments, and developer tooling.**

StackPay is a unified backend system that gives developers a single integration point for payments, identity verification, wallet operations, and webhook management — eliminating the need to integrate Paystack, Flutterwave, and other providers separately. It's built to demonstrate the engineering patterns behind real fintech infrastructure products like Paystack, Mono, and Flutterwave: reliability, idempotency, asynchronous processing, and secure access control.

> **Status:** Actively in development. Core modules are functional; see [Roadmap](#roadmap) for what's next.

---

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Features](#features)
- [Project structure](#project-structure)
- [Installation](#installation)
- [API reference](#api-reference)
- [Engineering concepts demonstrated](#engineering-concepts-demonstrated)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

Without StackPay, a developer building a fintech product in Nigeria has to integrate Paystack for payments, build their own wallet system, handle KYC separately, and manage webhooks from multiple providers independently. StackPay collapses this into one API — developers sign up, get an API key, and get consistent, unified responses regardless of which provider is handling a request behind the scenes.

The project is built around three core principles:

- **Reliability** — idempotency keys, atomic transactions, and retry-safe webhook delivery
- **Security** — JWT authentication, RBAC, hashed API keys, and request validation
- **Extensibility** — a provider abstraction layer designed to support multiple payment processors

---

## Architecture

StackPay follows a modular architecture using NestJS, with each domain isolated into its own module:

```
┌─────────────────────────────────────────────┐
│                  API Gateway                  │
│         (Guards · Validation · Logging)        │
└───────────────────┬─────────────────────────┘
                     │
   ┌─────────────────┼─────────────────┐
   │                 │                 │
┌──▼───┐        ┌────▼────┐       ┌────▼────┐
│ Auth │        │ Wallet  │       │ Payment │
│Module│        │ Module  │       │ Module  │
└──┬───┘        └────┬────┘       └────┬────┘
   │                 │                 │
   │           ┌─────▼─────┐     ┌─────▼─────┐
   │           │Transaction│     │  Webhook  │
   │           │  Module   │     │  Module   │
   │           └───────────┘     └─────┬─────┘
   │                                   │
┌──▼──────┐                      ┌─────▼─────┐
│API Key  │                      │   Bull    │
│ Module  │                      │  Queue    │
└─────────┘                      └─────┬─────┘
                                        │
                                  ┌─────▼─────┐
                                  │   Redis   │
                                  └───────────┘
```

All modules persist through **PostgreSQL via Prisma ORM**. **Redis** backs caching and queue management, with **Bull** handling background job processing — primarily webhook delivery and retry workflows.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend framework | NestJS, TypeScript, Node.js |
| Database | PostgreSQL, Prisma ORM |
| Caching & queues | Redis, Bull |
| Authentication | JWT, RBAC, API Keys |
| Documentation | Swagger / OpenAPI |
| Infrastructure | Docker |
| Payments | Paystack *(Flutterwave planned)* |

---

## Features

### Authentication & authorization
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Guard-protected endpoints
- Secure user authentication workflows
- Refresh token support *(planned)*

### Wallet infrastructure
- Wallet creation and management
- Wallet funding, wallet-to-wallet transfers, and withdrawals
- PIN verification for sensitive operations
- Transaction recording and tracking
- Idempotency protection to prevent duplicate financial operations

### API key management
- API key generation, validation, and revocation
- Secure API key hashing and storage
- Access management for third-party consumers

### Payment processing
- Paystack integration with payment verification
- Webhook handling for payment events
- Extensible provider abstraction layer for future integrations

### Webhook infrastructure
- Webhook registration and event delivery
- Asynchronous processing via Bull and Redis
- Retry mechanisms for failed deliveries with delivery tracking

### Analytics & monitoring
- Request logging and API usage tracking
- Success/failure metrics
- Dashboard statistics for operational visibility

### Security
- JWT authentication, RBAC, and API key authentication
- Secure password handling
- Idempotency keys and request validation
- Financial transaction safeguards

---

## Project structure

```
stackpay-api/
├── src/
│   ├── auth/              # JWT authentication & RBAC
│   ├── users/              # User management
│   ├── wallet/             # Wallet operations
│   ├── transactions/       # Transaction recording & idempotency
│   ├── api-keys/           # API key generation & validation
│   ├── payments/           # Paystack integration
│   ├── webhooks/           # Webhook registration & delivery
│   ├── analytics/          # Usage tracking & metrics
│   ├── dashboard/          # Dashboard statistics
│   ├── queues/             # Bull queue processors
│   ├── common/             # Guards, interceptors, decorators
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
└── README.md
```

---

## Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Redis
- Docker *(optional, for containerized setup)*

### Setup

```bash
# Clone the repository
git clone https://github.com/Chrix-Dev/StackPay-Api.git
cd StackPay-Api

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Update `.env` with your database, Redis, and Paystack credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/stackpay"
REDIS_HOST="localhost"
REDIS_PORT=6379
JWT_SECRET="your-jwt-secret"
PAYSTACK_SECRET_KEY="your-paystack-secret-key"
```

```bash
# Run Prisma migrations
npx prisma migrate dev

# Start the development server
npm run start:dev
```

The API Swagger documentation is available at 'https://stackpay-api.onrender.com'.

### Running with Docker

```bash
docker-compose up --build
```

---

## API reference

| Module | Method | Endpoint | Description |
|---|---|---|---|
| Auth | `POST` | `/auth/register` | Register a new user |
| Auth | `POST` | `/auth/login` | Authenticate and receive a JWT |
| Wallet | `POST` | `/wallet/fund` | Fund a wallet |
| Wallet | `POST` | `/wallet/transfer` | Transfer between wallets |
| Wallet | `POST` | `/wallet/withdraw` | Withdraw funds |
| API Keys | `POST` | `/api-keys` | Generate a new API key |
| API Keys | `DELETE` | `/api-keys/:id` | Revoke an API key |
| Payments | `POST` | `/payments/initialize` | Initialize a Paystack payment |
| Payments | `GET` | `/payments/verify/:reference` | Verify a payment |
| Webhooks | `POST` | `/webhooks` | Register a webhook endpoint |
| Webhooks | `GET` | `/webhooks/:id/deliveries` | View delivery history |
| Dashboard | `GET` | `/dashboard/stats` | View usage statistics |

Full interactive documentation is available via Swagger once the server is running.

---

## Engineering concepts demonstrated

- REST API design
- Fintech infrastructure patterns
- Authentication & authorization (JWT, RBAC, API keys)
- Background job processing & queue-based architecture
- Payment gateway integration
- Webhook processing with retry mechanisms
- Idempotency & transaction consistency
- Modular system design
- Analytics & monitoring

---

## Roadmap

- [ ] Transaction History API with pagination and filtering
- [ ] Refresh token authentication
- [ ] API usage quotas and per-key rate limiting
- [ ] Automated unit, integration, and end-to-end tests
- [ ] GitHub Actions CI/CD pipeline
- [ ] Structured logging
- [ ] Multi-provider payment architecture
- [ ] Flutterwave integration

---

## License

This project is licensed under the MIT License.

---

*StackPay is a portfolio project built to demonstrate backend infrastructure thinking for fintech systems. Built by [Chris](https://github.com/Chrix-Dev).*
