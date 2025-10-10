# Análisis Invoice + Catálogo de Servicios - 09 Octubre 2025

**Fecha**: 09 Octubre 2025 - 19:00
**Contexto**: Diseño de sistema de cierre de ciclo preventivo

---

## 🎯 Objetivo de la Sesión

Diseñar el modelo de datos para:
1. Cerrar ciclo preventivo (WorkOrder → Invoice → Estados)
2. Responder preguntas de negocio clave
3. Mantener histórico de precios/servicios

---

## 💡 Preguntas de Negocio que Debemos Responder

### 1. Financieras
- ¿Cuánto dinero invertimos en este vehículo?
- ¿Qué proveedor cobra menos?
- ¿Cuál es el presupuesto necesario para sostener línea Toyota?
- ¿Nos conviene más Toyota o Nissan? (TCO - Total Cost of Ownership)

### 2. Operativas
- Lista de compras de filtros de aceite últimos 6 meses (precio, comprador, proveedor)
- ¿Este vehículo está bien o mal mantenido?
- Histórico de precios de un servicio/artículo

### 3. Estratégicas
- Proyecciones presupuestarias por marca/línea
- Análisis de proveedores (precio, calidad, tiempo)
- Scoring de vehículos mejor mantenidos

---

## 📊 Análisis de Modelos Existentes

### ✅ VehicleMaintenanceMetrics (Scoring - EXCELENTE)

**Responde**: ¿Vehículo bien o mal mantenido?

```prisma
model VehicleMaintenanceMetrics {
  maintenanceScore      Int      @default(100)   // 0-100 para ranking
  avgDeviationKm        Int      @default(0)     // + tarde, - temprano
  totalMaintenances     Int      @default(0)
  lastScoreUpdate       DateTime
}
```

**Uso**:
- Score > 80 = Bien mantenido
- avgDeviationKm > 0 = Hace mantenimientos tarde
- Ranking de flota: ORDER BY maintenanceScore DESC

---

### ✅ ScheduledPackage (Desviación - EXCELENTE)

**Responde**: Cumplimiento y desviación presupuestaria

```prisma
model ScheduledPackage {
  idealExecutionKm      Int      // 15000 (template)
  scheduledExecutionKm  Int      // 15200 (programado real)
  actualExecutionKm     Int?     // 15800 (ejecutado real)
  deviationKm           Int?     // 600 km tarde
  onTimeExecution       Boolean?

  estimatedCost         Decimal?
  actualCost            Decimal? // Desviación presupuestaria
}
```

**Uso**:
- % paquetes onTime
- Desviación presupuestaria: estimatedCost - actualCost
- Patrón del vehículo (siempre tarde o temprano)

---

### ✅ WorkOrderApproval (Control Financiero)

**Mantener**: Workflow de aprobaciones por nivel

```prisma
model WorkOrderApproval {
  approverLevel Int    // 1=supervisor, 2=manager, 3=admin
  amount        Decimal
  status        ApprovalStatus
}
```

---

### ✅ ExpenseAuditLog (Auditoría)

**Mantener**: Log de cambios para compliance

```prisma
model ExpenseAuditLog {
  action        AuditAction // CREATED, APPROVED, MODIFIED, PAID
  previousValue Json?
  newValue      Json
  performedBy   String
}
```

---

### ⚠️ WorkOrderExpense (Revisar uso)

**Estado actual**: Muy genérico, no tiene detalle de items

**Propuesta**: Usar solo para gastos misceláneos (peajes, grúa, lavado)
- NO para repuestos/servicios con precio histórico

---

## 🏗️ Arquitectura Propuesta - Evolución del Análisis

### Iteración 1: Invoice básico ❌

**Problema**: Muy simple, no responde preguntas de negocio

```prisma
model Invoice {
  invoiceNumber String
  total         Decimal
  // Falta detalle de items
}
```

---

### Iteración 2: Invoice + InvoiceItem (Productos) ⚠️

**Propuesta**:
```prisma
model Invoice {
  id              String
  workOrderId     Int
  providerId      Int
  total           Decimal
  items           InvoiceItem[]
}

model InvoiceItem {
  description     String
  partNumber      String?
  brand           String?
  unitPrice       Decimal
  quantity        Int
}

model ProductCatalog {
  partNumber      String
  lastPrice       Decimal
  priceHistory    PriceHistory[]
}
```

**Ventaja**: Detalle granular de productos
**Problema descubierto**: En la práctica, facturas NO discriminan productos individuales

---

### Iteración 3: ServiceCatalog (REALIDAD DEL NEGOCIO) ✅

