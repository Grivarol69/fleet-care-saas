# Design: Work Order UX Redesign

## Technical Approach

Refactor exclusivo de capa UI. Sin migraciones de schema. La arquitectura de datos (WorkOrder → WorkOrderItem → SubTask/Tickets) ya soporta el rediseño — el problema es que la UI fragmenta información que el modelo tiene unificada.

Estrategia: reemplazar el shell de 5 tabs por uno de 3 tabs + header sticky, conservando la lógica de negocio existente (transitions, permissions) que ya está bien diseñada en `GeneralInfoTab.tsx` y `src/lib/permissions.ts`.

---

## Architecture Decisions

### Decision: Header extraído del GeneralInfoTab

**Choice**: Crear un componente `WorkOrderHeader` en el shell `page.tsx` que recibe `workOrder` + `currentUser` + `onUpdate`, y mueve ahí toda la lógica de `renderActionButtons()`.

**Alternatives considered**:

- Mantener acciones en GeneralInfoTab y agregar un mini-badge en el header del page → duplica estado de `currentUser`, causa desincronización.
- Levantar el fetch de `/api/auth/me` al page.tsx y pasar el user como prop a todos los tabs → correcto arquitectónicamente, y es lo que hacemos.

**Rationale**: `page.tsx` ya hace el fetch de `workOrder`. Agregar el fetch de `currentUser` ahí y pasarlo como prop elimina el fetch duplicado que hace `GeneralInfoTab` hoy. El header necesita ambos para renderizar las acciones correctas.

### Decision: Tab "Trabajo" como componente nuevo, no refactor de InternalWorkTab

**Choice**: Crear `WorkTab.tsx` desde cero. Los componentes `InternalWorkTab.tsx`, `ServicesTab.tsx` y `PartsTab.tsx` se mantienen en el repo pero se dejan de usar en `page.tsx`.

**Alternatives considered**:

- Refactorizar `InternalWorkTab.tsx` in-place → el componente ya tiene 3 responsabilidades mezcladas (items + subtasks + tickets). Refactorizarlo in-place crea un diff inmenso y dificulta el rollback.

**Rationale**: Un componente nuevo tiene diff limpio, es reversible (restaurar un import en page.tsx), y permite implementar la nueva UX sin el peso del código legacy. Los archivos viejos actúan como documentación viviente del comportamiento anterior.

### Decision: Clasificación de items por itemSource explícito en creación

**Choice**: El `AddItemDialog` ya tiene el campo `itemSource` en su Zod schema (`z.enum(['EXTERNAL', 'INTERNAL_STOCK'])`). Solo hay que asegurarse que siempre se envíe un valor y que el default sea consciente del destino elegido.

**Alternatives considered**:

- Agregar un campo `destination` separado al schema y mapear en el POST → innecesario, `itemSource` ya modela esto.

**Rationale**: El bug actual es de UI, no de schema. El usuario no tiene una UX clara para distinguir el destino al agregar un item (el label "Fuente / Origen" es confuso). La solución es rediseñar el selector con labels claros: "Taller Propio" / "Servicio Externo" / "Repuesto Externo", mapeando a `INTERNAL_STOCK` / `EXTERNAL` / `EXTERNAL`.

### Decision: WorkTab — secciones por `itemSource`, no por `mantItemType`

**Choice**: La única separación visual en WorkTab es `INTERNAL_STOCK` (Taller) vs `EXTERNAL` (Externos). Items con `itemSource = null` → tratados como `INTERNAL_STOCK`.

**Alternatives considered**:

- Separar por `mantItemType`: ACTION/SERVICE vs PART → crearía la misma fragmentación que hoy (el técnico debe saber si algo es una "acción" o un "servicio" para encontrarlo).

**Rationale**: Desde la perspectiva del operador, la pregunta relevante es "¿lo hace el taller o lo hace un proveedor?". El tipo del mantItem es un detalle de catálogo, no una dimensión de trabajo.

### Decision: Accordion de items con fetch por demanda (lazy)

**Choice**: Cada item en WorkTab renderiza un `Collapsible`. Al expandir, se hace el fetch de subtasks para ese item específico (`GET /subtasks?workOrderItemId=X`). No se pre-cargan todos los subtasks al montar el componente.

**Alternatives considered**:

- Cargar todos los subtasks al montar WorkTab (comportamiento actual de InternalWorkTab) → con muchos items, esto genera N+1 fetches innecesarios si el técnico solo trabaja en 1 item.

