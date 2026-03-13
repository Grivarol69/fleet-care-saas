# Proposal: Template Cloning UI (Clonado Asistido)

## Intent

Empoderar a los usuarios para crear rápidamente nuevos planes de mantenimiento basados en la "Knowledge Base" global o sus planes privados, ahorrando horas de tipeo. Dado que un vehículo nuevo a menudo comparte el 90% de un esquema de mantenimiento con otro similar, clonar un template existente proporciona una base sólida operativa. No obstante, el clonado debe ser *asistido*, exigiendo al usuario reclasificar el plan (Marca, Línea, Nombre) para mantener limpia la arquitectura de datos multitenant, previniendo conflictos y desorden general.

## Scope

### In Scope
- Actualización del endpoint `POST /api/maintenance/mant-template/clone` para aceptar un payload extendido (`name`, `vehicleBrandId`, `vehicleLineId`).
- Creación de un Modal (Dialog UI) "Clonar Template" accesible desde las vistas de detalle o listado de templates.
- Selectores asíncronos en el Modal para elegir la Marca y Línea destino.
- Agregar un tooltip o alerta visible, tras el clonado exitoso, recordando revisar la compatibilidad de los repuestos (MasterParts).

### Out of Scope
- Interfaz masiva de "Find & Replace" de repuestos (eso corresponde al roadmap futuro de refactorización de planes).
- Sincronización automática futuro-hacia-pasado (Si el plan padre se actualiza, los planes clonados no heredarán automáticamente los cambios, ya que ahora son entidades aisladas).

## Approach

1. Modificaremos el Zod schema del clonado en la API para requerir el nuevo de nombre, marca destino y línea destino.
2. Modificaremos el `prisma.$transaction` del endpoint `clone` para **excluir intencionalmente cualquier vínculo con repuestos (`MantItemMasterPart`)** durante la copia profunda, asegurándonos de que solo se copien las tareas desnudas.
3. Construiremos un componente modal de Radix UI / Shadcn para el frontend que capture estos 3 valores obligatorios.
4. El frontend enviará esta información, y el backend asignará inmediatamente el plan clonado bajo las nuevas jerarquías.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/maintenance/mant-template/clone/route.ts` | Modified | Modificación del Zod schema y payload de creación de Prisma |
| `src/app/(dashboard)/maintenance/programs/[id]/page.tsx` | Modified | Agregar botón "Clonar" en UI del detalle program |
| `src/components/maintenance/templates/CloneTemplateModal.tsx` | New | Formulario Asistido UI para realizar la copia |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Incompatibilidad cruzada accidental (Repuestos de otra marca en vehículo equivocado) | Low | Intervención en backend: No clonar vínculos con repuestos MasterPart, requiriendo vinculación manual posterior. |
| Errores al cargar Marcas/Líneas en el Modal por peticiones repetitivas | Low | Reutilizar el hook existente (ej. `useVehicleBrands`) que maneje cache en SWR/React Query o pre-cargar data localmente. |

## Rollback Plan

- Si se detecta un comportamiento defectuoso en producción, el componente Modal se puede hacer "Hidden" mediante un flag en el frontend de forma temporal, previniendo el clonado.
- El endpoint puede restaurar su comportamiento simple (1-Click clone) usando `git checkout` si falla la lógica de Marcas.

## Success Criteria

- [ ] Un usuario puede clickear en un Template, seleccionar "Clonar", escoger su "Nissan Frontier" y el nombre "Plan de Mantenimiento Ligero 2026", y ver el nuevo template pre-llenado en 5 segundos.
- [ ] La base de datos asocia correctamente este nuevo `MaintenanceTemplate` al `tenantId` privado del cliente y vincula la jerarquía a `vehicleBrandId` y `vehicleLineId` de la Nissan Frontier.
