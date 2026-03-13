# Proposal: Wizard Alert Modality — Modalidad y Proveedor en OTs

## Intent

Cuando se crea una Orden de Trabajo a partir de un paquete de alertas de mantenimiento, el sistema hoy crea todos los WorkOrderItems como `EXTERNAL` sin una asignación real de proveedor. Esto genera dos problemas:

1. Los items aparecen en el tab incorrecto (Trabajos Externos) aunque el trabajo se haga en taller propio.
2. No hay forma de asignar proveedores a items externos ni de generar Órdenes de Compra por proveedor.

Esta change agrega: (a) selección de modalidad a nivel de paquete en el wizard, (b) asignación de proveedor a items externos con opción global o por-item, (c) toggle INTERNO/EXTERNO editable post-creación en ambos tabs, y (d) generación de OCs agrupadas por proveedor.

---

## Scope

### In Scope
- Toggle "Taller Propio / Servicio Externo" a nivel de paquete en el wizard (panel azul de creación)
- Campo `providerId` en `WorkOrderItem` (schema migration)
- En tab Trabajos Externos: checkbox "Mismo proveedor para todos" + dropdown global; sino dropdown por item
- Toggle INTERNO/EXTERNO editable en cada WorkOrderItem dentro del tab Taller Propio y Trabajos Externos
- Al cambiar toggle: PATCH `itemSource` + `providerId` → item se mueve al tab correspondiente sin recarga de página
- Botón "Generar OC" en Trabajos Externos: agrupa items por `providerId` → crea 1 `PurchaseOrder` por proveedor
- Endpoint `POST /api/maintenance/work-orders/[id]/purchase-orders` (actualmente referenciado pero no implementado)
- Endpoint `PATCH /api/maintenance/work-orders/[id]/items/[itemId]` para actualizar `itemSource` y `providerId`

### Out of Scope
- Cambio de proveedor en una OC ya generada (flujo de compras)
- Flujo de aprobación de OCs (ya existe, no se modifica)
- Items manuales agregados desde AddItemDialog (tienen su propio flujo de `itemSource`)
- Corrective OTs (sin alertIds, no aplica el toggle de paquete)

---

## Approach

### Paso 1 — Schema
Agregar `providerId String?` con relación `provider Provider?` a `WorkOrderItem`.
Migración: `prisma migrate dev --name add_provider_to_work_order_item`

### Paso 2 — Wizard (panel azul)
En el `WorkOrderCreateWizard.tsx`, dentro del bloque "Alertas Pendientes Detectadas", agregar debajo de los checkboxes de alertas:

```
┌─────────────────────────────────────────────────┐
│ ¿Dónde se realizará el trabajo?                  │
│  ○ Taller Propio    ● Servicio Externo           │
└─────────────────────────────────────────────────┘
```

Si se selecciona "Servicio Externo":
- Mostrar checkbox "Todos los items con el mismo proveedor"
- Si checkbox ON: dropdown único de proveedor (Select con lista de Providers del tenant)
- Si checkbox OFF: sin dropdown en wizard; la asignación se hace post-creación por item

El payload nuevo agrega: `modality: 'INTERNAL' | 'EXTERNAL'` y `globalProviderId?: string`

### Paso 3 — API POST work-orders
Procesar `modality` y `globalProviderId` al crear WorkOrderItems:
- `INTERNAL` → `itemSource = 'INTERNAL_STOCK'`, `providerId = null`
- `EXTERNAL` + `globalProviderId` → `itemSource = 'EXTERNAL'`, `providerId = globalProviderId`
- `EXTERNAL` sin provider → `itemSource = 'EXTERNAL'`, `providerId = null` (asignar post)

### Paso 4 — Toggle per-item en WorkItemRow
Agregar en el WorkItemRow un pequeño toggle o badge clicable: `[Taller Propio] / [Externo]`
Al cambiar: llamar `PATCH /api/maintenance/work-orders/[id]/items/[itemId]` con `{ itemSource, providerId: null }` si pasa a INTERNO.
El `onRefresh()` post-PATCH hace que el item desaparezca del tab actual y aparezca en el otro.

