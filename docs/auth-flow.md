# Flujo de Autenticación Híbrida — Fleet Care SaaS

## Visión General

La autenticación es **híbrida**: Clerk maneja identidad y sesión, nuestra base de datos (Prisma/Neon) mantiene el perfil de usuario con rol y tenantId. Estos dos mundos se sincronizan principalmente vía webhooks, con un fallback JIT (Just-In-Time) para cubrir fallos o retrasos del webhook.

```
┌─────────────┐     sesión JWT      ┌──────────────────┐
│    Clerk    │ ─────────────────▶  │  Next.js App     │
│  (identidad)│                     │  (middleware)    │
└─────────────┘                     └────────┬─────────┘
      │                                      │
      │  webhooks (async)                    │  auth() → userId + orgId
      ▼                                      ▼
┌─────────────┐               ┌──────────────────────────┐
│  Webhook    │  upsert       │  getCurrentUser()         │
│  Handler   │ ─────────────▶ │  (src/lib/auth.ts)       │
│  /api/      │               │  busca en Prisma          │
│  webhooks/  │               │  ↳ fallback JIT si falla  │
│  clerk      │               └──────────────────────────┘
└─────────────┘                            │
                                           ▼
                               ┌──────────────────────────┐
                               │  User de Prisma           │
                               │  { tenantId, role,        │
                               │    isSuperAdmin, ... }    │
                               └──────────────────────────┘
```

---

## 1. Clerk como fuente de identidad

Clerk provee:

- **`userId`** — ID único del usuario en Clerk (formato `user_xxx`)
- **`orgId`** — ID de la organización activa en sesión (formato `org_xxx`) → equivale a `tenantId` en Prisma
- **Email** — identificador principal para cruzar con Prisma
- **Roles de org** — `org:admin`, `org:manager`, etc. → se mapean a `UserRole` de Prisma

### Mapeo de roles Clerk → Prisma

| Clerk (`org:X`)    | Prisma `UserRole`  |
| ------------------ | ------------------ |
| `org:admin`        | `OWNER`            |
| `org:owner`        | `OWNER`            |
| `org:manager`      | `MANAGER`          |
| `org:coordinator`  | `COORDINATOR`      |
| `org:technician`   | `TECHNICIAN`       |
| `org:purchaser`    | `PURCHASER`        |
| `org:driver`       | `DRIVER`           |
| _(cualquier otro)_ | `DRIVER` (default) |

---

## 2. Sincronización vía Webhooks (camino feliz)

**Archivo:** [src/app/api/webhooks/clerk/route.ts](../src/app/api/webhooks/clerk/route.ts)

Clerk envía eventos vía Svix a `/api/webhooks/clerk`. El handler verifica la firma HMAC con `WEBHOOK_SECRET`, aplica idempotencia en memoria (5 min TTL, 100 eventos max en caché) y procesa:

### Eventos manejados

#### `organization.created` / `organization.updated`

→ Upsert `Tenant` en Prisma con `id = orgId`, `name`, `slug`.

- Create: `subscriptionStatus: 'TRIAL'`, `onboardingStatus: 'PENDING'`
- Update: solo `name` y `slug`

#### `organizationMembership.created`

→ El evento más crítico. Crea al usuario en el tenant.

1. Primero garantiza que el `Tenant` exista (upsert defensivo, por si `organization.created` llegó tarde o falló)
2. Upsert `User` con `{ tenantId: org.id, email }` como clave única
3. `user.id` = `public_user_data.user_id` (ID de Clerk), lo que garantiza compatibilidad total entre ambos sistemas

#### `organizationMembership.updated`

→ Actualiza solo el `role` en Prisma (no toca otros campos)

#### `organizationMembership.deleted`

→ Soft delete: `isActive = false` (el usuario no se elimina de la DB)

#### `user.created` / `user.updated`

→ Actualiza `firstName` y `lastName` en **todos** los registros con ese email (puede haber uno por tenant)

---

## 3. Función `getCurrentUser()` — el núcleo del auth

**Archivo:** [src/lib/auth.ts](../src/lib/auth.ts)

Esta función es invocada en cada request autenticado. Envuelve `getCurrentUserInternal()` con un timeout de **15 segundos** para protegerse de cold starts de Neon.

### Flujo interno

