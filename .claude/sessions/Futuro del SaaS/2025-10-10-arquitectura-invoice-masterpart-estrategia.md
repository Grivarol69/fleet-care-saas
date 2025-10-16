# Sesión 10 Octubre 2025 - Arquitectura Invoice + MasterPart + Estrategia de Datos Compartidos

**Fecha**: 10 Octubre 2025
**Branch**: `develop`
**Commit base**: `489d3a0` - Sistema de alertas premium funcionando

---

## 🎯 Contexto de la Sesión

### Input del Cliente (Responsable Mantenimiento):

**Pregunta clave**: ¿Cómo se facturan los servicios de mantenimiento?

**Respuesta**:
> "En la factura de compra del servicio (ej: cambio de filtro de aceite) se discrimina cada elemento con su costo, pero **NO se agrega la mano de obra**."

**Ejemplos reales**:
```
Factura Proveedor XYZ - Cambio aceite motor:
- Aceite Shell Helix 5W-40 (4L)    $140,000
- Filtro aceite BOSCH               $45,000
- Arandela tapón cárter             $2,000
                          TOTAL:    $187,000

❌ NO incluye: "Mano de obra $50,000"
```

### Implicaciones:
1. **No necesitamos inventario propio** - Solo catálogo de referencia
2. **Sí necesitamos master de artículos** - Para vincular factura con item trabajo
3. **Sí necesitamos discriminar** - MantItem tipo "Acción" vs "Repuesto"
4. **Sí necesitamos histórico de precios** - Por artículo + proveedor

---

## 💡 Estrategia de Negocio CLAVE

### Visión del Pitch de Ventas:

> "No vendemos tecnología. Vendemos AHORRO y CONTROL DE COSTOS."

**Preguntas que el sistema debe responder** (vendedoras de software):
1. ✅ ¿Cuánto invertimos en este vehículo este año?
2. ✅ ¿Qué proveedor cobra menos por filtros?
3. ✅ Listado de compras: artículo, precio, proveedor, quién autorizó
4. ✅ ¿Presupuesto necesario para línea Toyota en 2026?
5. ✅ ¿Conviene Toyota o Nissan? (TCO - Total Cost of Ownership)
6. ✅ ¿Este vehículo está bien o mal mantenido?
7. ✅ **IA sugeriendo plan de acción para abaratar costos** 🤖

**Diferenciador vs Competencia**:
- Competencia: "Tenemos módulo de mantenimiento"
- Nosotros: "Le mostramos que Proveedor B le cobra 15% más y le ahorramos $2.3M/año"

---

## 🏗️ Arquitectura Propuesta - Fase por Fase

### 📊 Decisiones de Diseño Fundamentales:

#### 1. ¿Un MantItem puede tener múltiples artículos?
**DECISIÓN**: **SÍ** - No limitarnos.

**Razón**:
- "Cambio aceite motor" incluye: aceite + filtro + arandela
- "Mantenimiento 5,000 km" incluye: 8-10 artículos diferentes

**Solución**: Tabla intermedia `MantItemPart` (many-to-many)

#### 2. ¿MantItem necesita discriminación de tipo?
**DECISIÓN**: **SÍ** - Agregar enum `ItemType`

**Tipos**:
- `ACTION` - Inspección, revisión (no factura artículo)
- `PART` - Repuesto facturable (filtro, aceite, etc.)
- `SERVICE` - Servicio completo externo (mano obra + materiales del proveedor)

#### 3. ¿Necesitamos histórico de precios por proveedor?
**DECISIÓN**: **SÍ** - `PartPriceHistory`

**Razón**: Responder "¿Qué proveedor cobra menos?" y detectar aumentos abusivos.

#### 4. ¿Campo observaciones técnicas en alertas?
**DECISIÓN**: **SÍ** - `MantItem.technicalNotes`

**Ejemplo**:
> "Debe colocarse aceite SAE 5W-40 sintético. NO usar mineral."

**Beneficio**:
- ✅ Técnico sabe exactamente qué necesita
- ❌ Previene errores → evita correctivos $$$

---

## 📐 Schema Prisma Completo

### Diseño Incremental: MVP → Premium

