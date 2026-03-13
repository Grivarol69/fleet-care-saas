# Tasks: Work Order UX Redesign

## Phase 1: Foundation — Tipos, permisos y API filter

- [ ] 1.1 Agregar `canAccessTaller()` en `src/lib/permissions.ts` → retorna true para TECHNICIAN, MANAGER, OWNER, SUPER_ADMIN
- [ ] 1.2 Agregar subItem "Mi Taller" con icono `Hammer` y href `/dashboard/maintenance/taller` en `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`, roles: SUPER_ADMIN, OWNER, MANAGER, TECHNICIAN
- [ ] 1.3 Modificar `src/app/api/maintenance/work-orders/route.ts` (GET handler): agregar soporte para query param `hasInternalWork=true` → `where: { workOrderItems: { some: { itemSource: 'INTERNAL_STOCK' } } }`
- [ ] 1.4 Modificar el mismo GET handler: agregar soporte para `assignedToMe=true` → resolver `technicianId = currentUser.id` server-side con `requireCurrentUser()`
- [ ] 1.5 Actualizar el tipo `WorkOrder` en `src/app/dashboard/maintenance/work-orders/[id]/page.tsx` para incluir `internalWorkTickets` (con `laborEntries`, `partEntries`) y `purchaseOrders` en el tipo y en el fetch
- [ ] 1.6 ~~Migración ya aplicada~~ Campo `notes String? @db.Text` agregado a `WorkOrder` (migración `20260310163841_add_work_order_notes`). Campo `WorkOrderItem.notes` ya existía. Exponer ambos campos en las UI correspondientes: campo `notes` de WO en `GeneralInfoTab` (o `WorkOrderHeader`), campo `notes` de WorkOrderItem en `WorkItemRow`

---

## Phase 2: Header Sticky — WorkOrderHeader

- [ ] 2.1 Crear `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkOrderHeader.tsx` con props: `workOrder`, `currentUser`, `onUpdate`, `isTransitioning`
- [ ] 2.2 Mover toda la función `renderActionButtons()` desde `GeneralInfoTab.tsx` al nuevo `WorkOrderHeader.tsx` (copiar lógica, no reinventar)
- [ ] 2.3 Mover las funciones helper `isManagerOrAbove()` y `canExecute()` a `WorkOrderHeader.tsx` (o importar desde `src/lib/permissions.ts` los equivalentes `canApproveWorkOrder`, `canExecuteWorkOrders`)
- [ ] 2.4 El header debe mostrar: título de OT, `Badge` de estado con colores del `statusConfig`, placa + marca + línea del vehículo, nombre del técnico (o "Sin asignar"), y los botones de acción
- [ ] 2.5 Agregar el input de kilometraje de cierre como `Dialog` disparado por el botón "Cerrar OT" (en vez de mostrarlo inline como hoy)
- [ ] 2.6 Modificar `src/app/dashboard/maintenance/work-orders/[id]/page.tsx`: elevar el fetch de `/api/auth/me` al nivel del page, pasar `currentUser` como prop a `WorkOrderHeader` y `GeneralInfoTab`
- [ ] 2.7 Integrar `WorkOrderHeader` en `page.tsx` con `position: sticky, top-0, z-10` — reemplaza el div de header actual
- [ ] 2.8 Limpiar `GeneralInfoTab.tsx`: eliminar el `useEffect` que fetcha `/api/auth/me`, eliminar `renderActionButtons()`, recibir `currentUser` como prop opcional (para evitar romper otros usos)

---

## Phase 3: Tab "Trabajo" — WorkTab + WorkItemRow

