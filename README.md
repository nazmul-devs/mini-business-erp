# Mini Business ERP

A modern, full-stack monorepo ERP application designed for managing parties (vendors and clients), product inventory, purchases, sales invoices, operating expenses, and financial ledger reports.

---

## 🛠 Tech Stack

- **Monorepo**: [pnpm](https://pnpm.io/) Workspaces + [Turborepo](https://turbo.build/)
- **Frontend (`apps/web`)**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend API (`apps/api`)**: Node.js, Express 5, TypeScript, JWT, bcryptjs, Zod
- **Database & Cache**: PostgreSQL 16 (Docker) + Redis 7 (Docker) + Prisma ORM
- **Testing**: Vitest
- **Type Safety**: End-to-end TypeScript with shared Zod validation schemas

---

## 📂 Repository Structure

```text
mini-business-erp/
├── apps/
│   ├── api/                      # REST API (Express 5 + TypeScript)
│   │   ├── src/
│   │   │   ├── config/           # Validated environment configuration
│   │   │   ├── middlewares/      # auth, validate, error, and notFound middlewares
│   │   │   ├── modules/          # Layered modules (routes, controller, service, repo)
│   │   │   │   └── auth/         # Complete Authentication module & unit tests
│   │   │   └── shared/errors/    # AppError operational error handler
│   │   └── package.json
│   │
│   └── web/                      # Frontend (Next.js 15 App Router)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/       # /login and /register pages
│       │   │   ├── (dashboard)/  # Protected dashboard layout & /dashboard page
│       │   │   └── page.tsx      # Landing page
│       │   ├── features/auth/    # AuthProvider context, useAuth, ProtectedRoute
│       │   └── lib/              # Client-side API fetcher & auth storage
│       └── package.json
│
├── packages/
│   ├── database/                 # Prisma schema, migrations, seed script & client
│   └── shared/                   # Shared TypeScript interfaces, types & Zod schemas
│
├── docker-compose.yml            # Docker container configurations for Postgres & Redis
├── pnpm-workspace.yaml           # pnpm workspace definition
└── turbo.json                    # Turborepo task pipeline configuration
```

---

## 🌐 Default Ports & Services

| Service | Host Port | Internal / Target | Description |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | `http://localhost:3000` | 3000 | Next.js Client Application |
| **REST API** | `http://localhost:4000` | 4000 | Express Backend API |
| **PostgreSQL** | `localhost:5434` | 5432 | Primary Database (Docker) |
| **Redis** | `localhost:6380` | 6379 | In-memory Cache & Sessions (Docker) |

*(Host ports 5434 and 6380 were selected to prevent conflicts with native local database services).*

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+ LTS recommended)
- [pnpm](https://pnpm.io/) (`corepack enable` or `npm install -g pnpm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
*(Pre-configured with default credentials and mapped Docker ports).*

### 3. Start Database & Redis Services
Start PostgreSQL and Redis in the background:
```bash
pnpm docker:up
```

### 4. Install Dependencies
Install all workspace dependencies:
```bash
pnpm install
```

### 5. Generate Database Client & Run Migrations
```bash
# Generate Prisma Client
pnpm db:generate

# Apply database migrations
pnpm db:migrate
```

### 6. Seed Initial Data
Populate the database with business profiles, demo users, sample parties, and products:
```bash
pnpm db:seed
```

### 7. Run the Development Servers
Start both the Frontend and Backend concurrently via Turborepo:
```bash
pnpm dev
```
- Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Login Credentials

The seed script (`pnpm db:seed`) provides pre-configured user accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@minibusinesserp.com` | `admin123` |
| **Manager** | `manager@minibusinesserp.com` | `admin123` |
| **Sales Executive** | `sales@minibusinesserp.com` | `admin123` |

> **Tip**: On the `/login` page, you can click the **"Auto-fill Admin"** button to instantly populate the credentials.

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | API health check status |
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user & receive Bearer JWT |
| `GET` | `/api/auth/me` | Protected | Retrieve authenticated user profile |
| `POST` | `/api/auth/logout` | Protected | Invalidate user session |

### Parties (`/api/parties`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/parties` | Protected | List parties with pagination, search & type filter |
| `GET` | `/api/parties/:id` | Protected | Get party details with transaction counts |
| `POST` | `/api/parties` | Protected | Create new party (Vendor, Client, or Both) |
| `PUT` | `/api/parties/:id` | Protected | Update existing party information |
| `DELETE` | `/api/parties/:id` | Protected | Delete party (guarded if transactions exist) |

---

## 📜 Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `pnpm dev` | `turbo dev` | Start all apps concurrently in development mode |
| `pnpm build` | `turbo build` | Build all workspace packages and apps |
| `pnpm typecheck` | `turbo typecheck` | Run TypeScript type checks across all packages |
| `pnpm test` | `turbo test` | Run Vitest test suites |
| `pnpm docker:up` | `docker compose up -d` | Start PostgreSQL & Redis Docker containers |
| `pnpm docker:down` | `docker compose down` | Stop PostgreSQL & Redis Docker containers |
| `pnpm docker:logs` | `docker compose logs -f` | Tail logs from Docker containers |
| `pnpm db:generate` | `prisma generate` | Generate Prisma client |
| `pnpm db:migrate` | `prisma migrate dev` | Run pending Prisma schema migrations |
| `pnpm db:seed` | `prisma db seed` | Run database seed script (`prisma/seed.ts`) |
| `pnpm db:studio` | `prisma studio` | Open Prisma Studio database management GUI |

---

## 🔒 Security & Best Practices

- Real environment configurations (`.env`, `.env.*`) are strictly excluded via `.gitignore`.
- Passwords are encrypted using `bcryptjs` with salt rounds.
- Protected routes on the web client verify sessions using both client storage and server-side token validation.
- API endpoints use Zod validation middleware to sanitize inputs before processing.