```prisma
// ============================================
// FASE 1: MVP (Sprint 1.5) - LO MÍNIMO VIABLE
// ============================================

enum ItemType {
  ACTION   // Inspección, revisión (no factura artículo)
  PART     // Repuesto facturable
  SERVICE  // Servicio completo del proveedor
}

// 1. Master de Artículos (Catálogo compartido entre tenants)
model MasterPart {
  id              String   @id @default(cuid())
  tenantId        String?  // NULL = compartido globalmente, FK = específico del tenant

  // Identificación
  code            String   @unique  // "BOSCH-123", "SHELL-5W40-SYNT"
  description     String              // "Filtro aceite motor BOSCH"
  category        String              // "FILTROS", "ACEITES", "LUBRICANTES"
  subcategory     String?             // "FILTROS_ACEITE", "FILTROS_AIRE"
  unit            String   @default("UNIDAD")  // "UNIDAD", "LITRO", "GALÓN", "KG"

  // Precio referencia (último conocido)
  referencePrice  Float?
  lastPriceUpdate DateTime?

  // Specs técnicas (JSON flexible para futuro)
  specifications  Json?    // { "viscosity": "5W-40", "type": "synthetic", "apiRating": "SN/CF" }

  // Alternativas/Equivalentes (FASE 2)
  alternativeFor  String?  // FK a otro MasterPart (ej: genérico equivalente)
  alternativePart MasterPart? @relation("Alternatives", fields: [alternativeFor], references: [id], onDelete: SetNull)
  alternatives    MasterPart[] @relation("Alternatives")

  // Metadata
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relaciones
  mantItemParts   MantItemPart[]
  invoiceItems    InvoiceItem[]
  priceHistory    PartPriceHistory[]
  compatibilities PartCompatibility[]  // FASE 3

  @@index([category])
  @@index([tenantId])
  @@index([code])
}

// 2. MantItem extendido con discriminación de tipo
model MantItem {
  id              String   @id @default(cuid())
  templateId      String
  template        MaintenanceTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  // ... campos actuales (name, description, intervalKm, estimatedHours, priority, etc.) ...

  // NUEVO: Discriminación de tipo
  type            ItemType  @default(ACTION)

  // NUEVO: Costo estimado (suma automática de parts o manual)
  estimatedCost   Float?

  // NUEVO: Recomendaciones técnicas para el técnico
  technicalNotes  String?   @db.Text  // "Debe colocarse aceite SAE 5W-40 sintético"

  // Relaciones
  parts           MantItemPart[]  // Items tipo PART vinculan artículos
  programItems    VehicleProgramItem[]
  workOrderItems  WorkOrderItem[]

  @@index([templateId])
  @@index([type])
}

// 3. Tabla intermedia: MantItem ↔ MasterPart (many-to-many)
model MantItemPart {
  id            String   @id @default(cuid())
  mantItemId    String
  mantItem      MantItem @relation(fields: [mantItemId], references: [id], onDelete: Cascade)
  masterPartId  String
  masterPart    MasterPart @relation(fields: [masterPartId], references: [id], onDelete: Restrict)

  quantity      Float    @default(1)  // Ej: 4.5 litros de aceite
  isRequired    Boolean  @default(true)  // Requerido vs opcional
  isPrimary     Boolean  @default(false) // Artículo principal del item

  // Notas específicas de este vinculo
  notes         String?  // "Alternativamente usar CASTROL 5W-40"

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([mantItemId, masterPartId])
  @@index([mantItemId])
  @@index([masterPartId])
}

// 4. MaintenanceAlert extendido (hereda info técnica)
model MaintenanceAlert {
  // ... campos actuales ...

  // NUEVO: Info técnica heredada de MantItem al generarse
  technicalNotes    String?  @db.Text  // Copiado de MantItem.technicalNotes
  recommendedParts  Json?    // Snapshot de parts recomendados al momento de generar alerta

  // NUEVO: Admin puede agregar notas específicas del caso
  customNotes       String?  @db.Text  // "En este vehículo usar 10W-40 por clima extremo"
}

// 5. Invoice (Factura del proveedor)
model Invoice {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Identificación factura
  invoiceNumber   String   // Número de factura del proveedor
  invoiceDate     DateTime // Fecha emisión factura
  dueDate         DateTime? // Fecha vencimiento pago

  // Proveedor
  supplierId      String
  supplier        Supplier @relation(fields: [supplierId], references: [id], onDelete: Restrict)

  // Vinculación con trabajo (opcional si factura es de WO)
  workOrderId     String?
  workOrder       WorkOrder? @relation(fields: [workOrderId], references: [id], onDelete: SetNull)

  // Montos
  subtotal        Float
  taxAmount       Float    @default(0)
  totalAmount     Float
  currency        String   @default("COP")

  // Estado
  status          InvoiceStatus @default(PENDING)

  // Aprobación y auditoría
  approvedBy      String?
  approver        User?    @relation("InvoiceApprover", fields: [approvedBy], references: [id], onDelete: SetNull)
  approvedAt      DateTime?

  registeredBy    String   // Usuario que registró la factura
  registrar       User     @relation("InvoiceRegistrar", fields: [registeredBy], references: [id], onDelete: Restrict)

  // Notas y adjuntos
  notes           String?  @db.Text
  attachmentUrl   String?  // URL a factura escaneada/PDF

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relaciones
  items           InvoiceItem[]
  payments        InvoicePayment[]  // FASE 2
  priceHistory    PartPriceHistory[]

  @@unique([tenantId, invoiceNumber])
  @@index([tenantId])
  @@index([supplierId])
  @@index([workOrderId])
  @@index([status])
  @@index([invoiceDate])
}

enum InvoiceStatus {
  PENDING      // Registrada, pendiente aprobación
  APPROVED     // Aprobada para pago
  PAID         // Pagada
  OVERDUE      // Vencida
  CANCELLED    // Cancelada
}

// 6. InvoiceItem (Línea de factura - granular)
model InvoiceItem {
  id              String   @id @default(cuid())
  invoiceId       String
  invoice         Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  // Vinculación con catálogo (CLAVE para analytics)
  masterPartId    String?  // Nullable: permite registrar sin catálogo inicialmente
  masterPart      MasterPart? @relation(fields: [masterPartId], references: [id], onDelete: SetNull)

  // Vinculación con trabajo realizado (traza: alerta → WO → factura)
  workOrderItemId String?
  workOrderItem   WorkOrderItem? @relation(fields: [workOrderItemId], references: [id], onDelete: SetNull)

  // Datos de factura (lo que dice el documento físico)
  description     String   // Texto exacto de la factura
  quantity        Float
  unitPrice       Float    // Precio real pagado
  subtotal        Float
  taxRate         Float    @default(0)
  taxAmount       Float    @default(0)
  total           Float

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([invoiceId])
  @@index([masterPartId])
  @@index([workOrderItemId])
}

// 7. Histórico de precios por artículo + proveedor (GOLD MINE para analytics)
model PartPriceHistory {
  id              String   @id @default(cuid())
  tenantId        String   // Precios son específicos del tenant

  // Artículo
  masterPartId    String
  masterPart      MasterPart @relation(fields: [masterPartId], references: [id], onDelete: Cascade)

  // Proveedor
  supplierId      String
  supplier        Supplier @relation(fields: [supplierId], references: [id], onDelete: Restrict)

  // Precio y contexto
  price           Float
  quantity        Float    @default(1)  // Por si aplican descuentos por volumen
  recordedAt      DateTime @default(now())

  // Auditoría (RESPONDE: "¿Quién autorizó esta compra?")
  invoiceId       String?
  invoice         Invoice? @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  approvedBy      String?
  approver        User?    @relation(fields: [approvedBy], references: [id], onDelete: SetNull)
  purchasedBy     String?  // Usuario que gestionó la compra
  purchaser       User?    @relation(fields: [purchasedBy], references: [id], onDelete: SetNull)

  // Metadata
  createdAt       DateTime @default(now())

  @@index([masterPartId, supplierId])
  @@index([tenantId])
  @@index([recordedAt])
  @@index([approvedBy])
}

// ============================================
// FASE 2: Post-MVP (Sprint 2-3) - ANALYTICS PREMIUM
// ============================================

// 8. Pagos de facturas (control financiero)
model InvoicePayment {
  id              String   @id @default(cuid())
  invoiceId       String
  invoice         Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  amount          Float
  paymentDate     DateTime
  paymentMethod   String   // "TRANSFERENCIA", "CHEQUE", "EFECTIVO"
  referenceNumber String?  // Número de transferencia/cheque

  registeredBy    String
  registrar       User     @relation(fields: [registeredBy], references: [id], onDelete: Restrict)

  notes           String?
  createdAt       DateTime @default(now())

  @@index([invoiceId])
  @@index([paymentDate])
}

// ============================================
// FASE 3: Premium (Sprint 4+) - IA Y OPTIMIZACIÓN
// ============================================

// 9. Compatibilidad de artículos por vehículo (para sugerir alternativas)
model PartCompatibility {
  id              String   @id @default(cuid())
  masterPartId    String
  masterPart      MasterPart @relation(fields: [masterPartId], references: [id], onDelete: Cascade)

  // Filtros de compatibilidad (NULL = aplica a todos)
  brand           String?   // "Toyota"
  model           String?   // "Hilux"
  yearFrom        Int?      // 2020
  yearTo          Int?      // 2024
  engineType      String?   // "Diesel 2.8L", "Gasolina 2.7L"
  transmission    String?   // "Manual", "Automática"

  // Nivel de compatibilidad
  compatibility   CompatibilityLevel @default(COMPATIBLE)

  notes           String?  @db.Text
  verifiedBy      String?  // Usuario que verificó compatibilidad
  verifiedAt      DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([masterPartId])
  @@index([brand, model])
}

enum CompatibilityLevel {
  RECOMMENDED   // OEM o recomendado fabricante
  COMPATIBLE    // Compatible genérico
  CONDITIONAL   // Compatible bajo condiciones
  INCOMPATIBLE  // No compatible
}

// ============================================
// MODIFICACIONES A MODELOS EXISTENTES
// ============================================

// WorkOrder - Agregar relación con Invoice
model WorkOrder {
  // ... campos actuales ...

  // NUEVO: Relación con facturas
  invoices        Invoice[]
}

// WorkOrderItem - Agregar relación con InvoiceItem
model WorkOrderItem {
  // ... campos actuales ...

  // NUEVO: Relación con items de factura
  invoiceItems    InvoiceItem[]
}

// Supplier - Agregar relaciones
model Supplier {
  // ... campos actuales ...

  // NUEVO: Relaciones
  invoices        Invoice[]
  priceHistory    PartPriceHistory[]
}

// User - Agregar relaciones de auditoría
model User {
  // ... campos actuales ...

  // NUEVO: Auditoría de compras
  invoicesApproved    Invoice[] @relation("InvoiceApprover")
  invoicesRegistered  Invoice[] @relation("InvoiceRegistrar")
  priceHistoryApproved PartPriceHistory[]
  priceHistoryPurchased PartPriceHistory[] @relation("PurchasedBy")
  paymentsRegistered   InvoicePayment[]
}
```

