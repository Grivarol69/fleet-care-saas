# Design: work-order-form-complete

## Technical Approach

Modificaciones quirúrgicas sobre 5 archivos existentes. Sin nuevas rutas, sin schema changes.
El backend tiene toda la lógica; los cambios son: reordenar lógica de transacción en la API,
agregar estados al FSM, y rediseñar el render del form.

---

## Architecture Decisions

| Decisión              | Elección                                                   | Descartado                           | Rationale                                                                    |
| --------------------- | ---------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| Separar renderers     | `renderServiceRow` + `renderPartRow` independientes        | mantener `renderItemRow` con if/else | Elimina `if arrayName === 'services'` disperso; cada renderer es limpio      |
| Origen en servicios   | `<Button>` toggle par (Taller / Externo)                   | `<Select>` actual                    | UX directa, 2 opciones → toggle es más rápido que dropdown                   |
| AddItemDialog         | Prop `mode: 'endpoint' \| 'form'` + `onItemAdded` callback | duplicar el componente               | Reutiliza toda la lógica de suggest+stock sin fork                           |
| Widget horas          | `useWatch` inline en el form                               | componente separado                  | Un solo nivel de prop-drilling; cálculo trivial no amerita extracción        |
| Ticket+OC en APPROVED | Mover bloque `$transaction` de PENDING_INVOICE a APPROVED  | nuevo endpoint                       | Mismo código, diferente trigger; idempotencia via `findFirst` existingTicket |

---

## Data Flow

### Flujo de creación de OT (nuevo)

```
UnifiedWorkOrderForm
  ├── renderServiceRow (Card vertical)
  │     ├── Badge toggle: INTERNAL_STOCK | EXTERNAL
  │     ├── "Cargar Despiece" → GET /tempario/lookup → form.setValue subTasks
  │     └── useWatch(services) → widget hrs est / hrs reales
  │
  ├── renderPartRow
  │     └── "Añadir Repuesto" → AddItemDialog(mode='form')
  │           ├── GET /vehicle-parts/suggest → sugerencia repuesto
  │           ├── GET /inventory/items → check stock → auto-itemSource
  │           └── onItemAdded(item) → partsArray.append(item)
  │
  └── onSubmit → POST /api/maintenance/work-orders (items unificados)
```

### Flujo de aprobación (nuevo)

```
WorkOrderHeader
  PENDING      → "Enviar a Aprobación" → PATCH {status: PENDING_APPROVAL}
  PENDING_APPROVAL → "Aprobar OT" → showApproveDialog
                       ↓ (preflight: warn si !technician)
                     PATCH {status: APPROVED}
                       ↓ response: { ticket, purchaseOrders[] }
                     if ticket → renderToBuffer(TicketPDF) → download
                     toast("X OC generadas")
  APPROVED     → "Iniciar Trabajo" → PATCH {status: IN_PROGRESS}
  IN_PROGRESS  → "Cerrar OT" → mileageDialog → PATCH {status: PENDING_INVOICE}
  PENDING_INVOICE → "Marcar Completada" → PATCH {status: COMPLETED}
```

### Handler APPROVED en API (nueva lógica)

```
PATCH [id] status=APPROVED
  └── $transaction
        ├── update WO status
        ├── load workOrderItems activos
        ├── for EXTERNAL/INTERNAL_PURCHASE items → create PurchaseOrders (group by providerId)
        ├── if technicianId && !existingTicket → create InternalWorkTicket
        └── return { workOrder, ticket?, purchaseOrders[], stockWarnings[] }

PATCH [id] status=PENDING_INVOICE  (simplificado)
  └── update WO: status, actualCost, endDate
      (ya no genera ticket ni OC)
```

---

## File Changes

| Archivo                                                                                    | Acción | Cambio principal                                                          |
| ------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------- |
| `src/app/api/maintenance/work-orders/[id]/route.ts`                                        | Modify | ALLOWED_TRANSITIONS + handler APPROVED + GET include subTasks + PUT guard |
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`                                  | Modify | Tipo WorkOrder.workOrderItems[].workOrderSubTasks                         |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx` | Modify | 4 nuevos handlers + renderActionButtons para 3 estados nuevos             |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx`   | Modify | prop mode + onItemAdded + fix tipos PartSuggestion                        |
| `src/components/maintenance/work-orders/UnifiedWorkOrderForm.tsx`                          | Modify | renderServiceRow/renderPartRow + eliminar manual inline + widget horas    |

---

## Interfaces / Contracts

```ts
// AddItemDialog — props extendidas
type AddItemDialogProps = {
  workOrderId: string;
  vehicleId: string;
  open: boolean;
  onClose: () => void;
  mode?: 'endpoint' | 'form'; // default: 'endpoint'
  onItemAdded?: (item: {
    // solo requerido si mode='form'
    mantItemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    itemSource: 'INTERNAL_STOCK' | 'EXTERNAL';
    providerId?: string | null;
    masterPartId?: string | null;
  }) => void;
};

// ALLOWED_TRANSITIONS (nuevo)
const ALLOWED_TRANSITIONS = {
  PENDING: {
    PENDING_APPROVAL: 'canExecuteWorkOrders',
    CANCELLED: 'canApproveWorkOrder',
  },
  PENDING_APPROVAL: {
    APPROVED: 'canApproveWorkOrder',
    REJECTED: 'canApproveWorkOrder',
  },
  APPROVED: { IN_PROGRESS: 'canExecuteWorkOrders' },
  IN_PROGRESS: {
    PENDING_INVOICE: 'canCloseWorkOrder',
    CANCELLED: 'canApproveWorkOrder',
  },
  PENDING_INVOICE: { COMPLETED: 'canCloseWorkOrder' },
};
```

---

## Testing Strategy

| Layer      | Qué probar                                                                                      | Approach                    |
| ---------- | ----------------------------------------------------------------------------------------------- | --------------------------- |
| Manual E2E | Flujo completo: crear OT → enviar aprobación → aprobar → verificar ticket+OC → iniciar → cerrar | Navegador con Neon develop  |
| Manual E2E | Editar OT con subtareas DONE → guardar → verificar que no se borraron                           | Prisma Studio antes/después |
| Manual UI  | Sección servicios: Card vertical visible, badge toggle Origen funciona                          | Visual review               |
| Manual UI  | Añadir repuesto via modal → verify suggest aparece para vehículo con KB                         | Visual review               |
| Type-check | `pnpm type-check` sin errores nuevos                                                            | CI                          |

---

## Migration / Rollout

No hay migración de DB. Las WOs existentes con PENDING_APPROVAL/APPROVED status legacy
son manejadas por el stepper (ya mostraba esos estados) pero sin botones de acción.
Post-deploy: esas WOs quedan "atascadas" — se puede hacer `UPDATE work_orders SET status='IN_PROGRESS' WHERE status='PENDING_APPROVAL' OR status='APPROVED'` si se requiere.

## Open Questions

- [ ] ¿El botón "Rechazar" en PENDING_APPROVAL debe pedir motivo (textarea) o es confirmación simple?
- [ ] ¿Las WOs legacy en PENDING_APPROVAL/APPROVED deben migrarse a IN_PROGRESS automáticamente en deploy?