- [ ] 3.1 Crear `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkItemRow.tsx`: componente `Collapsible` para un WorkOrderItem. Props: `workOrderId`, `item`, `isInternal`, `onRefresh`. Al expandir → fetch lazy de `/api/maintenance/work-orders/:id/subtasks?workOrderItemId=:itemId`
- [ ] 3.2 En `WorkItemRow` (sección interna): renderizar lista de subtasks con checkbox de estado inline (PENDING → IN_PROGRESS → DONE), campo de horas directas editable con `onBlur` → PATCH, botón "Expandir Tempario" (disabled si ya tiene procedureId), botón "Agregar subtarea manual"
- [ ] 3.3 En `WorkItemRow` (sección externa): mostrar proveedor asignado (si existe), número de OC vinculada (si existe), badge `closureType`, checkbox para selección batch de OC
- [ ] 3.4 Verificar que el endpoint `GET /api/maintenance/work-orders/:id/subtasks` acepta filtro por `workOrderItemId` — si no lo acepta, agregarlo en `src/app/api/maintenance/work-orders/[id]/subtasks/route.ts`
- [ ] 3.5 Crear `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/InternalTicketDialog.tsx`: dialog rediseñado con lista de items pendientes, campo de horas por item (default: `standardHours` del tempario si existe, sino vacío), selector de técnico, validación que todos los items tengan horas > 0 antes de permitir confirmar
- [ ] 3.6 Crear `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/WorkTab.tsx`: recibe `workOrderId`, `vehicleId`, `items: WorkOrderItemSummary[]`, `onRefresh`. Renderiza dos secciones con `Separator` y header: "Taller Propio" (items donde `itemSource === 'INTERNAL_STOCK' || !itemSource`) y "Servicios & Repuestos Externos" (items donde `itemSource === 'EXTERNAL'`)
- [ ] 3.7 En `WorkTab`: integrar `WorkItemRow` para cada item. Integrar `InternalTicketDialog` para el botón "Crear Ticket". Integrar `AddItemDialog` con `itemSource` pre-seleccionado según la sección donde se clickea "Agregar"
- [ ] 3.8 Modificar `AddItemDialog.tsx`: cambiar labels del selector `itemSource` de "Fuente / Origen" a "Destino del trabajo" con opciones claras: "Taller Propio (interno)" / "Proveedor Externo (compra)". Agregar prop `defaultItemSource?: 'EXTERNAL' | 'INTERNAL_STOCK'` para pre-seleccionar según contexto

---

## Phase 4: Tab "Compras & Costos" — CostsTab

- [ ] 4.1 Crear `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/CostSummaryCard.tsx`: recibe `tickets`, `purchaseOrders`, `expenses`. Calcula con `reduce()`: `laborTotal`, `partsTotal`, `externalTotal`, `expensesTotal`, `grandTotal`. Renderiza 5 métricas en grid + total destacado
- [ ] 4.2 Crear `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/CostsTab.tsx`: recibe `workOrder` completo + `onRefresh`. Compone: `CostSummaryCard` arriba, luego sección "Órdenes de Compra" (lista de OCs vinculadas con estado y total), luego sección "Gastos Adicionales" (migración del `ExpensesTab` actual — se puede copiar la lógica directamente)
- [ ] 4.3 Agregar fetch de purchase orders vinculadas a la OT en `CostsTab` → `GET /api/purchase-orders?workOrderId=:id`
- [ ] 4.4 Verificar que el endpoint `GET /api/purchase-orders` acepta filtro por `workOrderId` — si no, agregarlo en `src/app/api/purchase-orders/route.ts`

---

## Phase 5: Tab "Actividad" — ActivityTab

- [ ] 5.1 Crear `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/ActivityTab.tsx`: recibe `workOrder.approvals` y `workOrderId`
- [ ] 5.2 Renderizar timeline cronológica: cada `WorkOrderApproval` como un evento con ícono de estado, texto "Cambió a [status]", nombre del usuario (si está disponible), y timestamp con `formatDistanceToNow`
- [ ] 5.3 Agregar bloque de creación de la OT como primer evento de la timeline (usando `workOrder.createdAt`)
- [ ] 5.4 Agregar `Textarea` + botón "Agregar nota" al final de la timeline → `POST /api/maintenance/expenses` con `expenseType: 'OTHER'`, `amount: 0`, `description: texto_del_usuario` como workaround temporal

---

## Phase 6: Ensamble final de page.tsx

