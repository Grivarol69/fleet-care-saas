# Flujo de Cierre del Ciclo de Mantenimiento Preventivo

**Fecha**: 23 Octubre 2025
**Versión**: 1.0
**Estado**: Diseño técnico para implementación

---

## 🎯 Objetivo

Implementar el ciclo completo de mantenimiento preventivo:

```
MaintenanceAlert → WorkOrder → Invoice → Cierre automático de todos los estados
```

---

## 📋 Análisis del Schema Actual

### Modelos Involucrados

#### 1. MaintenanceAlert
```prisma
model MaintenanceAlert {
  id                Int
  vehicleId         Int
  programItemId     Int           // VehicleProgramItem específico
  status            AlertStatus   // PENDING, ACKNOWLEDGED, SNOOZED, IN_PROGRESS, COMPLETED, DISMISSED
  workOrderId       Int?          // Vinculación con WO
  actualCost        Decimal?      // Costo real (se llena al completar WO)
  wasOnTime         Boolean?      // ¿Se completó a tiempo?

  // Relaciones
  workOrder         WorkOrder?
  programItem       VehicleProgramItem
}
```

**Estados**:
- `PENDING`: Alerta generada, no atendida
- `ACKNOWLEDGED`: Usuario la vio y reconoció
- `SNOOZED`: Pospuesta temporalmente
- `IN_PROGRESS`: WorkOrder creada, trabajo en curso
- `COMPLETED`: WorkOrder completada + Invoice registrada
- `DISMISSED`: Cancelada/no aplica

---

#### 2. WorkOrder
```prisma
model WorkOrder {
  id              Int
  vehicleId       Int
  status          WorkOrderStatus  // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  estimatedCost   Decimal?
  actualCost      Decimal?         // Se calcula automáticamente al cerrar

  // Vinculación con alertas (1-to-many)
  maintenanceAlerts MaintenanceAlert[]

  // Vinculación con facturas (1-to-many) ✅ YA EXISTE
  invoices          Invoice[]

  // Items de trabajo
  workOrderItems    WorkOrderItem[]
}
```

**Estados**:
- `PENDING`: Orden creada, no iniciada
- `IN_PROGRESS`: Trabajo en curso
- `COMPLETED`: Trabajo terminado, esperando factura
- `CANCELLED`: Cancelada

---

#### 3. WorkOrderItem
```prisma
model WorkOrderItem {
  id              Int
  workOrderId     Int
  mantItemId      Int
  description     String
  unitPrice       Decimal
  quantity        Int
  totalCost       Decimal
  status          WorkOrderStatus  // PENDING, IN_PROGRESS, COMPLETED, CANCELLED

  // Vinculación con factura (cuando existe)
  invoiceItems    InvoiceItem[]
}
```

**Nota**: Cada WorkOrderItem puede vincularse con múltiples InvoiceItems (si un item se compra en varias facturas).

---

#### 4. Invoice
```prisma
model Invoice {
  id              String
  tenantId        String
  invoiceNumber   String
  invoiceDate     DateTime
  supplierId      Int              // Provider
  workOrderId     Int?             // Opcional: puede ser factura sin WO
  status          InvoiceStatus    // PENDING, APPROVED, PAID, OVERDUE, CANCELLED
  subtotal        Decimal
  taxAmount       Decimal
  totalAmount     Decimal
  approvedBy      String?
  approvedAt      DateTime?
  registeredBy    String

  // Relaciones
  items           InvoiceItem[]
  workOrder       WorkOrder?
}
```

**Estados**:
- `PENDING`: Factura registrada, esperando aprobación
- `APPROVED`: Aprobada por MANAGER/OWNER, esperando pago
- `PAID`: Pagada completamente
- `OVERDUE`: Vencida sin pagar
- `CANCELLED`: Cancelada

---

