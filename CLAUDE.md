# CLAUDE.md

## REGLAS DE CÓDIGO — OBLIGATORIAS

### PROHIBIDO
1. **NO `class`** para servicios/repositorios/lógica de negocio → usar funciones exportadas
2. **NO jerarquía de errores** (`extends Error`) → usar discriminated unions
3. **NO `React.Component`** → solo function components con hooks
4. **NO `enum` de TypeScript** → usar `const OBJ = { ... } as const`
   - Excepción: enums en `prisma/schema.prisma` están permitidos

### APROBADO
- Servicios: funciones exportadas o factory functions (closures)
- Errores: `type XError = { kind: 'auth' | 'rate_limit'; message: string }` + `throwXError(): never`
- API clients con estado: `createXClient(tenantId, config)` retorna objeto plano con métodos

---

## PROYECTO

**Fleet Care SaaS** — multi-tenant SaaS de gestión de flotas y mantenimiento vehicular.
**Stack**: Next.js 15 (App Router, webpack), Prisma + PostgreSQL (Neon), Clerk (auth), Shadcn/UI, Tailwind.
**Escala**: 46 modelos Prisma, ~90 API endpoints, 10 módulos, 7 roles.
**Schema completo**: `prisma/schema.prisma` | **Detalle de arquitectura**: leer archivos on-demand.

---

## COMANDOS

```bash
pnpm dev                         # Desarrollo local
pnpm build                       # Build (corre prisma generate primero)
pnpm type-check                  # TypeScript check
pnpm lint / pnpm lint:fix        # ESLint
npx prisma migrate reset --force # Reset DB + corre seed.ts automáticamente
pnpm db:seed                     # Solo seed (seed.ts — datos globales)
pnpm prisma:studio               # Prisma Studio GUI
```

---

## ARQUITECTURA CLAVE

### Multi-tenancy
- Todo dato tiene `tenantId` = `orgId` de Clerk (son el mismo valor)
- Entidades globales: `isGlobal=true` en VehicleBrand, MaintenanceTemplate, MasterPart (gestionadas por SUPER_ADMIN)
- SUPER_ADMIN usa `tenantId = '00000000-0000-0000-0000-000000000000'`

### Auth flow
- `src/lib/auth.ts` → `getCurrentUser()` — resuelve sesión Clerk a User de Prisma
- `src/app/api/webhooks/clerk/route.ts` — sincroniza orgs y memberships de Clerk → BD
- JIT fallback en `getCurrentUser()`: si el webhook tardó, crea User/Tenant en el momento

### API routes pattern (`src/app/api/`)
```ts
const { user, tenantPrisma } = await requireCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// usar tenantPrisma para queries (ya filtra por tenantId automáticamente)
```

### Componentes
```
ComponentName/
  ComponentName.tsx       # Componente principal
  ComponentName.types.ts  # Interfaces TypeScript
  ComponentName.form.ts   # Schema Zod (si es form)
  index.ts                # Barrel export
```
Path alias: `@/*` → `./src/*`

---

## ROLES

| Rol | Acceso |
|-----|--------|
| `SUPER_ADMIN` | Todo + gestión de plataforma |
| `OWNER` | Todo el tenant + usuarios + billing |
| `MANAGER` | Flota, mantenimiento, facturas, reportes |
| `PURCHASER` | Facturas, OC, proveedores, inventario |
| `TECHNICIAN` | Vehículos (ver), OT (ejecutar), checklist, odómetro |
| `DRIVER` | Solo odómetro |

Sidebar: `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`
Permisos: `src/lib/permissions.ts`

---

## ARCHIVOS CLAVE

| Archivo | Rol |
|---------|-----|
| `prisma/schema.prisma` | Schema completo (46 modelos) |
| `src/lib/auth.ts` | getCurrentUser(), requireCurrentUser() |
| `src/lib/tenant-prisma.ts` | Prisma con aislamiento por tenant |
| `src/app/api/webhooks/clerk/route.ts` | Sync Clerk → BD |
| `prisma/seed.ts` | Seed de producción (datos globales) |
| `prisma/seed-multitenancy.ts` | Seed demo (requiere DEMO_TENANT_ID de Clerk) |