---

## 🔄 Flujo Completo: Alerta → Factura → Analytics

### Ejemplo Real Paso a Paso:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SETUP INICIAL (Admin configura template)                    │
└─────────────────────────────────────────────────────────────────┘

Admin crea MaintenanceTemplate "Paquete 5,000 km Toyota Hilux"
  └─ MantItem #1: "Cambio aceite motor"
       ├─ type: PART
       ├─ technicalNotes: "Debe colocarse aceite SAE 5W-40 sintético"
       ├─ estimatedCost: 187,000 (suma de parts)
       └─ parts:
           ├─ MantItemPart #1:
           │   ├─ masterPart: "SHELL-5W40-SYNT" (Aceite Shell Helix Ultra)
           │   ├─ quantity: 4.5
           │   ├─ isRequired: true
           │   └─ isPrimary: true
           ├─ MantItemPart #2:
           │   ├─ masterPart: "BOSCH-FILTER-123" (Filtro aceite)
           │   ├─ quantity: 1
           │   └─ isRequired: true
           └─ MantItemPart #3:
               ├─ masterPart: "WASHER-M14" (Arandela)
               ├─ quantity: 1
               └─ isRequired: false

  └─ MantItem #2: "Inspección visual frenos"
       ├─ type: ACTION (sin parts vinculados)
       └─ estimatedHours: 0.5

