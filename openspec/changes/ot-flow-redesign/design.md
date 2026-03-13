# Design: OT Flow Redesign

## Technical Approach

Reorganización pura de frontend. El backend ya devuelve todos los datos necesarios via
`GET /api/maintenance/work-orders/[id]`. No se agregan endpoints ni se toca Prisma.

La estrategia es:
1. Dividir `WorkTab.tsx` en dos componentes separados (Fase A provee el slot, Fases B+C rellenan)
2. Renombrar y ampliar `CostsTab.tsx` → `ComprasTab.tsx` (Fase C)
3. Crear dos vistas nuevas: `ResumenTab.tsx` (extrae de `GeneralInfoTab`) y `CierreTab.tsx` (nueva)
4. Simplificar `WorkItemRow.tsx` y mejorar `AddItemDialog.tsx` sin cambiar la API

Todas las modificaciones son en
`src/app/dashboard/maintenance/work-orders/[id]/page.tsx` y su carpeta de componentes.

---

## Architecture Decisions

### Decision: Props pattern — workOrder completo por tab

**Choice**: Cada tab recibe `workOrder: WorkOrder`, `currentUser: CurrentUser`, `onRefresh: () => void`
como props planas, igual al patrón actual.

**Alternatives considered**: Context API / Zustand store compartido.

**Rationale**: El patrón actual funciona y es consistente en todos los tabs existentes. No hay
problema de prop drilling dado que el árbol es page → tab (2 niveles). Cambiar a Context
agregaría complejidad sin beneficio real a este nivel.

---

### Decision: CierreTab calcula costos en cliente desde props

**Choice**: `CierreTab.tsx` computa los totales client-side a partir del objeto `workOrder`
recibido por props, reutilizando la lógica de `CostSummaryCard.tsx`.

**Alternatives considered**: Endpoint dedicado `GET /work-orders/[id]/summary`.

**Rationale**: El objeto `workOrder` ya tiene todos los datos necesarios:
`workOrderItems[].totalCost`, `workOrderExpenses[].amount`, `purchaseOrders[].totalAmount`.
Un endpoint nuevo sería duplicar lógica sin ganancia. Si en el futuro se necesita snapshot
inmutable del costo al cierre, se agrega un endpoint entonces.

**Nota importante**: `CostSummaryCard` usa `workOrder.expenses` pero el tipo en `[id]/page.tsx`
define `workOrderExpenses`. Al escribir `CierreTab` y `ComprasTab`, usar `workOrderExpenses`
(nombre correcto del campo). Ver sección Interfaces.

---

### Decision: AddItemDialog — reemplazar Input+Select por Combobox unificado

**Choice**: Reemplazar el patrón actual (Input de búsqueda separado + Select de selección)
por un único `Command` + `Popover` de shadcn/ui. La lógica de fetch debounced existente
(useEffect con setTimeout 300ms → `/api/maintenance/mant-items?search=...`) se mantiene
igual, solo cambia el control de UI.

**Alternatives considered**: Mantener el Input+Select actual.

**Rationale**: El diálogo actual tiene dos controles separados que hacen la misma función.
El operador escribe en el Input pero selecciona en el Select — dos interacciones para
una sola acción. El Combobox (pattern Command+Popover ya usado en WorkOrderCreateWizard)
unifica búsqueda y selección en un solo control. La lógica de fetch no cambia.

**Referencia del patrón existente**: `src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx`
usa exactamente este patrón para la selección de vehículo.

---

### Decision: No crear ResumenTab desde cero — extraer de GeneralInfoTab

**Choice**: `ResumenTab.tsx` toma el contenido actual de `GeneralInfoTab.tsx` (estado, vehículo,
responsables, fechas, alertas, notas) y le agrega el mini-panel de métricas (`CostSummaryCard`
ya existe). `GeneralInfoTab.tsx` se simplifica eliminando solo el campo `actualCost`.

**Alternatives considered**: Crear ResumenTab completamente nuevo, depreciando GeneralInfoTab.

**Rationale**: `GeneralInfoTab.tsx` ya tiene toda la info de Resumen bien implementada (edit,
save, validaciones). Copiar o reutilizar es más seguro que reescribir. Lo único que se
elimina es el campo `actualCost` editable. El componente puede renombrarse o simplemente
el page.tsx puede seguir importando `GeneralInfoTab` con el label de tab cambiado a "Resumen".

---

### Decision: WorkItemRow — eliminar auto-expand, no el componente

