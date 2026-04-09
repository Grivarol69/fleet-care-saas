# Tasks: OT Flow Redesign

## Convención de fases

```
Fase A (GEMINI) → Bloqueante. B, C y D no pueden empezar hasta que A compile.
Fase B (GEMINI) + Fase C (CODEX) → Paralelas. Sin superposición de archivos.
Fase D (GEMINI) → Después de B+C.
Fase E → Cleanup final (cualquier worker).
```

---

## Fase A — Estructura: 6 tabs + ResumenTab (GEMINI)

> Archivos tocados: `[id]/page.tsx`, `ResumenTab.tsx` (nuevo), `GeneralInfoTab.tsx`, `CostSummaryCard.tsx`
> Al terminar: el proyecto DEBE compilar. Los tabs B/C/D pueden ser stubs con `<p>TODO</p>`.

- [ ] A.1 — `CostSummaryCard.tsx`: corregir bug de campo — cambiar `workOrder.expenses` → `workOrder.workOrderExpenses` en todos los `reduce` (líneas ~51-54). El tipo correcto es `workOrderExpenses: Array<{amount: number, ...}>` definido en `[id]/page.tsx`.

- [ ] A.2 — Crear `ResumenTab.tsx` extrayendo contenido de `GeneralInfoTab.tsx`:
  - Props: `{ workOrder, currentUser, onRefresh, onUpdate }`
  - Incluir: todas las secciones actuales de `GeneralInfoTab` (estado, edición de título/descripción/notas/prioridad/centro-de-costos, vehículo, responsables, fechas, alertas de mantenimiento)
  - Agregar encima de todo: mini-panel de 4 métricas en un `grid grid-cols-4`:
    1. "Costo Acumulado": calcular igual que `CostSummaryCard.grandTotal` (suma de todos los items + expenses)
    2. "Ítems": `{completados}/{total}` donde completados = items con status COMPLETED o CANCELLED
    3. "OCs pendientes": count de `workOrder.purchaseOrders` con status != 'INVOICED' y != 'CANCELLED'
    4. "Estado cierre": "Listo para cerrar" (verde) si no hay OCs pendientes ni ítems activos, sino "Pendiente" (amarillo)
  - Agregar debajo del mini-panel: `<CostSummaryCard workOrder={workOrder} currentUser={currentUser} />`
  - El componente `<GeneralInfoTab>` puede quedar en el repo — no eliminarlo todavía.

- [ ] A.3 — `GeneralInfoTab.tsx`: eliminar el campo `actualCost` del formulario:
  - Remover `actualCost: workOrder.actualCost?.toString() || ''` de `formData` (defaultValues)
  - Remover el bloque de `actualCost` en `handleSave` (líneas ~149-151: `if (formData.actualCost) { updates.actualCost = ... }`)
  - Remover la Card "Costos" completa del JSX (líneas ~431-470, la Card con `<DollarSign>` que muestra "Costo Estimado" y "Costo Real")
  - El componente `GeneralInfoTab` seguirá existiendo pero sin el campo de costos manual.

- [ ] A.4 — `[id]/page.tsx`: reestructurar de 4 tabs a 6 tabs:
  - Agregar imports: `ResumenTab`, `TallerPropioTab`, `TrabajosExternosTab`, `ComprasTab`, `CierreTab`
  - Para los tabs que aún no existen (TallerPropioTab, TrabajosExternosTab, ComprasTab, CierreTab): crear archivos stub mínimos en la misma carpeta `WorkOrderDetail/` con `export function XTab() { return <p>TODO</p>; }` — suficiente para que compile.
  - Cambiar `<Tabs defaultValue="work">` → `<Tabs defaultValue="resumen">`
  - Cambiar `<TabsList className="grid w-full grid-cols-4">` → `grid-cols-6`
  - Reemplazar los 4 TabsTrigger por 6: `resumen | taller | externos | compras | cierre | actividad`
  - Reemplazar los TabsContent:
    - `value="resumen"` → `<ResumenTab workOrder={workOrder} currentUser={currentUser} onRefresh={fetchWorkOrder} onUpdate={handleUpdate} />`
    - `value="taller"` → `<TallerPropioTab workOrder={workOrder} currentUser={currentUser} onRefresh={fetchWorkOrder} />`
    - `value="externos"` → `<TrabajosExternosTab workOrder={workOrder} currentUser={currentUser} onRefresh={fetchWorkOrder} />`
    - `value="compras"` → `<ComprasTab workOrder={workOrder} currentUser={currentUser} onRefresh={fetchWorkOrder} />`
    - `value="cierre"` → `<CierreTab workOrder={workOrder} currentUser={currentUser} onRefresh={fetchWorkOrder} />`
    - `value="actividad"` → sin cambios (igual que antes)
  - Eliminar el import de `WorkTab` (ya no se usa)

