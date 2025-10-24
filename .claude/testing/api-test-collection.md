# API Testing Collection - Work Orders & Invoices

**Fecha**: 23 Octubre 2025
**Base URL**: `http://localhost:3000`

---

## 🔐 Pre-requisitos

1. **Usuario autenticado**: Debes estar logueado en la aplicación
2. **Cookies de sesión**: Thunder Client/Postman deben tener las cookies de Supabase Auth
3. **Datos existentes**:
   - Al menos 1 vehículo creado
   - Al menos 1 MaintenanceAlert en estado PENDING
   - Al menos 1 Provider (supplier)
   - Al menos 1 Technician (opcional)

---

## 📋 FLUJO COMPLETO DE TESTING

### PASO 1: Listar Alertas Pendientes

**Endpoint**: `GET /api/maintenance/alerts?status=PENDING`

**Objetivo**: Obtener alertas para crear WorkOrder

**Response esperado**:
```json
[
  {
    "id": 1,
    "vehicleId": 123,
    "itemName": "Cambio aceite motor",
    "status": "PENDING",
    "scheduledKm": 15000,
    "currentKm": 14500,
    "priority": "MEDIUM",
    "estimatedCost": 150000
  }
]
```

**Nota**: Guarda el `id` y `vehicleId` para el siguiente paso

---

### PASO 2: Crear WorkOrder desde Alertas

**Endpoint**: `POST /api/maintenance/work-orders`

**Headers**:
```
Content-Type: application/json
Cookie: [cookies de sesión Supabase]
```

**Body**:
```json
{
  "vehicleId": 123,
  "alertIds": [1, 2, 3],
  "title": "Mantenimiento 15,000 km - Toyota Hilux ABC123",
  "description": "Mantenimiento preventivo programado",
  "technicianId": 5,
  "providerId": 10,
  "priority": "MEDIUM",
  "mantType": "PREVENTIVE",
  "scheduledDate": "2025-10-24T08:00:00Z"
}
```

**Response esperado** (201 Created):
```json
{
  "id": 456,
  "tenantId": "...",
  "vehicleId": 123,
  "title": "Mantenimiento 15,000 km - Toyota Hilux ABC123",
  "status": "PENDING",
  "mantType": "PREVENTIVE",
  "priority": "MEDIUM",
  "estimatedCost": 450000,
  "creationMileage": 14500,
  "requestedBy": "user-uuid",
  "createdAt": "2025-10-23T..."
}
```

**Nota**: Guarda el `id` de la WorkOrder (456 en este ejemplo)

---

### PASO 3: Obtener Detalle de WorkOrder

**Endpoint**: `GET /api/maintenance/work-orders/456`

**Response esperado**:
```json
{
  "id": 456,
  "title": "Mantenimiento 15,000 km",
  "status": "PENDING",
  "vehicle": {
    "id": 123,
    "plate": "ABC123",
    "brand": { "name": "Toyota" },
    "line": { "name": "Hilux" }
  },
  "maintenanceAlerts": [
    {
      "id": 1,
      "itemName": "Cambio aceite motor",
      "status": "IN_PROGRESS",
      "priority": "MEDIUM"
    }
  ],
  "workOrderItems": [
    {
      "id": 1,
      "description": "Cambio aceite motor",
      "totalCost": 150000,
      "status": "PENDING"
    }
  ],
  "invoices": []
}
```

**Validar**:
- ✅ `maintenanceAlerts[].status` debe ser "IN_PROGRESS"
- ✅ `workOrderItems[]` debe tener los items

---

### PASO 4: Iniciar Trabajo (cambiar a IN_PROGRESS)

**Endpoint**: `PATCH /api/maintenance/work-orders/456`

**Body**:
```json
{
  "status": "IN_PROGRESS"
}
```

**Response esperado**:
```json
{
  "id": 456,
  "status": "IN_PROGRESS",
  "startDate": "2025-10-23T15:30:00Z",
  ...
}
```

**Validar**:
- ✅ `status` cambió a "IN_PROGRESS"
- ✅ `startDate` se marcó automáticamente

---

### PASO 5: Completar Trabajo

**Endpoint**: `PATCH /api/maintenance/work-orders/456`

**Body**:
```json
{
  "status": "COMPLETED",
  "actualCost": 450000,
  "completedAt": "2025-10-23T18:00:00Z"
}
```

**Response esperado**:
```json
{
  "id": 456,
  "status": "COMPLETED",
  "startDate": "2025-10-23T15:30:00Z",
  "endDate": "2025-10-23T18:00:00Z",
  "estimatedCost": 450000,
  "actualCost": 450000,
  "workOrderItems": [
    {
      "status": "COMPLETED"  // ← Auto-actualizado
    }
  ]
}
```