#### 5. InvoiceItem
```prisma
model InvoiceItem {
  id              String
  invoiceId       String
  masterPartId    String?          // Opcional: link a catálogo
  workOrderItemId Int?             // Opcional: link a item de WO
  description     String
  quantity        Decimal
  unitPrice       Decimal
  total           Decimal

  // Relaciones
  invoice         Invoice
  masterPart      MasterPart?
  workOrderItem   WorkOrderItem?
}
```

---

#### 6. PartPriceHistory (Analytics)
```prisma
model PartPriceHistory {
  id              String
  tenantId        String
  masterPartId    String
  supplierId      Int
  price           Decimal
  quantity        Decimal
  recordedAt      DateTime
  invoiceId       String?
  approvedBy      String?
  purchasedBy     String?

  // Relaciones
  masterPart      MasterPart
  supplier        Provider
  invoice         Invoice?
}
```

**Nota**: Se llena automáticamente cuando Invoice cambia a `APPROVED`.

---

## 🔄 Flujo Completo del Ciclo

### FASE 1: Generación de Alerta (YA IMPLEMENTADO ✅)

**Trigger**: Cron job o actualización manual de odómetro

```typescript
// YA EXISTE: MaintenanceAlertService
if (vehicle.currentKm >= programItem.scheduledKm - alertThreshold) {
  const alert = await prisma.maintenanceAlert.create({
    data: {
      vehicleId,
      programItemId,
      status: 'PENDING',
      itemName: mantItem.name,
      scheduledKm: programItem.scheduledKm,
      currentKm: vehicle.currentKm,
      // ... más campos
    }
  });
}
```

**Resultado**: `MaintenanceAlert` con status `PENDING`

---

### FASE 2: Creación de WorkOrder (YA IMPLEMENTADO ✅)

**Trigger**: Usuario selecciona alertas y crea WorkOrder

```typescript
// YA EXISTE: POST /api/maintenance/work-orders
const workOrder = await prisma.workOrder.create({
  data: {
    vehicleId,
    title: "Mantenimiento 15,000 km",
    status: 'PENDING',
    maintenanceAlerts: { connect: alertIds.map(id => ({ id })) }
  }
});

// Actualizar alertas
await prisma.maintenanceAlert.updateMany({
  where: { id: { in: alertIds } },
  data: {
    status: 'IN_PROGRESS',
    workOrderId: workOrder.id
  }
});
```

**Resultado**:
- `WorkOrder` con status `PENDING`
- `MaintenanceAlert` cambia a `IN_PROGRESS`

---

### FASE 3: Completar WorkOrder (🚧 FALTA IMPLEMENTAR)

**Trigger**: Usuario marca WorkOrder como completada

**Endpoint necesario**: `PATCH /api/maintenance/work-orders/[id]`

```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status, actualCost, completedAt } = await req.json();

  if (status === 'COMPLETED') {
    // 1. Actualizar WorkOrder
    const workOrder = await prisma.workOrder.update({
      where: { id: parseInt(params.id) },
      data: {
        status: 'COMPLETED',
        actualCost,
        endDate: completedAt || new Date()
      }
    });

    // 2. Actualizar WorkOrderItems
    await prisma.workOrderItem.updateMany({
      where: { workOrderId: workOrder.id },
      data: { status: 'COMPLETED' }
    });

    // 3. NO CERRAR ALERTAS AÚN
    // Esperar a que se registre Invoice

    return NextResponse.json(workOrder);
  }

  // Para otros cambios de estado (IN_PROGRESS, etc.)
  const workOrder = await prisma.workOrder.update({
    where: { id: parseInt(params.id) },
    data: { status }
  });

  return NextResponse.json(workOrder);
}
```

**Resultado**:
- `WorkOrder` cambia a `COMPLETED`
- `WorkOrderItem` cambia a `COMPLETED`
- `MaintenanceAlert` se mantiene en `IN_PROGRESS` (esperando Invoice)

---

### FASE 4: Registro de Invoice (🚧 FALTA IMPLEMENTAR)

