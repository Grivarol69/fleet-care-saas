# Plan de Implementacion: Circuito OT -> Ordenes de Compra -> Facturas

**Fecha de creacion:** 2026-02-04
**Estado:** EN PROGRESO
**Version:** 1.0

---

## Indice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual del Sistema](#estado-actual-del-sistema)
3. [Fase 1: Schema de Prisma](#fase-1-schema-de-prisma)
4. [Fase 2: APIs Backend](#fase-2-apis-backend)
5. [Fase 3: Componentes UI](#fase-3-componentes-ui)
6. [Checklist de Progreso](#checklist-de-progreso)
7. [Notas Tecnicas](#notas-tecnicas)

---

## Resumen Ejecutivo

### Objetivo

Implementar un circuito completo de trazabilidad financiera:

| Escenario   | Flujo                                                        |
| ----------- | ------------------------------------------------------------ |
| **Externo** | Alertas -> OT -> OC Servicios + OC Repuestos -> Facturas     |
| **Interno** | Alertas -> OT -> Ticket Interno (inventario + HH + tecnico)  |
| **Mixto**   | Una OT puede tener items externos e internos simultaneamente |

### Flujo de Aprobacion de OC

```
DRAFT -> PENDING_APPROVAL -> APPROVED -> SENT -> PARTIAL/COMPLETED
```

### Cierre Parcial

Una OT puede cerrarse aunque falten items (flag `allowPartialClose`)

---

## Estado Actual del Sistema

### Modelos Existentes Relevantes

#### WorkOrder (linea ~394 en schema.prisma)

- Ya tiene relaciones con: `workOrderItems`, `invoices`, `internalWorkTickets`
- **NO tiene:** campo `workType`, relacion con `PurchaseOrder`

#### WorkOrderItem (linea ~450 en schema.prisma)

- Ya tiene campos de cierre: `closureType`, `invoiceItemId`, `internalTicketEntryId`
- **NO tiene:** campo `itemSource`, relacion con `PurchaseOrderItem`

#### Invoice (linea ~646 en schema.prisma)

- Ya tiene relacion con `WorkOrder`
- **NO tiene:** relacion con `PurchaseOrder`

#### InternalWorkTicket (linea ~1588 en schema.prisma)

- Ya funciona con `TicketLaborEntry` y `TicketPartEntry`
- Descuenta inventario correctamente
- **NO tiene:** manejo de items pendientes de compra

---

## Fase 1: Schema de Prisma

### 1.1 NUEVOS Enums a Agregar

Ubicacion: Despues del enum `ItemClosureType` (linea ~1709)

```prisma
// ========================================
// PURCHASE ORDER SYSTEM
// ========================================

enum PurchaseOrderType {
  SERVICES    // Servicios de mantenimiento
  PARTS       // Repuestos y materiales
}

enum PurchaseOrderStatus {
  DRAFT              // Borrador, editable
  PENDING_APPROVAL   // Enviada a aprobacion
  APPROVED           // Aprobada, lista para enviar
  SENT               // Enviada al proveedor
  PARTIAL            // Parcialmente recibida/facturada
  COMPLETED          // Completamente recibida/facturada
  CANCELLED          // Cancelada
}

enum POItemStatus {
  PENDING     // Pendiente de recibir/facturar
  PARTIAL     // Parcialmente recibido
  COMPLETED   // Completamente recibido/facturado
  CANCELLED   // Cancelado
}

enum WorkType {
  EXTERNAL    // Todo va a proveedor externo
  INTERNAL    // Todo en taller propio
  MIXED       // Algunos items externos, otros internos
}

enum ItemSource {
  EXTERNAL          // Compra externa (genera OC)
  INTERNAL_STOCK    // Del inventario propio (genera ticket interno)
  INTERNAL_PURCHASE // Compra para uso interno (genera OC + ticket)
}
```

### 1.2 NUEVO Modelo PurchaseOrder

Ubicacion: Despues del modelo `InvoicePayment` (linea ~802)

```prisma
// ========================================
// PURCHASE ORDER SYSTEM
// ========================================

model PurchaseOrder {
  id            String   @id @default(cuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Relacion con OT
  workOrderId   Int
  workOrder     WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Restrict)

  // Numero y tipo
  orderNumber   String   // "OC-2026-000001"
  type          PurchaseOrderType  // SERVICES | PARTS

  // Proveedor
  providerId    Int
  provider      Provider @relation(fields: [providerId], references: [id], onDelete: Restrict)

  // Estado con flujo de aprobacion
  status        PurchaseOrderStatus @default(DRAFT)

  // Aprobacion
  requestedBy   String   // userId que creo
  approvedBy    String?  // userId que aprobo
  approvedAt    DateTime?
  sentAt        DateTime?

  // Montos
  subtotal      Decimal  @db.Decimal(12, 2)
  taxRate       Decimal  @db.Decimal(5, 2) @default(0)
  taxAmount     Decimal  @db.Decimal(12, 2) @default(0)
  total         Decimal  @db.Decimal(12, 2)

  // Items y facturas
  items         PurchaseOrderItem[]
  invoices      Invoice[]  // Facturas que cancelan esta OC

  notes         String?  @db.Text
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([tenantId, orderNumber])
  @@index([tenantId])
  @@index([workOrderId])
  @@index([providerId])
  @@index([status])
}

model PurchaseOrderItem {
  id              String   @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)

  // Vinculo con WorkOrderItem (trazabilidad)
  workOrderItemId Int?
  workOrderItem   WorkOrderItem? @relation(fields: [workOrderItemId], references: [id], onDelete: SetNull)

  // Item de mantenimiento
  mantItemId      Int?
  mantItem        MantItem? @relation(fields: [mantItemId], references: [id], onDelete: SetNull)

  // Repuesto (si aplica)
  masterPartId    String?
  masterPart      MasterPart? @relation(fields: [masterPartId], references: [id], onDelete: SetNull)

  // Datos del item
  description     String
  quantity        Decimal  @db.Decimal(10, 2)
  unitPrice       Decimal  @db.Decimal(12, 2)
  total           Decimal  @db.Decimal(12, 2)

  // Estado de recepcion/facturacion
  status          POItemStatus  @default(PENDING)
  receivedQty     Decimal  @db.Decimal(10, 2) @default(0)

  // Referencia a factura que cancela este item
  invoiceItemId   String?
  closedAt        DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([purchaseOrderId])
  @@index([workOrderItemId])
  @@index([mantItemId])
  @@index([masterPartId])
  @@index([status])
}
```

### 1.3 MODIFICACIONES a Modelos Existentes

#### 1.3.1 Modificar Tenant (agregar relacion)

Ubicacion: Linea ~55 (despues de `documentTypeConfigs`)

```prisma
// AGREGAR:
purchaseOrders            PurchaseOrder[]
```

#### 1.3.2 Modificar WorkOrder

Ubicacion: Linea ~394

```prisma
// AGREGAR despues de la linea 440 (despues de invoices):
purchaseOrders     PurchaseOrder[]

// AGREGAR campo workType despues de status (linea ~403):
workType        WorkType  @default(EXTERNAL)  // EXTERNAL | INTERNAL | MIXED
```

#### 1.3.3 Modificar WorkOrderItem

Ubicacion: Linea ~450

```prisma
// AGREGAR despues de linea 494 (despues de ticketPartEntries):
purchaseOrderItems PurchaseOrderItem[]

// AGREGAR campo itemSource despues de closedBy (linea ~481):
itemSource      ItemSource  @default(EXTERNAL)  // EXTERNAL | INTERNAL_STOCK | INTERNAL_PURCHASE
```

#### 1.3.4 Modificar Invoice

Ubicacion: Linea ~646

```prisma
// AGREGAR despues de workOrderId/workOrder (linea ~662):
// Puede cancelar una OC
purchaseOrderId String?
purchaseOrder   PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id], onDelete: SetNull)

// AGREGAR indice:
@@index([purchaseOrderId])
```

#### 1.3.5 Modificar Provider

Ubicacion: Linea ~865

```prisma
// AGREGAR despues de workOrderExpenses (linea ~883):
purchaseOrders         PurchaseOrder[]
```

#### 1.3.6 Modificar MantItem

Ubicacion: Linea ~272

```prisma
// AGREGAR despues de parts (linea ~298):
purchaseOrderItems     PurchaseOrderItem[]
```

#### 1.3.7 Modificar MasterPart

Ubicacion: Linea ~579

```prisma
// AGREGAR despues de workOrderItems (linea ~614):
purchaseOrderItems     PurchaseOrderItem[]
```

### 1.4 Comando de Migracion

```bash
pnpm prisma migrate dev --name add_purchase_order_system
```

---

## Fase 2: APIs Backend

### 2.1 API de Ordenes de Compra - Listado y Creacion

**Archivo:** `src/app/api/purchase-orders/route.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { Prisma, PurchaseOrderStatus, PurchaseOrderType } from '@prisma/client';

/**
 * GET - Listar Ordenes de Compra con filtros
 * Query params: workOrderId, status, type, providerId, limit
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get('workOrderId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const providerId = searchParams.get('providerId');
    const limit = searchParams.get('limit');

    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId: user.tenantId,
    };

    if (workOrderId) where.workOrderId = parseInt(workOrderId);
    if (status) where.status = status as PurchaseOrderStatus;
    if (type) where.type = type as PurchaseOrderType;
    if (providerId) where.providerId = parseInt(providerId);

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        workOrder: {
          select: {
            id: true,
            title: true,
            vehicle: {
              select: {
                licensePlate: true,
                brand: { select: { name: true } },
              },
            },
          },
        },
        provider: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            mantItem: { select: { name: true } },
            masterPart: { select: { code: true, description: true } },
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {}),
    });

    return NextResponse.json(purchaseOrders);
  } catch (error: unknown) {
    console.error('[PURCHASE_ORDERS_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear Orden de Compra
 * Body: { workOrderId, type, providerId, items: [...], notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Validar permisos (OWNER, MANAGER, PURCHASER)
    if (!['OWNER', 'MANAGER', 'PURCHASER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear ordenes de compra' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { workOrderId, type, providerId, items, notes } = body;

    // Validaciones basicas
    if (!workOrderId || !type || !providerId || !items?.length) {
      return NextResponse.json(
        { error: 'workOrderId, type, providerId y items son requeridos' },
        { status: 400 }
      );
    }

    // Validar WorkOrder existe y pertenece al tenant
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId, tenantId: user.tenantId },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    // Validar Provider existe y pertenece al tenant
    const provider = await prisma.provider.findUnique({
      where: { id: providerId, tenantId: user.tenantId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Generar numero de OC
    const year = new Date().getFullYear();
    const lastOC = await prisma.purchaseOrder.findFirst({
      where: {
        tenantId: user.tenantId,
        orderNumber: { startsWith: `OC-${year}-` },
      },
      orderBy: { orderNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastOC) {
      const lastNum = parseInt(lastOC.orderNumber.split('-')[2] || '0');
      nextNumber = lastNum + 1;
    }
    const orderNumber = `OC-${year}-${nextNumber.toString().padStart(6, '0')}`;

    // Calcular totales
    const subtotal = items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );
    const taxRate = 0; // Configurable por tenant
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Crear OC con items en transaccion
    const purchaseOrder = await prisma.$transaction(async tx => {
      const po = await tx.purchaseOrder.create({
        data: {
          tenantId: user.tenantId,
          workOrderId,
          orderNumber,
          type: type as PurchaseOrderType,
          providerId,
          status: 'DRAFT',
          requestedBy: user.id,
          subtotal,
          taxRate,
          taxAmount,
          total,
          notes,
          items: {
            create: items.map((item: any) => ({
              workOrderItemId: item.workOrderItemId || null,
              mantItemId: item.mantItemId || null,
              masterPartId: item.masterPartId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: Number(item.quantity) * Number(item.unitPrice),
              status: 'PENDING',
            })),
          },
        },
        include: {
          items: true,
          provider: { select: { name: true } },
        },
      });

      return po;
    });

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error: unknown) {
    console.error('[PURCHASE_ORDERS_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
```

### 2.2 API de Ordenes de Compra - Detalle y Workflow

**Archivo:** `src/app/api/purchase-orders/[id]/route.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { PurchaseOrderStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Detalle de Orden de Compra
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
      include: {
        workOrder: {
          include: {
            vehicle: {
              include: {
                brand: true,
                line: true,
              },
            },
          },
        },
        provider: true,
        items: {
          include: {
            workOrderItem: true,
            mantItem: true,
            masterPart: true,
          },
        },
        invoices: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(purchaseOrder);
  } catch (error: unknown) {
    console.error('[PURCHASE_ORDER_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualizar estado de Orden de Compra
 * Body: { action: 'submit' | 'approve' | 'reject' | 'send' | 'cancel', notes? }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    // Obtener OC actual
    const currentPO = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!currentPO) {
      return NextResponse.json(
        { error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    // Definir transiciones validas
    const validTransitions: Record<
      string,
      {
        from: PurchaseOrderStatus[];
        to: PurchaseOrderStatus;
        requiredRole?: string[];
      }
    > = {
      submit: {
        from: ['DRAFT'],
        to: 'PENDING_APPROVAL',
        requiredRole: ['OWNER', 'MANAGER', 'PURCHASER'],
      },
      approve: {
        from: ['PENDING_APPROVAL'],
        to: 'APPROVED',
        requiredRole: ['OWNER', 'MANAGER'],
      },
      reject: {
        from: ['PENDING_APPROVAL'],
        to: 'DRAFT',
        requiredRole: ['OWNER', 'MANAGER'],
      },
      send: {
        from: ['APPROVED'],
        to: 'SENT',
        requiredRole: ['OWNER', 'MANAGER', 'PURCHASER'],
      },
      cancel: {
        from: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'],
        to: 'CANCELLED',
        requiredRole: ['OWNER', 'MANAGER'],
      },
    };

    const transition = validTransitions[action];
    if (!transition) {
      return NextResponse.json(
        { error: `Accion '${action}' no valida` },
        { status: 400 }
      );
    }

    if (!transition.from.includes(currentPO.status)) {
      return NextResponse.json(
        { error: `No se puede ${action} una OC en estado ${currentPO.status}` },
        { status: 400 }
      );
    }

    if (
      transition.requiredRole &&
      !transition.requiredRole.includes(user.role)
    ) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta accion' },
        { status: 403 }
      );
    }

    // Preparar datos de actualizacion
    const updateData: any = {
      status: transition.to,
      ...(notes && { notes }),
    };

    // Datos adicionales segun accion
    if (action === 'approve') {
      updateData.approvedBy = user.id;
      updateData.approvedAt = new Date();
    } else if (action === 'send') {
      updateData.sentAt = new Date();
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        provider: { select: { name: true } },
      },
    });

    return NextResponse.json(updatedPO);
  } catch (error: unknown) {
    console.error('[PURCHASE_ORDER_PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar OC (solo si DRAFT)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    if (purchaseOrder.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar OC en estado DRAFT' },
        { status: 400 }
      );
    }

    await prisma.purchaseOrder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[PURCHASE_ORDER_DELETE]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
```

### 2.3 API de Items de Orden de Compra

**Archivo:** `src/app/api/purchase-orders/[id]/items/route.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Listar items de una OC
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que OC existe y pertenece al tenant
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    const items = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id },
      include: {
        workOrderItem: true,
        mantItem: { select: { name: true, type: true } },
        masterPart: { select: { code: true, description: true, unit: true } },
      },
    });

    return NextResponse.json(items);
  } catch (error: unknown) {
    console.error('[PO_ITEMS_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * POST - Agregar item a OC (solo si DRAFT)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verificar OC y estado
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    if (purchaseOrder.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Solo se pueden agregar items a OC en estado DRAFT' },
        { status: 400 }
      );
    }

    const {
      workOrderItemId,
      mantItemId,
      masterPartId,
      description,
      quantity,
      unitPrice,
    } = body;

    if (!description || !quantity || !unitPrice) {
      return NextResponse.json(
        { error: 'description, quantity y unitPrice son requeridos' },
        { status: 400 }
      );
    }

    const itemTotal = Number(quantity) * Number(unitPrice);

    // Crear item y actualizar totales
    const result = await prisma.$transaction(async tx => {
      const newItem = await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: id,
          workOrderItemId: workOrderItemId || null,
          mantItemId: mantItemId || null,
          masterPartId: masterPartId || null,
          description,
          quantity,
          unitPrice,
          total: itemTotal,
          status: 'PENDING',
        },
      });

      // Recalcular totales de OC
      const allItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });

      const newSubtotal = allItems.reduce(
        (sum, item) => sum + Number(item.total),
        0
      );
      const newTaxAmount = newSubtotal * (Number(purchaseOrder.taxRate) / 100);
      const newTotal = newSubtotal + newTaxAmount;

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          taxAmount: newTaxAmount,
          total: newTotal,
        },
      });

      return newItem;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error('[PO_ITEMS_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
```

### 2.4 Modificar API de WorkOrders

**Archivo:** `src/app/api/maintenance/work-orders/route.ts`

**Cambios en POST (agregar soporte para workType y auto-creacion de OC):**

```typescript
// AGREGAR al destructuring del body (linea ~137):
workType = "EXTERNAL",
itemsWithSource = [], // Array de { alertId, itemSource, providerId? }

// AGREGAR despues de crear WorkOrder (linea ~264):
// Si workType es EXTERNAL o MIXED, auto-crear OC en DRAFT
if (workType !== "INTERNAL" && itemsWithSource.length > 0) {
  // Agrupar items por proveedor y tipo
  const itemsByProvider = new Map<number, { services: any[], parts: any[] }>();

  for (const item of itemsWithSource) {
    if (item.itemSource !== "EXTERNAL") continue;
    if (!item.providerId) continue;

    if (!itemsByProvider.has(item.providerId)) {
      itemsByProvider.set(item.providerId, { services: [], parts: [] });
    }

    const group = itemsByProvider.get(item.providerId)!;
    const alertData = alerts.find(a => a.id === item.alertId);
    if (!alertData) continue;

    const itemType = alertData.programItem.mantItem.type;
    const target = itemType === "SERVICE" ? group.services : group.parts;
    target.push({
      description: alertData.itemName,
      quantity: 1,
      unitPrice: alertData.estimatedCost || 0,
      mantItemId: alertData.programItem.mantItemId,
    });
  }

  // Crear OC por cada proveedor y tipo
  for (const [providerId, groups] of itemsByProvider) {
    if (groups.services.length > 0) {
      // Crear OC de servicios (implementar llamada a API o logica directa)
    }
    if (groups.parts.length > 0) {
      // Crear OC de repuestos
    }
  }
}
```

### 2.5 Modificar API de Facturas

**Archivo:** `src/app/api/invoices/route.ts`

**Cambios en POST (agregar soporte para purchaseOrderId):**

```typescript
// AGREGAR al destructuring del body (linea ~96):
purchaseOrderId,

// AGREGAR despues de la linea ~153 (validacion de workOrder):
// Si tiene purchaseOrderId, validar y actualizar OC
if (purchaseOrderId) {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: {
      id: purchaseOrderId,
      tenantId: user.tenantId,
    },
    include: { items: true },
  });

  if (!purchaseOrder) {
    return NextResponse.json(
      { error: "Orden de compra no encontrada" },
      { status: 404 }
    );
  }

  if (purchaseOrder.status !== "SENT") {
    return NextResponse.json(
      { error: "Solo se pueden facturar OC en estado SENT" },
      { status: 400 }
    );
  }
}

// AGREGAR al crear Invoice (linea ~173):
purchaseOrderId: purchaseOrderId || null,

// AGREGAR dentro de la transaccion (despues de crear InvoiceItems):
// Actualizar PurchaseOrder y sus items
if (purchaseOrderId) {
  // Marcar items de OC como COMPLETED
  await tx.purchaseOrderItem.updateMany({
    where: { purchaseOrderId },
    data: {
      status: "COMPLETED",
      invoiceItemId: newInvoice.id,
      closedAt: new Date(),
    },
  });

  // Verificar si todos los items estan completos
  const pendingItems = await tx.purchaseOrderItem.count({
    where: {
      purchaseOrderId,
      status: { not: "COMPLETED" },
    },
  });

  // Actualizar estado de OC
  await tx.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      status: pendingItems === 0 ? "COMPLETED" : "PARTIAL",
    },
  });
}
```

---

## Fase 3: Componentes UI

### 3.1 Tab de Ordenes de Compra en Detalle de OT

**Archivo:** `src/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/PurchaseOrdersTab.tsx`

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Plus,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface PurchaseOrdersTabProps {
  workOrderId: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  type: "SERVICES" | "PARTS";
  status: string;
  provider: { id: number; name: string };
  subtotal: number;
  total: number;
  items: any[];
  invoices: any[];
  createdAt: string;
  approvedAt?: string;
  sentAt?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Borrador", variant: "outline" },
  PENDING_APPROVAL: { label: "Pendiente Aprobacion", variant: "secondary" },
  APPROVED: { label: "Aprobada", variant: "default" },
  SENT: { label: "Enviada", variant: "default" },
  PARTIAL: { label: "Parcial", variant: "secondary" },
  COMPLETED: { label: "Completada", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  SERVICES: { label: "Servicios", color: "bg-blue-100 text-blue-800" },
  PARTS: { label: "Repuestos", color: "bg-green-100 text-green-800" },
};

export function PurchaseOrdersTab({ workOrderId }: PurchaseOrdersTabProps) {
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    poId: string;
    action: string;
    title: string;
    description: string;
  }>({ open: false, poId: "", action: "", title: "", description: "" });

  // Fetch purchase orders
  const { data: purchaseOrders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders", workOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders?workOrderId=${workOrderId}`);
      if (!res.ok) throw new Error("Error al cargar ordenes de compra");
      return res.json();
    },
  });

  // Mutation para cambiar estado
  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", workOrderId] });
      toast.success("Orden de compra actualizada");
      setActionDialog({ ...actionDialog, open: false });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAction = (poId: string, action: string) => {
    const titles: Record<string, string> = {
      submit: "Enviar a Aprobacion",
      approve: "Aprobar Orden",
      reject: "Rechazar Orden",
      send: "Marcar como Enviada",
      cancel: "Cancelar Orden",
    };

    const descriptions: Record<string, string> = {
      submit: "La orden sera enviada para aprobacion de un supervisor.",
      approve: "La orden quedara aprobada y lista para enviar al proveedor.",
      reject: "La orden volvera a estado borrador para correccion.",
      send: "La orden se marcara como enviada al proveedor.",
      cancel: "La orden sera cancelada permanentemente.",
    };

    setActionDialog({
      open: true,
      poId,
      action,
      title: titles[action] || "Confirmar",
      description: descriptions[action] || "Esta seguro?",
    });
  };

  const confirmAction = () => {
    statusMutation.mutate({ id: actionDialog.poId, action: actionDialog.action });
  };

  const getAvailableActions = (status: string) => {
    const actions: Record<string, string[]> = {
      DRAFT: ["submit", "cancel"],
      PENDING_APPROVAL: ["approve", "reject"],
      APPROVED: ["send", "cancel"],
      SENT: [], // Solo se cierra con factura
      PARTIAL: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    return actions[status] || [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Ordenes de Compra</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva OC
        </Button>
      </div>

      {!purchaseOrders?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay ordenes de compra para esta OT
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchaseOrders.map((po) => (
            <Card key={po.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {po.orderNumber}
                      <span className={`text-xs px-2 py-0.5 rounded ${typeConfig[po.type].color}`}>
                        {typeConfig[po.type].label}
                      </span>
                    </CardTitle>
                    <CardDescription>{po.provider.name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusConfig[po.status].variant}>
                      {statusConfig[po.status].label}
                    </Badge>
                    {getAvailableActions(po.status).length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {getAvailableActions(po.status).includes("submit") && (
                            <DropdownMenuItem onClick={() => handleAction(po.id, "submit")}>
                              <Send className="h-4 w-4 mr-2" />
                              Enviar a Aprobacion
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes("approve") && (
                            <DropdownMenuItem onClick={() => handleAction(po.id, "approve")}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Aprobar
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes("reject") && (
                            <DropdownMenuItem onClick={() => handleAction(po.id, "reject")}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Rechazar
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes("send") && (
                            <DropdownMenuItem onClick={() => handleAction(po.id, "send")}>
                              <FileText className="h-4 w-4 mr-2" />
                              Marcar Enviada
                            </DropdownMenuItem>
                          )}
                          {getAvailableActions(po.status).includes("cancel") && (
                            <DropdownMenuItem
                              onClick={() => handleAction(po.id, "cancel")}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripcion</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(item.unitPrice))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(item.total))}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total OC</div>
                    <div className="text-lg font-bold">{formatCurrency(Number(po.total))}</div>
                  </div>
                </div>
                {po.invoices.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Facturas Vinculadas</div>
                    {po.invoices.map((inv: any) => (
                      <div key={inv.id} className="flex justify-between text-sm">
                        <span>{inv.invoiceNumber}</span>
                        <span>{formatCurrency(Number(inv.totalAmount))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{actionDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} disabled={statusMutation.isPending}>
              {statusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### 3.2 Pagina de Listado de Ordenes de Compra

**Archivo:** `src/app/dashboard/purchases/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Filter, Eye } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default function PurchasesPage() {
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    search: "",
  });

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["purchase-orders", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.type) params.append("type", filters.type);

      const res = await fetch(`/api/purchase-orders?${params}`);
      if (!res.ok) throw new Error("Error al cargar");
      return res.json();
    },
  });

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { label: "Borrador", variant: "outline" },
    PENDING_APPROVAL: { label: "Pend. Aprobacion", variant: "secondary" },
    APPROVED: { label: "Aprobada", variant: "default" },
    SENT: { label: "Enviada", variant: "default" },
    PARTIAL: { label: "Parcial", variant: "secondary" },
    COMPLETED: { label: "Completada", variant: "default" },
    CANCELLED: { label: "Cancelada", variant: "destructive" },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ordenes de Compra</h1>
          <p className="text-muted-foreground">
            Gestiona las ordenes de compra de mantenimiento
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por numero de OC..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pend. Aprobacion</SelectItem>
                <SelectItem value="APPROVED">Aprobada</SelectItem>
                <SelectItem value="SENT">Enviada</SelectItem>
                <SelectItem value="COMPLETED">Completada</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({ ...filters, type: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="SERVICES">Servicios</SelectItem>
                <SelectItem value="PARTS">Repuestos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. OC</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>OT</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders?.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.orderNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {po.type === "SERVICES" ? "Servicios" : "Repuestos"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/maintenance/work-orders/${po.workOrder.id}`}
                        className="text-primary hover:underline"
                      >
                        {po.workOrder.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {po.workOrder.vehicle.licensePlate}
                      </div>
                    </TableCell>
                    <TableCell>{po.provider.name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(po.total))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[po.status].variant}>
                        {statusConfig[po.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(po.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/purchases/${po.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.3 Agregar Ruta al Sidebar

**Archivo:** `src/components/layout/SidebarRoutes/SidebarRoutes.data.ts`

```typescript
// AGREGAR en la seccion de rutas (despues de Facturas):
{
  label: "Compras",
  icon: ShoppingCart, // Importar de lucide-react
  href: "/dashboard/purchases",
  roles: ["OWNER", "MANAGER", "PURCHASER"],
},
```

---

## Checklist de Progreso

### Fase 1: Schema Prisma ✅ COMPLETADA

- [x] 1.1 Agregar enums (PurchaseOrderType, PurchaseOrderStatus, POItemStatus, WorkType, ItemSource)
- [x] 1.2 Agregar modelo PurchaseOrder
- [x] 1.3 Agregar modelo PurchaseOrderItem
- [x] 1.4 Modificar Tenant (agregar relacion purchaseOrders)
- [x] 1.5 Modificar WorkOrder (agregar workType y relacion purchaseOrders)
- [x] 1.6 Modificar WorkOrderItem (agregar itemSource y relacion purchaseOrderItems)
- [x] 1.7 Modificar Invoice (agregar purchaseOrderId y relacion)
- [x] 1.8 Modificar Provider (agregar relacion purchaseOrders)
- [x] 1.9 Modificar MantItem (agregar relacion purchaseOrderItems)
- [x] 1.10 Modificar MasterPart (agregar relacion purchaseOrderItems)
- [x] 1.11 Ejecutar migracion (usamos `prisma db push`)

### Fase 2: APIs Backend ✅ COMPLETADA

- [x] 2.1 Crear /api/purchase-orders/route.ts (GET, POST)
- [x] 2.2 Crear /api/purchase-orders/[id]/route.ts (GET, PATCH, DELETE)
- [x] 2.3 Crear /api/purchase-orders/[id]/items/route.ts (GET, POST)
- [x] 2.4 Modificar /api/maintenance/work-orders/route.ts (soportar workType)
- [x] 2.5 Modificar /api/invoices/route.ts (soportar purchaseOrderId)

### Fase 3: UI Components ✅ COMPLETADA

- [x] 3.1 Crear PurchaseOrdersTab.tsx
- [x] 3.2 Crear /dashboard/purchase-orders/page.tsx (listado)
- [x] 3.3 Crear /dashboard/purchase-orders/[id]/page.tsx (detalle individual)
- [x] 3.4 WorkOrderItemsTab ya muestra fuente (EXTERNAL/STOCK) - OC se ve en tab dedicado
- [x] 3.5 Agregar ruta "Órdenes Compra" al Sidebar (en Mantenimiento)
- [x] 3.6 Integrar PurchaseOrdersTab en detalle de OT

### Fase 4: Testing

- [ ] 4.1 Test flujo externo completo
- [ ] 4.2 Test flujo interno completo
- [ ] 4.3 Test flujo mixto
- [ ] 4.4 Test cierre parcial

---

## Notas Tecnicas

### Patrones a Seguir

1. **Autenticacion:** Usar `getCurrentUser()` de `@/lib/auth`
2. **Permisos:** Validar rol del usuario antes de operaciones
3. **Multi-tenant:** Siempre filtrar por `tenantId` del usuario
4. **Transacciones:** Usar `prisma.$transaction()` para operaciones atomicas
5. **Errores:** Retornar JSON con estructura `{ error: string }`

### Numeros Automaticos

```typescript
// Patron para generar numeros secuenciales
const year = new Date().getFullYear();
const prefix = 'OC';
const lastRecord = await prisma.purchaseOrder.findFirst({
  where: {
    tenantId: user.tenantId,
    orderNumber: { startsWith: `${prefix}-${year}-` },
  },
  orderBy: { orderNumber: 'desc' },
});

let nextNumber = 1;
if (lastRecord) {
  const parts = lastRecord.orderNumber.split('-');
  nextNumber = parseInt(parts[2] || '0') + 1;
}
const orderNumber = `${prefix}-${year}-${nextNumber.toString().padStart(6, '0')}`;
```

### Formateo de Moneda

```typescript
// Usar la funcion existente
import { formatCurrency } from '@/lib/utils';
// Ejemplo: formatCurrency(15000) -> "$15,000"
```

### Estados de OC y Transiciones Validas

```
DRAFT -> PENDING_APPROVAL (submit)
PENDING_APPROVAL -> APPROVED (approve)
PENDING_APPROVAL -> DRAFT (reject)
APPROVED -> SENT (send)
SENT -> PARTIAL (factura parcial)
SENT -> COMPLETED (factura total)
DRAFT/PENDING/APPROVED -> CANCELLED (cancel)
```

---

## Proximos Pasos

### Fase 4: Testing Manual (PENDIENTE)

El desarrollo está completo. Solo falta realizar pruebas manuales:

1. **Test flujo externo completo:**
   - Crear OT desde alertas
   - Crear OC manual (o via API)
   - Flujo: DRAFT -> PENDING_APPROVAL -> APPROVED -> SENT
   - Crear factura con purchaseOrderId -> OC se cierra a COMPLETED

2. **Test flujo interno:**
   - Crear OT con items de inventario
   - Verificar que no genera OC

3. **Test flujo mixto:**
   - OT con items externos e internos
   - Solo items externos generan OC

4. **Test cierre parcial:**
   - OC con múltiples items
   - Factura parcial -> OC pasa a PARTIAL

### Comandos útiles:

```bash
# Iniciar servidor de desarrollo
pnpm dev

# Verificar esquema
npx prisma validate

# Ver datos en BD
npx prisma studio
```

### URLs para testing:

- Dashboard: http://localhost:3000/dashboard
- OTs: http://localhost:3000/dashboard/maintenance/work-orders
- Órdenes Compra: http://localhost:3000/dashboard/purchase-orders
- Facturas: http://localhost:3000/dashboard/invoices

---

**Ultima actualizacion:** 2026-02-04
**Progreso:** 22/28 items completados (Fase 1-3 completas, Fase 4 testing pendiente)

claude --resume 0edbadd4-d216-4565-87b9-da7ee334ccc6