┌─────────────────────────────────────────────────────────────────┐
│ 2. GENERACIÓN AUTOMÁTICA DE ALERTA                             │
└─────────────────────────────────────────────────────────────────┘

Chofer registra odómetro: 5,020 km
  ↓
MaintenanceAlertService.checkAndGenerateAlerts()
  ↓
MaintenanceAlert creada:
  ├─ programItemId: FK a VehicleProgramItem
  ├─ status: ACTIVE
  ├─ priority: CRITICAL
  ├─ estimatedCost: 187,000 (heredado)
  ├─ technicalNotes: "Debe colocarse aceite SAE 5W-40 sintético" (copiado)
  └─ recommendedParts: [snapshot JSON de parts]

┌─────────────────────────────────────────────────────────────────┐
│ 3. ADMIN VE ALERTA EN UI                                       │
└─────────────────────────────────────────────────────────────────┘

Navega a /dashboard/maintenance/alerts
  ↓
Ve tabla compacta:
┌──┬──┬─────────┬────────┬────────┬────────┬────────┬────────┬──┐
│☐│🚗│BCD-890  │🔴1     │5,020 km│20 km   │$187k   │1.5 hrs │▼│
└──┴──┴─────────┴────────┴────────┴────────┴────────┴────────┴──┘
  ↓
Click expandir:
  📋 Recomendación técnica:
  "Debe colocarse aceite SAE 5W-40 sintético"

  📦 Artículos requeridos:
  ✓ Aceite Shell Helix Ultra 5W-40 (4.5 L) - $140,000
  ✓ Filtro aceite BOSCH-123 (1 un) - $45,000
  ○ Arandela tapón cárter M14 (1 un) - $2,000 (opcional)

┌─────────────────────────────────────────────────────────────────┐
│ 4. CREACIÓN DE WORKORDER                                        │
└─────────────────────────────────────────────────────────────────┘

Admin selecciona alertas → Click "Crear Orden de Trabajo"
  ↓
WorkOrder #5 creada:
  ├─ vehicleId: "vehicle-123" (Toyota Hilux BCD-890)
  ├─ status: PENDING
  ├─ totalEstimatedCost: 187,000
  └─ items:
      └─ WorkOrderItem #1:
          ├─ mantItemId: "mant-item-123" (Cambio aceite motor)
          ├─ maintenanceAlertId: "alert-456"
          ├─ estimatedCost: 187,000
          └─ technicalNotes: "Debe colocarse aceite SAE 5W-40..."

┌─────────────────────────────────────────────────────────────────┐
│ 5. EJECUCIÓN DEL TRABAJO                                        │
└─────────────────────────────────────────────────────────────────┘

Técnico ejecuta trabajo en taller externo
Proveedor "AutoServicio XYZ" entrega factura física

┌─────────────────────────────────────────────────────────────────┐
│ 6. REGISTRO DE FACTURA (Admin)                                  │
└─────────────────────────────────────────────────────────────────┘

Admin ingresa factura al sistema:

Invoice:
  ├─ invoiceNumber: "F-001234"
  ├─ supplierId: "autoservicio-xyz"
  ├─ workOrderId: "wo-5" (vincula con WO)
  ├─ invoiceDate: 2025-10-10
  ├─ subtotal: 187,000
  ├─ taxAmount: 0
  ├─ totalAmount: 187,000
  ├─ status: PENDING
  ├─ registeredBy: "user-admin"
  └─ items:
      ├─ InvoiceItem #1:
      │   ├─ masterPartId: "SHELL-5W40-SYNT" (seleccionado de dropdown)
      │   ├─ workOrderItemId: "woi-789" (vincula con item de WO)
      │   ├─ description: "Aceite Shell Helix Ultra 5W-40 sintético"
      │   ├─ quantity: 4.5
      │   ├─ unitPrice: 31,111 (140k / 4.5)
      │   └─ total: 140,000
      ├─ InvoiceItem #2:
      │   ├─ masterPartId: "BOSCH-FILTER-123"
      │   ├─ workOrderItemId: "woi-789"
      │   ├─ description: "Filtro aceite BOSCH"
      │   ├─ quantity: 1
      │   ├─ unitPrice: 45,000
      │   └─ total: 45,000
      └─ InvoiceItem #3:
          ├─ masterPartId: "WASHER-M14"
          ├─ workOrderItemId: "woi-789"
          ├─ quantity: 1
          ├─ unitPrice: 2,000
          └─ total: 2,000