**Trigger**: Usuario registra factura vinculada a WorkOrder

**Endpoint necesario**: `POST /api/maintenance/invoices`

```typescript
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const {
    invoiceNumber,
    invoiceDate,
    supplierId,
    workOrderId,  // ✅ Vinculación con WO
    subtotal,
    taxAmount,
    totalAmount,
    items  // InvoiceItem[]
  } = await req.json();

  // Validaciones
  if (!invoiceNumber || !supplierId || !items || items.length === 0) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  // Verificar WorkOrder existe y está completada
  if (workOrderId) {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { workOrderItems: true }
    });

    if (!workOrder) {
      return NextResponse.json({ error: "WorkOrder no encontrada" }, { status: 404 });
    }

    if (workOrder.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: "WorkOrder debe estar completada antes de registrar factura" },
        { status: 400 }
      );
    }
  }

  // Crear Invoice con Items en transacción
  const invoice = await prisma.$transaction(async (tx) => {
    // 1. Crear Invoice
    const newInvoice = await tx.invoice.create({
      data: {
        tenantId: user.tenantId,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        supplierId,
        workOrderId,
        subtotal,
        taxAmount,
        totalAmount,
        status: 'PENDING',
        registeredBy: user.id
      }
    });

    // 2. Crear InvoiceItems
    await Promise.all(
      items.map((item: any) =>
        tx.invoiceItem.create({
          data: {
            invoiceId: newInvoice.id,
            masterPartId: item.masterPartId || null,
            workOrderItemId: item.workOrderItemId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
            taxRate: item.taxRate || 0,
            taxAmount: item.taxAmount || 0,
            total: item.total
          }
        })
      )
    );

    return newInvoice;
  });

  return NextResponse.json(invoice, { status: 201 });
}
```

**Resultado**:
- `Invoice` creada con status `PENDING`
- `InvoiceItem[]` vinculados
- `MaintenanceAlert` todavía en `IN_PROGRESS` (esperando aprobación)

---

### FASE 5: Aprobación de Invoice (🚧 FALTA IMPLEMENTAR)

**Trigger**: MANAGER/OWNER aprueba la factura

**Endpoint necesario**: `PATCH /api/maintenance/invoices/[id]`

```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Validar permisos
  const { requireManagementRole } = await import("@/lib/permissions");
  try {
    requireManagementRole(user);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }

  const { status, notes } = await req.json();

  if (status === 'APPROVED') {
    // TRANSACCIÓN CRÍTICA: Cierre del ciclo completo
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aprobar Invoice
      const invoice = await tx.invoice.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED',
          approvedBy: user.id,
          approvedAt: new Date()
        },
        include: {
          workOrder: {
            include: {
              maintenanceAlerts: true,
              workOrderItems: true
            }
          },
          items: {
            include: {
              masterPart: true
            }
          }
        }
      });

      // 2. ✅ CIERRE DE WORKORDER (actualizar costo real)
      if (invoice.workOrderId) {
        await tx.workOrder.update({
          where: { id: invoice.workOrderId },
          data: {
            actualCost: invoice.totalAmount,
            status: 'COMPLETED'  // Asegurar que está completada
          }
        });
      }

      // 3. ✅ CIERRE DE ALERTAS (cambiar a COMPLETED)
      if (invoice.workOrder?.maintenanceAlerts) {
        const alertIds = invoice.workOrder.maintenanceAlerts.map(a => a.id);

        await tx.maintenanceAlert.updateMany({
          where: { id: { in: alertIds } },
          data: {
            status: 'COMPLETED',
            actualCost: invoice.totalAmount,
            wasOnTime: true,  // TODO: Calcular basado en scheduledKm vs actualExecutionKm
            closedAt: new Date()
          }
        });
      }

      // 4. ✅ ACTUALIZAR VehicleProgramItems (completados)
      if (invoice.workOrder?.maintenanceAlerts) {
        const programItemIds = invoice.workOrder.maintenanceAlerts.map(a => a.programItemId);

        await tx.vehicleProgramItem.updateMany({
          where: { id: { in: programItemIds } },
          data: {
            status: 'COMPLETED',
            actualExecutionKm: invoice.workOrder.creationMileage,  // Km cuando se hizo
            completedAt: new Date()
          }
        });
      }

      // 5. ✅ CREAR PartPriceHistory (GOLD MINE para analytics)
      const priceHistoryPromises = invoice.items
        .filter(item => item.masterPartId)  // Solo items con catálogo
        .map(item =>
          tx.partPriceHistory.create({
            data: {
              tenantId: user.tenantId,
              masterPartId: item.masterPartId!,
              supplierId: invoice.supplierId,
              price: item.unitPrice,
              quantity: item.quantity,
              recordedAt: new Date(),
              invoiceId: invoice.id,
              approvedBy: user.id,
              purchasedBy: invoice.registeredBy
            }
          })
        );

      await Promise.all(priceHistoryPromises);

      return invoice;
    });

    return NextResponse.json(result);
  }

  // Para otros cambios (CANCELLED, etc.)
  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: { status, notes }
  });

  return NextResponse.json(invoice);
}
```

