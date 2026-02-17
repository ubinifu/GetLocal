# GetLocal - Local Corner Store Pickup Platform

A mobile-first application connecting local customers with independent corner stores for product ordering and in-store pickup, featuring real-time inventory management and seamless communication between customers and store owners.

## Tech Stack

- **Backend**: Node.js 18+ / Express.js / TypeScript / Prisma ORM
- **Frontend**: React 19 / TypeScript / Vite / Tailwind CSS / Redux Toolkit
- **Database**: PostgreSQL 15+ / Redis 7+
- **Infrastructure**: Docker / Docker Compose / Nginx
- **Payments**: Stripe Connect
- **CI/CD**: GitHub Actions

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) and Docker Compose
- [PostgreSQL 15+](https://www.postgresql.org/) (or use Docker)
- [Redis 7+](https://redis.io/) (or use Docker)

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd GetLocal
```

### 2. Start infrastructure services (PostgreSQL + Redis)

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Set up the backend environment

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration as needed
```

### 5. Run database migrations and seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

### 6. Start the development servers

```bash
cd ..
npm run dev
```

The backend API runs at `http://localhost:3000` and the frontend at `http://localhost:5173`.

## API Endpoints

| Method | Endpoint                    | Description                |
| ------ | --------------------------- | -------------------------- |
| GET    | `/api/health`               | Health check               |
| POST   | `/api/auth/register`        | Register a new user        |
| POST   | `/api/auth/login`           | Authenticate user          |
| POST   | `/api/auth/refresh`         | Refresh access token       |
| POST   | `/api/auth/logout`          | Invalidate session         |
| GET    | `/api/stores`               | List stores (public)       |
| GET    | `/api/stores/:id`           | Get store details          |
| POST   | `/api/stores`               | Create a store (owner)     |
| PUT    | `/api/stores/:id`           | Update a store (owner)     |
| DELETE | `/api/stores/:id`           | Delete a store (owner)     |
| GET    | `/api/stores/:id/products`  | Get store products         |
| POST   | `/api/orders`               | Create a new order         |
| GET    | `/api/orders/:id`           | Get order details          |
| PUT    | `/api/orders/:id/status`    | Update order status        |
| GET    | `/api/products`             | List products              |
| POST   | `/api/reviews`              | Create a review            |
| GET    | `/api/notifications`        | Get user notifications     |

## Project Structure

```
GetLocal/
├── backend/                   # Express.js + TypeScript API
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── config/            # App configuration
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, validation, errors
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript type definitions
│   │   ├── validators/        # Zod validation schemas
│   │   ├── app.ts             # Express app setup
│   │   └── server.ts          # Server entry point
│   ├── tests/
│   │   ├── unit/              # Unit tests
│   │   ├── integration/       # Integration tests
│   │   └── setup.ts           # Test configuration
│   ├── Dockerfile
│   ├── jest.config.ts
│   ├── tsconfig.json
│   └── package.json
├── frontend/                  # React + Vite SPA
│   ├── public/
│   ├── src/
│   ├── nginx.conf             # Production Nginx config
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml             # CI/CD pipeline
├── docker-compose.yml         # Production compose
├── docker-compose.dev.yml     # Development compose
├── package.json               # Root workspace scripts
└── README.md
```

## Available Scripts

### Root

| Script            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start backend and frontend in development mode     |
| `npm run install:all` | Install dependencies for all packages          |
| `npm run build:all`   | Build backend and frontend for production      |
| `npm run test:all`    | Run all backend tests                          |
| `npm run docker:up`   | Start all services with Docker Compose         |
| `npm run docker:down` | Stop all Docker Compose services               |
| `npm run docker:dev`  | Start dev infrastructure (PostgreSQL + Redis)  |
| `npm run db:migrate`  | Run database migrations                        |
| `npm run db:seed`     | Seed the database                              |
| `npm run db:reset`    | Reset the database                             |

### Backend

| Script             | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start with hot-reload (nodemon)      |
| `npm run build`    | Compile TypeScript                   |
| `npm test`         | Run Jest test suite                  |
| `npm run test:cov` | Run tests with coverage report       |

### Frontend

| Script          | Description                     |
| --------------- | ------------------------------- |
| `npm run dev`   | Start Vite dev server           |
| `npm run build` | Build production bundle         |
| `npm run preview` | Preview production build      |

## Docker

### Full stack (production)

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, the backend API (port 3000), and the frontend (port 80).

### Development infrastructure only

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This starts only PostgreSQL (port 5432) and Redis (port 6379) for local development.

## Environment Variables

See `backend/.env.example` for the full list of environment variables. Key variables:

| Variable              | Description                    | Default                      |
| --------------------- | ------------------------------ | ---------------------------- |
| `PORT`                | Backend server port            | `3000`                       |
| `NODE_ENV`            | Runtime environment            | `development`                |
| `DATABASE_URL`        | PostgreSQL connection string   | See .env.example             |
| `REDIS_URL`           | Redis connection string        | `redis://localhost:6379`     |
| `JWT_SECRET`          | JWT signing secret             | (required in production)     |
| `JWT_REFRESH_SECRET`  | Refresh token signing secret   | (required in production)     |
| `STRIPE_SECRET_KEY`   | Stripe API secret key          | (required for payments)      |
| `CORS_ORIGIN`         | Allowed CORS origin            | `http://localhost:5173`      |

## License

ISC