**Choice**: Modificar solo `handleToggle` en `WorkItemRow.tsx` para remover el bloque
`axios.post('/subtasks/expand')`. El resto del componente queda igual.

**Alternatives considered**: Reescribir el componente completo.

**Rationale**: El componente funciona bien. El problema es específico: 5 líneas de código
en `handleToggle`. Minimizar el scope de cambio reduce riesgo.

Código a remover del `handleToggle`:
```typescript
// REMOVER este bloque completo (líneas ~131-151 de WorkItemRow.tsx):
try {
  const expandRes = await axios.post(
    `/api/maintenance/work-orders/${workOrderId}/subtasks/expand`,
    { workOrderItemId: item.id }
  );
  if (expandRes.status === 201) { ... toast ... }
  setNoRecipe(false);
} catch (error: any) {
  if (error.response?.status === 404) { setNoRecipe(true); }
  else if (error.response?.status === 409) { setNoRecipe(false); }
}
```
También remover: `const [noRecipe, setNoRecipe] = useState(false);` y el uso de `noRecipe`
en el mensaje del estado vacío.

---

### Decision: ComprasTab como archivo nuevo (no rename de CostsTab)

**Choice**: Crear `ComprasTab.tsx` nuevo. Mantener `CostsTab.tsx` sin cambios hasta que
`ComprasTab` sea verificado. Luego eliminar `CostsTab.tsx`.

**Rationale**: Rename seguro. Si Fase C falla, `CostsTab` sigue siendo importable en `[id]/page.tsx`
como fallback. Una vez `ComprasTab` verificado, se elimina `CostsTab`.

`ComprasTab.tsx` importa `ExpensesTab.tsx` (sin cambios) para gastos adicionales, igual que
`CostsTab.tsx` lo hacía.

---

## Data Flow

```
[id]/page.tsx
│  GET /api/maintenance/work-orders/{id}  (fetch on mount + onRefresh)
│  GET /api/auth/me  (currentUser)
│  state: workOrder, currentUser
│
├── <WorkOrderHeader workOrder onUpdate onDelete />   (sin cambios)
│
└── <Tabs defaultValue="resumen">
    │
    ├── ResumenTab (workOrder, currentUser, onRefresh, onUpdate)
    │   ├── mini-panel: métricas calculadas desde workOrder
    │   └── <CostSummaryCard workOrder currentUser />  (reutilizado)
    │
    ├── TallerPropioTab (workOrder, currentUser, onRefresh)
    │   ├── items = workOrder.workOrderItems.filter(i => i.itemSource !== 'EXTERNAL')
    │   ├── <WorkItemRow /> x N  (modificado: sin auto-expand)
    │   ├── <AddItemDialog defaultItemSource="INTERNAL_STOCK" />  (modificado: combobox)
    │   └── <InternalTicketDialog />  (sin cambios)
    │
    ├── TrabajosExternosTab (workOrder, currentUser, onRefresh)
    │   ├── services = workOrder.workOrderItems.filter(EXTERNAL + SERVICE)
    │   ├── parts = workOrder.workOrderItems.filter(EXTERNAL + PART)
    │   ├── selectedExternalIds: string[]  (estado local)
    │   ├── handleGenerateOC → POST /purchase-orders
    │   └── <AddItemDialog defaultItemSource="EXTERNAL" />
    │
    ├── ComprasTab (workOrder, currentUser, onRefresh)
    │   ├── purchaseOrders = workOrder.purchaseOrders
    │   ├── invoices = workOrder.invoices
    │   ├── <ExpensesTab />  (sin cambios, mismo import)
    │   └── totals: comprometido / facturado / pendiente
    │
    ├── CierreTab (workOrder, currentUser, onRefresh)
    │   ├── costos calculados client-side desde workOrder
    │   ├── blockers calculados desde items.status + purchaseOrders.status
    │   ├── canClose = blockers.length === 0
    │   └── handleClose → PATCH /work-orders/{id} { status: 'COMPLETED', completionMileage }
    │
    └── ActivityTab (sin cambios)
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx` | Modify | 4 tabs → 6 tabs; importar nuevos componentes; defaultValue="resumen" |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ResumenTab.tsx` | Create | Extrae contenido de GeneralInfoTab + mini-panel métricas + CostSummaryCard |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/TallerPropioTab.tsx` | Create | Sección interna de WorkTab + InternalTicketDialog |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/TrabajosExternosTab.tsx` | Create | Sección externa de WorkTab + lógica OC (selectedExternalIds + handleGenerateOC) |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ComprasTab.tsx` | Create | Rename/expand de CostsTab: OCs + invoices + ExpensesTab + totals |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/CierreTab.tsx` | Create | Vista auditoría: desglose costos calculados + checklist bloqueantes + botón cerrar |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkItemRow.tsx` | Modify | Remover bloque auto-expand + noRecipe state; actualizar mensaje estado vacío |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx` | Modify | Reemplazar Input+Select por Command+Popover combobox para búsqueda de MantItem |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/GeneralInfoTab.tsx` | Modify | Eliminar campo actualCost editable del formulario (formData + handleSave + JSX) |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/CostsTab.tsx` | Delete (post-verify) | Reemplazado por ComprasTab. No eliminar hasta que Fase C sea verificada |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkTab.tsx` | Delete (post-verify) | Reemplazado por TallerPropioTab + TrabajosExternosTab. No eliminar hasta Fase B+C verificadas |

