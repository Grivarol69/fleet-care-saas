# Design: Wizard Alert Modality — Modalidad y Proveedor en OTs

## Technical Approach

Six-layer change: (1) schema migration, (2) extend existing PATCH endpoint, (3) create new
POST purchase-orders endpoint, (4) extend POST work-orders to accept modality, (5) update
wizard UI, (6) update WorkItemRow + tabs UI.

**Key finding from codebase**: `PATCH /api/maintenance/work-orders/[id]/items/[itemId]/route.ts`
YA EXISTE y ya maneja `itemSource`. Solo necesita `providerId` agregado al Zod schema.
No crear un nuevo endpoint — extender el existente.

---

## Architecture Decisions

### Decision: Extender PATCH existente en lugar de crear uno nuevo

**Choice**: Agregar `providerId` al `updateItemSchema` en el route ya existente.
**Alternatives considered**: Crear endpoint separado `/items/[itemId]/provider`.
**Rationale**: El route ya tiene toda la seguridad (tenant isolation, permisos,
auto-trigger PENDING_INVOICE), tiene la misma firma, y es el contrato natural para
actualizar cualquier campo de un WorkOrderItem.

### Decision: Fetch de providers en TrabajosExternosTab (no en WorkItemRow)

**Choice**: Un solo `GET /api/people/providers` al montar el tab, que pasa la lista
como prop a cada WorkItemRow que necesite el dropdown.
**Alternatives considered**: Fetch por item al expandir el row.
**Rationale**: La lista de providers es la misma para todos los items del tab.
Un solo fetch evita N requests al tab. La lista se pasa como prop `providers` a
WorkItemRow — ya existe el patrón de pasar props entre tab y row.

### Decision: Generación de orderNumber sin colisión

**Choice**: Contar las OCs existentes del tenant en la misma transacción y usar
ese conteo como secuencia. Usar `$transaction` para atomicidad.
**Alternatives considered**: `Math.random()` (Gemini lo propuso — riesgo de colisión),
UUID como orderNumber (no es legible).
**Rationale**: El schema ya tiene `@@unique([tenantId, orderNumber])`. Si hay colisión,
Prisma lanza P2002. El conteo en transacción es el approach más simple y correcto
para el volumen esperado.

### Decision: supplier String — mantener, no migrar

**Choice**: Dejar `supplier` como está. No migrar datos. Display: `provider.name ?? supplier ?? '—'`.
**Alternatives considered**: Migrar `supplier` → `providerId` para registros existentes.
**Rationale**: Los registros existentes no tienen un `Provider` entity asociado.
Forzar migración requeriría match por nombre (frágil) o dejar nulls. El fallback
en display es suficiente y no genera deuda técnica significativa.

### Decision: WorkOrder.provider — campo legacy, eliminar de toda la UI

**Choice**: No settear `WorkOrder.providerId` en el wizard ni en los endpoints nuevos.
Eliminar el campo de proveedor del wizard (Step 2) y del Tab Resumen de la OT.
La única fuente de verdad del proveedor es `WorkOrderItem.providerId` (nivel ítem).
La asignación de proveedores ocurre exclusivamente en TrabajosExternosTab post-creación.
**Alternatives considered**: (A) Mantener ambas relaciones con roles explícitos;
(C) Propagar WorkOrder.provider a los ítems como default.
**Rationale**: Una sola fuente de verdad elimina ambigüedad. El wizard solo captura
modalidad (INTERNO/EXTERNO); el proveedor se asigna cuando el usuario ya tiene
la OT creada y puede ver los ítems individuales. Flujo más limpio, sin duplicación.

### Decision: Optimistic update en toggle de modalidad

**Choice**: Al hacer click en el toggle, esconder el item del tab actual inmediatamente
(sin esperar respuesta del servidor), luego `onRefresh()` confirma.
**Alternatives considered**: Esperar respuesta del PATCH antes de actualizar la UI.
**Rationale**: El tab filtra items por `itemSource`. Si el PATCH es exitoso (99% de los
casos), el item ya no debe estar en este tab. Si falla, `onRefresh()` restaura el estado
correcto. La UX es notablemente mejor con optimistic update.

---

## Data Flow

### Flujo 1: Wizard → Creación de OT con modalidad