**Descubrimiento clave**:
> Las empresas encargan SERVICIOS completos a proveedores.
> Factura dice: "Cambio filtro de aire - $50" (TODO incluido)
> NO discrimina: "Filtro $30 + Mano obra $20"

**Nueva arquitectura**:
```prisma
model Invoice {
  id              String
  workOrderId     Int
  providerId      Int
  invoiceNumber   String
  invoiceDate     DateTime
  total           Decimal
  fileUrl         String?
  items           InvoiceItem[]  // Servicios facturados
}

model InvoiceItem {
  invoiceId       String
  mantItemId      Int       // Vincula con tipo de servicio
  catalogItemId   String?   // Vincula con catálogo (opcional)

  description     String    // "Cambio filtro aire Toyota Hilux"
  quantity        Int
  unitPrice       Decimal
  total           Decimal
}

model ServiceCatalog {  // o ProductCatalog con flag
  id              String
  mantItemId      Int       // "Cambio filtro aire"
  tenantId        String

  name            String    // "Cambio filtro aire Toyota Hilux"
  serviceType     ServiceType // FULL_SERVICE, PARTS_ONLY, LABOR_ONLY

  // Precio actual
  lastPrice       Decimal
  lastProviderId  Int
  lastPurchaseDate DateTime

  // Relaciones
  priceHistory    PriceHistory[]
  invoiceItems    InvoiceItem[]
}

model PriceHistory {
  id              String
  catalogItemId   String
  providerId      Int
  price           Decimal
  purchaseDate    DateTime
  invoiceItemId   String
}
```

---

## 🔑 Problema Arquitectónico Central

### MantItem tiene 2 naturalezas:

**1. Acción/Servicio** (NO es artículo):
- "Revisión nivel de aceite"
- "Inspección de frenos"
- Solo mano de obra, sin artículo físico

**2. Artículo/Repuesto** (SÍ requiere compra):
- "Cambio filtro de aire"
- "Cambio aceite motor"
- Requiere artículo + puede incluir mano de obra

### Soluciones evaluadas:

**Opción 1**: Campo discriminador
```prisma
model MantItem {
  itemNature      MantItemNature // INSPECTION, REPLACEMENT, ADJUSTMENT
  requiresProduct Boolean
}
```

**Opción 2**: Tabla intermedia MantItemProduct
- Un MantItem puede requerir múltiples productos
- Ej: "Cambio aceite" = Aceite 4L + Filtro + Arandela

**Opción 3**: ServiceCatalog independiente
- No vincula directamente con MantItem
- MantItem es el "tipo de servicio"
- ServiceCatalog es la "implementación específica por vehículo"

---

## 🤔 Decisión Pendiente (Para mañana con empresa)

### Preguntas a resolver:

1. **¿Las facturas discriminan productos vs mano de obra?**
   - SÍ → ProductCatalog (granular)
   - NO → ServiceCatalog (agrupado)

2. **¿Necesitan trackear productos individuales?**
   - Para inventario → ProductCatalog detallado
   - Solo histórico de costos → ServiceCatalog simple

3. **¿Cómo se cotiza en la realidad?**
   - "Dame precio de filtro aire" → ProductCatalog
   - "Dame precio de servicio cambio filtro" → ServiceCatalog

4. **¿Qué análisis necesitan?**
   - "Proveedor más barato en aceite 5W30" → ProductCatalog
   - "Proveedor más barato en cambio de aceite completo" → ServiceCatalog

---

## 📈 Queries de Negocio (Con ServiceCatalog)

### 1. ¿Cuánto invertimos en vehículo X?
```sql
SELECT SUM(i.total)
FROM Invoice i
JOIN WorkOrder wo ON i.workOrderId = wo.id
WHERE wo.vehicleId = X
```

### 2. Lista de servicios últimos 6 meses
```sql
SELECT
  ii.description,
  ii.unitPrice,
  p.name as proveedor,
  i.uploadedBy as comprador,
  i.invoiceDate,
  v.licensePlate
FROM InvoiceItem ii
JOIN Invoice i ON ii.invoiceId = i.id
JOIN Provider p ON i.providerId = p.id
JOIN WorkOrder wo ON i.workOrderId = wo.id
JOIN Vehicle v ON wo.vehicleId = v.id
WHERE ii.description LIKE '%filtro%aire%'
  AND i.invoiceDate >= NOW() - INTERVAL '6 months'
ORDER BY i.invoiceDate DESC
```

### 3. ¿Qué proveedor cobra menos?
```sql
SELECT
  p.name,
  AVG(ph.price) as precioPromedio,
  MIN(ph.price) as mejorPrecio,
  COUNT(*) as cantidadCompras
FROM ServiceCatalog sc
JOIN PriceHistory ph ON ph.catalogItemId = sc.id
JOIN Provider p ON ph.providerId = p.id
WHERE sc.name LIKE '%cambio filtro aire%'
GROUP BY p.id
ORDER BY precioPromedio ASC
```

