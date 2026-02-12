# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fleet Care is a multi-tenant SaaS application for fleet management and vehicle maintenance tracking. Built with Next.js 15 (App Router), Prisma ORM, Clerk for authentication, and PostgreSQL (Neon).

## Commands

```bash
pnpm dev                  # Start development server
pnpm build               # Build for production (runs prisma generate first)
pnpm lint                # Run ESLint
pnpm lint:fix            # Fix ESLint issues
pnpm type-check          # TypeScript type checking
pnpm format              # Format code with Prettier

# Database
pnpm prisma:migrate      # Run Prisma migrations (dev)
pnpm prisma:generate     # Generate Prisma client
pnpm prisma:studio       # Open Prisma Studio GUI
pnpm db:seed             # Seed database with initial data

# Analysis
pnpm build:analyze       # Build with bundle analyzer (ANALYZE=true)
```

## Architecture

### Multi-Tenancy
- All data is tenant-scoped via `tenantId` field on most models
- Tenant ID comes from Clerk's `orgId` (Organization ID)
- Clerk webhooks sync organizations and memberships to Prisma (Tenant/User)
- Subdomain-based tenant routing is planned (see SETUP-ENTORNOS.md)

### Authentication
- Clerk handles all authentication (`@clerk/nextjs`)
- `middleware.ts` - `clerkMiddleware` protects routes and injects tenant context
- `src/lib/auth.ts` - `getCurrentUser()` resolves Clerk session to Prisma User (read-only)
- `src/app/api/webhooks/clerk/route.ts` - Svix-verified webhook syncs Clerk → Prisma
- Dashboard layout (`src/app/dashboard/layout.tsx`) enforces authentication via `getCurrentUser()`
- Onboarding wizard at `/onboarding` for new tenants

### Database (Prisma)
- Schema: `prisma/schema.prisma`
- Key models: Tenant, User, Vehicle, VehicleBrand, VehicleLine, VehicleType
- Maintenance: MantCategory, MantItem, MantPlan, PlanTask, VehicleMantPlan
- Work orders: WorkOrder, WorkOrderItem
- All tenant-scoped models have `@@unique([tenantId, ...])` constraints

### API Routes Pattern
Located in `src/app/api/`:
- `vehicles/` - Vehicle management (brands, lines, types, vehicles, documents)
- `maintenance/` - Maintenance system (categories, items, templates, plans)
- `uploadthing/` - File upload handling

API routes follow the pattern:
1. Call `getCurrentUser()` from `@/lib/auth` to get authenticated user + tenantId
2. Use `user.tenantId` for tenant scoping (comes from Clerk orgId)
3. Use Prisma for database operations
4. Return NextResponse.json() for success, NextResponse with status for errors

### Component Structure
- `src/components/ui/` - Shadcn/UI components (button, dialog, form, table, etc.)
- `src/components/layout/` - Layout components (Navbar, Sidebar, Logo)
- `src/components/landing/` - Landing page components
- Dashboard pages: `src/app/dashboard/[module]/components/` contains module-specific components

Component file organization within modules:
```
ComponentName/
  ComponentName.tsx       # Main component
  ComponentName.types.ts  # TypeScript interfaces
  ComponentName.form.ts   # Form schema (for forms)
  index.ts               # Barrel export
```

### Path Aliases
- `@/*` maps to `./src/*`

### TypeScript Configuration
Strict mode enabled with additional checks:
- `noImplicitAny`, `noImplicitReturns`
- `noUnusedLocals`, `noUnusedParameters`
- `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`

### Environment Variables
Required:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `WEBHOOK_SECRET` - Clerk webhook signing secret (Svix)
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `UPLOADTHING_TOKEN` - UploadThing API token

### Key Dependencies
- Form handling: react-hook-form + zod + @hookform/resolvers
- Tables: @tanstack/react-table
- State: zustand
- Styling: Tailwind CSS + tailwind-merge + class-variance-authority
- Charts: recharts
- File uploads: uploadthing
