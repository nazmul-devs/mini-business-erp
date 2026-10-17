# Mini Business ERP

A focused full-stack assessment project for managing parties (vendors/clients), products, purchases, sales invoices, expenses, inventory, and reports.

## Stack
- Monorepo: pnpm workspaces + Turborepo
- Web: Next.js + TypeScript + Tailwind CSS
- API: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma
- Validation/shared types: Zod
- Tests: Vitest (or Jest)

## Apps and packages
- `apps/web`: frontend
- `apps/api`: REST API
- `packages/database`: Prisma schema, migrations, and database client
- `packages/shared`: shared schemas, types, constants, and utilities
- `docs`: architecture and API notes

## Setup
1. Install Node.js LTS and pnpm.
2. Copy `.env.example` to `.env` and fill in values.
3. Run `pnpm install`.
4. Generate Prisma client: `pnpm db:generate`.
5. Run migrations: `pnpm db:migrate`.
6. Start apps: `pnpm dev`.

This is a scaffold only; implement the modules and business logic yourself. Keep secrets out of Git.
