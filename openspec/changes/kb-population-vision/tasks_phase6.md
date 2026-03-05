# Tasks: SDD Phase 6 - Catálogo Global de Repuestos

## Phase 1: Mapeo y UI
- [x] 1.1 Actualizar función `getKBCounts()` en `src/actions/get-kb-counts.ts` para contar la cantidad de `MasterPart` con `tenantId: null` y agregarlo a la respuesta (`parts: number`).
- [x] 1.2 Actualizar tipo `KBCountsData` en `src/components/onboarding/OnboardingKBForm.tsx` para aceptar `parts: number`.
- [x] 1.3 Mostrar el texto "(~{counts.parts} repuestos sugeridos)" junto a las categorías y mantenimientos en la UI del checkbox `maintenanceItems`.

## Phase 2: Transacción Backend
- [x] 2.1 En `src/actions/copy-kb-to-tenant.ts`, dentro del clúster `if (options.maintenanceItems)`, agregar la búsqueda de `MasterPart` globales.
- [x] 2.2 Replicar cada `MasterPart` hallado a nombre del nuevo `tenantId`. Guardar referencias en un diccionario `partMap = new Map<string, string>()`.
- [x] 2.3 Si se copiaron partes, buscar `MantItemVehiclePart` con `isGlobal: true` (o `tenantId: null`).
- [x] 2.4 Replicar las tuplas halladas para el nuevo Tenant utilizando como Foreign Keys las colecciones en memoria de `mantItemId`, `vehicleBrandId`, `vehicleLineId` y `masterPartId` recién inicializadas.

## Phase 3: Pruebas
- [x] 3.1 Probar la funcionalidad de copiado End-to-End desde el frontend de Onboarding de Clerk/Test.
- [x] 3.2 Confirmar integridad SQL.