```
WorkOrderCreateWizard
  │  Step 1: selección de vehículo + alertas (pantalla azul — sin cambios)
  │  Step 2: resumen del paquete (alertas seleccionadas)
  │    - Toggle "Taller Propio / Servicio Externo"   ← NUEVO aquí
  │    - (campo WorkOrder.provider legacy → ELIMINADO de este step)
  │    - (sin dropdown de proveedor — se asigna post-creación a nivel ítem)
  │  form: { alertIds, modality }
  │
  ▼
POST /api/maintenance/work-orders
  │  Por cada alertId:
  │  - modality=INTERNAL → itemSource=INTERNAL_STOCK, providerId=null
  │  - modality=EXTERNAL → itemSource=EXTERNAL, providerId=null
  │
  ▼
WorkOrderItem creado (con itemSource + providerId correctos)
  │
  ▼
Redirect a /dashboard/maintenance/work-orders/[id]
  → Items aparecen en el tab correcto (Taller Propio / Trabajos Externos)
```

### Flujo 2: Toggle per-item (post-creación)

```
WorkItemRow (en TallerPropioTab o TrabajosExternosTab)
  │  User hace click en toggle
  │
  ▼  [Optimistic: esconder item del tab actual]
  │
PATCH /api/maintenance/work-orders/[id]/items/[itemId]
  │  body: { itemSource: 'EXTERNAL'|'INTERNAL_STOCK', providerId: null }
  │
  ▼
onRefresh() → fetchWorkOrder() → items re-filtrados
  → Item aparece en el otro tab
```

### Flujo 3: Asignación de proveedor + Generar OC

```
TrabajosExternosTab
  │  mount → GET /api/people/providers → lista de providers
  │
  ├─ Checkbox "Mismo proveedor"=ON
  │    → Select global → "Aplicar a todos"
  │    → PATCH batch (un PATCH por item sin OC activa)
  │    → onRefresh()
  │
  └─ Por item individual
       → Select inline → PATCH { providerId }
       → onRefresh()

  │  Selección con checkboxes + click "Generar OC"
  ▼
POST /api/maintenance/work-orders/[id]/purchase-orders
  │  body: { itemIds: string[] }
  │  1. Fetch items + providerId
  │  2. Validar todos tienen providerId
  │  3. Validar ninguno tiene PurchaseOrderItem activo
  │  4. Agrupar por providerId
  │  5. Por cada grupo: crear PurchaseOrder + PurchaseOrderItems en $transaction
  │  6. updateMany WorkOrderItem → closureType=PURCHASE_ORDER
  │
  ▼
onRefresh() → OCs aparecen en tab Compras
```

---

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `prisma/schema.prisma` | Modificar | Agregar `providerId String?` + `provider Provider?` + `@@index([providerId])` a `WorkOrderItem` |
| `prisma/migrations/` | Crear | Migración auto-generada por `prisma migrate dev` |
| `src/app/api/maintenance/work-orders/[id]/items/[itemId]/route.ts` | Modificar | Agregar `providerId` al Zod schema + `updateData` builder |
| `src/app/api/maintenance/work-orders/[id]/purchase-orders/route.ts` | Crear | POST handler: generar OCs agrupadas por proveedor |
| `src/app/api/maintenance/work-orders/route.ts` | Modificar | Aceptar `modality` + `globalProviderId` en POST, usarlos al crear WorkOrderItems |
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx` | Modificar | Agregar `providerId` + `provider { id, name }` al tipo `WorkOrder.workOrderItems[]` |
| `src/app/api/maintenance/work-orders/[id]/route.ts` | Modificar | Agregar `providerId: true, provider: { select: { id, name } }` al include de workOrderItems |
| `src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx` | Modificar | Agregar `modality` + `globalProviderId` al formSchema + UI del selector |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkItemRow.tsx` | Modificar | Agregar toggle modalidad + prop `providers` + prop `workOrderId` ya existe |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/TrabajosExternosTab.tsx` | Modificar | Fetch providers, checkbox global proveedor, pasar `providers` a WorkItemRow |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/TallerPropioTab.tsx` | Modificar | Pasar `workOrderId` a WorkItemRow (ya lo hace), agregar toggle via WorkItemRow |

---

## Interfaces / Contracts

### Schema — WorkOrderItem (delta)

```prisma
model WorkOrderItem {
  // ... campos existentes ...
  providerId String?
  provider   Provider? @relation(fields: [providerId], references: [id])
  // ... al final:
  @@index([providerId])  // AGREGAR
}
```

### PATCH /api/maintenance/work-orders/[id]/items/[itemId] (extensión)

```ts
// Zod schema — agregar campo:
const updateItemSchema = z.object({
  // ... campos existentes (itemSource, closureType, status, supplier, unitPrice, quantity) ...
  providerId: z.string().nullable().optional(),
})

// updateData builder — agregar:
if (updates.providerId !== undefined) {
  updateData.providerId = updates.providerId; // acepta string | null
}

// Response — agregar al return:
providerId: updatedItem.providerId,
provider: updatedItem.provider ? { id: updatedItem.provider.id, name: updatedItem.provider.name } : null,
// (requiere agregar provider al include de la query)
```