**Sin cambios** (no tocar):
- `ActivityTab.tsx`, `WorkOrderHeader.tsx`, `WorkOrdersList.tsx`
- `InternalTicketDialog.tsx`, `InternalTicketSummaryModal.tsx`
- `TemparioPickerModal.tsx`, `ExpensesTab.tsx`, `CostSummaryCard.tsx`
- `HistoryTab.tsx`, `PurchaseOrdersTab.tsx`, `ServicesTab.tsx`, `PartsTab.tsx`

---

## Interfaces / Contracts

### WorkOrder type (sin cambios al tipo, pero notar campo correcto)

```typescript
// [id]/page.tsx ya define:
workOrderExpenses: Array<{
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  expenseType: string;
  status: string;
  vendor: string | null;
  invoiceNumber: string | null;
}>;

// NOTA: CostSummaryCard usa workOrder.expenses (incorrecto).
// Al crear ComprasTab y CierreTab, usar workOrder.workOrderExpenses (correcto).
// CostSummaryCard.tsx se puede dejar con el bug ya que es un componente que será
// reemplazado funcionalmente por la lógica inline de CierreTab.
```

### Props de nuevos componentes

```typescript
// Todos los tabs nuevos usan el mismo contrato:
type TabProps = {
  workOrder: WorkOrder;       // tipo definido en [id]/page.tsx
  currentUser: CurrentUser;   // { id, role, isSuperAdmin }
  onRefresh: () => void;
};

// ResumenTab agrega onUpdate (igual que GeneralInfoTab):
type ResumenTabProps = TabProps & {
  onUpdate: (updates: Partial<WorkOrder>) => Promise<void>;
};
```

### CierreTab — cálculo de costos

```typescript
// Lógica de cálculo en CierreTab (client-side, sin API):

const items = workOrder.workOrderItems || [];
const expenses = workOrder.workOrderExpenses || [];
const purchaseOrders = workOrder.purchaseOrders || [];

const totalLaborInterna = items
  .filter(i => i.itemSource === 'INTERNAL_STOCK' && i.mantItem.type === 'SERVICE')
  .reduce((acc, i) => acc + (i.totalCost || 0), 0);

const totalRepuestosInternos = items
  .filter(i => i.itemSource === 'INTERNAL_STOCK' && i.mantItem.type === 'PART')
  .reduce((acc, i) => acc + (i.totalCost || 0), 0);

const totalServiciosExternos = items
  .filter(i => i.itemSource === 'EXTERNAL' && i.mantItem.type === 'SERVICE')
  .reduce((acc, i) => acc + (i.totalCost || 0), 0);

const totalRepuestosExternos = items
  .filter(i => i.itemSource === 'EXTERNAL' && i.mantItem.type === 'PART')
  .reduce((acc, i) => acc + (i.totalCost || 0), 0);

const totalGastos = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

const costoRealTotal = totalLaborInterna + totalRepuestosInternos
  + totalServiciosExternos + totalRepuestosExternos + totalGastos;
```

### CierreTab — checklist de bloqueantes

```typescript
type ClosureBlocker = {
  message: string;
  type: 'item' | 'purchase_order' | 'subtask';
};

const blockers: ClosureBlocker[] = [
  // Ítems sin completar
  ...items
    .filter(i => !['COMPLETED', 'CANCELLED'].includes(i.status))
    .map(i => ({
      message: `Ítem "${i.mantItem.name}" está ${i.status === 'PENDING' ? 'pendiente' : 'en progreso'}`,
      type: 'item' as const,
    })),
  // OCs sin factura
  ...purchaseOrders
    .filter(po => !['INVOICED', 'CANCELLED'].includes(po.status))
    .map(po => ({
      message: `OC ${po.orderNumber} no tiene factura vinculada (${po.status})`,
      type: 'purchase_order' as const,
    })),
];

const canClose = blockers.length === 0;
// Roles que pueden cerrar: ['OWNER', 'MANAGER', 'SUPERVISOR', 'SUPER_ADMIN']
const canUserClose = ['OWNER', 'MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'].includes(currentUser.role)
  || currentUser.isSuperAdmin;
```

