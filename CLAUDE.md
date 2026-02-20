# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fleet Care is a **mature, feature-rich multi-tenant SaaS** for fleet management and vehicle maintenance tracking. The system covers the full operational lifecycle: vehicle fleet management, preventive/corrective maintenance scheduling, work orders, invoicing with OCR, purchase orders, inventory, financial analytics, document compliance monitoring, and internal workshop management.

**Stack**: Next.js 15 (App Router), Prisma ORM, PostgreSQL (Neon), Clerk (auth), UploadThing (files), Shadcn/UI.

**Scale**: 46 Prisma models, 90+ API endpoints, 10 dashboard modules, 7 user roles, full multi-tenant isolation.

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
- Database constraints enforce isolation: `@@unique([tenantId, ...])` on all tenant-scoped tables
- Global vs tenant-specific entities: some models (VehicleBrand, MaintenanceTemplate) can be `isGlobal=true` (managed by SUPER_ADMIN) or tenant-specific

### Authentication & Authorization

- Clerk handles all authentication (`@clerk/nextjs`)
- `middleware.ts` — `clerkMiddleware` protects routes and injects tenant context
- `src/lib/auth.ts` — `getCurrentUser()` resolves Clerk session to Prisma User (read-only)
- `src/app/api/webhooks/clerk/route.ts` — Svix-verified webhook syncs Clerk → Prisma
- Dashboard layout (`src/app/dashboard/layout.tsx`) enforces authentication via `getCurrentUser()`
- Onboarding wizard at `/onboarding` for new tenants

### API Routes Pattern

Located in `src/app/api/`:

1. Call `getCurrentUser()` from `@/lib/auth` to get authenticated user + tenantId
2. Use `user.tenantId` for tenant scoping (comes from Clerk orgId)
3. Use Prisma for database operations with tenant filters
4. Return `NextResponse.json()` for success, `NextResponse` with status for errors

### Component Structure

- `src/components/ui/` — Shadcn/UI components (button, dialog, form, table, etc.)
- `src/components/layout/` — Layout components (Navbar, Sidebar, Logo)
- `src/components/landing/` — Landing page components
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

---

## Database Models (46 models)

Schema: `prisma/schema.prisma`

### Core / Multi-Tenancy (4)

| Model          | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `Tenant`       | Organization with billing, subscription status, onboarding stage, settings |
| `User`         | App user synced from Clerk, role-based, linked to Tenant                   |
| `Subscription` | MercadoPago subscription status, trial/renewal dates                       |
| `Payment`      | Payment history with MercadoPago reference                                 |

### Vehicles (5)

| Model           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `Vehicle`       | License plate, brand/line/type, mileage, status (ACTIVE/MAINTENANCE/SOLD), fuel type, emergency contact |
| `VehicleBrand`  | Global or tenant-specific vehicle makes                                                                 |
| `VehicleLine`   | Vehicle models (e.g. Toyota Hilux)                                                                      |
| `VehicleType`   | Vehicle categories (truck, bus, etc.)                                                                   |
| `VehicleDriver` | Driver assignments with date ranges                                                                     |

### Maintenance System (10)

| Model                   | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| `MantCategory`          | Maintenance categories (Motor, Frenos, Lubricantes, etc.)                     |
| `MantItem`              | Master maintenance tasks with ItemType (ACTION, PART, SERVICE)                |
| `MantItemRequest`       | Technician request workflow → Manager approval/rejection                      |
| `MaintenanceTemplate`   | Brand/line-specific maintenance templates (e.g. "Toyota Hilux Standard v1.2") |
| `MaintenancePackage`    | Service packages within templates (5,000km, 15,000km, etc.)                   |
| `PackageItem`           | Items within packages with estimated time/cost                                |
| `VehicleMantProgram`    | One assigned program per vehicle                                              |
| `VehicleProgramPackage` | Packages in vehicle program with execution tracking                           |
| `VehicleProgramItem`    | Individual items in package with cost/time estimates                          |
| `MantItemVehiclePart`   | Knowledge Base: MantItem → vehicle brand/line/year → MasterPart               |