**Resultado** (TODO SE CIERRA AUTOMÁTICAMENTE):
1. ✅ `Invoice` → `APPROVED`
2. ✅ `WorkOrder` → `actualCost` actualizado
3. ✅ `MaintenanceAlert` → `COMPLETED` + `actualCost` + `closedAt`
4. ✅ `VehicleProgramItem` → `COMPLETED` + `actualExecutionKm`
5. ✅ `PartPriceHistory` → Registros creados para analytics

---

## 🎯 Casos de Uso Específicos

### Caso 1: WorkOrder de Paquete Completo (múltiples items)

**Escenario**: Usuario crea WO desde 5 alertas del "Mantenimiento 15,000 km"

```typescript
// Al crear WO
POST /api/maintenance/work-orders
{
  "vehicleId": 123,
  "alertIds": [1, 2, 3, 4, 5],  // 5 alertas diferentes
  "title": "Mantenimiento 15,000 km",
  "isPackageWork": true
}

// Resultado:
// - 1 WorkOrder creada
// - 5 MaintenanceAlerts → IN_PROGRESS
// - 5 WorkOrderItems creados
```

**Al registrar Invoice**:
```typescript
POST /api/maintenance/invoices
{
  "workOrderId": 456,
  "invoiceNumber": "FAC-2025-001",
  "supplierId": 789,
  "totalAmount": 450000,
  "items": [
    {
      "description": "Cambio aceite + filtro",
      "workOrderItemId": 1,
      "masterPartId": "ACEITE-10W40",
      "quantity": 5,
      "unitPrice": 45000,
      "total": 225000
    },
    {
      "description": "Filtro aire",
      "workOrderItemId": 2,
      "masterPartId": "FILTRO-AIRE-123",
      "quantity": 1,
      "unitPrice": 35000,
      "total": 35000
    },
    // ... más items
  ]
}
```

**Al aprobar Invoice**:
```typescript
PATCH /api/maintenance/invoices/[id]
{ "status": "APPROVED" }

// Automáticamente:
// - 5 MaintenanceAlerts → COMPLETED
// - 1 WorkOrder → actualCost = 450000
// - 5 VehicleProgramItems → COMPLETED
// - 2 PartPriceHistory creados (para items con masterPartId)
```

---

### Caso 2: WorkOrder Individual (1 item correctivo)

**Escenario**: Usuario reporta "Ruido extraño en motor" (correctivo, no preventivo)

