# 🧪 Guía de Testing Manual - Ciclo Completo WorkOrders + Invoice

**Branch**: `feature/work-orders-invoice-cycle`
**Servidor**: http://localhost:3001
**Fecha**: 23 Octubre 2025

---

## ✅ Estado Actual

### WorkOrder #2 - COMPLETADA
- **Status**: `COMPLETED` ✅
- **Actual Cost**: $450,000
- **End Date**: 2025-10-23T17:34:47.675Z
- **WorkOrderItems**: 3 items (todos COMPLETED) ✅
- **MaintenanceAlerts**: 3 alertas (todas en IN_PROGRESS) ⏳

### Próximo Paso Crítico
🎯 **Crear y Aprobar Invoice** para cerrar el ciclo completo automáticamente

---

## 📋 Testing Manual con Insomnia

### PASO 1: Crear Invoice ✅ LISTO PARA EJECUTAR

**Endpoint**:
```
POST http://localhost:3001/api/maintenance/invoices
```

**Headers**:
```
Content-Type: application/json
```

**Body (JSON)**:
```json
{
  "invoiceNumber": "FAC-2025-001",
  "invoiceDate": "2025-10-23T00:00:00.000Z",
  "dueDate": "2025-11-22T00:00:00.000Z",
  "supplierId": 1,
  "workOrderId": 2,
  "subtotal": 450000,
  "taxAmount": 0,
  "totalAmount": 450000,
  "items": [
    {
      "description": "Revisión nivel refrigerante",
      "workOrderItemId": 5,
      "quantity": 1,
      "unitPrice": 5000,
      "total": 5000
    },
    {
      "description": "Cambio aceite motor",
      "workOrderItemId": 6,
      "quantity": 1,
      "unitPrice": 45000,
      "total": 45000
    },
    {
      "description": "Cambio filtro aceite",
      "workOrderItemId": 7,
      "quantity": 1,
      "unitPrice": 25000,
      "total": 25000
    },
    {
      "description": "Mano de obra",
      "quantity": 1,
      "unitPrice": 375000,
      "total": 375000
    }
  ]
}
```

**Respuesta Esperada**:
```json
{
  "id": "<UUID>",
  "invoiceNumber": "FAC-2025-001",
  "status": "PENDING",
  "totalAmount": 450000,
  ...
}
```

---

### PASO 2: Aprobar Invoice ⭐ CRÍTICO - CIERRE DEL CICLO

**Endpoint**:
```
PATCH http://localhost:3001/api/maintenance/invoices/<INVOICE_ID>
```

**Body (JSON)**:
```json
{
  "status": "APPROVED",
  "notes": "Aprobado - Testing ciclo completo"
}
```

### 🎉 Lo que sucederá AUTOMÁTICAMENTE al aprobar:

1. ✅ **Invoice** → status `APPROVED`, `approvedBy` y `approvedAt` actualizados

2. ✅ **WorkOrder #2** → `actualCost` confirmado en $450,000

3. ✅ **MaintenanceAlerts (3)** → Cambiarán automáticamente a:
   ```
   status: "COMPLETED"
   actualCost: 450000
   wasOnTime: true/false (calculado)
   closedAt: <timestamp>
   completionTimeHours: <calculado>
   costVariance: <diferencia estimado vs real>
   ```

4. ✅ **VehicleProgramItems (3)** → Cambiarán automáticamente a:
   ```
   status: "COMPLETED"
   executedKm: 85000
   executedDate: <timestamp>
   ```

5. ✅ **PartPriceHistory** → Se crean registros (solo si items tienen `masterPartId`)

---

### PASO 3: Verificar Cierre del Ciclo

**Endpoint de verificación**:
```
GET http://localhost:3001/api/maintenance/work-orders/2
```

**Qué verificar en la respuesta**:

```json
{
  "id": 2,
  "status": "COMPLETED",
  "actualCost": 450000,
  "maintenanceAlerts": [
    {
      "id": 22,
      "status": "COMPLETED",  // ✅ Debe ser COMPLETED
      "actualCost": 450000,    // ✅ Debe tener costo
      "wasOnTime": true,       // ✅ Debe estar calculado
      "closedAt": "2025-10-23...", // ✅ Debe tener fecha
      "completionTimeHours": 120  // ✅ Calculado
    },
    // ... otras 2 alertas igual
  ],
  "invoices": [
    {
      "status": "APPROVED",     // ✅ Aprobada
      "approvedAt": "2025-10-23...",  // ✅ Con timestamp
      "approvedBy": "<user-id>"        // ✅ Con usuario
    }
  ]
}
```

---

## 🔍 Scripts de Verificación Automática

Una vez hayas aprobado la Invoice en Insomnia, puedes ejecutar:

```bash
# Verificar estado de la WorkOrder
node .claude/testing/check-workorder-state.mjs

# Ver todas las alerts
node .claude/testing/check-alerts.mjs
```

---

## ✅ Checklist de Testing

- [x] WorkOrder creada desde alertas
- [x] WorkOrder cambiada a IN_PROGRESS
- [x] WorkOrder completada (COMPLETED)
- [x] WorkOrderItems cambiados a COMPLETED automáticamente
- [ ] Invoice creada vinculada a WorkOrder
- [ ] Invoice aprobada
- [ ] MaintenanceAlerts cerradas automáticamente (COMPLETED)
- [ ] VehicleProgramItems actualizados a COMPLETED
- [ ] WorkOrder.actualCost actualizado
- [ ] PartPriceHistory creado (si aplica)

---

## 🐛 Troubleshooting

### Error: "WorkOrder debe estar completada"
✅ Solucionado - Ya está COMPLETED

### Error: "No autenticado"
→ Asegúrate de estar logueado en la app (localhost:3001)

### Error: "Proveedor no encontrado"
→ Ejecuta: `node .claude/testing/get-provider.mjs`

### Error: "Número de factura duplicado"
→ Cambia el `invoiceNumber` a otro valor único

---

## 📊 Datos de Prueba

| Campo | Valor |
|-------|-------|
| WorkOrder ID | 2 |
| Vehicle | VWX-234 |
| Tenant ID | cf68b103-12fd-4208-a352-42379ef3b6e1 |
| User ID | 38cadef6-123b-4360-a945-eab70d9ded9b |
| Provider ID | 1 |
| Estimated Cost | $75,000 |
| Actual Cost | $450,000 |

---

## 🎯 Después del Testing

Una vez verificado el cierre completo:

1. ✅ Documentar resultados en sesión MD
2. ✅ Commit de los cambios
3. ✅ Merge a develop
4. 🎨 Desarrollar UI atractiva para WorkOrders
5. 🎨 Desarrollar UI atractiva para Invoices

---

**Última actualización**: 23 Oct 2025 - 18:25