### Work Orders (5)

| Model               | Description                                                                            |
| ------------------- | -------------------------------------------------------------------------------------- |
| `WorkOrder`         | Main work order with cost tracking, asset/provider assignment                          |
| `WorkOrderItem`     | Line items (repuestos/services) with supplier and invoice linkage                      |
| `WorkOrderExpense`  | Additional expenses (PARTS, LABOR, TRANSPORT, TOOLS, MATERIALS, SERVICE, OTHER)        |
| `WorkOrderApproval` | Multi-level approval workflow (supervisor → manager → admin)                           |
| `ExpenseAuditLog`   | Full audit trail (CREATED, APPROVED, MODIFIED, PAID, COMPLETED, FLAGGED, ACKNOWLEDGED) |

### Invoicing & Parts (6)

| Model              | Description                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `MasterPart`       | Shared parts catalog with SKU, category, reference price, alternatives                      |
| `MantItemPart`     | Many-to-many: MantItem ↔ MasterPart with quantity/notes                                     |
| `Invoice`          | Supplier invoices with OCR support (PENDING/PROCESSING/COMPLETED/FAILED), approval workflow |
| `InvoiceItem`      | Line items with MasterPart linkage and price deviation tracking                             |
| `PartPriceHistory` | Price trends per supplier — key for analytics and financial watchdog                        |
| `InvoicePayment`   | Payment records per invoice with method tracking                                            |

### Purchase Orders (2)

| Model               | Description                                                                            |
| ------------------- | -------------------------------------------------------------------------------------- |
| `PurchaseOrder`     | Orders to suppliers (DRAFT → PENDING_APPROVAL → APPROVED → SENT → PARTIAL → COMPLETED) |
| `PurchaseOrderItem` | Items in orders with receipt tracking                                                  |

### Alerts (2)

| Model              | Description                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `MaintenanceAlert` | Maintenance alerts with mileage thresholds, priority score (0-100), snooze/acknowledgment |
| `FinancialAlert`   | Price deviation and budget overrun watchdog                                               |

### People & Resources (4)

| Model         | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| `Technician`  | Internal mechanics with specialty, hourly rate, employment type |
| `Provider`    | External suppliers with specialty, contact info                 |
| `Driver`      | Vehicle drivers with license number and expiry                  |
| `OdometerLog` | Mileage/hour recordings by drivers and technicians              |

### Documents & Compliance (2)

| Model                | Description                                                                             |
| -------------------- | --------------------------------------------------------------------------------------- |
| `Document`           | Vehicle documents (SOAT, Tecno, etc.) with OCR support and expiry tracking              |
| `DocumentTypeConfig` | Global or tenant-specific document types with expiry warning thresholds and criticality |

### Inventory & Internal Workshop (6)

| Model                | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `InventoryItem`      | Stock levels per warehouse with min/max thresholds                             |
| `InventoryMovement`  | Stock movements (PURCHASE, CONSUMPTION, ADJUSTMENT, TRANSFER, RETURN, DAMAGED) |
| `InternalWorkTicket` | Internal workshop tickets replacing external invoices                          |
| `TicketLaborEntry`   | Labor hours per technician with hourly rates                                   |
| `TicketPartEntry`    | Parts consumed from inventory                                                  |
| `PartCompatibility`  | [FASE 3] Parts compatibility by vehicle brand/model/year/engine                |

---

## API Routes (~90 endpoints)

### Dashboard

```
GET /api/dashboard/fleet-status          # Fleet overview with vehicle counts/status
GET /api/dashboard/financial-metrics     # Financial KPIs (costs, trends, breakdown)
GET /api/dashboard/financial-evolution   # Cost evolution over time
GET /api/dashboard/navbar-stats          # Quick stats for navbar
```

### Vehicles

```
CRUD /api/vehicles/vehicles              # Vehicle CRUD
CRUD /api/vehicles/brands                # Brand management
CRUD /api/vehicles/lines                 # Line management
CRUD /api/vehicles/types                 # Type management
CRUD /api/vehicles/documents             # Vehicle document upload/management
GET  /api/vehicles/documents/expiring    # Expiring documents — consumed by N8N Flujo 1
POST /api/vehicles/odometer              # Mileage recording
CRUD /api/vehicles/document-types        # Document type configuration (per country)
```