```typescript
// Opción A: Crear alerta manual primero
POST /api/maintenance/alerts
{
  "vehicleId": 123,
  "type": "CORRECTIVE",
  "itemName": "Inspección motor",
  "description": "Ruido extraño reportado por conductor"
}

// Luego crear WO
POST /api/maintenance/work-orders
{
  "vehicleId": 123,
  "alertIds": [10],
  "title": "Inspección motor - correctivo"
}

// Opción B: Crear WO directamente sin alerta (para correctivos urgentes)
POST /api/maintenance/work-orders
{
  "vehicleId": 123,
  "title": "Reparación urgente motor",
  "mantType": "CORRECTIVE",
  "alertIds": []  // Sin alertas
}
```

---

### Caso 3: Invoice sin WorkOrder (Compra de repuestos para inventario)

**Escenario**: Usuario compra repuestos para stock, no para WO específica

```typescript
POST /api/maintenance/invoices
{
  "invoiceNumber": "FAC-2025-002",
  "supplierId": 789,
  "workOrderId": null,  // Sin WO
  "totalAmount": 1200000,
  "items": [
    {
      "description": "Aceite 10W-40 (stock)",
      "masterPartId": "ACEITE-10W40",
      "quantity": 20,
      "unitPrice": 45000,
      "total": 900000
    }
  ]
}

// Al aprobar:
// - PartPriceHistory se crea igual (para analytics)
// - NO se cierran alertas (porque no hay WO vinculada)
```

---

### Caso 4: Múltiples Invoices para una WorkOrder

**Escenario**: Trabajo grande con facturas de múltiples proveedores

```typescript
// WO creada
const workOrder = { id: 456, estimatedCost: 800000 };

// Invoice 1 (Repuestos)
POST /api/maintenance/invoices
{
  "workOrderId": 456,
  "supplierId": 10,  // Proveedor repuestos
  "totalAmount": 500000
}

// Invoice 2 (Mano de obra)
POST /api/maintenance/invoices
{
  "workOrderId": 456,
  "supplierId": 20,  // Taller
  "totalAmount": 350000
}

// Al aprobar AMBAS invoices:
// - workOrder.actualCost = Suma de todas las invoices vinculadas
// - Alertas se cierran cuando TODAS las invoices están APPROVED
```

**Implementación sugerida**:
```typescript
// Al aprobar cualquier Invoice vinculada a WO
const allInvoices = await prisma.invoice.findMany({
  where: { workOrderId: invoice.workOrderId }
});

const allApproved = allInvoices.every(inv =>
  inv.status === 'APPROVED' || inv.id === invoice.id
);

if (allApproved) {
  // Calcular costo total
  const totalCost = allInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Cerrar ciclo
  await closeMaintenanceCycle(invoice.workOrderId, totalCost);
}
```

---

## 📊 Métricas y Analytics Generados

### Datos que se capturan automáticamente

#### 1. PartPriceHistory (por cada item con masterPartId)
```typescript
{
  masterPartId: "ACEITE-10W40",
  supplierId: 789,
  price: 45000,
  quantity: 5,
  recordedAt: "2025-10-23",
  invoiceId: "invoice-uuid",
  approvedBy: "user-uuid"
}
```

**Permite responder**:
- "¿Cuánto costó el aceite 10W-40 en Octubre 2025?"
- "¿Qué proveedor tiene mejor precio para filtros de aire?"
- "¿Cuánto ha aumentado el costo del cambio de aceite en el último año?"

---

#### 2. MaintenanceAlert Metrics
```typescript
{
  scheduledKm: 15000,
  actualExecutionKm: 15200,  // Se hizo 200 km tarde
  wasOnTime: false,
  estimatedCost: 400000,
  actualCost: 450000,       // Costó 50k más de lo estimado
  responseTimeMinutes: 120,  // Tardó 2 horas en crear WO después de alerta
  completionTimeHours: 72    // Tardó 3 días en completar WO
}
```

**Permite responder**:
- "¿Qué % de mantenimientos se hacen a tiempo?"
- "¿Qué vehículo tiene peor cumplimiento de mantenimiento?"
- "¿Cuánto nos desviamos del presupuesto estimado?"