- [ ] 6.1 Modificar `page.tsx`: reemplazar `TabsList` de 5 columnas por 3 columnas: "Trabajo" | "Compras & Costos" | "Actividad"
- [ ] 6.2 Reemplazar `<TabsContent value="taller-propio">` y eliminar los de "servicios-ext" y "parts" → agregar un solo `<TabsContent value="trabajo">` con `<WorkTab />`
- [ ] 6.3 Reemplazar `<TabsContent value="expenses">` → `<TabsContent value="costos">` con `<CostsTab />`
- [ ] 6.4 Agregar `<TabsContent value="actividad">` con `<ActivityTab />`
- [ ] 6.5 Mantener `<TabsContent value="general">` con `<GeneralInfoTab />` (ahora sin fetch de user, recibe prop `currentUser`)
- [ ] 6.6 Mover el defaultValue del Tabs a "trabajo" (los usuarios llegan directamente al trabajo, no a la info general)

---

## Phase 7: Página "Mi Taller"

- [ ] 7.1 Crear `src/app/dashboard/maintenance/taller/page.tsx`: server component que fetchea WOs con `?hasInternalWork=true&assignedToMe=true&status=IN_PROGRESS,PENDING,APPROVED`. Si el usuario es MANAGER/OWNER, omite `assignedToMe`. Incluir guard de rol con `canAccessTaller()`
- [ ] 7.2 Crear `src/app/dashboard/maintenance/taller/components/TallerCard.tsx`: card con placa (prominente, texto grande), marca + línea, título de OT, `Badge` de estado, `Badge` de prioridad, barra de progreso de subtasks (X/Y completadas), lista de hasta 3 subtasks pendientes como preview
- [ ] 7.3 Modificar el endpoint `GET /api/maintenance/work-orders` para incluir `_count` de subtasks (total y completadas) cuando `hasInternalWork=true`, para que TallerCard pueda mostrar el progreso sin un segundo fetch
- [ ] 7.4 Crear `src/app/dashboard/maintenance/taller/components/TallerDetailPanel.tsx`: slide-over (usa `Sheet` de shadcn) que muestra los items internos de la OT seleccionada con sus subtasks expandibles. Reutilizar `WorkItemRow` del Phase 3
- [ ] 7.5 Integrar el estado de "OT seleccionada" en `page.tsx` de taller con `useState<string | null>` y renderizar `TallerDetailPanel` condicionalmente
- [ ] 7.6 Agregar estado vacío en `taller/page.tsx`: si no hay WOs, mostrar mensaje "No tenés trabajo de taller pendiente" con enlace a `/dashboard/maintenance/work-orders`

---

## Phase 8: Verificación y type-check

- [ ] 8.1 Ejecutar `pnpm type-check` y corregir todos los errores TypeScript introducidos
- [ ] 8.2 Verificar spec scenario "Item externo nunca aparece en sección Taller": agregar un item con `itemSource='EXTERNAL'` y confirmar que NO aparece en la sección Taller de WorkTab
- [ ] 8.3 Verificar spec scenario "Header visible en todos los tabs": navegar entre los 3 tabs y confirmar que el header sticky y el botón de acción son visibles en todos
- [ ] 8.4 Verificar spec scenario "Técnico ve solo sus OTs": loguear como TECHNICIAN y navegar a "Mi Taller", confirmar que solo aparecen OTs asignadas a ese técnico
- [ ] 8.5 Verificar spec scenario "Ticket interno con horas reales": abrir `InternalTicketDialog`, confirmar que el campo de horas es editable por item y que no se puede confirmar con horas = 0
- [ ] 8.6 Verificar spec scenario "Costos auto-calculados": crear un ticket interno, navegar a "Compras & Costos" y confirmar que el total de labor se actualiza sin campo manual
- [ ] 8.7 Verificar que la generación de OC de servicios externos (flow existente) sigue funcionando desde la sección "Externos" de WorkTab — no debe haber regresión
- [ ] 8.8 Ejecutar `pnpm lint:fix` y resolver warnings ESLint en archivos nuevos