### 4. Presupuesto línea Toyota
```sql
SELECT
  SUM(i.total) / COUNT(DISTINCT v.id) / 12 as costoMensualPromedio
FROM Invoice i
JOIN WorkOrder wo ON i.workOrderId = wo.id
JOIN Vehicle v ON wo.vehicleId = v.id
JOIN Line l ON v.lineId = l.id
WHERE l.name = 'Hilux'
  AND i.invoiceDate >= NOW() - INTERVAL '1 year'
```

### 5. ¿Toyota o Nissan? (TCO + Score)
```sql
SELECT
  b.name,
  SUM(i.total) / COUNT(DISTINCT v.id) as TCO_anual,
  AVG(vmm.maintenanceScore) as scorePromedio,
  COUNT(*) FILTER (WHERE sp.onTimeExecution = true) * 100.0 / COUNT(*) as pctOnTime
FROM Invoice i
JOIN WorkOrder wo ON i.workOrderId = wo.id
JOIN Vehicle v ON wo.vehicleId = v.id
JOIN Brand b ON v.brandId = b.id
JOIN VehicleMaintenanceMetrics vmm ON v.id = vmm.vehicleId
JOIN ScheduledPackage sp ON vmm.id = sp.scheduleId
WHERE b.name IN ('Toyota', 'Nissan')
GROUP BY b.name
```

---

## 🎯 Flujo de Cierre Propuesto

```
1. Usuario carga Invoice (PDF/imagen)
   - Número, fecha, proveedor, monto

2. Registra InvoiceItems
   - Selecciona MantItem (tipo de servicio)
   - Autocomplete sugiere último precio del catálogo
   - Ingresa cantidad y precio

3. Sistema vincula y actualiza:
   - Crea/actualiza ServiceCatalog.lastPrice
   - Crea PriceHistory
   - Cierra WorkOrderItems → COMPLETED
   - Actualiza MaintenanceAlerts → COMPLETED
   - Actualiza VehicleProgramItems → COMPLETED + actualExecutionKm
   - Actualiza ScheduledPackage → actualCost + deviationKm
   - Recalcula VehicleMaintenanceMetrics.maintenanceScore

4. Si todos items cerrados:
   - WorkOrder → COMPLETED
```

---

## 📝 Decisiones Arquitectónicas a Tomar Mañana

### A. Modelo de Catálogo

**Opción 1: ServiceCatalog** (Simple - Refleja realidad)
- Pro: Facturación real (servicios todo incluido)
- Pro: Más simple
- Contra: Menos granularidad para inventario

**Opción 2: ProductCatalog** (Granular)
- Pro: Control de inventario
- Pro: Análisis detallado por componente
- Contra: No refleja cómo se factura en la realidad

**Opción 3: Híbrido** (Flexible)
- Catálogo único con `itemType` (SERVICE, PRODUCT, BOTH)
- Permite ambos casos de uso

### B. Vinculación MantItem ↔ Catálogo

**Opción 1: Directa** (1-to-1 o 1-to-many)
```prisma
MantItem.defaultCatalogId → ServiceCatalog
```

**Opción 2: Tabla intermedia**
```prisma
MantItemCatalog (many-to-many)
```

**Opción 3: Sin vinculación directa**
- Catalogo se popula desde InvoiceItem
- MantItem es solo tipo de servicio

---

## 🚀 Próximos Pasos (10-Oct)

### 1. Reunión con empresa
- Resolver preguntas sobre facturación
- Definir modelo: ServiceCatalog vs ProductCatalog

### 2. Implementación
- Agregar modelos al schema
- Migración
- API Invoice CRUD
- Service/Product Catalog

### 3. UI
- Página detalle WorkOrder
- Modal cargar Invoice
- Autocomplete desde catálogo
- Proceso de cierre

---

## 💎 Insights Clave de la Sesión

1. **Modelos existentes son excelentes**: VehicleMaintenanceMetrics y ScheduledPackage ya tienen scoring y desviación
2. **WorkOrderExpense es redundante**: Mejor usar Invoice + InvoiceItem
3. **Facturas reales ≠ Productos individuales**: Necesitamos reflejar cómo el negocio REALMENTE opera
4. **MantItem es dual**: Acción vs Artículo requiere discriminación
5. **Histórico de precios es clave**: ServiceCatalog + PriceHistory responde todas las preguntas de negocio

---

**Estado**: Análisis completo, pendiente decisión con empresa
**Próxima sesión**: 10 Octubre 2025 - Implementar modelo definitivo