**Rationale**: Reduce la carga inicial del tab. La API de subtasks ya soporta filtros por `workOrderItemId`. Experiencia percibida: la expansión tiene un micro-loading de ~200ms que es aceptable.

**Excepción**: Si la OT tiene ≤ 5 items, cargar todos los subtasks al montar (optimización para el caso más común de talleres pequeños).

### Decision: CostsTab calcula totales en el cliente

**Choice**: `CostsTab.tsx` recibe los `internalWorkTickets`, `purchaseOrders`, y `workOrderExpenses` como props (pasados desde `page.tsx` que ya fetcha `workOrder` con todas sus relaciones), y calcula el total en el cliente con `reduce()`.

**Alternatives considered**:

- Agregar un endpoint `GET /api/maintenance/work-orders/:id/cost-summary` que devuelva el desglose → introduce una API nueva que no agrega valor, el cliente puede calcular esto.

**Rationale**: Todos los datos ya están disponibles en el fetch de `workOrder`. El endpoint actual incluye `workOrderExpenses` y puede incluir `internalWorkTickets` y POs con un `include` adicional en Prisma. Sin round-trip extra.

### Decision: "Mi Taller" usa el mismo endpoint de WOs con nuevo filtro

**Choice**: Agregar soporte para `?hasInternalWork=true&assignedToMe=true` en `GET /api/maintenance/work-orders`. El filtro `assignedToMe` usa el `userId` resuelto en el servidor desde la sesión Clerk, no desde el cliente.

**Alternatives considered**:

- Nuevo endpoint `GET /api/maintenance/taller` → duplica lógica de autenticación, multi-tenancy, paginación.

**Rationale**: El endpoint de WOs ya tiene toda la infraestructura de multi-tenancy via `tenantPrisma`. Agregar dos filtros opcionales es minimal. El filtro `assignedToMe=true` se resuelve en el servidor con `requireCurrentUser()`, sin exponer el userId en la URL.

### Decision: ActivityTab implementado como timeline simple sin modelo nuevo

**Choice**: El tab "Actividad" muestra los `approvals` de la OT (que ya existen en el modelo `WorkOrderApproval`) como cambios de estado, más un textarea para agregar una nota libre guardada como `WorkOrderExpense` con `expenseType = 'OTHER'` y `description` = comentario.

**Alternatives considered**:

- Nuevo modelo `WorkOrderComment` con migración → out of scope según propuesta.
- Leer de un audit log genérico → no existe en el proyecto.

**Rationale**: Los `approvals` ya registran quién cambió el estado y cuándo. Reutilizarlos como "eventos" en la timeline es cero costo. El hack de usar `WorkOrderExpense` para comentarios es temporal pero funcional y no requiere migración. Se puede migrar a un modelo propio en la siguiente iteración.

---

## Data Flow

### WorkOrderDetail Page — Flujo de datos completo

```
page.tsx (Server shell)
  │
  ├── fetch /api/auth/me            → currentUser (role, isSuperAdmin)
  ├── fetch /api/work-orders/:id    → workOrder (con includes completos)
  │     └── include: vehicle, technician, provider, workOrderItems,
  │                  workOrderExpenses, approvals, internalWorkTickets,
  │                  internalWorkTickets.laborEntries,
  │                  internalWorkTickets.partEntries
  │
  ├── WorkOrderHeader (sticky)
  │     ├── props: workOrder, currentUser, onUpdate
  │     └── renderiza: badge estado, vehicle, acción primaria contextual
  │
  ├── Tab "Trabajo" → WorkTab.tsx
  │     ├── props: workOrderId, workOrder.workOrderItems (filtrado), vehicleId
  │     ├── Sección Taller: items donde itemSource === 'INTERNAL_STOCK' || null
  │     │     └── Collapsible por item → lazy fetch subtasks on expand
  │     │           └── PATCH /subtasks/:id (inline edits, sin "Guardar")
  │     └── Sección Externos: items donde itemSource === 'EXTERNAL'
  │           └── Checkbox + "Generar OC" → POST /purchase-orders
  │
  ├── Tab "Compras & Costos" → CostsTab.tsx
  │     ├── props: workOrder (con expenses + tickets incluidos)
  │     ├── CostSummaryCard: calcula totales en cliente
  │     ├── Lista de OCs → GET /purchase-orders?workOrderId=:id
  │     └── ExpensesList + AddExpenseDialog → POST /maintenance/expenses
  │
  └── Tab "Actividad" → ActivityTab.tsx
        ├── props: workOrder.approvals, workOrderId
        ├── Timeline de approvals como eventos de estado
        └── Textarea comentario → POST /maintenance/expenses (type=OTHER, como workaround)
```