┌─────────────────────────────────────────────────────────────────┐
│ 7. ACTUALIZACIÓN AUTOMÁTICA DE HISTÓRICO (Trigger DB)          │
└─────────────────────────────────────────────────────────────────┘

Sistema crea PartPriceHistory automáticamente:

PartPriceHistory #1:
  ├─ masterPartId: "SHELL-5W40-SYNT"
  ├─ supplierId: "autoservicio-xyz"
  ├─ price: 31,111
  ├─ invoiceId: "invoice-123"
  ├─ approvedBy: "user-admin"
  └─ recordedAt: 2025-10-10

PartPriceHistory #2:
  ├─ masterPartId: "BOSCH-FILTER-123"
  ├─ supplierId: "autoservicio-xyz"
  ├─ price: 45,000
  └─ ...

Sistema actualiza MasterPart.referencePrice:
  - SHELL-5W40-SYNT: $31,111 (actualizado)
  - BOSCH-FILTER-123: $45,000 (actualizado)

┌─────────────────────────────────────────────────────────────────┐
│ 8. ANALYTICS Y REPORTES (Killer Features)                      │
└─────────────────────────────────────────────────────────────────┘

Ahora admin puede consultar:

🔍 Query 1: "Histórico de precios - Filtro BOSCH-123"
┌──────────────┬─────────────────┬──────────┬────────────┬──────────────┐
│ Fecha        │ Proveedor       │ Precio   │ Autorizado │ Factura      │
├──────────────┼─────────────────┼──────────┼────────────┼──────────────┤
│ 2025-10-10   │ AutoServicio XYZ│ $45,000  │ Juan Pérez │ F-001234     │
│ 2025-08-15   │ Repuestos ABC   │ $42,000  │ Juan Pérez │ F-000987     │
│ 2025-06-20   │ AutoServicio XYZ│ $46,500  │ María López│ F-000756     │
└──────────────┴─────────────────┴──────────┴────────────┴──────────────┘
💡 Insight: Proveedor ABC cobra 7% menos → Ahorro potencial

🔍 Query 2: "¿Cuánto gastamos en Toyota Hilux BCD-890 en 2025?"
Total: $4,250,000
Desglose:
  - Aceites: $840,000 (6 cambios)
  - Filtros: $450,000
  - Frenos: $980,000
  - Neumáticos: $1,980,000

🔍 Query 3: "Comparar TCO: Toyota vs Nissan"
Toyota Hilux (promedio 30 vehículos): $2,100,000/año
Nissan Frontier (promedio 15 vehículos): $2,800,000/año
💡 Diferencia: Toyota 33% más eficiente → $700k ahorro/año

🤖 Query 4: "IA sugiere acción" (FASE 3)
Detecté 3 oportunidades de ahorro:
1. Cambiar a Proveedor ABC en filtros → $180,000/año
2. Usar aceite sintético de larga duración → $320,000/año
3. Mantenimientos preventivos evitarían $1,200,000 en correctivos
TOTAL AHORRO POTENCIAL: $1,700,000/año
```

---

## 🚀 Estrategia de Datos Compartidos (GAME CHANGER)

### Visión del Modelo de Negocio:

> **"El sufrimiento de carga de la primera empresa beneficia a todas las siguientes."**

### Implementación:

```prisma
model MasterPart {
  tenantId  String?  // NULL = dato global compartido
                     // FK = dato específico del tenant
}
```

### Lógica de Compartición:

```typescript
// Al buscar artículos, unir globales + específicos del tenant
const parts = await prisma.masterPart.findMany({
  where: {
    OR: [
      { tenantId: null },           // Globales (todos)
      { tenantId: currentTenantId } // Específicos del tenant
    ],
    category: 'FILTROS_ACEITE'
  }
})
```

### Ejemplo Práctico:

```
EMPRESA A (Primera - Transportes Andinos):
└─ Tiene Toyota Hilux 2024
└─ Admin carga manualmente:
    ├─ MasterPart: "BOSCH-FILTER-123" (tenantId: NULL → global)
    ├─ MasterPart: "SHELL-5W40-SYNT" (tenantId: NULL → global)
    └─ MaintenanceTemplate "Paquete 5000 km Toyota Hilux 2024"
        └─ MantItems vinculados a parts globales

EMPRESA B (Segunda - Logística del Valle):
└─ Tiene Toyota Hilux 2024
└─ Al crear template, sistema sugiere:
    💡 "Detectamos template compatible: Paquete 5000 km Toyota Hilux 2024"
    💡 "¿Desea importarlo?"
    └─ Admin: "Sí" → Template copiado automáticamente
    └─ MasterParts ya existen (globales) → 0 carga manual