```
auth() de Clerk
    │
    ├─ userId null → return null (no autenticado)
    │
    └─ userId existe
          │
          ├─ currentUser() → email
          │
          ├─ Verificar SUPER_ADMIN
          │      └─ buscar en Prisma: { email, tenantId: PLATFORM_TENANT_ID, role: 'SUPER_ADMIN' }
          │
          ├─ orgId null + no es SUPER_ADMIN → return null
          │   (usuario sin org activa no puede operar como tenant)
          │
          ├─ orgId null + es SUPER_ADMIN → return superAdminUser (opera en Platform Tenant)
          │
          └─ orgId existe → buscar User en Prisma { email, tenantId: orgId, isActive: true }
                    │
                    ├─ Usuario encontrado → return { ...user, isSuperAdmin }
                    │
                    └─ Usuario NO encontrado → FALLBACK JIT
                              │
                              ├─ Llamar clerkClient().organizations.getOrganizationMembershipList()
                              │     para resolver nombre de org y rol
                              │
                              ├─ Si el Tenant no existe en DB → crearlo
                              │
                              └─ Crear User con rol resuelto (default: OWNER para primer usuario)
```

### SUPER_ADMIN: comportamiento especial

El SUPER_ADMIN es un concepto de la **plataforma**, no de un tenant. Su `tenantId` en Prisma es `PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000'`. La verificación es independiente del `orgId` activo: se busca por email en ese tenant especial.

Un SUPER_ADMIN puede:

- Operar sin org activa (acceso a panel de plataforma)
- Usar `prisma` base (sin filtro de tenant) en lugar de `tenantPrisma`
- Modificar datos globales (`isGlobal = true`)

### Fallback JIT (Just-In-Time)

El webhook puede llegar tarde (latencia de Svix, cold start, fallo temporal). El JIT garantiza que el usuario **nunca quede bloqueado** aunque el webhook no haya llegado:

1. Llama a la API de Clerk para obtener membership y resolver el rol real
2. Si la llamada a Clerk falla → usa `OWNER` como fallback seguro (es el primer usuario de la org)
3. Crea Tenant si no existe
4. Crea User con todos los datos disponibles
5. Log `[AUTH] JIT User created successfully` para diagnóstico

> ⚠️ **Riesgo conocido**: Si el JIT corre antes de que el webhook llegue Y el rol es distinto de OWNER, el usuario podría tener un rol incorrecto temporalmente hasta que llegue `organizationMembership.updated`. En la práctica es raro porque el webhook suele llegar en segundos.

---

## 4. Función `requireCurrentUser()`