**Validar**:
- ✅ `status` = "COMPLETED"
- ✅ `endDate` marcado
- ✅ `actualCost` actualizado
- ✅ Todos los `workOrderItems[].status` = "COMPLETED"

---

### PASO 6: Listar Providers (para crear Invoice)

**Endpoint**: `GET /api/people/providers`

**Response esperado**:
```json
[
  {
    "id": 10,
    "name": "Taller Automotriz XYZ",
    "email": "contacto@tallerxyz.com",
    "phone": "3001234567"
  }
]
```

**Nota**: Guarda el `id` del proveedor

---

### PASO 7: Crear Invoice vinculada a WorkOrder

**Endpoint**: `POST /api/maintenance/invoices`

**Body**:
```json
{
  "invoiceNumber": "FAC-2025-001",
  "invoiceDate": "2025-10-23",
  "dueDate": "2025-11-23",
  "supplierId": 10,
  "workOrderId": 456,
  "subtotal": 420000,
  "taxAmount": 30000,
  "totalAmount": 450000,
  "currency": "COP",
  "notes": "Factura por mantenimiento preventivo 15k km",
  "items": [
    {
      "description": "Aceite 10W-40 Mobil 1 - 5 litros",
      "masterPartId": null,
      "workOrderItemId": 1,
      "quantity": 5,
      "unitPrice": 45000,
      "taxRate": 0,
      "taxAmount": 0,
      "total": 225000
    },
    {
      "description": "Filtro de aire original",
      "masterPartId": null,
      "workOrderItemId": 2,
      "quantity": 1,
      "unitPrice": 35000,
      "taxRate": 0,
      "taxAmount": 0,
      "total": 35000
    },
    {
      "description": "Mano de obra - Mantenimiento preventivo",
      "masterPartId": null,
      "workOrderItemId": null,
      "quantity": 1,
      "unitPrice": 190000,
      "taxRate": 0,
      "taxAmount": 0,
      "total": 190000
    }
  ]
}
```

**Response esperado** (201 Created):
```json
{
  "id": "xyz-uuid",
  "invoiceNumber": "FAC-2025-001",
  "invoiceDate": "2025-10-23T00:00:00Z",
  "status": "PENDING",
  "totalAmount": 450000,
  "workOrderId": 456,
  "supplier": {
    "id": 10,
    "name": "Taller Automotriz XYZ"
  },
  "items": [
    {
      "id": "item-1-uuid",
      "description": "Aceite 10W-40 Mobil 1 - 5 litros",
      "quantity": 5,
      "unitPrice": 45000,
      "total": 225000
    }
    // ... más items
  ]
}
```

**Nota**: Guarda el `id` de la Invoice

---

### PASO 8: ⭐ APROBAR INVOICE (CIERRE DE CICLO COMPLETO)

**Endpoint**: `PATCH /api/maintenance/invoices/xyz-uuid`

**Body**:
```json
{
  "status": "APPROVED",
  "notes": "Factura revisada y aprobada - Todo conforme"
}
```

**Response esperado**:
```json
{
  "id": "xyz-uuid",
  "invoiceNumber": "FAC-2025-001",
  "status": "APPROVED",
  "approvedBy": "user-uuid",
  "approvedAt": "2025-10-23T18:30:00Z",
  "totalAmount": 450000,
  "workOrder": {
    "id": 456,
    "actualCost": 450000,  // ← Auto-actualizado
    "maintenanceAlerts": [
      {
        "id": 1,
        "status": "COMPLETED",  // ← Auto-cerrado
        "actualCost": 450000,
        "wasOnTime": true,
        "closedAt": "2025-10-23T18:30:00Z"
      }
    ]
  }
}
```

**Validaciones críticas**:
- ✅ `invoice.status` = "APPROVED"
- ✅ `invoice.approvedBy` = tu user ID
- ✅ `invoice.approvedAt` = timestamp actual
- ✅ `workOrder.actualCost` = totalAmount de invoice
- ✅ `maintenanceAlerts[].status` = "COMPLETED"
- ✅ `maintenanceAlerts[].actualCost` = totalAmount
- ✅ `maintenanceAlerts[].closedAt` = timestamp

---

### PASO 9: Verificar Cierre en Alertas

**Endpoint**: `GET /api/maintenance/alerts?status=COMPLETED`

**Response esperado**:
```json
[
  {
    "id": 1,
    "itemName": "Cambio aceite motor",
    "status": "COMPLETED",
    "workOrderId": 456,
    "actualCost": 450000,
    "wasOnTime": true,
    "closedAt": "2025-10-23T18:30:00Z",
    "costVariance": 0,
    "completionTimeHours": 72
  }
]
```

**Validar**:
- ✅ La alerta que estaba en IN_PROGRESS ahora está en COMPLETED
- ✅ Tiene `actualCost`, `wasOnTime`, `closedAt`