### Mi Taller Page — Flujo

```
/dashboard/maintenance/taller/page.tsx
  │
  ├── GET /api/maintenance/work-orders
  │     ?hasInternalWork=true
  │     &assignedToMe=true      (resuelto server-side)
  │     &status=IN_PROGRESS,PENDING,APPROVED
  │
  ├── TallerCard[] (grid de OTs)
  │     ├── vehicle plate, priority badge, technician
  │     ├── Progress: completedSubtasks / totalSubtasks
  │     └── Preview: primeras 3 subtasks PENDING
  │
  └── [click card] → TallerDetailPanel (slide-over inline)
        ├── Lista de items internos
        └── Por item: subtasks expandibles + PATCH status inline
```

---

## File Changes

| File                                                                                            | Action        | Description                                                                     |
| ----------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------- |
| `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`                                       | Modify        | Agrega fetch de currentUser, extrae header sticky, cambia a 3 tabs              |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx`      | Create        | Header sticky: badge estado, vehicle, técnico, acción primaria contextual       |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkTab.tsx`              | Create        | Tab "Trabajo" unificado: sección Taller + sección Externos                      |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkItemRow.tsx`          | Create        | Fila expandible de un WorkOrderItem con subtasks lazy-loaded                    |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/InternalTicketDialog.tsx` | Create        | Dialog rediseñado para crear ticket interno con horas por item                  |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/CostsTab.tsx`             | Create        | Tab "Compras & Costos" con resumen auto-calculado + OCs + gastos                |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/CostSummaryCard.tsx`      | Create        | Card de totales calculados en cliente                                           |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ActivityTab.tsx`          | Create        | Tab "Actividad" con timeline de approvals + comentarios                         |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/GeneralInfoTab.tsx`       | Modify        | Eliminar `renderActionButtons()` y el fetch de `/api/auth/me` (sube a page.tsx) |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx`        | Modify        | Labels más claros en selector itemSource; default basado en el tab activo       |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/InternalWorkTab.tsx`      | Keep (unused) | Se conserva para rollback, no se importa en page.tsx                            |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ServicesTab.tsx`          | Keep (unused) | Ídem                                                                            |
| `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/PartsTab.tsx`             | Keep (unused) | Ídem                                                                            |
| `src/app/dashboard/maintenance/taller/page.tsx`                                                 | Create        | Página "Mi Taller"                                                              |
| `src/app/dashboard/maintenance/taller/components/TallerCard.tsx`                                | Create        | Card de OT con progreso y preview de subtasks                                   |
| `src/app/dashboard/maintenance/taller/components/TallerDetailPanel.tsx`                         | Create        | Slide-over de ejecución inline                                                  |
| `src/app/api/maintenance/work-orders/route.ts`                                                  | Modify        | Agregar filtros `hasInternalWork` y `assignedToMe` al GET                       |
| `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`                                     | Modify        | Agregar "Mi Taller" como subItem de Mantenimiento                               |
| `src/lib/permissions.ts`                                                                        | Modify        | Agregar `canAccessTaller()` → TECHNICIAN, MANAGER, OWNER, SUPER_ADMIN           |

---

## Interfaces / Contracts

### WorkOrderHeader Props

```typescript
type WorkOrderHeaderProps = {
  workOrder: WorkOrderDetail;
  currentUser: { role: string; isSuperAdmin: boolean; id: string };
  onUpdate: (updates: Partial<WorkOrderDetail>) => Promise<void>;
  isTransitioning: boolean;
};
```

### WorkTab Props

```typescript
type WorkTabProps = {
  workOrderId: string;
  vehicleId: string;
  items: WorkOrderItemSummary[]; // pasado desde page para evitar re-fetch
  onRefresh: () => void;
};
```

### WorkItemRow Props

```typescript
type WorkItemRowProps = {
  workOrderId: string;
  item: WorkOrderItemSummary;
  isInternal: boolean; // determina qué sección mostrar al expandir
  onRefresh: () => void;
};