### Maintenance

```
CRUD /api/maintenance/mant-categories             # Maintenance categories
CRUD /api/maintenance/mant-items                  # Maintenance items
GET  /api/maintenance/mant-items/search           # Fuzzy search
GET  /api/maintenance/mant-items/similar          # Find similar items
CRUD /api/maintenance/mant-item-requests          # Item request workflow
CRUD /api/maintenance/mant-template               # Templates
GET  /api/maintenance/mant-template/global        # Global templates (SUPER_ADMIN)
POST /api/maintenance/mant-template/clone         # Clone template
CRUD /api/maintenance/packages                    # Maintenance packages
CRUD /api/maintenance/package-items               # Package items
CRUD /api/maintenance/vehicle-programs            # Vehicle program assignment
CRUD /api/maintenance/vehicle-parts               # Knowledge Base: vehicle-specific parts
GET  /api/maintenance/vehicle-parts/suggest       # Suggest parts by vehicle
CRUD /api/maintenance/work-orders                 # Work order CRUD
CRUD /api/maintenance/work-orders/[id]/items      # Work order items
CRUD /api/maintenance/work-orders/[id]/expenses   # Work order expenses
POST /api/maintenance/work-orders/[id]/import-recipe  # Import maintenance package to WO
CRUD /api/maintenance/alerts                      # Maintenance alerts
GET  /api/maintenance/vehicles/[id]/recipes       # Available packages for vehicle
```

### Invoicing

```
CRUD /api/invoices          # Invoice management
GET  /api/invoices/recent   # Recent invoices for dashboard
```

### Purchase Orders

```
CRUD /api/purchase-orders               # Purchase order management
CRUD /api/purchase-orders/[id]/items    # PO items
```

### Inventory

```
CRUD /api/inventory/items               # Inventory item management
CRUD /api/inventory/movements           # Stock movements
CRUD /api/inventory/parts               # Parts catalog
GET  /api/inventory/parts/recommendations  # Parts recommendations
CRUD /api/inventory/purchases           # Purchase records
```

### People

```
CRUD /api/people/drivers        # Drivers
CRUD /api/people/technicians    # Technicians
CRUD /api/people/providers      # Suppliers
```

### Financial

```
GET /api/financial/alerts         # Financial alerts (price deviations, budget overruns)
GET /api/financial/watchdog/test  # Test watchdog logic
```

### Internal Workshop

```
CRUD /api/internal-tickets    # Internal work ticket management
```

### Administration

```
CRUD /api/tenants               # Tenant CRUD (SUPER_ADMIN only)
GET  /api/tenants/slug/[slug]   # Tenant lookup by slug
GET  /api/auth/me               # Current user info
POST /api/webhooks/clerk        # Clerk webhook (Svix-verified)
POST /api/uploadthing/*         # File upload handling
GET  /api/alerts/test           # Test alert generation
```

---

## Dashboard Modules

### Dashboard Principal (`/dashboard`)

- **Tabs**: Fleet Status | Financial | Documents
- Fleet Status Board: Vehicle grid with health, mileage, alerts, driver info
- Financial Dashboard: KPI cards, cost evolution chart, vehicle breakdown, recent invoices, financial alerts
- Documents Tab: Document compliance widget per vehicle

### Vehículos (`/dashboard/vehicles/`)

| Route        | Description                                             |
| ------------ | ------------------------------------------------------- |
| `fleet/`     | Vehicle list and CRUD — core fleet management           |
| `documents/` | Document compliance dashboard (SOAT, Tecno, etc.) — NEW |
| `brands/`    | Brand CRUD                                              |
| `lines/`     | Line CRUD                                               |
| `types/`     | Type CRUD                                               |
| `odometer/`  | Mileage recording (DRIVER + TECHNICIAN)                 |

### Mantenimiento (`/dashboard/maintenance/`)