### POST /api/maintenance/work-orders/[id]/purchase-orders (nuevo)

```ts
// Request body
type GenerateOCBody = {
  itemIds: string[]
}

// Response 201
type GenerateOCResponse = Array<{
  id: string
  orderNumber: string
  providerId: string
  type: 'SERVICES' | 'PARTS'
  status: 'DRAFT'
  subtotal: number
  total: number
  items: Array<{ workOrderItemId: string; description: string; quantity: number; unitPrice: number }>
}>

// Errors
// 400: itemIds vacío, items sin providerId, items ya con OC activa
// 404: algún itemId no encontrado o no pertenece a la OT
```

### POST /api/maintenance/work-orders — payload extendido

```ts
// Body adicional (campos opcionales — no rompe OTs correctivas sin alertas)
type CreateWorkOrderBody = {
  // ... campos existentes ...
  modality?: 'INTERNAL' | 'EXTERNAL'        // default: 'INTERNAL'
  globalProviderId?: string                  // solo si modality=EXTERNAL
}
```

### WorkOrderItem type en page.tsx (extensión)

```ts
workOrderItems: Array<{
  // ... campos existentes ...
  providerId: string | null        // AGREGAR
  provider: {                      // AGREGAR
    id: string
    name: string
  } | null
}>
```

### WorkItemRow props (extensión)

```ts
type WorkItemRowProps = {
  workOrderId: string
  item: WorkOrderItemSummary  // con providerId + provider agregados
  currentUser: CurrentUser
  onRefresh: () => void
  showSubtasks?: boolean
  providers?: Array<{ id: string; name: string }>  // AGREGAR — lista para dropdown
}

// WorkOrderItemSummary — agregar campos:
type WorkOrderItemSummary = {
  // ... existentes ...
  providerId: string | null
  provider: { id: string; name: string } | null
  // hasActivePO: boolean  // derivado de purchaseOrderItems.length > 0, ver abajo
}
```

**Nota**: Para saber si un item ya tiene OC activa (bloquear toggle y checkbox),
el include en `[id]/route.ts` debe agregar:
```ts
purchaseOrderItems: { select: { id: true } }
```
Y en el tipo: `hasActivePurchaseOrder: boolean` (computado como `item.purchaseOrderItems.length > 0`).

---

## Testing Strategy

| Capa | Qué testear | Approach |
|------|-------------|----------|
| Unit | `orderNumber` generation no colisiona | Test con mock de count retornando N |
| Unit | Display fallback `provider.name ?? supplier ?? '—'` | Test de la función helper |
| Integration | PATCH con `providerId` actualiza el campo | Test con DB real, verificar row |
| Integration | POST purchase-orders crea OCs correctas agrupadas por provider | Test con 2 providers distintos |
| Integration | POST purchase-orders rechaza items sin `providerId` | Esperar 400 |
| Integration | POST purchase-orders rechaza items con OC activa | Esperar 400 |
| E2E | Wizard con "Taller Propio" → items en tab correcto | Playwright (si aplica) |

---

## Migration / Rollout

### Paso 1 — Schema migration
```bash
npx prisma migrate dev --name add_provider_to_work_order_item
```
La columna se agrega como `NULL` en todos los registros existentes — no hay downtime.

### Paso 2 — Deploy
Ningún cambio breaking. Los endpoints existentes siguen funcionando.
Los nuevos campos son opcionales en todos los contratos.

### Datos existentes
Items con `providerId = null` y `itemSource = null` se tratan como `INTERNAL_STOCK`
sin proveedor. El toggle les permite asignar modalidad y proveedor post-deploy.

---

## Open Questions

- [x] ¿El tipo de OC (SERVICES vs PARTS) debe inferirse del `mantItem.type` de los items,
      o mejor crear una OC mixta? → **RESUELTO**: Una sola OC por proveedor, mixta (servicios +
      repuestos juntos). Tipo: si todos los items son PART → `PARTS`, si hay al menos un SERVICE
      → `SERVICES`. Razón: la OC se envía por email al proveedor y se usa como base para
      validar la factura de compra (vía Claude Vision o pre-carga). Documentos sueltos = mala UX.
- [x] ¿`canExecuteWorkOrders` es el permiso correcto para el toggle de modalidad,
      o debería ser `canCreateWorkOrders`? → **RESUELTO**: Mantener `canExecuteWorkOrders`
      para consistencia con el route existente.
      Mantener consistencia con el route existente → usar `canExecuteWorkOrders`.