**Archivo:** [src/lib/auth.ts:192](../src/lib/auth.ts#L192)

Wrapper usado en API routes. Devuelve `{ user, tenantPrisma }`.

```ts
const { user, tenantPrisma } = await requireCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

- Si `user.isSuperAdmin` → usa `prisma` base (sin aislamiento de tenant)
- Si no → usa `getTenantPrisma(user.tenantId)` (con aislamiento automático)

---

## 5. Aislamiento de Tenant con `getTenantPrisma()`

**Archivo:** [src/lib/tenant-prisma.ts](../src/lib/tenant-prisma.ts)

Implementado como una extensión de Prisma (`$extends`). Intercepta **todas** las operaciones de todos los modelos y:

| Operación                                    | Acción                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `create`                                     | Inyecta `tenantId` en `data`                                                               |
| `createMany`                                 | Inyecta `tenantId` en cada item de `data`                                                  |
| `findUnique`                                 | Agrega `tenantId` al `where` (solo modelos no-globales)                                    |
| `findMany/findFirst/count/aggregate/groupBy` | Agrega `WHERE tenantId = X` (o `OR isGlobal=true` para modelos globales)                   |
| `update`                                     | Agrega `tenantId` al `where`, **elimina** `tenantId` de `data` (previene cambio de tenant) |
| `upsert`                                     | Agrega `tenantId` a `create`, **elimina** de `update`                                      |
| `updateMany`                                 | Agrega `tenantId` al `where`, **elimina** de `data`                                        |
| `delete/deleteMany`                          | Agrega `tenantId` al `where`                                                               |

### Modelos globales

Los modelos con campo `isGlobal` (ej: `VehicleBrand`, `MaintenanceTemplate`, `MasterPart`) en lecturas devuelven:

```
WHERE (tenantId = X OR isGlobal = true)
```

Es decir, el tenant ve sus propios datos + los datos globales de la plataforma. Las escrituras de datos globales son solo para SUPER_ADMIN.

---

## 6. Permisos — `src/lib/permissions.ts`

Sistema de funciones puras sin estado. Reciben un `User | null` y devuelven `boolean`.

### Jerarquía general (de más a menos acceso)

```
SUPER_ADMIN > OWNER > MANAGER > COORDINATOR > PURCHASER > TECHNICIAN > DRIVER
```

### Permisos clave

| Función                        | Roles con acceso                                    |
| ------------------------------ | --------------------------------------------------- |
| `canManageMasterData`          | SUPER_ADMIN, OWNER, MANAGER, COORDINATOR            |
| `canViewCosts`                 | SUPER_ADMIN, OWNER, MANAGER, COORDINATOR, PURCHASER |
| `canManageUsers`               | SUPER_ADMIN, OWNER                                  |
| `canViewAuditLogs`             | SUPER_ADMIN, OWNER, MANAGER                         |
| `canApproveWorkOrder`          | SUPER_ADMIN, OWNER, MANAGER, COORDINATOR            |
| `canOverrideWorkOrderFreeze`   | SUPER_ADMIN, OWNER                                  |
| `canManageGlobalKnowledgeBase` | SUPER_ADMIN (solo)                                  |
| `canRegisterOdometer`          | Todos los autenticados                              |

Para datos maestros globales existe `requireMasterDataMutationPermission()` que valida:

- Si `item.isGlobal = true` → requiere `isSuperAdmin`
- Si `item.isGlobal = false` → requiere que `item.tenantId === user.tenantId` + rol OWNER/MANAGER/COORDINATOR

---

## 7. Variables de Entorno Requeridas

| Variable                            | Descripción                                              |
| ----------------------------------- | -------------------------------------------------------- |
| `WEBHOOK_SECRET`                    | Secret de Svix para verificar firma de webhooks de Clerk |
| `CLERK_SECRET_KEY`                  | Usado por `clerkClient()` en el fallback JIT             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Usado por el SDK de Clerk en el frontend                 |

---

## 8. Casos Límite y Comportamiento Conocido

### Usuario sin organización activa

- `orgId` es null → `getCurrentUser()` devuelve `null` (a menos que sea SUPER_ADMIN)
- El usuario puede estar autenticado en Clerk pero sin empresa activa → la app los trata como no autenticados

### Webhook duplicado

- El in-memory cache de `processedEvents` (Map) previene reprocesamiento dentro de los 5 min siguientes
- Limitación: si hay múltiples instancias del servidor (Vercel), cada instancia tiene su propio Map → puede reprocesar en edge cases. Es idempotente igualmente gracias a `upsert`.

### Cambio de rol en Clerk

1. `organizationMembership.updated` llega al webhook
2. Se actualiza solo `role` en Prisma via `updateMany`
3. La próxima llamada a `getCurrentUser()` leerá el rol actualizado

### Soft delete de usuario

- `organizationMembership.deleted` → `isActive = false`
- `getCurrentUser()` busca con `isActive: true` → devuelve `null`
- El usuario queda autenticado en Clerk pero la app lo trata como inactivo

### Timeout de DB (Neon cold start)

- `getCurrentUser()` tiene timeout de 15s
- Lanza `Error('DATABASE_TIMEOUT')` que se propaga al caller
- Las páginas que usan `getCurrentUser()` deben manejar este caso

---

## 9. Diagrama Completo de una Petición API

```
Cliente HTTP
    │
    ▼
Next.js Middleware (Clerk)
    │  ← verifica JWT de sesión
    │  ← redirige a /sign-in si no autenticado
    │
    ▼
API Route Handler
    │
    ├─ const { user, tenantPrisma } = await requireCurrentUser()
    │         │
    │         └─ getCurrentUser()
    │               ├─ auth() → { userId, orgId }
    │               ├─ currentUser() → email
    │               ├─ verificar SUPER_ADMIN en DB
    │               └─ buscar User en DB (con fallback JIT)
    │
    ├─ if (!user) return 401
    │
    ├─ verificar permiso: canXxx(user)
    │   └─ if (!permission) return 403
    │
    └─ tenantPrisma.model.findMany(...)
              │
              └─ getTenantPrisma intercepta
                    └─ agrega WHERE tenantId = user.tenantId automáticamente
```
