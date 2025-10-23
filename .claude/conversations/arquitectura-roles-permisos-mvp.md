# Arquitectura de Roles y Permisos - Fleet Care SaaS

**Fecha**: 22 Octubre 2025
**Contexto**: Diseño de sistema de roles para empresas target (10-50 vehículos)
**Estado**: ✅ Definido para implementación MVP

---

## 🎯 Target: Empresas Chicas y Medianas

### Estructura Organizacional Típica

**Empresa Chica (10-20 vehículos)**:
```
CEO/Dueño (1)
├── Gerente de Flota (1)
└── Mecánico/Conductor (2-3)
```

**Empresa Mediana (21-50 vehículos)**:
```
CEO/Dueño (1)
├── Gerente General (1)
├── Supervisor de Flota (1-2)
├── Coordinador de Mantenimiento (1)
├── Mecánicos (2-4)
└── Conductores (10-20)
```

---

## 📊 Análisis de Roles

### ❌ Problema con Estructura Inicial (4 roles)

```prisma
enum UserRole {
  SUPER_ADMIN  // Tu rol (dueño del SaaS)
  ADMIN        // ¿CEO? ¿Gerente?
  MANAGER      // ¿Supervisor? ¿Coordinador?
  USER         // ¿Mecánico? ¿Conductor? ¿Ambos?
}
```

**Limitaciones identificadas**:
- ❌ `USER` es muy genérico (¿mecánico puede ver costos? ¿conductor puede crear órdenes?)
- ❌ No distingue entre roles operativos
- ❌ No hay granularidad de permisos
- ❌ Confuso para el cliente final

---

## ✅ Solución MVP: 5 Roles Simples

### Schema Definitivo

```prisma
enum UserRole {
  SUPER_ADMIN    // Tú (dueño del SaaS) - acceso a tablas maestras
  OWNER          // Dueño de la empresa - acceso total a su tenant
  MANAGER        // Gerente/Supervisor - gestión completa, ve costos
  TECHNICIAN     // Mecánico - solo gestión de trabajo, NO ve costos
  DRIVER         // Conductor - solo registro de km, NO ve mantenimiento
}
```

### Justificación

**Por qué 5 roles y no 4**:
1. ✅ **OWNER vs ADMIN**: Más claro que es el dueño de la empresa cliente
2. ✅ **TECHNICIAN separado**: Mecánicos no necesitan ver costos (sensible)
3. ✅ **DRIVER específico**: Conductores solo registran km, no gestionan
4. ✅ **Lenguaje de negocio**: Roles que el cliente entiende inmediatamente

**Por qué NO más roles (MVP)**:
- ⚠️ Más roles = más complejidad
- ⚠️ Sistema de permisos granular = OVERKILL para MVP
- ⚠️ Primeros clientes (5-15) no lo necesitan
- ✅ Suficiente para 95% de casos reales

---

## 📋 Matriz de Permisos Completa

### 🚗 Vehículos

| Acción | SUPER_ADMIN | OWNER | MANAGER | TECHNICIAN | DRIVER |
|--------|-------------|-------|---------|------------|--------|
| Listar todos | ✅ | ✅ | ✅ | ✅ | ❌ (solo asignados) |
| Ver detalles | ✅ | ✅ | ✅ | ✅ | ✅ (asignados) |
| Crear/Editar | ✅ | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver CV | ✅ | ✅ | ✅ | ✅ | ❌ |
| Enviar CV email | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver costos históricos | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 🔧 Mantenimiento

| Acción | SUPER_ADMIN | OWNER | MANAGER | TECHNICIAN | DRIVER |
|--------|-------------|-------|---------|------------|--------|
| Ver alertas | ✅ | ✅ | ✅ | ✅ | ❌ |
| Crear OT manual | ✅ | ✅ | ✅ | ❌ | ❌ |
| Asignar OT | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ejecutar OT | ✅ | ✅ | ✅ | ✅ | ❌ |
| Cerrar OT | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver estimados | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver costos reales | ✅ | ✅ | ✅ | ❌ | ❌ |
| Aprobar gastos | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 💰 Facturación

| Acción | SUPER_ADMIN | OWNER | MANAGER | TECHNICIAN | DRIVER |
|--------|-------------|-------|---------|------------|--------|
| Registrar factura | ✅ | ✅ | ✅ | ❌ | ❌ |
| Aprobar factura | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver histórico | ✅ | ✅ | ✅ | ❌ | ❌ |
| Reportes costos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Comparar proveedores | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 📊 Dashboard/Reportes

