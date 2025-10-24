# Continuar Testing - Próxima Sesión

## Resumen: Llegamos hasta aquí ✅

- ✅ Autenticación con cookies funcionando
- ✅ WorkOrder creada (ID: 2)
- ✅ WorkOrder → IN_PROGRESS
- ✅ WorkOrder → COMPLETED (items auto-completados)
- ⏳ Falta: Crear Invoice y aprobarla para cerrar ciclo

## Siguiente Paso: Crear Provider

Antes de crear Invoice, ejecuta en psql:

```sql
INSERT INTO "Provider" (
  "tenantId", 
  "name", 
  "email", 
  "phone"
) VALUES (
  'cf68b103-12fd-4208-a352-42379ef3b6e1',
  'Taller Automotriz XYZ',
  'contacto@tallerxyz.com',
  '3001234567'
) RETURNING id;
```

Guarda el ID que retorne.

## TEST 5: Crear Invoice

**Endpoint**: `POST http://localhost:3000/api/maintenance/invoices`

**Headers**:
- Cookie: [usar /api/auth/debug]
- Content-Type: application/json

**Body**:
```json
{
  "invoiceNumber": "FAC-2025-001",
  "invoiceDate": "2025-10-23",
  "dueDate": "2025-11-23",
  "supplierId": [ID_DEL_PROVIDER_CREADO],
  "workOrderId": 2,
  "subtotal": 420000,
  "taxAmount": 30000,
  "totalAmount": 450000,
  "currency": "COP",
  "notes": "Factura por mantenimiento preventivo",
  "items": [
    {
      "description": "Aceite 10W-40 - 5 litros",
      "workOrderItemId": 5,
      "quantity": 5,
      "unitPrice": 45000,
      "taxRate": 0,
      "taxAmount": 0,
      "total": 225000
    },
    {
      "description": "Filtro de aceite",
      "workOrderItemId": 6,
      "quantity": 1,
      "unitPrice": 35000,
      "taxRate": 0,
      "taxAmount": 0,
      "total": 35000
    },
    {
      "description": "Mano de obra",
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

**Guardar** el `id` de la Invoice creada.

## TEST 6: 🎯 APROBAR INVOICE (CRÍTICO)

**Endpoint**: `PATCH http://localhost:3000/api/maintenance/invoices/[ID_INVOICE]`

**Body**:
```json
{
  "status": "APPROVED"
}
```

**Verificar en response**:
- ✅ invoice.status = "APPROVED"
- ✅ workOrder.actualCost = 450000
- ✅ maintenanceAlerts[].status = "COMPLETED"
- ✅ maintenanceAlerts[].closedAt tiene timestamp
- ✅ maintenanceAlerts[].actualCost = 450000

## TEST 7: Verificar Cierre

**Endpoint**: `GET http://localhost:3000/api/maintenance/alerts?status=COMPLETED`

Deberías ver las 3 alertas (22, 24, 25) ahora con status COMPLETED.

---

**WorkOrder ID actual**: 2
**Alert IDs vinculadas**: 22, 24, 25
**Vehicle ID**: 8