---

#### 3. Vehicle Maintenance Score (futuro)
```typescript
// Calculado automáticamente al cerrar alertas
const score = calculateMaintenanceScore(vehicle);
// Considera:
// - % mantenimientos a tiempo
// - Desviación km promedio
// - Frecuencia de correctivos vs preventivos
```

**Permite**:
- Ranking de vehículos por "salud de mantenimiento"
- Identificar vehículos problema
- Proyectar costos futuros

---

## 🚀 Plan de Implementación

### Sprint 1: WorkOrders Completo (Semana 23-30 Oct)

**Endpoints a crear**:
1. ✅ `GET /api/maintenance/work-orders` - Listar con filtros
2. ✅ `GET /api/maintenance/work-orders/[id]` - Detalle
3. ✅ `PATCH /api/maintenance/work-orders/[id]` - Actualizar estado
4. ✅ `DELETE /api/maintenance/work-orders/[id]` - Cancelar

**Tiempo estimado**: 8-10 horas

---

### Sprint 2: Invoice Básico (Semana 30 Oct - 06 Nov)

**Endpoints a crear**:
1. ✅ `POST /api/maintenance/invoices` - Crear
2. ✅ `GET /api/maintenance/invoices` - Listar
3. ✅ `GET /api/maintenance/invoices/[id]` - Detalle
4. ✅ `PATCH /api/maintenance/invoices/[id]` - Aprobar/Rechazar

**Lógica de cierre**:
- Trigger en `PATCH` cuando status → `APPROVED`
- Cerrar WorkOrder + MaintenanceAlerts + VehicleProgramItems
- Crear PartPriceHistory

**Tiempo estimado**: 12-15 horas

---

### Sprint 3: UI WorkOrders (Semana 06-13 Nov)

**Páginas a crear**:
1. `/dashboard/maintenance/work-orders` - Lista
2. `/dashboard/maintenance/work-orders/[id]` - Detalle + Gestión
3. Formularios: Cambiar estado, Agregar notas

**Tiempo estimado**: 8-10 horas

---

### Sprint 4: UI Invoices (Semana 13-20 Nov)

**Páginas a crear**:
1. `/dashboard/maintenance/invoices` - Lista
2. `/dashboard/maintenance/invoices/new` - Crear
3. `/dashboard/maintenance/invoices/[id]` - Detalle + Aprobar

**Tiempo estimado**: 10-12 horas

---

## ⚠️ Consideraciones Importantes

### 1. Transacciones Atómicas

**CRÍTICO**: El cierre del ciclo DEBE ser transaccional

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Aprobar invoice
  // 2. Cerrar workOrder
  // 3. Cerrar alertas
  // 4. Actualizar programItems
  // 5. Crear priceHistory
});
```

**Por qué**: Si falla algún paso, TODO debe revertirse.

---

### 2. Manejo de Errores

```typescript
try {
  const result = await prisma.$transaction(/* ... */);
  return NextResponse.json(result);
} catch (error) {
  console.error("[INVOICE_APPROVE_ERROR]", error);

  // Rollback automático por Prisma
  return NextResponse.json(
    { error: "Error al cerrar ciclo de mantenimiento" },
    { status: 500 }
  );
}
```

---

### 3. Permisos

**Roles permitidos**:
- `SUPER_ADMIN`: Todo
- `OWNER`: Todo en su tenant
- `MANAGER`: Crear WO, Aprobar Invoices, Ver todo
- `TECHNICIAN`: Ver WO asignadas, Actualizar progreso
- `DRIVER`: Solo registrar odómetro

---

### 4. Auditoría

**Campos críticos para rastreo**:
- `Invoice.registeredBy` - Quién registró
- `Invoice.approvedBy` - Quién aprobó
- `WorkOrder.requestedBy` - Quién solicitó
- `WorkOrder.authorizedBy` - Quién autorizó
- `MaintenanceAlert.workOrderCreatedBy` - Quién creó WO

---

## 📈 Mejoras Futuras (Post-MVP)

### 1. Workflow de Aprobaciones Multi-nivel

```typescript
// WorkOrderApproval ya existe en schema
model WorkOrderApproval {
  approverLevel  Int  // 1=supervisor, 2=manager, 3=admin
  status         ApprovalStatus
}

