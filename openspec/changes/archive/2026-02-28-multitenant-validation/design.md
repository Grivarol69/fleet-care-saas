# Diseño: multitenant-validation

## Enfoque Técnico

Implementaremos una Extensión de Prisma Client (específicamente, una extensión de consultas `$extends`) que interceptará automáticamente todas las consultas a la base de datos e inyectará el `tenantId` en la cláusula `where`. Esto garantiza un aislamiento multitenant absoluto en la capa del ORM, previniendo cualquier acceso accidental a datos cruzados entre tenants.

En lugar de sobrescribir el singleton global `prisma` (el cual aún necesitamos para webhooks y trabajos en segundo plano que operan a través de múltiples tenants), crearemos una función de fábrica `getTenantPrisma(tenantId: string)` en `src/lib/prisma.ts`. Todas las rutas de API y Server Actions con alcance de tenant serán refactorizadas para usar esta fábrica en lugar del cliente base.

## Decisiones de Arquitectura

### Decisión: Prisma Client Extension ($extends) vs Raw SQL RLS

**Elección**: Extensión de Prisma Client (`$extends`)
**Alternativas consideradas**: Row-Level Security (RLS) de Postgres configurado directamente en Neon DB, o continuar con cláusulas `where` manuales.
**Fundamento**: Postgres RLS requiere ejecutar una consulta `SET app.current_tenant = X` antes de cada transacción, lo cual es complejo de gestionar de manera confiable en un entorno serverless (Next.js + pool de conexiones de Prisma). Las extensiones de Prisma Client ofrecen una solución a nivel de aplicación determinista, segura (en cuanto a tipos) y pura que se integra nativamente con nuestro ORM existente sin la complejidad a nivel de base de datos.

### Decisión: Función Factory vs AsyncLocalStorage

**Elección**: Función Factory `getTenantPrisma(tenantId)`
**Alternativas consideradas**: Usar `AsyncLocalStorage` de Node para pasar implícitamente el `tenantId` hacia abajo a una única instancia decorada global de Prisma.
**Fundamento**: Aunque `AsyncLocalStorage` crea una API más "limpia" (sin necesidad de pasar `tenantId` de un lado a otro), es notoriamente difícil de depurar, puede perder contexto en ciclos de vida complejos de Server Actions de Next.js, y oculta dependencias. Pasar el `tenantId` explícitamente desde `getCurrentUser()` a `getTenantPrisma(user.tenantId)` es explícito, predecible y más fácil de probar.
### Decisión: Modelado de Knowledge Base (Datos Globales vs Propietarios)

**Elección**: Usar las mismas tablas con `tenantId` y `isGlobal`, aplicando Reglas Férreas de Lectura/Escritura mediante la Extensión.
**Alternativas consideradas**: Crear tablas duplicadas separadas y copiar los datos a los tenants por demanda.
**Fundamento**: Mantener tablas separadas o copiar datos duplicaría la lógica de negocio y crearía una pesadilla de sincronización. Al usar la misma tabla:
1. **Propiedad Intelectual Protegida**: Si el cliente crea un Plan de Mantenimiento, la API *fuerza* que se guarde con su `tenantId`. Nadie más lo ve. No hay conflicto legal porque la Plataforma no comparte esos datos.
2. **Propiedad de la Plataforma**: Los planes y catalogos que ustedes curan, se guardan con `tenantId: null` e `isGlobal: true`.
3. **Escudo de Escritura**: La Extensión de Prisma impedirá automáticamente que cualquier inquilino edite o borre un registro global, asegurando que la Base de Conocimiento no sea alterada. Solo la leerán.

### Decisión: Alcance del Rol SUPER_ADMIN

**Elección**: El `SUPER_ADMIN` utilizará el cliente Prisma "Base" (sin encapsular) para tareas de plataforma, y podrá saltar el aislamiento.
**Alternativas consideradas**: Forzar al `SUPER_ADMIN` a usar siempre un `tenantId`.
**Fundamento**: Como dueños de la plataforma, necesitan poder hacer operaciones CRUD sobre todos los tenants (ej. soporte técnico, analíticas o curar la Base de Conocimiento Global). El `SUPER_ADMIN` no usará `getTenantPrisma(user.tenantId)`, sino que tendrá acceso al cliente original de Prisma que no inyecta el `where` automáticamente, dándole visibilidad y control total del sistema.

## Flujo de Datos

    [Petición Cliente] ──→ [proxy.ts (Auth Check)] ──→ [API Route / Server Action]
                                                            │
                                                     getCurrentUser()
                                                            │
                                              getTenantPrisma(user.tenantId)
                                                            │
                                                [Prisma Client Extension]
                                              Inyecta automáticamente `where`
                                                            │
                                                       [Neon DB]

## Archivos Modificados

| Archivo | Acción | Descripción |
|------|--------|-------------|
| `src/lib/prisma.ts` | Modificar | Añadir fábrica `getTenantPrisma` y la lógica de intercepción usando `$extends`. |
| `src/app/api/**/*.ts` | Modificar | Reemplazar sistemáticamente `prisma` base con `tenantPrisma` donde corresponda. |
| `src/actions/**/*.ts` | Modificar | Reemplazar sistemáticamente `prisma` base con `tenantPrisma` donde corresponda. |

## Interfaces / Contratos

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export function getTenantPrisma(tenantId: string) {
  // Podemos memorizar o simplemente retornar una nueva instancia de la extensión
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Comprobar si este modelo realmente tiene un campo tenantId (ej. User, Vehicle)
          // También respetar las banderas `isGlobal` para modelos de la Knowledge Base como VehicleBrand
          
          const hasTenantField = /* lógica para comprobar si el modelo tiene tenantId */;
          
          if (hasTenantField && !['create', 'createMany'].includes(operation)) {
             // Inyectar tenantId en args.where
             args.where = { ...args.where, tenantId };
          }
          
          // Para creaciones, auto-inyectar la data
          if (hasTenantField && ['create', 'update', 'upsert'].includes(operation)) {
             // Inyectar tenantId en args.data
          }

          return query(args);
        },
      },
    },
  });
}
```

## Estrategia de Pruebas

| Capa | Qué probar | Enfoque |
|-------|-------------|----------|
| Unitarias | Extensión Prisma | Escribir una suite de pruebas dedicada `src/lib/__tests__/tenant-prisma.test.ts` para consultar la BD con dos IDs de tenant diferentes y verificar que no pueden ver los datos del otro incluso omitiendo un `where` explícito. |
| E2E | Webhooks & Auth | Ejecutar pruebas Playwright para Onboarding y Sign In para asegurar que los webhooks sin alcance sigan funcionando perfectamente. |
| Integración | Rutas API | Asegurar que rutas existentes como `GET /api/maintenance/vehicles` retornen 200 y solo los vehículos correctos del tenant después de la refactorización. |

## Migración / Despliegue

No se requiere migración de base de datos. Este es puramente un cambio en la capa de aplicación.
El despliegue debería ser un reemplazo tipo "Big Bang" a través de todas las rutas de la API para garantizar coherencia, validado por las suites existentes de `vitest` y `playwright`.

## Preguntas Abiertas

- [ ] ¿Expone `Prisma.dmmf.datamodel.models` los campos del esquema en tiempo de ejecución para que la extensión pueda comprobar dinámicamente si un `model` tiene el campo `tenantId` y uno `isGlobal`? (Necesito verificar componentes internos de Prisma).