| Route               | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `mant-items/`       | Master maintenance items CRUD                              |
| `mant-categories/`  | Category management                                        |
| `mant-template/`    | Global/tenant maintenance template CRUD                    |
| `packages/`         | Service package definition and editing                     |
| `vehicle-programs/` | Assign templates to vehicles (one per vehicle)             |
| `work-orders/`      | Full work order management: list, create, detail, approval |
| `vehicle-parts/`    | Knowledge Base: vehicle → brand/line/year → MasterPart     |
| `alerts/`           | Maintenance alert dashboard with ack/snooze workflow       |

### Facturación (`/dashboard/invoices/`)

| Route         | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `/`           | Invoice list with filters and status                                      |
| `new/`        | Advanced create: link to PO, OCR upload, manual items, tax calc, approval |
| `[id]/`       | Invoice detail with items, payments, audit trail                          |
| `[id]/print/` | Invoice print view                                                        |

### Órdenes de Compra (`/dashboard/purchase-orders/`)

- List with status tracking
- Detail with item tracking and receipt confirmation

### Inventario (`/dashboard/inventory/`)

- `parts/` — Master parts catalog
- `purchases/new/` — Purchase order creation

### Checklist (`/dashboard/checklist/`)

- `crear/` — Create checklists (MANAGER+)
- `inspeccionar/` — Execute inspections (TECHNICIAN)
- `historial/` — Inspection history and reports

### Personal (`/dashboard/people/`)

- `technician/` — Technician CRUD (specialty, hourly rate, employment type)
- `driver/` — Driver CRUD (license number and expiry)
- `provider/` — Supplier CRUD (specialty, contact)

### Reportes (`/dashboard/reports/`)

- `maintenance-costs/` — Cost analytics by vehicle/period
- `fleet-status/` — Fleet overview and health
- `maintenance-efficiency/` — Response time and completion metrics

### Empresa (`/dashboard/empresa/`)

- `informacion/` — Company profile (name, country, currency, logo)
- `configuracion/` — Tenant settings
- `sucursales/` — Multi-location configuration

### Configuración/Admin (`/dashboard/admin/`)

- `document-types/` — Configure required documents by country (OWNER+)
- `users/` — User management (OWNER+)
- `tenant/` — Tenant configuration (SUPER_ADMIN only)
- `roles/` — Role management (SUPER_ADMIN only)
- `permissions/` — Permission management (SUPER_ADMIN only)

### Panel Global (`/admin/`)

- SUPER_ADMIN only: tenants, global templates, system settings

---

## Role-Based Access Control

7 roles defined in `UserRole` enum (Prisma):

| Role          | Access Level | Key Capabilities                                                       |
| ------------- | ------------ | ---------------------------------------------------------------------- |
| `SUPER_ADMIN` | Platform     | All access + tenant management + global templates + platform config    |
| `OWNER`       | Tenant       | Full tenant access + user management + billing                         |
| `MANAGER`     | Tenant       | Fleet, maintenance, invoices, reports — no billing, no user management |
| `PURCHASER`   | Tenant       | Work orders (view), invoices, purchase orders, suppliers, inventory    |
| `TECHNICIAN`  | Tenant       | Vehicles (view), work orders (execute), checklist, odometer, alerts    |
| `DRIVER`      | Tenant       | Odometer recording only                                                |

Sidebar routes are role-gated via `roles?: UserRole[]` in `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`. API routes validate roles via `getCurrentUser()`.

---

## Feature Status

