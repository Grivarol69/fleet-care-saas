# Testing Handoff - 2026-03-11

## Estado actual

### Base estable
Estos tests quedaron funcionando y forman la base rapida de la suite:
- `src/lib/__tests__/auth.test.ts`
- `src/lib/__tests__/permissions.test.ts`
- `src/lib/__tests__/utils.test.ts`
- `src/lib/logic/__tests__/financial-calculations.test.ts`
- `src/lib/logic/__tests__/maintenance-logic.test.ts`

Resultado validado:
- `114` tests pasando

Comando:
```bash
npx vitest run \
  src/lib/__tests__/utils.test.ts \
  src/lib/__tests__/permissions.test.ts \
  src/lib/__tests__/auth.test.ts \
  src/lib/logic/__tests__/financial-calculations.test.ts \
  src/lib/logic/__tests__/maintenance-logic.test.ts
```

### Limpieza aplicada hoy
- Se renombro `vitest.config.ts` a `vitest.config.mts`
- El entorno por defecto de Vitest quedo en `node`
- Se elimino `src/lib/logic/__tests__/work-order-utils.test.ts` por no proteger codigo productivo
- Se alineo `permissions.test.ts` con el rol `COORDINATOR`
- Se endurecieron assertions en `auth.test.ts` y `utils.test.ts`

### Integration tests ya separados como opt-in
Estos tests ahora requieren `RUN_INTEGRATION_TESTS=1`:
- `src/lib/__tests__/tenant-prisma.test.ts`
- `src/app/api/__tests__/multi-tenant-security.test.ts`
- `src/app/api/vehicles/__tests__/vehicles-crud.test.ts`
- `src/app/api/people/__tests__/people-crud.test.ts`
- `src/app/api/dashboard/__tests__/dashboard-metrics.test.ts`
- `src/app/api/inventory/__tests__/inventory-lifecycle.test.ts`

Comando:
```bash
RUN_INTEGRATION_TESTS=1 npx vitest run \
  src/lib/__tests__/tenant-prisma.test.ts \
  src/app/api/__tests__/multi-tenant-security.test.ts \
  src/app/api/vehicles/__tests__/vehicles-crud.test.ts \
  src/app/api/people/__tests__/people-crud.test.ts \
  src/app/api/dashboard/__tests__/dashboard-metrics.test.ts \
  src/app/api/inventory/__tests__/inventory-lifecycle.test.ts
```

## Politica de testing
Referencia principal:
- `TESTING_POLICY.md`

## Siguiente paso recomendado
Continuar con:
- `src/app/api/maintenance/__tests__/mant-items-crud.test.ts`

Objetivo del siguiente bloque:
- mejorar naming
- reforzar asserts debiles
- separar claramente integration tests
- mantener cambios pequenos y reversibles
- no entrar todavia a `work-orders`

## Engram
Estado confirmado hoy:
- `engram` binario instalado en `/home/guille-rivar/.local/bin/engram`
- no existe aun `~/.codex/config.toml`
- por eso Codex todavia no tiene Engram registrado automaticamente

Paso sugerido para manana:
1. configurar Engram para Codex con `engram setup`
2. elegir opcion `4) Codex`
3. abrir una nueva sesion y verificar si Engram ya aparece disponible

Nota:
- En esta sesion no hubo tool MCP de Engram expuesto directamente, asi que no se pudo usar todavia desde Codex.

## Limites acordados
- No tocar todavia la bateria especifica de `work-orders`
- Hay mucho trabajo en curso del equipo en esa zona
- Fuera de `work-orders`, seguir ordenando la suite por capas

## Actualizacion - 2026-03-12 19:23 -05

### Bloque completado
Se continuo el trabajo recomendado sobre:
- `src/app/api/maintenance/__tests__/mant-items-crud.test.ts`

Cambios aplicados:
- naming de tests alineado a comportamiento: `debe ... cuando ...`
- helpers locales para reducir repeticion en auth y requests JSON
- asserts mas fuertes sobre persistencia en DB y ausencia de efectos colaterales
- `afterEach` defensivo para no introducir ruido cuando falla el setup