| Acción | SUPER_ADMIN | OWNER | MANAGER | TECHNICIAN | DRIVER |
|--------|-------------|-------|---------|------------|--------|
| Dashboard general | ✅ | ✅ | ✅ | ❌ | ❌ |
| TCO/Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Métricas operativas | ✅ | ✅ | ✅ | ✅ | ❌ |
| Exportar reportes | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 🛣️ Odómetro

| Acción | SUPER_ADMIN | OWNER | MANAGER | TECHNICIAN | DRIVER |
|--------|-------------|-------|---------|------------|--------|
| Registrar km | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver histórico | ✅ | ✅ | ✅ | ✅ | ✅ (solo sus vehículos) |
| Editar registros | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### ⚙️ Administración

| Acción | SUPER_ADMIN | OWNER | MANAGER | TECHNICIAN | DRIVER |
|--------|-------------|-------|---------|------------|--------|
| Gestionar usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Asignar roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configuración tenant | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver suscripción | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar programas mant. | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 🗂️ Tablas Maestras (CRÍTICO)

| Acción | SUPER_ADMIN | OWNER | MANAGER | TECHNICIAN | DRIVER |
|--------|-------------|-------|---------|------------|--------|
| Ver Brands/Lines/Types | ✅ | ✅ (solo lectura) | ✅ (solo lectura) | ✅ (solo lectura) | ❌ |
| Crear/Editar/Eliminar | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver MantCategories/Items | ✅ | ✅ (solo lectura) | ✅ (solo lectura) | ✅ (solo lectura) | ❌ |
| Crear/Editar/Eliminar | ✅ | ❌ | ❌ | ❌ | ❌ |

**Razón**: Solo SUPER_ADMIN puede modificar maestras para evitar inconsistencias entre tenants.

---

## 🔧 Implementación Técnica

### 1. Schema Prisma

```prisma
// prisma/schema.prisma

enum UserRole {
  SUPER_ADMIN    // Dueño del SaaS - acceso total + tablas maestras
  OWNER          // Dueño empresa cliente - acceso total a su tenant
  MANAGER        // Gerente/Supervisor - gestión + costos
  TECHNICIAN     // Mecánico/Técnico - operación sin costos
  DRIVER         // Conductor - solo odómetro
}

model User {
  id        String   @id @default(uuid())
  tenantId  String
  email     String
  role      UserRole @default(DRIVER)  // Default más restrictivo
  // ...
}
```

---

### 2. Helpers de Permisos

**Archivo**: `src/lib/permissions.ts`

```typescript
import { User } from "@prisma/client";

// ========================================
// VALIDADORES DE ROL INDIVIDUAL
// ========================================

export function isSuperAdmin(user: User | null): boolean {
  return user?.role === "SUPER_ADMIN";
}

export function isOwner(user: User | null): boolean {
  return user?.role === "OWNER";
}

export function isManager(user: User | null): boolean {
  return user?.role === "MANAGER";
}

export function isTechnician(user: User | null): boolean {
  return user?.role === "TECHNICIAN";
}

export function isDriver(user: User | null): boolean {
  return user?.role === "DRIVER";
}

// ========================================
// PERMISOS COMPUESTOS (LÓGICA DE NEGOCIO)
// ========================================

/**
 * Solo SUPER_ADMIN puede modificar tablas maestras
 * (Brands, Lines, Types, MantCategories, MantItems)
 */
export function canManageMasterData(user: User | null): boolean {
  return isSuperAdmin(user);
}

/**
 * OWNER, MANAGER pueden ver costos reales
 * TECHNICIAN, DRIVER NO pueden ver costos
 */
export function canViewCosts(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * OWNER, MANAGER pueden crear Work Orders
 */
export function canCreateWorkOrders(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * OWNER, MANAGER, TECHNICIAN pueden ejecutar Work Orders
 */
export function canExecuteWorkOrders(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isTechnician(user)
  );
}

/**
 * Solo OWNER puede gestionar usuarios de su tenant
 */
export function canManageUsers(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user);
}

/**
 * OWNER, MANAGER pueden aprobar facturas
 */
export function canApproveInvoices(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * OWNER, MANAGER pueden ver dashboard con métricas de costos
 */
export function canViewDashboard(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * Todos pueden registrar odómetro
 */
export function canRegisterOdometer(user: User | null): boolean {
  return !!user; // Cualquier usuario autenticado
}

/**
 * OWNER, MANAGER pueden gestionar programas de mantenimiento
 */
export function canManageMaintenancePrograms(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

/**
 * OWNER, MANAGER, TECHNICIAN pueden ver alertas
 */
export function canViewAlerts(user: User | null): boolean {
  return (
    isSuperAdmin(user) ||
    isOwner(user) ||
    isManager(user) ||
    isTechnician(user)
  );
}

/**
 * OWNER, MANAGER pueden enviar CV de vehículos
 */
export function canSendVehicleCV(user: User | null): boolean {
  return isSuperAdmin(user) || isOwner(user) || isManager(user);
}

// ========================================
// VALIDADORES CON EXCEPCIÓN (para APIs)
// ========================================

export function requireSuperAdmin(user: User | null): void {
  if (!isSuperAdmin(user)) {
    throw new Error("Acceso denegado: Se requiere rol SUPER_ADMIN");
  }
}

export function requireManagementRole(user: User | null): void {
  if (!isSuperAdmin(user) && !isOwner(user) && !isManager(user)) {
    throw new Error("Acceso denegado: Se requiere rol OWNER o MANAGER");
  }
}

export function requireAuthenticated(user: User | null): void {
  if (!user) {
    throw new Error("No autenticado");
  }
}

// ========================================
// CONSTANTES
// ========================================

export const SUPER_ADMIN_TENANT_ID = "super-admin-tenant-uuid"; // Definir después de crear tenant
```