EMPRESA C (Tercera - Entregas Rápidas):
└─ Tiene Toyota Hilux 2024
└─ Template YA EXISTE → Onboarding instantáneo
└─ Solo configura su flota → 5 minutos vs 2 horas
```

### Datos Globales vs Específicos:

**GLOBALES (tenantId = NULL)** - Compartidos:
- ✅ MasterPart (artículos genéricos)
- ✅ PartCompatibility (compatibilidades vehiculares)
- ✅ MaintenanceTemplate (plantillas base por marca/modelo)

**ESPECÍFICOS (tenantId = FK)** - Privados:
- 🔒 Vehicles (flota del cliente)
- 🔒 WorkOrder (órdenes del cliente)
- 🔒 Invoice (facturas del cliente)
- 🔒 PartPriceHistory (precios pagados por el cliente)
- 🔒 Supplier (proveedores del cliente)
- 🔒 MantItem personalizados (modificaciones específicas)

### Flujo de Creación de Datos Globales:

```typescript
// Al crear MasterPart, admin decide:

┌─────────────────────────────────────────────┐
│  Nuevo Artículo: Filtro BOSCH-123           │
├─────────────────────────────────────────────┤
│  [x] Compartir con otros usuarios           │
│      Este artículo es genérico y puede      │
│      beneficiar a otras empresas            │
│                                             │
│  [ ] Mantener privado                       │
│      Este artículo es específico de         │
│      mi empresa                             │
└─────────────────────────────────────────────┘

// Si marca "Compartir":
await prisma.masterPart.create({
  data: {
    code: "BOSCH-123",
    description: "Filtro aceite motor BOSCH",
    tenantId: null  // ← GLOBAL
  }
})

// Si marca "Privado":
await prisma.masterPart.create({
  data: {
    code: "CUSTOM-FILTER-XYZ",
    description: "Filtro modificado para nuestros vehículos",
    tenantId: "tenant-abc"  // ← PRIVADO
  }
})
```

### Beneficios Medibles:

| Métrica | Empresa 1 | Empresa 2 | Empresa 10 |
|---------|-----------|-----------|------------|
| Tiempo onboarding | 8 horas | 2 horas | 30 minutos |
| MasterParts a cargar | 150 | 20 | 5 |
| Templates a configurar | 8 | 2 | 0 |
| Tiempo hasta productivo | 1 semana | 1 día | 2 horas |

**ROI para Fleet Care**:
- Empresa 1: 8h trabajo manual
- Empresa 10: 0.5h trabajo manual
- **Eficiencia: 1,600% mejora en onboarding**

---

## 💎 Killer Features para Pitch de Ventas

### 1. 🤖 IA Sugiere Ahorros (FASE 3)

**Ejemplo visual para demo**:

```
┌───────────────────────────────────────────────────────────────┐
│ 🤖 OPORTUNIDADES DE AHORRO DETECTADAS                         │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ 1. 💰 Cambiar de proveedor en filtros                        │
│    Proveedor actual (AutoServicio XYZ): $45,000/unidad      │
│    Proveedor sugerido (Repuestos ABC): $42,000/unidad       │
│    Frecuencia: 30 cambios/año                                │
│    AHORRO ANUAL: $90,000                                      │
│    [Ver Detalle] [Aplicar Sugerencia]                        │
│                                                               │
│ 2. 🔧 Usar aceite sintético de larga duración                │
│    Actual: Cambio cada 5,000 km ($140,000)                   │
│    Sugerido: Cambio cada 10,000 km ($180,000)                │
│    Ahorro: -2 cambios/año por vehículo                       │
│    AHORRO ANUAL (flota 30 veh): $420,000                     │
│    [Ver Análisis Técnico]                                    │
│                                                               │
│ 3. ⚠️ Prevenir correctivos con preventivo proactivo          │
│    Detectamos 12 correctivos evitables en 2025               │
│    Costo correctivos: $3,200,000                             │
│    Costo preventivo: $480,000                                │
│    AHORRO POTENCIAL: $2,720,000                              │
│    [Ver Casos]                                                │
│                                                               │
│ 🎯 AHORRO TOTAL ANUAL: $3,230,000                            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 2. 📊 Comparador de TCO por Marca (FASE 2)

```
┌───────────────────────────────────────────────────────────────┐
│ 📊 TOTAL COST OF OWNERSHIP (TCO) - 2025                      │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ Toyota Hilux (30 vehículos)                                   │
│ ████████████████████░░░░░░░░░░ $2,100,000/año (promedio)    │
│                                                               │
│ Nissan Frontier (15 vehículos)                                │
│ ████████████████████████████░░ $2,800,000/año (promedio)    │
│                                                               │
│ Chevrolet Colorado (5 vehículos)                              │
│ ██████████████████████████████ $3,100,000/año (promedio)    │
│                                                               │
│ 💡 INSIGHT:                                                   │
│ Toyota es 33% más económico que Nissan                        │
│ En renovación de flota, priorizar Toyota                      │
│ Ahorro potencial al unificar flota: $1,200,000/año           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 3. 🔍 Auditoría Completa de Gastos (MVP)

```sql
-- Query que responde: "¿Quién autorizó todas las compras de filtros en 2025?"