- [ ] A.5 — Verificar que `pnpm type-check` pasa sin errores nuevos. Corregir cualquier error de tipos introducido en A.1-A.4.

---

## Fase B — Tab Taller Propio + WorkItemRow + AddItemDialog (GEMINI)

> Prerequisito: Fase A completada y compilando.
> Archivos exclusivos: `TallerPropioTab.tsx`, `WorkItemRow.tsx`, `AddItemDialog.tsx`
> Puede correr EN PARALELO con Fase C.

- [ ] B.1 — Crear `TallerPropioTab.tsx` extrayendo la sección interna de `WorkTab.tsx`:
  - Props: `{ workOrder, currentUser, onRefresh }`
  - Estado local: `isAddDialogOpen`, `isTicketDialogOpen` (igual que WorkTab pero solo para internos)
  - `internalItems = workOrder.workOrderItems.filter(i => i.itemSource !== 'EXTERNAL')`
  - `pendingInternal = internalItems.filter(i => i.closureType === 'PENDING')`
  - Header con ícono `<Wrench>` azul, título "Taller Propio", botones: "Generar Ticket ({count})" + "Nuevo Trabajo"
  - Botón "Nuevo Trabajo" abre `<AddItemDialog type="SERVICE" defaultItemSource="INTERNAL_STOCK" />`
  - Lista de ítems: mapear `internalItems` → `<WorkItemRow>` (igual que WorkTab sección interna)
  - Estado vacío: `<div className="py-10 text-center border-2 border-dashed...">No hay trabajos internos registrados.</div>`
  - Al final: `<InternalTicketDialog workOrderId={workOrder.id} pendingItems={pendingInternal} .../>`

- [ ] B.2 — `WorkItemRow.tsx`: eliminar lógica de auto-expansión de tempario:
  - Eliminar `const [noRecipe, setNoRecipe] = useState(false);`
  - En `handleToggle(open: boolean)`: eliminar el bloque `try { const expandRes = await axios.post('/subtasks/expand', ...) ... } catch ...` completo. Solo debe quedar `setIsOpen(open); if (open) { fetchSubtasks(); }`
  - En la celda de estado vacío de la tabla (línea ~299): cambiar el texto de `No hay subtareas. {noRecipe ? 'Carga desde el tempario o agrega manualmente.' : 'Intentando cargar tempario...'}` → `Sin subtareas. Agregá desde el Tempario o manualmente.`
  - Renombrar botón "Cargar Subtarea" (línea ~276) → "Agregar desde Tempario"
  - Eliminar import de `noRecipe` (ya no se usa)

