# Agents Guide

This document describes the foundation and infrastructure established during project initialization.

## Project Overview

**Church Donations Platform** - A transparent, community-driven donation platform built with Next.js 15, Drizzle ORM, and PostgreSQL, hosted on DigitalOcean.

## Architecture

### Core Stack

- **Frontend**: Next.js 15 (App Router)
- **Database**: PostgreSQL (container on the DigitalOcean Droplet in production; Supabase CLI provides a local Postgres for development)
- **ORM**: Drizzle
- **Authentication**: iron-session (fixed credential admin)
- **File Storage**: DigitalOcean Spaces (S3-compatible, via `@aws-sdk/client-s3`)
- **Emails**: Resend (thank-you emails and broadcasts)
- **Styling**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest
- **Production infra**: DigitalOcean Droplet + Docker Compose + Traefik (see `docs/deploy.md`)

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes (catalog)
│   ├── admin/             # Admin routes (protected)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── features/              # Feature modules
│   ├── donations/         # Donation flows + emails
│   ├── products/          # Product management
│   ├── categories/        # Category management
│   ├── pix/              # PIX settings
│   ├── broadcasts/        # Email broadcasts
│   └── dashboard/         # Admin dashboard
├── lib/
│   ├── db/               # Database client & schema
│   ├── auth/             # Authentication
│   ├── storage/          # Storage client
│   └── utils/            # Utility functions
├── middleware.ts         # Next.js middleware
└── components/           # Shared UI components
```

## Agent Skills (instalados no repositório)

Skills são pacotes de instruções para assistentes (Cursor, Claude Code, etc.). Cada skill vive em um diretório com `SKILL.md` e metadados no frontmatter.

### Onde estão

| Local | Uso |
| --- | --- |
| `.agents/skills/` | Conjunto principal (fonte). **Não versionado** (`.gitignore`) — precisa existir localmente. |
| `.agent/skills/`, `.claude/skills/`, `.trae/skills/`, `.kilocode/skills/` | Symlinks versionados apontando para `../../.agents/skills/*`. Se `.agents/` não existir na máquina, os links ficam quebrados (restaure a pasta para reativá-los). |

### Catálogo (`.agents/skills/<id>/SKILL.md`)

| Skill | Quando usar (resumo) |
| --- | --- |
| `deploy-to-vercel` | Deploy e previews na Vercel; ligar projeto ao Git. |
| `drizzle-orm` | Drizzle: schema, queries, transações, migrações, performance. |
| `drizzle-safe-migrations` | Migrações Drizzle seguras em produção (backfills, enums, ordem). |
| `exa-web-search-free` | Busca web/código via Exa MCP (sem API key). |
| `fix-coderabbit-review` | Corrigir issues do CodeRabbit em um PR e commit único. |
| `frontend-design` | Interfaces web com alto nível de design (evitar estética genérica). |
| `landing-page-design` | Landing pages: hero, CTA, conversão, mobile. |
| `nano-banana-pro` | Geração/edição de imagens (Gemini / Nano Banana Pro). |
| `next-best-practices` | Next.js: App Router, RSC, dados, metadata, bundling. |
| `perplexity` | Pesquisa na web com Perplexity (não substitui docs de libs nem o repo). |
| `postgres-drizzle` | PostgreSQL + Drizzle: SQL, índices, pooling, RLS, N+1. |
| `professional-communication` | E-mails, mensagens de time, reuniões, audiências técnicas/não técnicas. |
| `react` | React: componentes, hooks, estado, Vitest; React 19+. |
| `shadcn` | shadcn/ui: padrões, Radix, tokens, componentes compostos. |
| `shadcn-ui` | Instalação e padrões completos shadcn + RHF + Zod + temas. |
| `skill-best-practices` | Autoria de skills (agentskills.io), metadados, descoberta. |
| `skill-writer` | Criar/editar Skills para Claude Code (`SKILL.md`, frontmatter). |
| `tailwindcss` | Tailwind v4, layout responsivo, tailwind-variants. |
| `ui-ux-pro-max` | UI/UX: paletas, tipografia, padrões por stack (incl. Next + shadcn). |
| `vercel-composition-patterns` | Composição React em escala; compound components; React 19. |
| `vercel-react-best-practices` | Performance React/Next.js (Vercel Engineering). |
| `vercel-react-native-skills` | React Native / Expo: listas, animação, navegação nativa. |
| `web-design-guidelines` | Revisão de UI contra diretrizes web (a11y, UX). |

Para o texto completo de cada skill (passos, regras, referências), abra o `SKILL.md` correspondente.

## Database Schema

Source of truth: `src/lib/db/schema.ts` (migrations in `src/lib/db/migrations/`).

### Tables

1. **categories** - Donation categories
   - id (UUID PK)
   - name (unique text)
   - timestamps

2. **products** - Donation items
   - id (UUID PK)
   - name, description
   - targetAmount (in cents)
   - currentAmount (denormalized, in cents)
   - isFulfilled
   - isPublished
   - imagePath (Spaces path for product photo)
   - donationMode (`monetary` | `physical` | `both`)
   - productType (`regular` | `scholarship`)
   - timestamps

3. **product_categories** - Product-category relationships
   - productId (FK)
   - categoryId (FK)
   - Composite PK

4. **donations** - Recorded donations/pledges
   - id (UUID PK)
   - productId (FK)
   - donationType (`monetary` | `physical`)
   - amount (monetary, in cents)
   - donorName, donorPhone, donorEmail
   - receiptPath (Spaces path)
   - isVerified (financial team verification flag)
   - emailSentAt (last thank-you email timestamp)
   - createdAt

5. **pix_settings** - PIX configuration
   - id (UUID PK)
   - qrCodeImagePath (Spaces path)
   - copiaEColaCode
   - updatedAt

6. **broadcasts** - Email broadcast history
   - id (UUID PK)
   - subject, message
   - recipientCount, sentSuccessCount, sentFailureCount
   - sentBy, senderName
   - content (nullable JSONB; versioned structured email blocks)
   - createdAt (indexed)

7. **fund_transfers** - Transfers of funds between products
   - id (UUID PK)
   - sourceProductId, targetProductId (FKs, `ON DELETE RESTRICT`)
   - amount (in cents)
   - adminUsername
   - createdAt (indexed)

## Key Features Established

### Authentication

- **Admin Session**: iron-session with encrypted cookies
- **Fixed Credentials**: Username/password from env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
- **Session Duration**: 7 days
- **Protected Routes**: `/admin/*` routes check session in layout

### Database Access

- Drizzle ORM with the `postgres` (postgres-js) driver
- Connect timeout: 10 seconds; lazy client (never connects during `next build`)
- Migrations: Drizzle Kit generates SQL migrations (`npm run db:generate` / `db:migrate`)

### File Storage

- **DigitalOcean Spaces** (S3-compatible) via `src/lib/storage/spaces.ts`
- **Signed URLs**: 5-minute expiry for uploads and private downloads
- **Buckets** (names configured via `DO_SPACES_BUCKET_*` env vars):
  - `receipts` (private) - PIX payment proofs
  - `pix-qr` (public) - QR code image
  - `product-photos` (public) - product images
  - `broadcast-images` (public) - temporary and sent broadcast images
- Public URLs come from the corresponding `NEXT_PUBLIC_SPACES_*_URL` variables. Buckets rendered through `next/image` are also allow-listed in `next.config.ts` `remotePatterns`.

### Validation

- **Zod schemas** for all inputs
- Phone validation: Brazilian format (10-11 digits)
- Email validation: Standard format
- Currency: Integer cents (avoid floating-point errors)

## Development Workflow

### Prerequisites

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with local values
```

### Local Development

```bash
# Start the local Postgres (Supabase CLI, Docker required — used only as a dev database)
npm run supabase:start

# Generate and apply migrations
npm run db:generate
npm run db:migrate

# Start Next.js dev server
npm run dev
# If your shell exports a production DATABASE_URL, use instead:
npm run dev:local
```

### Testing

```bash
# Run all tests once
npm run test

# Watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Database Migrations

```bash
# After schema changes
npm run db:generate
# Review generated migration in src/lib/db/migrations/ (source of truth)
# Mirror the SQL into supabase/migrations/<timestamp>_<name>.sql (local reset uses it)
npm run db:migrate

# Reset database (local only; applies supabase/migrations/ + supabase/seed.sql)
npm run supabase:reset
```

Production: migrations are **not** applied automatically by the deploy — apply them on the Droplet (see `docs/deploy.md`, "Migrações em produção").

## Server Actions

All mutations are implemented as Server Actions in Next.js (no API routes).

### Donation Actions

- `createMonetaryDonation` - Record monetary donation + update progress
- `createPhysicalPledge` - Record physical pledge + mark fulfilled
- `generateUploadUrl` - Get signed URL for file upload

### Product Actions

- `createProduct` - Create new product (admin only)
- `updateProduct` - Modify product (admin only)
- `deleteProduct` - Remove product (admin only)

### Category Actions

- `createCategory` - Create category (admin only)
- `updateCategory` - Modify category (admin only)
- `deleteCategory` - Remove category (admin only)

### PIX Actions

- `updatePixSettings` - Update QR code and copia e cola (admin only)

### Other admin features

- **Broadcasts** (`features/broadcasts`) - send email announcements to past donors (Resend), with history
- **Fund transfers** (`admin/transfers`) - move funds between products, audited in `fund_transfers`
- **Financeiro** (`admin/financeiro`) - donation listing with verification flag (`isVerified`)

## Query Functions

All read operations are server-side queries:

- `getPublishedProducts()` - Products for catalog
- `getAllProducts()` - All products (admin)
- `getProductById(id)` - Single product with categories
- `getProductsByCategory(categoryId)` - Filter by category
- `getCategories()` - All categories
- `getDonationsByProductId(id)` - Donations for a product
- `getPixSettings()` - PIX configuration
- `getDashboardStats()` - Admin dashboard totals

## Error Handling

All Server Actions return `{ success: boolean, data?, error?, details? }` format.

Common errors:
- `VALIDATION_ERROR` - Invalid input per Zod schema
- `PRODUCT_NOT_FOUND` - Referenced product doesn't exist
- `UNAUTHORIZED` - Admin session invalid
- `INTERNAL_ERROR` - Database or system error

## Testing Strategy

### Unit Tests

- Schema validation (Zod)
- Business logic (donation calculations)
- Helper utilities (format, validate)

### Integration Tests

- Database transactions (monetary/physical flows)
- Storage integration (signed URLs)
- End-to-end donations

### Coverage Target

- ≥80% for critical paths
- Focus: donations/schemas, products/schemas, utilities

## Performance Considerations

1. **Denormalized Progress**: `current_amount` on products table for fast catalog reads
2. **Atomic Transactions**: All donation writes wrapped in DB transactions
3. **Uploads**: QR/product/receipt uploads use signed client-to-Spaces URLs (and require CORS); optimized broadcast images pass through an authenticated Server Action
4. **Drizzle Lightweight**: Better cold-start performance than Prisma

## Security

1. **Session**: Encrypted iron-session cookies
2. **Validation**: All inputs validated with Zod before DB writes
3. **Storage**: Signed URLs for private bucket access
4. **Environment**: Sensitive values in env vars (not committed)

## Deployment

Production runs entirely on DigitalOcean — full details in `docs/deploy.md`:

- **Droplet** with Docker Compose (`compose.traefik.yaml`) behind **Traefik** (TLS via Let's Encrypt), domain `ajude-o-colegio-sao-jose.com`
- **PostgreSQL** as a container on the Droplet's `internal` Docker network (`postgres:5432/donation`)
- **DigitalOcean Spaces** for file storage (four buckets)
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) — lint and tests are deploy gates; deploy happens over SSH running `scripts/deploy.sh`
- Production `.env` lives on the Droplet (mounted as a build secret and injected at runtime; never committed)

## Troubleshooting

### Database Connection Issues

1. Check `DATABASE_URL` in `.env.local`
2. Verify the local Postgres is running: `npm run supabase:start`
3. Check Docker is running
4. Shell-exported production `DATABASE_URL`? Use `npm run dev:local`

### Migration Failures

1. Review generated SQL in `src/lib/db/migrations/`
2. Reset local database: `npm run supabase:reset`
3. Check schema.ts for conflicts
4. If the runtime `DATABASE_URL` can't run DDL, set `DATABASE_URL_MIGRATE`

### Authentication Issues

1. Verify `SESSION_PASSWORD` is 32+ characters
2. Check iron-session cookies in DevTools
3. Ensure `/admin/login` credentials match env vars

## Feature Status

The foundation features are implemented and in production: admin authentication, admin CRUD (products/categories), public catalog, monetary and physical donation flows, admin dashboard, thank-you emails, email broadcasts, scholarship products, fund transfers, and the financial verification view.

New features should follow the established patterns: Server Actions with Zod validation, Drizzle transactions, Spaces for files, and Vitest coverage (tests are a deploy gate).