Resultado validado:
- `15/15` tests pasando en `src/app/api/maintenance/__tests__/mant-items-crud.test.ts`

Comando ejecutado:
```bash
npm test -- src/app/api/maintenance/__tests__/mant-items-crud.test.ts
```

### Estado de la DB de test
La suite no corria por dos motivos detectados:
- desde sandbox Prisma no podia conectar a `127.0.0.1:5433`
- fuera de sandbox, la DB de test estaba desalineada con Prisma y faltaba la columna `Tenant.plan`

Estado final confirmado:
- la DB de test afectada es solo `fleet_care_test` en `localhost:5433`
- esta DB viene de `.env.test`
- no corresponde a la DB usada por la app en `localhost:3000`
- no se modifico `prisma/schema.prisma`

Comando usado para destrabar la DB de test:
```bash
npx dotenv-cli -e .env.test -- prisma migrate reset --force --skip-seed
```

Esto dejo `fleet_care_test` limpia y con migraciones aplicadas.

### Proximo paso sugerido
Seguir con otra suite de integracion fuera de `work-orders`, manteniendo el mismo criterio:
- naming claro
- asserts observables
- separar dependencias reales de setup de entorno

## Actualizacion - 2026-03-12 19:58 -05

### Bloque completado
Se continuo con:
- `src/app/api/people/__tests__/people-crud.test.ts`

Cambios aplicados:
- naming alineado a comportamiento
- helper local para auth y creacion de requests
- cleanup centralizado para tenants secundarios creados dentro de la suite
- asserts de persistencia real en DB para casos de creacion y rechazo
- estabilizacion de Next `after()` con mock local a la suite para evitar fallo fuera de request scope en Vitest

Resultado validado:
- `12/12` tests pasando en `src/app/api/people/__tests__/people-crud.test.ts`

Comando ejecutado:
```bash
RUN_INTEGRATION_TESTS=1 npm test -- src/app/api/people/__tests__/people-crud.test.ts
```

### Observacion importante
La ruta `src/app/api/people/providers/route.ts` usa `after()` para disparar sincronizacion con Siigo.
En Vitest de integracion esto lanza:
- `` `after` was called outside a request scope ``

Para esta suite se resolvio con un mock local de `next/server` que reemplaza solo `after`, manteniendo el resto del modulo real.
No se modifico la ruta productiva.

### Proximo paso sugerido
Buenas candidatas siguientes, aun fuera de `work-orders`:
- `src/app/api/dashboard/__tests__/dashboard-metrics.test.ts`
- `src/app/api/__tests__/copy-kb-to-tenant.test.ts`

## Actualizacion - 2026-03-12 20:04 -05

### Bloque completado
Se continuo con:
- `src/app/api/dashboard/__tests__/dashboard-metrics.test.ts`

Cambios aplicados:
- helper para crear tenant autenticado con rol `OWNER`
- naming de tests alineado a comportamiento
- asserts mas explicitos sobre summary y thresholds
- aislamiento del caso de mapeo de alertas en `fleet-status` agregando lecturas recientes de odometro

Resultado validado:
- `11/11` tests pasando en `src/app/api/dashboard/__tests__/dashboard-metrics.test.ts`

Comando ejecutado:
```bash
RUN_INTEGRATION_TESTS=1 npm test -- src/app/api/dashboard/__tests__/dashboard-metrics.test.ts
```

### Observacion importante
En `fleet-status`, si un vehiculo no tiene lecturas de odometro, el handler lo clasifica como `CRITICAL` por defecto (`daysSinceUpdate = 999`).
Eso afecta el `summary` general aunque las alertas de mantenimiento sean solo warning.

Para testear solo el mapeo de alertas:
- agregar `odometerLog` reciente a los vehiculos del escenario
- si no, el resultado mezcla dos reglas distintas: alertas + odometro

### Proximo paso sugerido
Opciones razonables siguientes fuera de `work-orders`:
- `src/app/api/__tests__/copy-kb-to-tenant.test.ts`
- `src/app/api/vehicles/__tests__/vehicles-crud.test.ts`