### AddItemDialog — Combobox pattern

```typescript
// Reemplazar el par Input+Select existente por:
// 1. Un <Popover> que contiene un <Command>
// 2. El trigger muestra el ítem seleccionado o "Buscar servicio..."
// 3. Dentro del Command: <CommandInput> para búsqueda + <CommandList> con resultados
// 4. La lógica de fetch debounced se mantiene igual (searchQuery, items state)
// 5. Al seleccionar item del Command: form.setValue('mantItemId', item.id)

// Patrón de referencia: WorkOrderCreateWizard.tsx (vehicle selection combobox)
// Los estados existentes searchQuery + items[] se reutilizan sin cambios.
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Cálculo de costos en CierreTab | Test puro: dado workOrder mock con items y expenses, verificar que los totales son correctos |
| Unit | Lógica de blockers en CierreTab | Test puro: dado items con status PENDING, verificar que canClose = false |
| Unit | Filtro de items en TallerPropioTab | Dado workOrder con items mixed, verificar que solo aparecen INTERNAL |
| Integration | AddItemDialog con combobox | Verificar que al seleccionar item del combobox se populan price y description |
| E2E manual | Flujo completo: agregar ítem → completar → ver en Cierre | QA manual post-implementación |

Los tests existentes en `__tests__/` no son afectados (testean la API, no la UI).

---

## Migration / Rollout

No hay migración de datos ni cambios de schema.

**Rollout por fases con backward compatibility:**

- **Fase A** (page.tsx + ResumenTab): el slot "Información General" se renombra a "Resumen".
  Si algo falla, revertir solo `[id]/page.tsx` via git.

- **Fases B+C** (TallerPropioTab + TrabajosExternosTab + ComprasTab): los componentes originales
  `WorkTab` y `CostsTab` se mantienen en el repo hasta verificación. Si algo falla en B o C,
  se puede volver a importar el componente original en `[id]/page.tsx` sin tocar la DB.

- **Fase D** (CierreTab): nuevo tab. Si falla, se elimina del array de tabs en `[id]/page.tsx`.
  No afecta los demás tabs.

---

## Parallel Work Assignment

```
Fase A (GEMINI — bloqueante):
  - [id]/page.tsx: 4 tabs → 6 tabs
  - ResumenTab.tsx: nuevo (extrae de GeneralInfoTab + agrega CostSummaryCard)
  - GeneralInfoTab.tsx: eliminar campo actualCost

  Entrega: page.tsx compilando con 6 tabs (B,C,D pueden ser stubs vacíos)

                    ↓ (Fase A completa)

Fase B (GEMINI)                          Fase C (CODEX)
  TallerPropioTab.tsx (nuevo)              TrabajosExternosTab.tsx (nuevo)
  WorkItemRow.tsx (mod: sin auto-expand)   ComprasTab.tsx (nuevo)
  AddItemDialog.tsx (mod: combobox)

  Archivos exclusivos de B:               Archivos exclusivos de C:
  - TallerPropioTab.tsx                   - TrabajosExternosTab.tsx
  - WorkItemRow.tsx                       - ComprasTab.tsx
  - AddItemDialog.tsx

  SIN SUPERPOSICIÓN → pueden correr en paralelo

                    ↓ (Fases B+C completas)

Fase D (GEMINI):
  - CierreTab.tsx (nuevo)
```

---

## Open Questions

- [ ] `CostSummaryCard.tsx` usa `workOrder.expenses` pero el tipo tiene `workOrderExpenses`.
  ¿Renombrar en el tipo o en CostSummaryCard? (Bajo impacto — solo afecta el componente.
  Recomendación: corregir en CostSummaryCard como parte de Fase A ya que ResumenTab lo reutiliza)

- [ ] El tipo `purchaseOrders` en `[id]/page.tsx` no incluye `provider`. La tabla de OCs en
  `CostsTab` ya muestra `oc.provider?.name` — eso implica que el API devuelve más data de la
  que el tipo declara. Verificar con el endpoint antes de que Gemini escriba ComprasTab.
  Si el endpoint no devuelve provider, el display de proveedor en ComprasTab mostrará "N/A".