// Lógica:
// - Costos < $200k: Auto-aprobado
// - Costos $200k-$1M: Requiere MANAGER
// - Costos > $1M: Requiere OWNER
```

---

### 2. Notificaciones Automáticas

```typescript
// Al crear alerta
await sendNotification({
  to: [managers, technicians],
  type: "MAINTENANCE_ALERT_CREATED",
  data: { vehiclePlate, itemName, scheduledKm }
});

// Al aprobar invoice (cierre ciclo)
await sendNotification({
  to: [workOrder.requestedBy],
  type: "MAINTENANCE_COMPLETED",
  data: { vehiclePlate, totalCost, completedAt }
});
```

---

### 3. Dashboard con Datos Reales

```typescript
// Queries para dashboard
const totalMaintenanceCost = await prisma.invoice.aggregate({
  where: {
    tenantId: user.tenantId,
    status: 'APPROVED',
    invoiceDate: { gte: startOfMonth, lte: endOfMonth }
  },
  _sum: { totalAmount: true }
});

const pendingAlerts = await prisma.maintenanceAlert.count({
  where: {
    tenantId: user.tenantId,
    status: { in: ['PENDING', 'ACKNOWLEDGED'] }
  }
});

const vehicleTCO = await prisma.$queryRaw`
  SELECT
    v.id,
    v.plate,
    SUM(i.totalAmount) as totalCost,
    COUNT(DISTINCT wo.id) as maintenanceCount
  FROM Vehicle v
  JOIN WorkOrder wo ON wo.vehicleId = v.id
  JOIN Invoice i ON i.workOrderId = wo.id
  WHERE i.status = 'APPROVED'
  GROUP BY v.id
  ORDER BY totalCost DESC
  LIMIT 10
`;
```

---

## 🎯 Checklist de Implementación

### Backend APIs

- [ ] GET /api/maintenance/work-orders
- [ ] GET /api/maintenance/work-orders/[id]
- [ ] PATCH /api/maintenance/work-orders/[id]
- [ ] DELETE /api/maintenance/work-orders/[id]
- [ ] POST /api/maintenance/invoices
- [ ] GET /api/maintenance/invoices
- [ ] GET /api/maintenance/invoices/[id]
- [ ] PATCH /api/maintenance/invoices/[id] (con lógica de cierre)

### Lógica de Cierre

- [ ] Trigger al aprobar Invoice
- [ ] Actualizar WorkOrder.actualCost
- [ ] Cerrar MaintenanceAlert[] (status → COMPLETED)
- [ ] Actualizar VehicleProgramItem[] (status → COMPLETED)
- [ ] Crear PartPriceHistory[] (solo items con masterPartId)
- [ ] Transacción atómica para todo lo anterior

### UI

- [ ] Página lista WorkOrders
- [ ] Página detalle WorkOrder
- [ ] Formulario cambiar estado WO
- [ ] Página lista Invoices
- [ ] Formulario crear Invoice
- [ ] Formulario aprobar/rechazar Invoice
- [ ] Integración con sistema de permisos

### Testing

- [ ] Flujo completo: Alerta → WO → Invoice → Cierre
- [ ] Caso: WO con múltiples alertas
- [ ] Caso: Invoice sin WO (compra stock)
- [ ] Caso: Múltiples Invoices para una WO
- [ ] Verificar PartPriceHistory se crea correctamente
- [ ] Verificar permisos por rol

---

**Próximo paso**: Implementar endpoints de WorkOrders (GET, PATCH, DELETE)