| Module                           | Status         | Notes                                                        |
| -------------------------------- | -------------- | ------------------------------------------------------------ |
| Vehicle CRUD                     | ✅ Complete    | Brands, lines, types, details, status                        |
| Vehicle Documents                | ✅ Complete    | SOAT, Tecno, expiry tracking, compliance dashboard           |
| Odometer Recording               | ✅ Complete    | Multi-role recording                                         |
| Maintenance Items & Categories   | ✅ Complete    | Master items with request workflow                           |
| Maintenance Templates & Packages | ✅ Complete    | Global/tenant, clone, km-based packages                      |
| Vehicle Programs                 | ✅ Complete    | One per vehicle, package execution tracking                  |
| Knowledge Base (vehicle-parts)   | ✅ Complete    | Brand/line/year → MasterPart mapping                         |
| Work Orders                      | ✅ Complete    | CRUD, items, expenses, 3-level approval, audit trail         |
| Maintenance Alerts               | ✅ Complete    | Priority scoring, mileage thresholds, ack/snooze             |
| Alert Auto-Generation            | 🚧 In Progress | Triggered manually/by test endpoint; needs cron automation   |
| Invoicing                        | ✅ Complete    | Create, OCR, manual items, approval, payments                |
| Invoice OCR                      | 🚧 In Progress | States implemented; confidence scoring & review needs tuning |
| Purchase Orders                  | ✅ Complete    | Full lifecycle from DRAFT to COMPLETED                       |
| Inventory                        | ✅ Complete    | Parts catalog, stock tracking, movement history              |
| Internal Workshop                | ✅ Complete    | Work tickets, labor entries, parts from inventory            |
| Financial Dashboard              | ✅ Complete    | KPIs, charts, watchdog alerts                                |
| Financial Watchdog               | 🚧 In Progress | Price deviation detection implemented; needs calibration     |
| Checklist                        | ✅ Complete    | Create, inspect, history                                     |
| People Management                | ✅ Complete    | Drivers, technicians, providers                              |
| Reports                          | ✅ Complete    | Costs, fleet status, efficiency                              |
| Multi-tenancy                    | ✅ Complete    | Full isolation, global vs tenant entities                    |
| Auth & RBAC                      | ✅ Complete    | Clerk + 7 roles, per-route and per-API enforcement           |
| Subscription/Billing             | ✅ Complete    | MercadoPago integration, trial tracking                      |
| Subdomain Routing                | 📋 Planned     | See SETUP-ENTORNOS.md                                        |
| Part Compatibility Matrix        | 📋 Planned     | FASE 3                                                       |
| Predictive Maintenance (AI)      | 📋 Planned     | Future                                                       |

---

## Testing

### Unit/Integration Tests (`src/app/api/**/__tests__/`)

- `multi-tenant-security.test.ts` — Tenant isolation validation
- `dashboard-metrics.test.ts` — Dashboard API
- `inventory-lifecycle.test.ts` — Full inventory flow
- `invoice-lifecycle.test.ts` — Full invoice flow
- `mant-items-crud.test.ts`, `work-order-api.test.ts` — Maintenance core
- `preventive-circuit.test.ts`, `corrective-internal.test.ts` — Maintenance circuits
- `e2e-flow.test.ts` — Maintenance end-to-end
- `people-crud.test.ts` — People management
- `purchase-order-lifecycle.test.ts` — Purchase order flow
- `vehicles-crud.test.ts` — Vehicle management

### E2E Tests (Playwright, `e2e/`)

- `e2e/vehicles/documents.spec.ts` — Document compliance (newly added)

---

## Environment Variables

Required:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_SECRET_KEY` — Clerk secret key
- `WEBHOOK_SECRET` — Clerk webhook signing secret (Svix)
- `DATABASE_URL` — PostgreSQL connection string (Neon)
- `UPLOADTHING_TOKEN` — UploadThing API token

---

## Key Dependencies

| Category      | Library                                                  |
| ------------- | -------------------------------------------------------- |
| Framework     | Next.js 15 (App Router, webpack forced)                  |
| Database      | Prisma ORM + PostgreSQL (Neon)                           |
| Auth          | @clerk/nextjs + Svix (webhook verification)              |
| Forms         | react-hook-form + zod + @hookform/resolvers              |
| Tables        | @tanstack/react-table                                    |
| State         | zustand                                                  |
| Data fetching | SWR + Axios                                              |
| Styling       | Tailwind CSS + tailwind-merge + class-variance-authority |
| UI            | Shadcn/UI components                                     |
| Charts        | recharts                                                 |
| File uploads  | uploadthing                                              |
| Testing       | Jest (unit) + Playwright (E2E)                           |
