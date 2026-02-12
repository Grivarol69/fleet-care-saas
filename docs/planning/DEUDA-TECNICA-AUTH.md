# Deuda Tecnica: Sistema de Autenticacion, Multi-Tenancy y Permisos

**Fecha:** 12 Febrero 2026
**Objetivo:** Llevar a 0 deuda tecnica el sistema de auth antes de ir a produccion.
**Fuente de verdad para auth:** Clerk (webhooks sincronizan a Prisma)

---

## Estado actual

- Auth: Clerk (`@clerk/nextjs` v6.35.5)
- Webhook sync: Svix-verified + idempotency check, endpoint en `/api/webhooks/clerk`
- Helper principal: `getCurrentUser()` en `src/lib/auth.ts` (read-only, filtra isActive)
- Roles: SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN, PURCHASER, DRIVER
- Permisos: funciones granulares en `src/lib/permissions.ts`, aplicados en ~40+ endpoints
- Multi-tenancy: `tenantId` = Clerk `orgId`, scoping en schema con `@@unique([tenantId, ...])`

---

## Deuda Tecnica Identificada — TODAS RESUELTAS

### DT-01: Onboarding busca por email sin filtrar por orgId [BUG] — RESUELTO
**Archivo:** `src/app/onboarding/page.tsx`
**Solucion aplicada:** Se obtiene `orgId` de `auth()` y se filtra por `tenantId: orgId`
cuando hay org activa. Fallback a busqueda por email solo cuando no hay org.

### DT-02: API routes no validan permisos de forma consistente [SEGURIDAD] — RESUELTO
**Archivos:** ~40 endpoints en `src/app/api/`
**Solucion aplicada:** Auditoria completa de todos los endpoints POST/PUT/PATCH/DELETE.
Se reemplazaron checks hardcoded (`includes(user.role)`) y se agregaron checks faltantes
usando funciones centralizadas de `permissions.ts`:
- Financieros: `canApproveInvoices`, `canManagePurchases`
- Vehiculos: `canManageVehicles`, `canDeleteVehicles`, `canManageMasterData`
- Mantenimiento: `canManageMaintenancePrograms`, `canExecuteWorkOrders`, `canCreateWorkOrders`
- Personas: `canManageProviders`, `canManageVehicles` (drivers)
- Inventario: `canManagePurchases`, `canExecuteWorkOrders` (consume)
- Tickets internos: `canExecuteWorkOrders`, `canManageMasterData`

### DT-03: No hay audit trail para acciones criticas [SEGURIDAD] — RESUELTO
**Archivo:** `src/app/api/webhooks/clerk/route.ts`
**Solucion aplicada:**
- `organizationMembership.deleted` ahora hace soft-delete (`isActive: false`) en vez de `deleteMany`
- `organizationMembership.created` reactiva usuarios previamente desactivados (`isActive: true`)
- `getCurrentUser()` filtra por `isActive: true` en todas las queries, bloqueando usuarios desactivados
- `updatedAt` sirve como timestamp de desactivacion

### DT-04: Sin rate limiting en el webhook endpoint [SEGURIDAD] — RESUELTO
**Archivo:** `src/app/api/webhooks/clerk/route.ts`
**Solucion aplicada:** Cache en memoria con TTL de 5 minutos usando `svix-id` header.
Eventos duplicados se rechazan con 200 (para que Svix no reintente). Limpieza automatica
de entradas expiradas cada 100 eventos.

### DT-05: No hay proteccion de roles a nivel middleware [MEJORA] — RESUELTO
**Archivo:** `src/middleware.ts`
**Solucion aplicada:** Rutas `/admin` y `/api/admin` ahora requieren cuenta personal
(sin orgId). Usuarios con org activa son redirigidos a `/dashboard`. La verificacion
final de SUPER_ADMIN sigue en `getCurrentUser()` como segunda capa.

### DT-06: Roles se sincronizan solo Clerk -> DB, nunca al reves [DOCUMENTACION]
**Estado:** Regla operacional documentada. No requiere cambio de codigo.
**Regla:** Clerk es la UNICA fuente de verdad para roles. NUNCA modificar roles
directamente en Prisma Studio o via seeds. Siempre usar el Clerk Dashboard o la API
de Clerk para cambiar roles de usuarios.

---

## Completados en esta sesion (12 Feb 2026)

### Fase 1: Limpieza Supabase
- [x] Eliminar todos los archivos y dependencias de Supabase (7 archivos, 2 deps)
- [x] Unificar constante PLATFORM_TENANT_ID (auth.ts exporta, permissions.ts re-exporta)
- [x] Extraer mapeo de roles a funcion `mapClerkRoleToDbRole()` en webhook
- [x] Agregar fallback JIT con retry 1.5s en `getCurrentUser()` para race condition
- [x] Actualizar CLAUDE.md para reflejar arquitectura Clerk
- [x] Fix: pagina `/` redirige a `/sign-in` en vez de embedir SignIn con routing="hash"

### Fase 2: Deuda Tecnica Auth
- [x] DT-01: Fix onboarding query con tenant scope
- [x] DT-02: Auditoria y fix de permisos en ~40 endpoints de API
- [x] DT-03: Soft-delete en webhook + filtro isActive en getCurrentUser()
- [x] DT-04: Idempotency check en webhook con cache en memoria
- [x] DT-05: Proteccion de admin routes en middleware
- [x] DT-06: Documentado como regla operacional