---

### 3. Helper de Autenticación Abstracto (Preparado para Clerk)

**Archivo**: `src/lib/auth.ts`

```typescript
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { User } from '@prisma/client';

/**
 * Obtiene el usuario autenticado actual
 *
 * IMPORTANTE: Esta función abstrae la lógica de autenticación.
 * Al migrar a Clerk, solo se modifica esta función, no todas las APIs.
 *
 * @returns User de Prisma con información completa (incluido role)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // ========================================
    // VERSIÓN ACTUAL: SUPABASE AUTH
    // ========================================
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser?.email) {
      return null;
    }

    // Obtener User de Prisma (con role y tenantId)
    const user = await prisma.user.findUnique({
      where: { email: authUser.email }
    });

    return user;

    // ========================================
    // VERSIÓN FUTURA: CLERK (comentado por ahora)
    // ========================================
    // import { currentUser } from "@clerk/nextjs/server";
    //
    // const clerkUser = await currentUser();
    //
    // if (!clerkUser) {
    //   return null;
    // }
    //
    // const user = await prisma.user.findUnique({
    //   where: {
    //     email: clerkUser.emailAddresses[0].emailAddress
    //   }
    // });
    //
    // return user;

  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Obtiene el usuario autenticado o lanza excepción
 * Útil para APIs que REQUIEREN autenticación
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  return user;
}
```

**Ventaja**: Al migrar a Clerk, solo se modifica este archivo (5 minutos), no las 50+ APIs que usan `getCurrentUser()`.

---

### 4. Uso en API Routes

**Ejemplo**: Proteger endpoint de Brands (solo SUPER_ADMIN)

```typescript
// src/app/api/vehicles/brands/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// POST - Crear marca (solo SUPER_ADMIN)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Validar permisos
    requireSuperAdmin(user);

    const body = await req.json();
    const { name } = body;

    const brand = await prisma.vehicleBrand.create({
      data: {
        name,
        tenantId: user!.tenantId,
      }
    });

    return NextResponse.json(brand);

  } catch (error: any) {
    if (error.message.includes("Acceso denegado")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

// GET - Listar marcas (todos con restricción por tenant)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const brands = await prisma.vehicleBrand.findMany({
      where: {
        tenantId: user.tenantId, // Solo del tenant del usuario
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(brands);

  } catch (error) {
    return NextResponse.json(
      { error: "Error al cargar marcas" },
      { status: 500 }
    );
  }
}
```

---

### 5. Uso en UI Components

**Ejemplo**: Sidebar con navegación condicional

