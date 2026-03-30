# Tasks: work-order-form-complete

## Phase 1: API — Safety, Transitions & Handler APPROVED

_Archivo: `src/app/api/maintenance/work-orders/[id]/route.ts`_

- [x] 1.1 GET handler: agregar `workOrderSubTasks: { orderBy: { sequence: 'asc' } }` en el include de `workOrderItems`
- [x] 1.2 PUT handler: en `tx.workOrderSubTask.deleteMany`, agregar `status: 'PENDING'` en el where clause (nunca borrar DONE/IN_PROGRESS)
- [x] 1.3 Reemplazar `ALLOWED_TRANSITIONS` completo: PENDING→PENDING_APPROVAL, PENDING_APPROVAL→{APPROVED,REJECTED}, APPROVED→IN_PROGRESS, IN_PROGRESS→PENDING_INVOICE, PENDING_INVOICE→COMPLETED
- [x] 1.4 Agregar case APPROVED: mover bloque `$transaction` (PO+ticket) desde PENDING_INVOICE; agregar guard `findFirst(internalWorkTicket)` para idempotencia; retornar `{ workOrder, ticket, purchaseOrders[], stockWarnings[] }`
- [x] 1.5 Simplificar case PENDING_INVOICE: solo `update status + actualCost + endDate`; eliminar generación de ticket y OC

## Phase 2: Tipos

_Archivo: `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`_

- [x] 2.1 Extender tipo local `WorkOrder.workOrderItems[]` para incluir `workOrderSubTasks?: Array<{ id, procedureId, temparioItemId, description, standardHours, directHours, status, sequence, notes }>`

## Phase 3: WorkOrderHeader — botones nuevos

_Archivo: `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx`_

- [x] 3.1 Agregar `handleSendToApproval()`: PATCH `{status: 'PENDING_APPROVAL'}`, sin dialog
- [x] 3.2 Agregar `handleReject()`: confirm dialog simple → PATCH `{status: 'REJECTED'}`
- [x] 3.3 Agregar `handleStartWork()`: PATCH `{status: 'IN_PROGRESS'}`, sin dialog
- [x] 3.4 Agregar `handleApprove()`: dialog con `<Alert variant="warning">` si `!workOrder.technician` → PATCH `{status: 'APPROVED'}` → si response.ticket: descargar PDF (misma lógica que `handleCloseToPendingInvoice`) → toast con count de OC generadas
- [x] 3.5 Modificar `renderActionButtons()`: agregar casos PENDING ("Enviar a Aprobación"), PENDING_APPROVAL ("Aprobar OT" primario + "Rechazar" destructive), APPROVED ("Iniciar Trabajo")

## Phase 4: AddItemDialog — modo form + fix tipos

_Archivo: `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog.tsx`_

- [x] 4.1 Eliminar `manufacturer` e `isRecommended` del tipo `PartSuggestion`; corregir render que accede a `sugg.masterPart.manufacturer`
- [x] 4.2 Agregar props `mode?: 'endpoint' | 'form'` (default: 'endpoint') y `onItemAdded?: (item: PartFormData) => void`
- [x] 4.3 Modificar handler de submit: si `mode === 'form'` → llamar `onItemAdded(item)` + `onClose()` + return (sin POST)

## Phase 5: UnifiedWorkOrderForm — rediseño completo

_Archivo: `src/components/maintenance/work-orders/UnifiedWorkOrderForm.tsx`_

- [x] 5.1 Eliminar `handleAddManualSubTask`, `handleRemoveSubTask` y el botón "Añadir Tarea Manual" del JSX
- [x] 5.2 Eliminar branch `else` del render de subTasks (líneas 278-300); dejar solo el branch `if t.temparioItemId` (texto readonly + badge horas)
- [x] 5.3 En `handleLoadTempario`: agregar guard `if (!selectedVehicle?.brandId)` con toast informativo; cambiar toast de 404 de `destructive` a `default`
- [x] 5.4 Crear `renderServiceRow(field, index)`: Card vertical — Línea 1: Select MantItem + Badge toggle Origen (2 botones: Taller/Externo) + Trash; Línea 2: Descripción + Cant + Precio; Línea 3 (si EXTERNAL): Select Proveedor; Línea 4: sección Despiece solo si INTERNAL_STOCK + type SERVICE/ACTION
- [x] 5.5 Crear `renderPartRow(field, index)`: Card simple — Descripción (readonly) + Cant + Precio + badge itemSource + Proveedor si EXTERNAL + Trash
- [x] 5.6 Agregar `useWatch({ control, name: 'services' })` → calcular `totalStdHours` y `totalDirectHours` → mostrar badges "Hrs Est" y "Hrs Reales" en CardHeader de Servicios (Reales: verde si ≥ Est, ámbar si menor, slate si 0)
- [x] 5.7 Agregar `[showAddPartDialog, setShowAddPartDialog]` → botón "Añadir Repuesto" abre `<AddItemDialog mode="form" vehicleId={...} onItemAdded={(item) => { partsArray.append(item); setShowAddPartDialog(false); }} />`
- [x] 5.8 Actualizar `CardContent` de servicios para usar `renderServiceRow`; actualizar `CardContent` de partes para usar `renderPartRow`

## Phase 6: Verificación E2E

- [ ] 6.1 Crear OT: servicios con Card vertical legible, badge toggle Origen funciona, Cargar Despiece inyecta subtareas
- [ ] 6.2 Añadir repuesto via modal: sugerencia automática aparece para vehículo con marca registrada; stock auto-switch funciona
- [ ] 6.3 Flujo de estados: PENDING → "Enviar a Aprobación" → PENDING_APPROVAL → "Aprobar OT" → PDF descarga + toast OC → APPROVED → "Iniciar Trabajo" → IN_PROGRESS
- [ ] 6.4 Cerrar OT: IN_PROGRESS → "Cerrar OT" → mileage → PENDING_INVOICE → "Marcar Completada" → COMPLETED
- [ ] 6.5 Editar OT con subtareas DONE → guardar (PUT) → verificar en Prisma Studio que subTasks DONE se preservaron
- [ ] 6.6 `pnpm type-check` sin errores nuevos