- [ ] B.3 — `AddItemDialog.tsx`: reemplazar el par Input+Select de búsqueda por un Combobox:
  - Agregar imports de shadcn: `Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList` desde `@/components/ui/command` y `Popover, PopoverContent, PopoverTrigger` desde `@/components/ui/popover`
  - Agregar estado: `const [comboOpen, setComboOpen] = useState(false);`
  - Reemplazar la sección "Item Search" (el `<div className="space-y-2">` con el Input de búsqueda + el `<FormField name="mantItemId">` con Select) por:
    ```jsx
    <FormField control={form.control} name="mantItemId" render={({ field }) => (
      <FormItem>
        <FormLabel>Buscar {type === 'SERVICE' ? 'Servicio' : 'Repuesto'}</FormLabel>
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <FormControl>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                {field.value
                  ? items.find(i => i.id.toString() === field.value)?.name ?? 'Seleccionar...'
                  : 'Buscar y seleccionar...'}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Escribir para filtrar..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>Sin resultados.</CommandEmpty>
                <CommandGroup>
                  {items.slice(0, 50).map(item => (
                    <CommandItem key={item.id} value={item.id.toString()}
                      onSelect={(val) => { form.setValue('mantItemId', val); setComboOpen(false); }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${field.value === item.id.toString() ? 'opacity-100' : 'opacity-0'}`} />
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <FormMessage />
      </FormItem>
    )} />
    ```
  - El estado `searchQuery`, el `useEffect` de fetch debounced y el estado `items` se mantienen sin cambios — solo cambia el control visual.
  - Eliminar el import de `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` si ya no se usan en otro lugar del archivo (verificar: el `itemSource` Select y el `providerId` Select siguen usándolo, NO eliminar).

- [ ] B.4 — Verificar que `pnpm type-check` pasa para los 3 archivos de Fase B.

---

## Fase C — Tab Trabajos Externos + ComprasTab (CODEX)

> Prerequisito: Fase A completada y compilando.
> Archivos exclusivos: `TrabajosExternosTab.tsx`, `ComprasTab.tsx`
> Puede correr EN PARALELO con Fase B.

- [ ] C.1 — Crear `TrabajosExternosTab.tsx` extrayendo la sección externa de `WorkTab.tsx`:
  - Props: `{ workOrder, currentUser, onRefresh }`
  - Estado local: `selectedExternalIds: string[]`, `isGeneratingOC: boolean`, `isAddDialogOpen: boolean`, `addType: 'SERVICE' | 'PART'`
  - `externalItems = workOrder.workOrderItems.filter(i => i.itemSource === 'EXTERNAL')`
  - `serviceItems = externalItems.filter(i => i.mantItem.type === 'SERVICE')`
  - `partItems = externalItems.filter(i => i.mantItem.type === 'PART')`
  - Función `handleGenerateOC`: igual que en `WorkTab.tsx` (POST a `/api/maintenance/work-orders/${workOrder.id}/purchase-orders` con `{ itemIds: selectedExternalIds }`)
  - Header general con botón "Generar OC ({count})" habilitado solo cuando `selectedExternalIds.length > 0`
  - **Sub-sección "Servicios Externos"** (ícono `<ExternalLink>` naranja):
    - Lista de `serviceItems` con `<WorkItemRow>` y checkbox de selección (si closureType === 'PENDING')
    - Estado vacío si no hay items
  - **Sub-sección "Repuestos Externos"** (ícono `<Package>` naranja):
    - Lista de `partItems` con `<WorkItemRow>` y checkbox de selección (si closureType === 'PENDING')
    - Estado vacío si no hay items
  - Botones de agregar: "Servicio Externo" (type='SERVICE', defaultItemSource='EXTERNAL') y "Repuesto Externo" (type='PART', defaultItemSource='EXTERNAL')
  - `<AddItemDialog>` al final
  - Alert informativo cuando hay ítems con closureType === 'PENDING' (mismo que en WorkTab)
  - Checkbox logic: `toggleExternalSelect(id)` — mismo que WorkTab
  - No mostrar checkbox si `item.closureType !== 'PENDING'`

- [ ] C.2 — Crear `ComprasTab.tsx` como evolución de `CostsTab.tsx`:
  - Props: `{ workOrder, currentUser, onRefresh }`
  - Importar y reutilizar `ExpensesTab` (sin cambios)
  - Importar `CostSummaryCard` para el resumen al inicio
  - **Sección 1 — "Órdenes de Compra"** (ícono `<ShoppingCart>` naranja):
    - Reutilizar la tabla de OCs que ya existe en `CostsTab.tsx` (copiar y adaptar)
    - Agregar fila de totales debajo de la tabla:
      - "Total comprometido": suma de `purchaseOrders.totalAmount` de todas las OCs
      - "Total facturado": suma de `invoices.totalAmount`
      - "Pendiente de factura": comprometido − facturado
    - Cada OC que tenga `status !== 'INVOICED' && status !== 'CANCELLED'` → badge amarillo "Sin factura"
  - **Sección 2 — "Facturas Vinculadas"** (ícono `<Receipt>` azul):
    - Si `workOrder.invoices.length === 0`: estado vacío "No hay facturas vinculadas."
    - Si hay facturas: tabla con columnas: N° Factura, Proveedor, Fecha, Estado, Total
    - Para cada factura: si su totalAmount > el totalAmount de la OC referenciada en >10%, mostrar badge rojo "⚠ Variación X%" (si el objeto invoice tiene `purchaseOrderId` o similar para hacer el match; si no tiene la info, omitir la alerta y dejar un TODO comment)
  - **Sección 3 — "Gastos Adicionales"** (ícono `<Receipt>` púrpura):
    - Renderizar `<ExpensesTab workOrder={workOrder} onRefresh={onRefresh} />` sin cambios
  - Usar `workOrder.workOrderExpenses` (NO `workOrder.expenses`) para cualquier cálculo propio

- [ ] C.3 — Verificar que `pnpm type-check` pasa para los 2 archivos de Fase C.

---

## Fase D — Tab Cierre (GEMINI)

> Prerequisito: Fases B y C completadas (o al menos los tipos/interfaces definidos).
> Archivo exclusivo: `CierreTab.tsx`

- [ ] D.1 — Crear `CierreTab.tsx` — vista de auditoría y acción de cierre:
  - Props: `{ workOrder, currentUser, onRefresh }`
  - Importar: `formatCurrency` de `@/lib/utils`, `canViewCosts` de `@/lib/permissions`
  - Estado local: `showCloseDialog: boolean`, `kmCierre: string`, `isClosing: boolean`

  **Cálculo de costos** (client-side, sin API):
  ```typescript
  const items = workOrder.workOrderItems || [];
  const expenses = workOrder.workOrderExpenses || [];
  const totalLabor = items.filter(i => i.itemSource === 'INTERNAL_STOCK' && i.mantItem.type === 'SERVICE').reduce((a,i) => a + (i.totalCost||0), 0);
  const totalRepInt = items.filter(i => i.itemSource === 'INTERNAL_STOCK' && i.mantItem.type === 'PART').reduce((a,i) => a + (i.totalCost||0), 0);
  const totalServExt = items.filter(i => i.itemSource === 'EXTERNAL' && i.mantItem.type === 'SERVICE').reduce((a,i) => a + (i.totalCost||0), 0);
  const totalRepExt = items.filter(i => i.itemSource === 'EXTERNAL' && i.mantItem.type === 'PART').reduce((a,i) => a + (i.totalCost||0), 0);
  const totalGastos = expenses.reduce((a,e) => a + (e.amount||0), 0);
  const costoTotal = totalLabor + totalRepInt + totalServExt + totalRepExt + totalGastos;
  const estimado = workOrder.estimatedCost || 0;
  const variacion = estimado > 0 ? ((costoTotal - estimado) / estimado) * 100 : 0;
  ```

  **Lógica de checklist**:
  ```typescript
  const blockers = [
    ...items.filter(i => !['COMPLETED','CANCELLED'].includes(i.status))
            .map(i => `Ítem "${i.mantItem.name}" está sin completar`),
    ...(workOrder.purchaseOrders || []).filter(po => !['INVOICED','CANCELLED'].includes(po.status))
            .map(po => `OC ${po.orderNumber} no tiene factura vinculada`),
  ];
  const canClose = blockers.length === 0;
  const canUserClose = ['OWNER','MANAGER','SUPERVISOR','SUPER_ADMIN'].includes(currentUser?.role) || currentUser?.isSuperAdmin;
  ```

  **Estructura JSX** (usar Cards de shadcn, mismo estilo del resto de tabs):
  1. **Card "Resumen Ejecutivo"**: Vehículo (placa, marca/línea, km creación), Técnico, Proveedor(es) (si hay ítems externos), Centro de costos, Estado actual con Badge
  2. **Card "Desglose de Costos"** (solo si `canViewCosts(currentUser)`):
     - Tabla de 5 filas: Mano de obra | Repuestos internos | Servicios externos | Repuestos externos | Gastos adicionales
     - Fila de TOTAL con fuente grande y borde
     - Fila de variación: "Estimado {formatCurrency(estimado)} / Real {formatCurrency(costoTotal)} / Variación {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}%" — resaltado en rojo si `Math.abs(variacion) > 15`
  3. **Card "Trabajos Realizados"**:
     - Sub-sección Taller: tabla con ítems internos (nombre, estado badge)
     - Sub-sección Externos: tabla con ítems externos (nombre, proveedor si tiene, estado badge)
  4. **Card "Checklist de Cierre"**:
     - Si `canClose`: Alert verde "La OT está lista para cerrar."
     - Si `!canClose`: Alert amarillo "Hay {blockers.length} ítem(s) pendiente(s):" + lista `<ul>` con cada blocker
  5. **Botón "Cerrar OT"**:
     - Solo visible si `canUserClose`
     - `disabled={!canClose || isClosing}`
     - Al hacer click: `setShowCloseDialog(true)`
  6. **AlertDialog de confirmación con km**:
     - Trigger: botón "Cerrar OT"
     - Contenido: "Ingresá el kilometraje al cierre:" + `<Input type="number" value={kmCierre} onChange={...} />`
     - Botón confirmar: `disabled={!kmCierre || Number(kmCierre) <= 0}`
     - `handleClose`: `axios.patch('/api/maintenance/work-orders/${workOrder.id}', { status: 'COMPLETED', completionMileage: Number(kmCierre) })` → toast → `onRefresh()`

- [ ] D.2 — Verificar que `pnpm type-check` pasa para `CierreTab.tsx`.

---

## Fase E — Verificación y Cleanup

> Prerequisito: Fases A, B, C y D todas completas.

- [ ] E.1 — Ejecutar `pnpm type-check` en la raíz del proyecto. Corregir todos los errores de TypeScript.

- [ ] E.2 — Ejecutar `pnpm lint` y corregir todos los warnings de ESLint en los archivos modificados.

- [ ] E.3 — Verificar manualmente en browser los 6 tabs:
  - Tab Resumen: mini-panel muestra valores, edición funciona
  - Tab Taller Propio: solo ítems internos, combobox de búsqueda rápido, sin auto-expand al abrir ítem
  - Tab Trabajos Externos: dos sub-secciones (Servicios / Repuestos), checkboxes funcionan, OC se genera
  - Tab Compras: OCs con totales, facturas, gastos
  - Tab Cierre: costos calculados, checklist correcto, botón habilitado/deshabilitado según estado
  - Tab Actividad: sin cambios, funciona igual que antes

- [ ] E.4 — Eliminar archivos obsoletos una vez verificados los reemplazos:
  - Eliminar `WorkTab.tsx` (reemplazado por `TallerPropioTab` + `TrabajosExternosTab`)
  - Eliminar `CostsTab.tsx` (reemplazado por `ComprasTab`)
  - Confirmar que `GeneralInfoTab.tsx` ya no se importa en `[id]/page.tsx` (si ResumenTab lo absorbió completamente) — o mantenerlo si ResumenTab lo reutiliza internamente

- [ ] E.5 — Registrar observación en Engram con el estado final del cambio.