```tsx
// src/components/layout/Sidebar/Sidebar.tsx
"use client";

import { useUser } from "@/hooks/useUser";
import { isSuperAdmin, canViewDashboard, canManageUsers } from "@/lib/permissions";
import { NavItem, NavSeparator } from "./components";

export function Sidebar() {
  const user = useUser(); // Hook que obtiene user actual

  return (
    <nav className="space-y-2">
      {/* TODOS pueden ver vehículos */}
      <NavItem href="/dashboard/vehicles/fleet">
        Vehículos
      </NavItem>

      {/* OWNER, MANAGER, TECHNICIAN pueden ver alertas */}
      {canViewAlerts(user) && (
        <NavItem href="/dashboard/maintenance/alerts">
          Alertas
        </NavItem>
      )}

      {/* OWNER, MANAGER pueden ver dashboard */}
      {canViewDashboard(user) && (
        <NavItem href="/dashboard">
          Dashboard
        </NavItem>
      )}

      {/* Solo SUPER_ADMIN ve tablas maestras */}
      {isSuperAdmin(user) && (
        <>
          <NavSeparator label="Administración SaaS" />
          <NavItem href="/dashboard/admin/brands">
            Marcas
          </NavItem>
          <NavItem href="/dashboard/admin/lines">
            Líneas
          </NavItem>
          <NavItem href="/dashboard/admin/types">
            Tipos
          </NavItem>
          <NavItem href="/dashboard/admin/mant-items">
            Items Mantenimiento
          </NavItem>
        </>
      )}

      {/* Solo OWNER puede gestionar usuarios */}
      {canManageUsers(user) && (
        <>
          <NavSeparator label="Configuración" />
          <NavItem href="/dashboard/settings/users">
            Usuarios
          </NavItem>
        </>
      )}
    </nav>
  );
}
```

---

## 📦 Plan de Implementación MVP

### Fase 1: Schema y Helpers (1 hora)
- [x] Agregar `SUPER_ADMIN`, `OWNER`, `TECHNICIAN`, `DRIVER` al enum
- [x] Crear `src/lib/auth.ts` (abstracción Supabase → Clerk)
- [x] Crear `src/lib/permissions.ts` (helpers de permisos)
- [x] Migración: `npx prisma migrate dev --name add_five_roles`

### Fase 2: Proteger APIs Críticas (1 hora)
- [ ] `/api/vehicles/brands` (POST, PATCH, DELETE) → SUPER_ADMIN
- [ ] `/api/vehicles/lines` (POST, PATCH, DELETE) → SUPER_ADMIN
- [ ] `/api/vehicles/types` (POST, PATCH, DELETE) → SUPER_ADMIN
- [ ] `/api/maintenance/mant-categories` (POST, PATCH, DELETE) → SUPER_ADMIN
- [ ] `/api/maintenance/mant-items` (POST, PATCH, DELETE) → SUPER_ADMIN
- [ ] `/api/maintenance/invoices` (POST, PATCH) → OWNER, MANAGER

### Fase 3: UI Condicional (30 minutos)
- [ ] Sidebar con navegación por roles
- [ ] Ocultar botones según permisos (Eliminar, Aprobar, etc.)
- [ ] Badges visuales de rol en navbar

### Fase 4: Seed de Prueba (30 minutos)
- [ ] Crear tenant SUPER_ADMIN
- [ ] Crear tenant DEMO
- [ ] Crear usuarios de ejemplo (1 de cada rol)

### Fase 5: Testing (30 minutos)
- [ ] Login con cada rol
- [ ] Verificar accesos permitidos/denegados
- [ ] Probar flujo completo

**Tiempo total**: 3 horas

---

## 🔮 Roadmap Post-MVP

### FASE 2: Permisos Granulares (cuando 10+ clientes lo pidan)

```prisma
model Permission {
  id          String @id @default(cuid())
  name        String @unique  // "create_workorder", "approve_invoice_up_to_500"
  description String
  category    String          // "vehicles", "maintenance", "finance"
  // ...
}

model RolePermission {
  id           String     @id @default(cuid())
  role         UserRole
  permissionId String
  permission   Permission @relation(fields: [permissionId])
  // Restricciones adicionales (ej: límite de monto)
  constraints  Json?      // { "max_amount": 500 }
  // ...
}
```

**Features avanzados**:
- Permisos por límite de monto
- Roles custom por tenant
- Permisos temporales (ej: "aprobar mientras estoy de vacaciones")
- Logs de auditoría de permisos

---

## 💡 Ventajas del Diseño Elegido