SELECT
  i.invoiceNumber,
  i.invoiceDate,
  s.name AS proveedor,
  mp.description AS articulo,
  ii.quantity,
  ii.unitPrice,
  ii.total,
  u1.name AS autorizado_por,
  u2.name AS registrado_por
FROM Invoice i
JOIN InvoiceItem ii ON i.id = ii.invoiceId
JOIN MasterPart mp ON ii.masterPartId = mp.id
JOIN Supplier s ON i.supplierId = s.id
LEFT JOIN User u1 ON i.approvedBy = u1.id
LEFT JOIN User u2 ON i.registeredBy = u2.id
WHERE mp.category = 'FILTROS'
  AND YEAR(i.invoiceDate) = 2025
ORDER BY i.invoiceDate DESC;
```

**Output visual**:
```
┌──────────┬────────────┬──────────────┬─────────────┬────────┬─────────┬────────────┬────────────┐
│ Factura  │ Fecha      │ Proveedor    │ Artículo    │ Cant   │ Precio  │ Autorizó   │ Registró   │
├──────────┼────────────┼──────────────┼─────────────┼────────┼─────────┼────────────┼────────────┤
│ F-001234 │ 2025-10-10 │ AutoServ XYZ │ BOSCH-123   │ 1      │ $45,000 │ Juan Pérez │ Ana García │
│ F-001189 │ 2025-09-15 │ Repuestos ABC│ BOSCH-123   │ 1      │ $42,000 │ Juan Pérez │ Ana García │
│ F-001087 │ 2025-08-20 │ AutoServ XYZ │ MANN-456    │ 2      │ $38,000 │ María López│ Carlos Ruiz│
└──────────┴────────────┴──────────────┴─────────────┴────────┴─────────┴────────────┴────────────┘