// Estado local del acordeón
type WorkItemRowState = {
  isOpen: boolean;
  subtasks: SubTask[] | null; // null = no cargados aún
  isLoadingSubtasks: boolean;
};
```

### CostsTab Props

```typescript
type CostsTabProps = {
  workOrder: WorkOrderDetail; // incluye tickets, expenses, purchaseOrders
  onRefresh: () => void;
};

// Calculado en cliente
type CostSummary = {
  laborTotal: number; // sum(ticket.totalLaborCost)
  partsTotal: number; // sum(ticket.totalPartsCost)
  externalTotal: number; // sum(purchaseOrder.totalAmount)
  expensesTotal: number; // sum(expense.amount)
  grandTotal: number;
};
```

### Nuevo filtro en GET /api/maintenance/work-orders

```typescript
// Query params adicionales
type WorkOrderFilters = {
  vehicleId?: string;
  status?: string;
  mantType?: string;
  limit?: number;
  // NUEVOS:
  hasInternalWork?: 'true' | 'false'; // filtra WOs con items INTERNAL_STOCK
  assignedToMe?: 'true' | 'false'; // filtra por technicianId = currentUser.id
};

// Prisma where adicional cuando hasInternalWork=true:
// workOrderItems: { some: { itemSource: 'INTERNAL_STOCK' } }

// Prisma where adicional cuando assignedToMe=true:
// technicianId: currentUser.id  (resuelto en el servidor)
```

### TallerCard Props

```typescript
type TallerCardProps = {
  workOrder: WorkOrderWithProgress;
  onSelect: (workOrderId: string) => void;
};

type WorkOrderWithProgress = WorkOrderSummary & {
  completedSubtasks: number;
  totalSubtasks: number;
  pendingSubtaskPreviews: { id: string; description: string }[];
};
```

---

## Testing Strategy

| Layer       | What to Test                                                          | Approach                                                       |
| ----------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Unit        | `CostSummaryCard`: cálculo de totales con datos mock                  | Jest con valores conocidos                                     |
| Unit        | Clasificación de items: `itemSource=null` → sección Taller            | Función pura testeable                                         |
| Unit        | `canAccessTaller()` en permissions.ts                                 | Jest con distintos roles                                       |
| Integration | `WorkOrderHeader`: botón correcto por estado + rol                    | Testing Library + mock de currentUser                          |
| Integration | `WorkItemRow`: lazy load de subtasks al expandir                      | Mock de fetch, verificar que subtasks = null antes de expandir |
| Integration | Filtro `assignedToMe` en el endpoint WOs                              | Verificar que TECHNICIAN solo ve sus WOs                       |
| E2E         | Flujo completo: agregar item interno → expandir → marcar subtask DONE | Playwright si existe config, manual QA si no                   |

---

## Migration / Rollout

No hay migración de base de datos.

**Orden de implementación**:

1. `WorkOrderHeader` + refactor de `page.tsx` (Fase 1 — foundation, reversible)
2. `WorkTab` + `WorkItemRow` + `InternalTicketDialog` (Fase 2 — core)
3. `CostsTab` + `CostSummaryCard` (Fase 3)
4. `ActivityTab` (Fase 4 — rápido, usa datos existentes)
5. `TallerCard` + `TallerDetailPanel` + endpoint filters + sidebar (Fase 5)

Cada fase es desplegable independientemente. La Fase 1 es compatible con los tabs viejos. Las Fases 2–4 reemplazan tabs en `page.tsx` pero el resto no cambia. La Fase 5 es aditiva (nueva ruta, nuevo sidebar item).

---

## Open Questions

- [ ] **Tickets internos y permisos de costos**: El `TECHNICIAN` no puede ver costos (`canViewCosts = false`). ¿Debe ver las horas y costos de labor en WorkTab, o solo las subtasks sin montos? → Decisión de producto antes de implementar WorkItemRow.
- [ ] **Comentarios en ActivityTab**: El workaround de usar `WorkOrderExpense` con `type=OTHER` para comentarios es funcional pero semánticamente incorrecto. ¿Acceptable para esta iteración o creamos `WorkOrderComment` con una migración simple (una sola tabla, 4 campos)?
- [ ] **Progreso en TallerCard**: El cálculo de `completedSubtasks/totalSubtasks` requiere un `_count` en la query. ¿Lo hacemos en el endpoint (eficiente) o en el cliente con un segundo fetch? → Se recomienda `_count` en el endpoint.