### Para el MVP
1. ✅ **Simple de implementar** (3 horas vs 2 semanas con permisos granulares)
2. ✅ **Fácil de vender** ("5 roles que entiende cualquier empresa")
3. ✅ **Cubre 95% de casos** del target (10-50 vehículos)
4. ✅ **Preparado para Clerk** (solo 1 función a cambiar)
5. ✅ **Escalable** (luego agregar permisos granulares sin romper)

### Para el Cliente
1. ✅ **Intuitivo**: OWNER, MANAGER, TECHNICIAN, DRIVER son auto-explicativos
2. ✅ **Seguridad**: TECHNICIAN no ve costos sensibles
3. ✅ **Flexibilidad**: Empresa chica usa 2 roles, mediana usa los 5
4. ✅ **Control**: OWNER gestiona su equipo sin llamar a soporte

### Para Escalabilidad
1. ✅ **Compatible con Clerk**: Migración en 3 horas
2. ✅ **Base sólida**: Agregar permisos granulares es aditivo, no destructivo
3. ✅ **Testing simple**: 5 roles = 5 casos de prueba
4. ✅ **Documentación fácil**: 1 tabla de permisos clara

---

## 🚨 Decisiones de Diseño Críticas

### 1. ¿Por qué NO usar sistema de permisos granular desde el inicio?

**Razón**: YAGNI (You Aren't Gonna Need It)

- Los primeros 5-10 clientes NO necesitan permisos complejos
- Agregar complejidad temprana = más bugs, más tiempo de desarrollo
- Si ningún cliente lo pide en 6 meses, fue tiempo perdido
- Es más fácil AGREGAR complejidad que QUITARLA

**Estrategia**: Implementar cuando 3+ clientes pidan lo mismo.

---

### 2. ¿Por qué DRIVER separado de TECHNICIAN?

**Razón**: Casos de uso totalmente distintos

**DRIVER**:
- Solo registra km al finalizar turno
- No ve mantenimiento, alertas, costos
- Puede ser un tercero (outsourcing)
- Turnos múltiples/día

**TECHNICIAN**:
- Ejecuta órdenes de trabajo
- Ve alertas y prioridades
- Registra trabajos realizados
- NO ve costos (sensible para empresa)

**Separar permite**:
- App móvil simple para DRIVER (solo odómetro)
- TECHNICIAN no necesita ver costos (evita conflictos laborales)
- Roles claramente diferenciados al vender

---

### 3. ¿Por qué OWNER separado de MANAGER?

**Razón**: Jerarquía clara + limitaciones de MANAGER futuras

**OWNER**:
- Único que puede gestionar usuarios
- Ve configuración de suscripción
- Puede eliminar vehículos
- "Dios" dentro de su tenant

**MANAGER**:
- Gestiona operación día a día
- NO gestiona usuarios (evita que despida al OWNER en el sistema 😄)
- Futuro: límites de aprobación ($500 vs $5000)

**Ventaja**: Si OWNER se va de vacaciones, MANAGER opera sin riesgos administrativos.

---

## 📝 Notas de Implementación

### Variables de Entorno Necesarias

```env
# .env.local
# (Actual - Supabase)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# (Futuro - Clerk)
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
# CLERK_SECRET_KEY=...
# CLERK_WEBHOOK_SECRET=...
```

### Seed Inicial de Tenants y Usuarios

```bash
# Ejecutar después de migración
npx tsx prisma/seed-permissions.ts
```

**Contendrá**:
- 1 tenant SUPER_ADMIN (para ti)
- 1 tenant DEMO (para mostrar a clientes)
- 5 usuarios (1 de cada rol) para testing

---

## 🎯 Métricas de Éxito

### MVP (Semana 1)
- [ ] 5 roles implementados
- [ ] Tablas maestras protegidas (solo SUPER_ADMIN)
- [ ] UI muestra/oculta según role
- [ ] 5 usuarios de prueba funcionando

### Post-MVP (Mes 1-3)
- [ ] 5-10 clientes usando el sistema
- [ ] 0 solicitudes de permisos más complejos
- [ ] Feedback positivo sobre simplicidad

### Señal para FASE 2
- [ ] 3+ clientes piden mismo permiso custom
- [ ] Ejemplo: "Necesito que supervisor apruebe hasta $1000, pero gerente hasta $5000"
- [ ] Ahí implementar sistema granular

---

**Estado**: ✅ Listo para implementación
**Próximo paso**: Ejecutar migración de schema y crear helpers