---

### PASO 10: Verificar PartPriceHistory (si usaste masterPartId)

**Endpoint**: `GET /api/maintenance/master-parts/ACEITE-10W40/price-history`
(Este endpoint aún no existe, pero los datos ya están en la BD)

**Query SQL directa** (para verificar):
```sql
SELECT * FROM "PartPriceHistory"
WHERE "invoiceId" = 'xyz-uuid';
```

**Resultado esperado**:
```
| masterPartId   | supplierId | price  | quantity | invoiceId | approvedBy |
|----------------|------------|--------|----------|-----------|------------|
| ACEITE-10W40   | 10         | 45000  | 5        | xyz-uuid  | user-uuid  |
```

---

## 🧪 CASOS DE PRUEBA ADICIONALES

### Test 1: Cancelar WorkOrder

**Endpoint**: `DELETE /api/maintenance/work-orders/456`

**Escenario**: Usuario creó WO por error y quiere cancelarla

**Validaciones**:
- ✅ `workOrder.status` → "CANCELLED"
- ✅ `maintenanceAlerts[]` → Vuelven a "PENDING"
- ✅ `workOrderId` en alertas → Se limpia (null)

---

### Test 2: Crear Invoice sin WorkOrder

**Body**:
```json
{
  "invoiceNumber": "FAC-2025-002",
  "invoiceDate": "2025-10-23",
  "supplierId": 10,
  "workOrderId": null,  // ← Sin vincular
  "totalAmount": 200000,
  "items": [
    {
      "description": "Aceite para inventario",
      "quantity": 10,
      "unitPrice": 20000,
      "total": 200000
    }
  ]
}
```

**Validar**:
- ✅ Invoice se crea correctamente
- ✅ NO cierra ninguna alerta (no hay WO vinculada)

---

### Test 3: Listar WorkOrders con filtros

**Queries**:
```
GET /api/maintenance/work-orders?status=PENDING
GET /api/maintenance/work-orders?vehicleId=123
GET /api/maintenance/work-orders?mantType=PREVENTIVE
GET /api/maintenance/work-orders?limit=10
```

---

### Test 4: Intentar aprobar Invoice sin permisos

**Usuario**: Login como TECHNICIAN o DRIVER

**Request**: `PATCH /api/maintenance/invoices/xyz-uuid`

**Response esperado**: 403 Forbidden
```json
{
  "error": "Acceso denegado: Se requiere rol OWNER o MANAGER"
}
```

---

## 🚨 Errores Comunes y Soluciones

### Error 1: "No autenticado" (401)

**Causa**: No hay cookies de sesión Supabase

**Solución**:
1. Abre la app en navegador
2. Haz login
3. Abre DevTools → Application → Cookies
4. Copia las cookies de Supabase
5. Agrégalas a Thunder Client/Postman

---

### Error 2: "Orden de trabajo debe estar completada" (400)

**Causa**: Intentas crear Invoice para WO con status != COMPLETED

**Solución**: Primero hacer `PATCH` a la WO con `status: "COMPLETED"`

---

### Error 3: "Ya existe una factura con este número" (409)

**Causa**: `invoiceNumber` duplicado para el tenant

**Solución**: Usar número diferente (ej: FAC-2025-002)

---

### Error 4: "Factura no encontrada" (404)

**Causa**: UUID incorrecto o factura de otro tenant

**Solución**: Verificar el ID copiado correctamente

---

## 📊 Checklist de Validación Completa

### Flujo Happy Path
- [ ] Crear WorkOrder desde alertas → WO created, alertas IN_PROGRESS
- [ ] Cambiar WO a IN_PROGRESS → startDate marcado
- [ ] Cambiar WO a COMPLETED → endDate marcado, items COMPLETED
- [ ] Crear Invoice vinculada → Invoice PENDING creada
- [ ] Aprobar Invoice → Status APPROVED
- [ ] Verificar cierre automático:
  - [ ] WorkOrder.actualCost actualizado
  - [ ] MaintenanceAlerts → COMPLETED
  - [ ] VehicleProgramItems → COMPLETED
  - [ ] PartPriceHistory creado (si usaste masterPartId)

### Casos Edge
- [ ] Cancelar WO → Alertas vuelven a PENDING
- [ ] Crear Invoice sin WO → Funciona sin cerrar alertas
- [ ] Intentar aprobar sin permisos → 403 Forbidden
- [ ] Intentar crear Invoice con número duplicado → 409 Conflict

---

## 🎯 Próximo: Crear Seed Data

Para testing más fácil, deberíamos crear un seed con:
- 1 vehículo con programa de mantenimiento
- 3 alertas en PENDING
- 1 provider
- 1 technician

¿Quieres que cree el seed script?