💡 INSIGHT: AutoServicio XYZ cobra 7% más que Repuestos ABC en BOSCH-123
```

---

## 📋 Plan de Implementación - Roadmap

### ✅ FASE 1: MVP (Sprint 1.5) - 3 días
**Objetivo**: Cerrar ciclo preventivo básico

**Tareas**:
1. ✅ Migración Prisma con modelos base:
   - MasterPart (básico)
   - MantItem.type + technicalNotes
   - MantItemPart (tabla intermedia)
   - Invoice + InvoiceItem
   - PartPriceHistory

2. ✅ CRUD MasterPart (admin):
   - Listar artículos
   - Crear artículo (con flag global/privado)
   - Editar artículo
   - Buscar por código/descripción

3. ✅ Modificar CreateWorkOrderModal:
   - Mostrar `technicalNotes` en preview
   - Mostrar `recommendedParts` (lista de artículos)

4. ✅ Pantalla registro de factura:
   - Crear Invoice (header)
   - Agregar InvoiceItems
   - Vincular con MasterPart (dropdown con search)
   - Vincular con WorkOrderItem (opcional)
   - Auto-crear PartPriceHistory (trigger)

5. ✅ Reporte básico: "Histórico de precios por artículo"

**Entregables**:
- Admin puede registrar facturas
- Sistema trackea precios históricos
- Flujo completo: Alerta → WO → Factura → Analytics

---

### 🚧 FASE 2: Analytics Premium (Sprint 2-3) - 5 días
**Objetivo**: Reportes que venden el software

**Tareas**:
1. Dashboard "Cost Analytics":
   - TCO por vehículo
   - TCO por marca/modelo
   - Gastos por categoría (filtros, aceites, frenos, etc.)
   - Top 5 vehículos más costosos
   - Top 5 proveedores más caros

2. Comparador de proveedores:
   - Lista artículos
   - Muestra precio por proveedor
   - Ordena por precio ascendente
   - Calcula ahorro potencial

3. InvoicePayment (control financiero):
   - Registrar pagos
   - Estado: Pending → Approved → Paid
   - Facturas vencidas (overdue)

4. Importador de catálogo CSV:
   - Subir CSV con artículos
   - Parsear y crear MasterParts
   - Validación de duplicados

**Entregables**:
- Reportes accionables para CEO/CFO
- Comparación de proveedores funcional
- Control financiero de facturas

---

### 🤖 FASE 3: IA y Optimización (Sprint 4+) - 8 días
**Objetivo**: Diferenciador absoluto vs competencia

**Tareas**:
1. PartCompatibility:
   - Definir compatibilidades por vehículo
   - Sugerir alternativas al crear WO
   - "Este vehículo también puede usar: [lista]"

2. Motor de recomendaciones básico (reglas):
   - Detectar proveedor más caro en categoría → Sugerir cambio
   - Detectar correctivos recurrentes → Sugerir preventivo
   - Detectar desviación estimado vs real → Ajustar templates

3. OCR facturas (Tesseract.js o API externa):
   - Subir foto/PDF de factura
   - Extraer: número, fecha, proveedor, items, totales
   - Pre-llenar formulario Invoice

4. Integración ERP (API):
   - Importar facturas desde contabilidad
   - Exportar órdenes de trabajo a ERP

**Entregables**:
- Sistema "inteligente" que sugiere ahorros
- Onboarding ultra-rápido con compatibilidades
- OCR reduce carga manual 80%

---

## 🎯 Métricas de Éxito (KPIs)

### Para el MVP:
- ✅ Usuario puede registrar factura completa en < 3 minutos
- ✅ Sistema genera PartPriceHistory automáticamente
- ✅ Reporte "Histórico de precios" funcional
- ✅ Flujo completo sin errores: Alerta → WO → Factura

### Para Analytics (Fase 2):
- ✅ Dashboard muestra TCO por vehículo
- ✅ Comparador detecta proveedor más barato
- ✅ CEO puede responder: "¿Cuánto gastamos en filtros en 2025?"

### Para IA (Fase 3):
- ✅ Sistema sugiere al menos 1 oportunidad de ahorro por mes
- ✅ OCR extrae datos de factura con 80% precisión
- ✅ Onboarding de empresa nueva < 2 horas (vs 8 horas sin IA)

---

## 🔥 Conversaciones Técnicas Clave

### 1. ¿Por qué MantItemPart (many-to-many) y no FK directo?
**Razón**: Flexibilidad para items complejos.
- "Cambio aceite motor" = aceite + filtro + arandela (3 artículos)
- "Mantenimiento 5,000 km" = 8-10 artículos
- Sin tabla intermedia → imposible modelar

### 2. ¿Por qué PartPriceHistory en lugar de actualizar precio en Invoice?
**Razón**: Análisis temporal y comparación.
- Detectar aumentos abusivos: "Proveedor subió 15% en 2 meses"
- Comparar precios entre proveedores en el tiempo
- Responder: "¿Cuándo pagamos menos por este artículo?"

### 3. ¿Por qué MasterPart.tenantId nullable?
**Razón**: Datos compartidos globalmente.
- Filtro BOSCH-123 es igual para todos
- No duplicar datos en cada tenant
- Primera empresa carga → todas se benefician

### 4. ¿Por qué InvoiceItem.masterPartId nullable?
**Razón**: Onboarding progresivo.
- Admin puede registrar factura SIN vincular a catálogo inicialmente
- Luego vincula (o sistema sugiere)
- No bloquear registro por falta de catálogo completo

### 5. ¿Por qué technicalNotes en MantItem Y MaintenanceAlert?
**Razón**: Herencia con override.
- MantItem.technicalNotes = recomendación genérica
- MaintenanceAlert.technicalNotes = copia al generar
- MaintenanceAlert.customNotes = override específico del caso
- Técnico ve: genérico + específico

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Sobrecarga de carga inicial
**Problema**: Admin debe cargar 100+ MasterParts antes de usar sistema.
**Mitigación**:
- MasterPart.tenantId = NULL (datos compartidos)
- Importador CSV
- OCR facturas (auto-crea artículos)
- Permitir registro sin catálogo (InvoiceItem.masterPartId nullable)

### Riesgo 2: Datos incorrectos en PartPriceHistory
**Problema**: Admin vincula artículo equivocado → analytics erróneos.
**Mitigación**:
- Validación en UI: "¿Seguro que este artículo cuesta $5M?" (outlier detection)
- Auditoría: campo `approvedBy` para rastrear errores
- Edición posterior de InvoiceItem (con log de cambios)

### Riesgo 3: Complejidad del schema asusta a desarrolladores
**Problema**: Schema extenso puede ser intimidante.
**Mitigación**:
- Documentación visual (diagramas ER)
- Implementación incremental (Fase 1 → 2 → 3)
- Código comentado en modelos Prisma

---

## 📞 Próximos Pasos Inmediatos

**HOY (10-Oct)**:
1. ✅ Documentar este análisis (HECHO - este archivo)
2. 🚧 Diseñar schema Prisma completo
3. 🚧 Crear migración base (MasterPart, Invoice, etc.)
4. 🚧 Implementar seed con datos de ejemplo

**MAÑANA (11-Oct)**:
1. CRUD MasterPart (admin)
2. Modificar CreateWorkOrderModal (mostrar technicalNotes)
3. Pantalla registro Invoice (básica)

**LUNES (14-Oct)**:
1. Vincular InvoiceItem con MasterPart
2. Auto-crear PartPriceHistory (trigger)
3. Reporte básico "Histórico de precios"

---

## 💎 Resumen Ejecutivo (para Pitch)

### Problema del Cliente:
> "No sé cuánto gasto en mantenimiento ni dónde optimizar costos"

### Solución Fleet Care:
> "Sistema que trackea cada peso gastado y sugiere cómo ahorrar millones"

### Diferenciadores:
1. 🤖 **IA sugiere ahorros concretos** - No solo muestra datos, ACTÚA
2. 📊 **TCO por marca/modelo** - ¿Toyota o Nissan? Datos objetivos
3. 🔍 **Auditoría completa** - Quién autorizó, cuándo, cuánto, por qué
4. ⚡ **Onboarding instantáneo** - Datos compartidos entre clientes
5. 💰 **ROI medible** - "Ahorramos $3.2M/año cambiando proveedor"

### Tecnología Invisible:
- El cliente no ve: Prisma, MantItemPart, PartPriceHistory
- El cliente ve: "Tu flota Toyota es 33% más eficiente que Nissan"

---

**Estado**: Arquitectura definida, lista para implementar ✅
**Próxima sesión**: Implementación schema + migración + CRUD básico
