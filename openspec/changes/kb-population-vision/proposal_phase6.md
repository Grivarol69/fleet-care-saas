# Proposal: SDD Phase 6 - Catálogo Global de Repuestos

## Problem Statement
Durante la fase de Onboarding, los nuevos tenants (empresas) pueden decidir precargar los datos básicos de la Knowledge Base (KB) global (vehículos y planes de mantenimiento). Sin embargo, la Fase 6 referente a la precarga de Catálogo de Repuestos Globales (`MasterPart`) y sus vínculos inteligentes (`MantItemVehiclePart`) sigue pendiente. Actualmente, cuando un usuario selecciona la carga de KB, no se traen los catálogos globales de repuestos, lo que obliga al usuario a introducirlos a mano.

## Proposed Solution
Aprovechando el componente `OnboardingKBForm` y el mecanismo robusto de transacciones asíncronas de `copyKnowledgeBaseToTenant`, añadiremos la funcionalidad de copiado de auto-partes.

1.  **En Backend (`copyKnowledgeBaseToTenant`)**:
    *   Si `options.maintenanceItems` (u otra opción elegida) resulta verdadera, buscar las `MasterPart` globales (`tenantId: null`).
    *   Copiar cada `MasterPart` y asociarla al `tenantId` en proceso, manteniendo un mapeo de IDs originales a los nuevos IDs generados.
    *   Buscar los `MantItemVehiclePart` globales. Por cada uno, si el `mantItemId`, `vehicleBrandId`, `vehicleLineId` y `masterPartId` originales fueron mapeados durante este mismo proceso de copia, generar una réplica en el tenant para vincular los repuestos a las tareas, marcas y líneas correspondientes.
2.  **En Frontend (`OnboardingKBForm`) / UI**:
    *   Asegurar que el contador de `MasterPart` y `MantItemVehiclePart` sea calculado desde la BD global e incluido en los checkboxes descriptivos (o un nuevo checkbox si decidiésemos que los repuestos van por separado, aunque vincularlos a *Items de Mantenimiento* es muy lógico).
    *   Actualizar `get-kb-counts.ts` para reportar estas métricas globales.

## In Scope
*   Actualización de `get-kb-counts.ts` para devolver cantidad de repuestos (`MasterPart`) globales.
*   Actualización de `OnboardingKBForm.tsx` (frontend) para reportar conteos actualizados.
*   Actualización de la transacción Prisma alojada en `copyKnowledgeBaseToTenant.ts` para clonar `MasterPart` y sus vínculos `MantItemVehiclePart`.
*   Testing manual del flujo.

## Out of Scope
*   Generación masiva con IA de catálogos (se deja para el administrador global de la plataforma).
*   Catálogos externos o APIs de terceros para autopartes.

## Success Criteria
1. Al invocar el Onboarding y seleccionar precargar "Items de Mantenimiento", el sistema debe copiar las partes globales.
2. Los repuestos (`MasterPart`) insertados deben mantener íntegramente sus relaciones con Marcas, Líneas, Categorías y Tareas en el nuevo tenant.
3. El frontend debe mostrar al usuario un indicio del conteo de partes disponibles para precarga.