### Paso 5 — Proveedor en TrabajosExternosTab
- Checkbox global "Asignar mismo proveedor a todos"
- Si ON: Select de proveedor → botón "Aplicar a todos" → PATCH batch
- Si OFF: cada item externo sin `providerId` muestra un inline Select de proveedor

### Paso 6 — API POST purchase-orders
Implementar el endpoint (ya referenciado en TrabajosExternosTab pero no existe):
- Recibe `{ itemIds: string[] }`
- Hace JOIN con `WorkOrderItem` para obtener `providerId` de cada item
- Valida: todos deben tener `providerId`
- Agrupa por `providerId` → crea 1 `PurchaseOrder` por proveedor con sus items
- Retorna lista de OCs creadas

---

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `prisma/schema.prisma` | Modificado | Agregar `providerId String?` + relación en `WorkOrderItem` |
| `prisma/migrations/` | Nuevo | Migración `add_provider_to_work_order_item` |
| `src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx` | Modificado | Toggle de modalidad + dropdown proveedor global |
| `src/app/api/maintenance/work-orders/route.ts` | Modificado | Procesar `modality` y `globalProviderId` en creación de items |
| `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts` | Nuevo | PATCH para actualizar `itemSource` y `providerId` |
| `src/app/api/maintenance/work-orders/[id]/purchase-orders/route.ts` | Nuevo | POST generar OCs agrupadas por proveedor |
| `src/app/api/providers/route.ts` | Lectura | Fetch de lista de providers (ya existe) |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkItemRow.tsx` | Modificado | Toggle INTERNO/EXTERNO per-item + dropdown proveedor inline |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/TrabajosExternosTab.tsx` | Modificado | Checkbox global proveedor + wiring Generar OC |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/TallerPropioTab.tsx` | Modificado | Toggle INTERNO/EXTERNO per-item |
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx` | Lectura | Verificar que `workOrder.workOrderItems` incluye `providerId` en el fetch |

---

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Items existentes con `itemSource = null` o sin `providerId` | Alta | Tratarlos como `INTERNAL_STOCK` con `providerId = null`; el toggle los puede reclasificar |
| "Generar OC" con items sin proveedor asignado | Media | Validar en frontend y backend: bloquear selección si `providerId = null`, mostrar mensaje |
| Batch PATCH de proveedor afecta items ya con OC generada | Baja | Bloquear cambio de `providerId` si el item ya tiene `purchaseOrderItems` asociados |
| Race condition entre toggle y onRefresh | Baja | Optimistic update: esconder item del tab actual inmediatamente, onRefresh confirma |

---

## Rollback Plan

1. Revertir la migración: `prisma migrate dev` elimina la columna `providerId` de `WorkOrderItem`
2. Eliminar los 2 endpoints nuevos
3. Revertir WorkOrderCreateWizard a su versión sin toggle de modalidad
4. Revertir WorkItemRow, TrabajosExternosTab, TallerPropioTab a versión anterior
5. Git: `git revert` del commit de esta change

---

## Dependencies

- `Provider` model ya existe con relación a `Tenant` — no hay nuevas entidades
- Endpoint `GET /api/providers` debe existir y retornar `{ id, name }[]` — verificar en implementación
- `PurchaseOrder` y `PurchaseOrderItem` ya existen en schema — la lógica de generación de OC los usa directamente

---

## Success Criteria

- [ ] Al crear una OT desde el wizard con "Taller Propio", los items aparecen en tab Taller Propio (`itemSource = INTERNAL_STOCK`)
- [ ] Al crear con "Servicio Externo" + proveedor global, los items aparecen en tab Trabajos Externos con `providerId` asignado
- [ ] Toggle per-item en Taller Propio mueve el item a Trabajos Externos y viceversa (sin recarga de página completa)
- [ ] "Generar OC" con 3 items de 2 proveedores distintos crea exactamente 2 PurchaseOrders
- [ ] Items sin `providerId` en Trabajos Externos no pueden incluirse en "Generar OC" (bloqueados con mensaje)
- [ ] Los items ya con OC generada (`purchaseOrderItems.length > 0`) no permiten cambiar proveedor
