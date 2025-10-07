# Cronograma Ajustado - Arquitectura Real Fleet Care SaaS

## Sesión: 07 Octubre 2025
**Contexto**: Cronograma ajustado basado en la arquitectura real del negocio (feedback del cliente)

---

## 🎯 ARQUITECTURA REAL DEL NEGOCIO

### Core Funcionalidades

#### 1. **Manejo de Activos**
```
Vehicle Management:
├── Vehicles (CRUD)
├── VehicleBrand
├── VehicleLine
└── VehicleType

Estado: 75% completado ✅
```

#### 2. **Mantenimiento PREVENTIVO** (Core del negocio)
```
Flujo completo:

1. MASTER DATA
   └─ MantItem (Catálogo de items de mantenimiento)

2. TEMPLATES (Plantillas reutilizables)
   MaintenanceTemplate (por marca/línea)
   └─ MaintenancePackage (15k km, 30k km, etc)
      └─ PackageItem (asociados a MantItem)

3. ASIGNACIÓN A ACTIVOS ESPECÍFICOS
   VehicleMantProgram (programa del vehículo)
   └─ VehicleProgramPackage (paquetes asignados)
      └─ VehicleProgramItem (items individuales)

4. MONITOREO
   OdometerLog (registro km/horas de trabajo)
   └─ Trigger → Verificar si hay mantenimientos próximos
      └─ Genera MaintenanceAlert
         └─ Aviso por WhatsApp (NO MVP, v1.1)

Estado: 90% completado ✅
```

#### 3. **Mantenimiento CORRECTIVO** (Faltante crítico)
```
Flujo propuesto:

1. REPORTE (PWA para Choferes)
   Chofer reporta novedad
   └─ MaintenanceIssue (nuevo model)
      ├─ Descripción
      ├─ Fotos (hasta 3)
      ├─ Urgencia
      └─ Status: REPORTED

2. VALIDACIÓN (Supervisor)
   Supervisor revisa novedad
   └─ Valida / Rechaza / Aprueba
      └─ Si aprueba → Status: APPROVED

3. EJECUCIÓN
   Se genera WorkOrder (correctiva)
   └─ Técnico ejecuta
      └─ Sube factura
         └─ Status: COMPLETED

4. CIERRE
   WorkOrder completada
   └─ MaintenanceIssue se cierra automáticamente

Estado: 0% implementado ❌ CRÍTICO
```

#### 4. **Proceso de CIERRE** (Faltante crítico)
```
PREVENTIVO:
VehicleProgramItem llega a km programado
└─ Sistema genera MaintenanceAlert
   └─ Admin crea WorkOrder desde alerta
      └─ Técnico ejecuta → sube factura
         └─ WorkOrder.status = COMPLETED
            └─ VehicleProgramItem.status = COMPLETED (auto-cierre)
               └─ MaintenanceAlert.status = CLOSED (auto-cierre)

CORRECTIVO:
MaintenanceIssue aprobada
└─ Supervisor genera WorkOrder
   └─ Técnico ejecuta → sube factura
      └─ WorkOrder.status = COMPLETED
         └─ MaintenanceIssue.status = CLOSED (auto-cierre)

Estado: 10% implementado ❌ CRÍTICO
```

#### 5. **Mantenimiento PREDICTIVO** (Por definir)
```
Opciones:

OPCIÓN A - Simple (MVP):
└─ Vehicle Health Score (0-100)
   └─ Basado en: correctivos, preventivos vencidos, días sin mant.
   └─ Dashboard: Ranking de vehículos en riesgo

OPCIÓN B - Intermedio (MVP):
└─ Análisis de patrones
   ├─ Detectar items que fallan antes de lo programado
   ├─ Vehículos con uso intensivo
   └─ Recomendaciones: "Ajustar programa de 10k a 8k km"

OPCIÓN C - Avanzado (v2.0):
└─ Machine Learning
   └─ Predicción de fallas
   └─ Requiere: historial extenso + TensorFlow.js

Recomendación MVP: Opción A + parte de B

Estado: 0% sin definir ⚠️
```

---

## 📊 GAP ANALYSIS ACTUALIZADO

### Completitud por Módulo

| Módulo | Actual | Gap | Prioridad | Esfuerzo |
|--------|--------|-----|-----------|----------|
| **Assets** | 75% | 25% | LOW | 0.5 sprint |
| **Preventivo** | 90% | 10% | HIGH | 1 sprint |
| **Correctivo** | 0% | 100% | CRITICAL | 2 sprints |
| **Proceso Cierre** | 10% | 90% | CRITICAL | 1 sprint |
| **Dashboard Ops** | 25% | 75% | HIGH | 1 sprint |
| **Predictivo** | 0% | 100% | MEDIUM | 1 sprint |
| **Inventory** | 15% | 85% | LOW (v1.1) | 2 sprints |

### Priorización Ajustada

#### CRÍTICO (MVP v1.0)
1. ⭐⭐⭐ Completar Preventivo 100% (trigger automático alertas)
2. ⭐⭐⭐ Mantenimiento Correctivo (PWA + validación supervisor)
3. ⭐⭐⭐ Proceso de Cierre (WorkOrder + auto-cierre items/alertas)

#### IMPORTANTE (MVP v1.0)
4. ⭐⭐ Dashboard Operativo (visibilidad tiempo real)
5. ⭐⭐ Mantenimiento Predictivo (health score básico)

#### NICE TO HAVE (v1.1)
6. ⭐ WhatsApp Notifications (confirmado para v1.1)
7. ⭐ Inventory System (stock tracking)
8. ⭐ OCR Facturas (feature/ocr-expense-tracking)

---

## 🗂️ MODELOS DE DATOS NUEVOS

### MaintenanceIssue (Correctivo)
```prisma
model MaintenanceIssue {
  id              Int           @id @default(autoincrement())
  tenantId        String
  vehicleId       Int
  reportedBy      String        // Driver ID
  description     String
  urgency         Urgency       // LOW, MEDIUM, HIGH, CRITICAL
  status          IssueStatus   // REPORTED, VALIDATED, REJECTED, APPROVED, IN_PROGRESS, CLOSED

  // Validación
  validatedBy     String?       // Supervisor ID
  validatedAt     DateTime?
  validationNotes String?

  // Evidencia
  photos          String[]      // Array de URLs (UploadThing)
  location        Json?         // Geolocalización opcional { lat, lng }

  // Conexión con WorkOrder
  workOrderId     Int?          @unique

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  tenant          Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  vehicle         Vehicle       @relation(fields: [vehicleId], references: [id])
  workOrder       WorkOrder?    @relation(fields: [workOrderId], references: [id])

  @@index([tenantId])
  @@index([vehicleId])
  @@index([status])
  @@index([urgency])
}

enum IssueStatus {
  REPORTED      // Reportado por chofer
  VALIDATED     // Validado por supervisor (pendiente decisión)
  REJECTED      // Rechazado por supervisor
  APPROVED      // Aprobado por supervisor (listo para WorkOrder)
  IN_PROGRESS   // WorkOrder en ejecución
  CLOSED        // Cerrado (WorkOrder completada)
}

enum Urgency {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

### MaintenanceAlert (Preventivo - mejorar existente)
```prisma
model MaintenanceAlert {
  id                    Int           @id @default(autoincrement())
  tenantId              String
  vehicleId             Int
  programPackageId      Int?          // VehicleProgramPackage que generó alerta
  type                  AlertType     // PREVENTIVE, CORRECTIVE, OVERDUE
  status                AlertStatus   // PENDING, IN_PROGRESS, CLOSED

  // Detalles
  scheduledKm           Int?          // Km programado
  currentKm             Int?          // Km actual cuando se generó
  message               String        // "Mantenimiento 15k km próximo"
  priority              Priority      // LOW, MEDIUM, HIGH, CRITICAL

  // Conexión con WorkOrder
  workOrderId           Int?          @unique

  createdAt             DateTime      @default(now())
  closedAt              DateTime?

  tenant                Tenant        @relation(...)
  vehicle               Vehicle       @relation(...)
  programPackage        VehicleProgramPackage? @relation(...)
  workOrder             WorkOrder?    @relation(...)

  @@index([tenantId])
  @@index([vehicleId])
  @@index([status])
  @@index([type])
}

enum AlertType {
  PREVENTIVE    // Alerta de mantenimiento preventivo próximo
  CORRECTIVE    // Alerta de issue reportada
  OVERDUE       // Mantenimiento vencido
}

enum AlertStatus {
  PENDING       // Pendiente de atención
  IN_PROGRESS   // WorkOrder creada y en progreso
  CLOSED        // Cerrada (WorkOrder completada)
}
```

### Actualizar WorkOrder (agregar campos)
```prisma
model WorkOrder {
  // ... campos existentes ...

  // Origen de la WorkOrder (NUEVO)
  sourceType          WorkOrderSource  // PREVENTIVE, CORRECTIVE, MANUAL
  sourceId            Int?             // alertId o issueId

  // Factura (mejorar)
  invoiceUrl          String?          // PDF/imagen factura
  invoiceAmount       Decimal?         @db.Decimal(10, 2)
  invoiceNumber       String?
  invoiceDate         DateTime?

  // Relaciones nuevas
  maintenanceAlert    MaintenanceAlert?
  maintenanceIssue    MaintenanceIssue?

  // ... resto de campos ...
}

enum WorkOrderSource {
  PREVENTIVE    // Generada desde alerta preventiva
  CORRECTIVE    // Generada desde issue correctiva
  MANUAL        // Creada manualmente por admin
}
```

---

## 📅 CRONOGRAMA AJUSTADO - 6 SPRINTS

### Timeline MVP: **12 semanas = 3 meses**

```
OCTUBRE        NOVIEMBRE      DICIEMBRE      ENERO
Week: 1-2  3-4  1-2  3-4  1-2  3-4  1-2
     [S1][S2][S3][S4][S5][S6][S7]
      ↓   ↓   ↓   ↓   ↓   ↓   ↓
    PREV CORR PWA CLOSE DASH PRED TEST
    100% API  UI  WO+   OPS  ML  DEPLOY
```

**Inicio**: 07 Octubre 2025
**Fin estimado**: ~31 Diciembre 2025 (Sprint 6) o ~17 Enero 2026 (con Sprint 7 opcional)

---

## 🚀 SPRINT 1: PREVENTIVO 100% + ALERTAS AUTOMÁTICAS

### Fecha: 14-25 Octubre 2025 (2 semanas)
**Objetivo**: Sistema preventivo completamente funcional con trigger automático

### Week 1: Trigger automático de alertas

#### Model MaintenanceAlert
**Tasks**:
- [ ] Crear model MaintenanceAlert (schema arriba)
- [ ] Migration: `npx prisma migrate dev --name add_maintenance_alert`
- [ ] Regenerar Prisma client

#### Lógica de trigger
**Tasks**:
- [ ] **API OdometerLog**: Modificar POST `/api/vehicles/odometer/route.ts`
```typescript
async function checkMaintenanceAlerts(vehicleId: number, currentKm: number) {
  // 1. Obtener VehicleMantProgram del vehículo
  const program = await prisma.vehicleMantProgram.findUnique({
    where: { vehicleId },
    include: {
      packages: {
        where: { status: 'PENDING' },
        include: { items: true }
      }
    }
  });

  // 2. Verificar paquetes próximos (500km de margen)
  const upcomingPackages = program.packages.filter(pkg =>
    currentKm >= pkg.scheduledKm - 500 &&
    currentKm < pkg.scheduledKm + 100
  );

  // 3. Generar alertas si no existen
  for (const pkg of upcomingPackages) {
    const existingAlert = await prisma.maintenanceAlert.findFirst({
      where: {
        vehicleId,
        programPackageId: pkg.id,
        status: 'PENDING'
      }
    });

    if (!existingAlert) {
      await prisma.maintenanceAlert.create({
        data: {
          tenantId: vehicle.tenantId,
          vehicleId,
          programPackageId: pkg.id,
          type: 'PREVENTIVE',
          status: 'PENDING',
          scheduledKm: pkg.scheduledKm,
          currentKm,
          message: `Mantenimiento ${pkg.packageName} próximo (${pkg.scheduledKm}km)`,
          priority: calculatePriority(currentKm, pkg.scheduledKm)
        }
      });
    }
  }

  // 4. Verificar mantenimientos vencidos
  const overduePackages = program.packages.filter(pkg =>
    currentKm > pkg.scheduledKm + 100
  );

  for (const pkg of overduePackages) {
    const existingAlert = await prisma.maintenanceAlert.findFirst({
      where: { vehicleId, programPackageId: pkg.id, status: 'PENDING' }
    });

    if (!existingAlert) {
      await prisma.maintenanceAlert.create({
        data: {
          type: 'OVERDUE',
          priority: 'CRITICAL',
          message: `Mantenimiento ${pkg.packageName} VENCIDO (programado: ${pkg.scheduledKm}km)`
        }
      });
    }
  }
}
```

- [ ] Integrar `checkMaintenanceAlerts()` en POST `/api/vehicles/odometer/`
- [ ] Testing con casos de prueba (km 14500, 15000, 15600)

### Week 2: Dashboard de alertas + UI

#### APIs Alertas
**Tasks**:
- [ ] Crear `/api/maintenance/alerts/route.ts` (GET listar, POST crear manual)
- [ ] Crear `/api/maintenance/alerts/[id]/route.ts` (GET, PATCH, DELETE)
- [ ] Crear `/api/maintenance/alerts/[id]/close/route.ts` (POST cerrar alerta)

#### Service Layer + Hooks
**Tasks**:
- [ ] Crear `MaintenanceAlertService`:
```typescript
class MaintenanceAlertServiceClass extends BaseService {
  async getAll(filters?: AlertFilters): Promise<MaintenanceAlert[]>
  async getPending(): Promise<MaintenanceAlert[]>
  async getByVehicle(vehicleId: number): Promise<MaintenanceAlert[]>
  async close(alertId: number): Promise<MaintenanceAlert>
  async createWorkOrderFromAlert(alertId: number, data: CreateWODto): Promise<WorkOrder>
}
```

- [ ] Custom hooks:
```typescript
export function useAlerts(filters?: AlertFilters)
export function usePendingAlerts()
export function useCloseAlert()
export function useCreateWorkOrderFromAlert()
```

#### UI Components
**Tasks**:
- [ ] **Dashboard card**: "Alertas Pendientes"
  - Badge rojo con número de alertas PENDING
  - Click → navegar a `/dashboard/maintenance/alerts`

- [ ] **Página `/dashboard/maintenance/alerts/page.tsx`**:
  - Tabla con columnas: Vehículo, Tipo, Mensaje, Prioridad, Km Actual, Km Programado, Fecha, Acciones
  - Color coding por tipo:
    - PREVENTIVE: Azul
    - OVERDUE: Rojo
  - Color coding por prioridad:
    - CRITICAL: Rojo oscuro
    - HIGH: Naranja
    - MEDIUM: Amarillo
    - LOW: Gris
  - Filtros: Por tipo, estado, vehículo
  - Botón "Crear WorkOrder" en cada fila

- [ ] **AlertCard component**: Card visual para dashboard

### User Stories Sprint 1

#### US-1: Como Sistema quiero generar alertas automáticamente al registrar odómetro
**Acceptance Criteria**:
- [x] Al registrar OdometerLog, se ejecuta checkMaintenanceAlerts()
- [x] Se generan alertas para paquetes próximos (500km antes)
- [x] Se generan alertas OVERDUE para paquetes vencidos
- [x] No se duplican alertas (check existingAlert)
- [x] Prioridad se calcula automáticamente

**Story Points**: 8

#### US-2: Como Admin quiero ver todas las alertas de mantenimiento
**Acceptance Criteria**:
- [x] Dashboard muestra card con número de alertas pendientes
- [x] Página /alerts muestra lista completa
- [x] Puedo filtrar por tipo, estado, vehículo
- [x] Veo color coding por prioridad
- [x] Veo detalles: km actual vs programado

**Story Points**: 5

#### US-3: Como Admin quiero crear WorkOrder desde una alerta
**Acceptance Criteria**:
- [x] Botón "Crear WorkOrder" en cada alerta
- [x] Modal con form pre-llenado (vehículo, items del paquete)
- [x] Al crear WO, alerta cambia a IN_PROGRESS
- [x] WorkOrder.sourceType = PREVENTIVE, sourceId = alertId

**Story Points**: 8

### Deliverables Sprint 1
- ✅ Model MaintenanceAlert creado y migrado
- ✅ Trigger automático funcionando en OdometerLog
- ✅ APIs de alertas funcionales
- ✅ Dashboard con card de alertas
- ✅ Página /alerts con tabla completa
- ✅ Botón "Crear WorkOrder" funcional
- ✅ Preventivo: 90% → 100%

**Velocity esperada**: 21 story points

---

## 🚀 SPRINT 2: MANTENIMIENTO CORRECTIVO - BACKEND

### Fecha: 28 Oct - 08 Nov 2025 (2 semanas)
**Objetivo**: API completa para reportar y validar novedades correctivas

### Week 1: Models + APIs

#### Model MaintenanceIssue
**Tasks**:
- [ ] Crear model MaintenanceIssue (schema completo arriba)
- [ ] Migration: `npx prisma migrate dev --name add_maintenance_issue`
- [ ] Agregar relación en Vehicle model
- [ ] Regenerar Prisma client

#### APIs CRUD
**Tasks**:
- [ ] Crear estructura `/api/maintenance/issues/`:
```
/api/maintenance/issues/
├── route.ts                     (GET listar, POST crear)
├── [id]/route.ts                (GET detalle, PUT editar, DELETE)
├── [id]/validate/route.ts       (POST validar)
├── [id]/approve/route.ts        (POST aprobar)
├── [id]/reject/route.ts         (POST rechazar)
└── [id]/create-workorder/route.ts (POST generar WO)
```

- [ ] Implementar cada endpoint con validaciones Zod
- [ ] Filtros GET: por vehículo, status, urgency, reportedBy, dateRange

### Week 2: Service Layer + UploadThing

#### MaintenanceIssueService
**Tasks**:
- [ ] Crear `MaintenanceIssueService`:
```typescript
class MaintenanceIssueServiceClass extends BaseService {
  async create(data: CreateIssueDto): Promise<MaintenanceIssue>
  async getAll(filters?: IssueFilters): Promise<MaintenanceIssue[]>
  async getById(id: number): Promise<MaintenanceIssue>
  async getByDriver(driverId: string): Promise<MaintenanceIssue[]>
  async getPending(): Promise<MaintenanceIssue[]>

  // Acciones supervisor
  async validate(id: number, validatorId: string, notes: string): Promise<MaintenanceIssue>
  async approve(id: number): Promise<MaintenanceIssue>
  async reject(id: number, reason: string): Promise<MaintenanceIssue>

  // Generar WorkOrder
  async createWorkOrderFromIssue(issueId: number, data: CreateWODto): Promise<WorkOrder>
}
```

#### Custom Hooks
**Tasks**:
- [ ] Crear hooks:
```typescript
// Queries
export function useIssues(filters?: IssueFilters)
export function useIssue(id: number)
export function useMyIssues()  // Issues del driver actual
export function usePendingIssues()  // Para supervisor

// Mutations
export function useCreateIssue()
export function useValidateIssue()
export function useApproveIssue()
export function useRejectIssue()
export function useCreateWorkOrderFromIssue()
```

#### Upload Fotos
**Tasks**:
- [ ] Configurar UploadThing route específica para issues: `/api/uploadthing/issue-photos`
- [ ] Máximo 3 fotos por issue
- [ ] Comprimir imágenes antes de subir (client-side)
- [ ] Validar formato (jpg, png, webp)

### User Stories Sprint 2

#### US-4: Como Chofer quiero reportar novedades de mantenimiento correctivo
**Acceptance Criteria**:
- [x] API POST /issues permite crear novedad
- [x] Puedo subir hasta 3 fotos
- [x] Campos requeridos: vehículo, descripción, urgencia
- [x] Status inicial = REPORTED
- [x] API devuelve 201 con issue creada

**Story Points**: 5

#### US-5: Como Supervisor quiero validar novedades reportadas
**Acceptance Criteria**:
- [x] API GET /issues?status=REPORTED devuelve pendientes
- [x] API POST /issues/:id/validate permite validar con notas
- [x] API POST /issues/:id/approve aprueba novedad
- [x] API POST /issues/:id/reject rechaza con motivo
- [x] Status cambia correctamente según acción

**Story Points**: 5

#### US-6: Como Supervisor quiero generar WorkOrder desde issue aprobada
**Acceptance Criteria**:
- [x] API POST /issues/:id/create-workorder genera WO
- [x] WorkOrder.sourceType = CORRECTIVE
- [x] WorkOrder.sourceId = issueId
- [x] Issue.workOrderId se actualiza
- [x] Issue.status cambia a IN_PROGRESS

**Story Points**: 5

### Deliverables Sprint 2
- ✅ Model MaintenanceIssue creado y migrado
- ✅ APIs CRUD completas y testeadas
- ✅ MaintenanceIssueService implementado
- ✅ Custom hooks con TanStack Query
- ✅ Upload de fotos funcional
- ✅ Mantenimiento Correctivo Backend: 0% → 50%

**Velocity esperada**: 15 story points

---

## 🚀 SPRINT 3: MANTENIMIENTO CORRECTIVO - PWA

### Fecha: 11-22 Noviembre 2025 (2 semanas)
**Objetivo**: Progressive Web App para choferes y UI supervisor

### Week 1: PWA Setup + UI Chofer

#### PWA Configuration
**Tasks**:
- [ ] Instalar dependencias:
```bash
npm install next-pwa
```

- [ ] Configurar `next.config.js`:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  // ... rest of config
});
```

- [ ] Crear `public/manifest.json`:
```json
{
  "name": "Fleet Care SaaS",
  "short_name": "FleetCare",
  "description": "Sistema de gestión de mantenimiento vehicular",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [...]
}
```

- [ ] Agregar service worker básico
- [ ] Testear instalación en móvil

#### UI Chofer - Reportar Novedad
**Tasks**:
- [ ] **Página `/driver/report-issue/page.tsx`** (mobile-first):
  - Layout simplificado (sin sidebar complejo)
  - Header: Logo + "Reportar Novedad"
  - Form campos:
    - Dropdown: "Mi vehículo asignado" (query a VehicleDriver)
    - Textarea: Descripción (placeholder: "¿Qué problema detectaste?")
    - Radio buttons: Urgencia (LOW, MEDIUM, HIGH, CRITICAL) con iconos y colores
    - Upload: Hasta 3 fotos (abrir cámara móvil directamente)
    - Botón: "Capturar ubicación" (opcional, usar Geolocation API)
  - Botón grande: "Enviar Reporte"
  - Toast success: "Reporte enviado. Un supervisor lo revisará pronto."

- [ ] **Offline support**:
  - Si sin internet → guardar en localStorage
  - Mostrar banner: "Sin conexión. Se enviará automáticamente al reconectar."
  - Service worker: detectar online → enviar reportes pendientes

- [ ] **Página `/driver/my-issues/page.tsx`**:
  - Lista de issues reportados por el driver
  - Card por issue: descripción, status badge, fecha
  - Click → ver detalles + fotos
  - Filtro por status

#### Componentes Mobile-First
**Tasks**:
- [ ] `IssueFormDriver.tsx`: Form optimizado móvil
- [ ] `CameraCapture.tsx`: Componente para capturar fotos
- [ ] `IssueCard.tsx`: Card visual para lista
- [ ] `StatusBadge.tsx`: Badge colorido con iconos

### Week 2: UI Supervisor + Notificaciones

#### UI Supervisor - Validar Novedades
**Tasks**:
- [ ] **Página `/supervisor/issues/page.tsx`**:
  - Tabs: "Pendientes" (REPORTED) / "Validadas" / "Todas"
  - Lista tipo cards (mejor que tabla para fotos):
    ```
    [Card por Issue]
    ├── Header: Vehículo + Urgency badge + Fecha
    ├── Body: Descripción + Fotos (carousel)
    ├── Footer: Reportado por [Driver Name]
    └── Actions: [Rechazar] [Validar] [Aprobar]
    ```
  - Filtros sidebar: Por vehículo, urgencia, fecha

- [ ] **Modal de Validación**:
  - Textarea: "Notas de validación"
  - Dropdown: Acción (Validar / Aprobar / Rechazar)
  - Si Rechazar → campo obligatorio "Motivo de rechazo"
  - Botón: "Confirmar"

- [ ] **Modal Generar WorkOrder**:
  - Trigger: Botón "Generar Orden" en issue APPROVED
  - Form: título, técnico asignado, prioridad, fecha programada
  - Pre-llenar: vehículo, descripción del issue
  - Botón: "Crear WorkOrder"
  - Al crear → Issue.status = IN_PROGRESS

#### Notificaciones Básicas
**Tasks**:
- [ ] **Badge en sidebar** (sin WebSockets, polling simple):
  - Hook `usePendingIssuesCount()` con refetchInterval: 30000 (30 seg)
  - Badge rojo con número en menu "Novedades Pendientes"

- [ ] **Toast notifications**:
  - Chofer: "Tu reporte fue validado/aprobado/rechazado por [Supervisor]"
  - Supervisor: "Nueva novedad reportada por [Driver]" (al refetch)

- [ ] **Email notifications** (opcional, básico):
  - Usar servicio simple como Resend o SendGrid
  - Email a supervisor cuando nuevo reporte CRITICAL

### User Stories Sprint 3

#### US-7: Como Chofer quiero reportar novedades desde mi móvil
**Acceptance Criteria**:
- [x] Puedo instalar app como PWA en mi teléfono
- [x] Form es fácil de usar en móvil (botones grandes)
- [x] Puedo capturar fotos con cámara del teléfono
- [x] Puedo seleccionar urgencia visualmente (colores/iconos)
- [x] Si sin internet, se guarda y envía después
- [x] Recibo confirmación visual al enviar

**Story Points**: 8

#### US-8: Como Supervisor quiero validar novedades reportadas
**Acceptance Criteria**:
- [x] Veo lista de novedades REPORTED
- [x] Puedo ver fotos en carousel
- [x] Puedo agregar notas de validación
- [x] Puedo aprobar/rechazar con motivo
- [x] Badge en menu muestra cantidad pendientes

**Story Points**: 8

#### US-9: Como Supervisor quiero generar WorkOrder desde novedad aprobada
**Acceptance Criteria**:
- [x] Botón "Generar Orden" visible en issues APPROVED
- [x] Modal pre-llena datos del issue
- [x] Puedo asignar técnico
- [x] Al crear WO, issue cambia a IN_PROGRESS
- [x] WO aparece en lista de órdenes de trabajo

**Story Points**: 5

### Deliverables Sprint 3
- ✅ PWA configurada e instalable en móvil
- ✅ UI Chofer para reportar novedades
- ✅ Offline support básico
- ✅ UI Supervisor para validar/aprobar
- ✅ Generación de WorkOrder desde issue
- ✅ Notificaciones básicas (badge + toast)
- ✅ Mantenimiento Correctivo: 50% → 100%

**Velocity esperada**: 21 story points

---

## 🚀 SPRINT 4: PROCESO DE CIERRE

### Fecha: 25 Nov - 06 Dic 2025 (2 semanas)
**Objetivo**: Conectar WorkOrders con cierre automático de items y alertas

### Week 1: WorkOrder CRUD + Factura

#### Actualizar Model WorkOrder
**Tasks**:
- [ ] Migration para agregar campos nuevos:
```prisma
// Agregar a WorkOrder existente:
sourceType    WorkOrderSource  // PREVENTIVE, CORRECTIVE, MANUAL
sourceId      Int?             // alertId o issueId
invoiceUrl    String?          // URL factura (UploadThing)
invoiceAmount Decimal?         @db.Decimal(10, 2)
invoiceNumber String?
invoiceDate   DateTime?
```

- [ ] Actualizar relaciones:
```prisma
maintenanceAlert    MaintenanceAlert?  @relation(...)
maintenanceIssue    MaintenanceIssue?  @relation(...)
```

#### APIs WorkOrder
**Tasks**:
- [ ] Crear/actualizar `/api/maintenance/work-orders/`:
```
/api/maintenance/work-orders/
├── route.ts                       (GET listar, POST crear)
├── [id]/route.ts                  (GET, PUT, DELETE)
├── [id]/upload-invoice/route.ts   (POST subir factura)
├── [id]/complete/route.ts         (POST completar WO + auto-cierre)
└── from-alert/[alertId]/route.ts  (POST crear WO desde alerta)
```

#### Service Layer
**Tasks**:
- [ ] Crear `WorkOrderService`:
```typescript
class WorkOrderServiceClass extends BaseService {
  async create(data: CreateWorkOrderDto): Promise<WorkOrder>
  async getAll(filters?: WOFilters): Promise<WorkOrder[]>
  async getById(id: number): Promise<WorkOrder>
  async update(id: number, data: UpdateWorkOrderDto): Promise<WorkOrder>

  // Factura
  async uploadInvoice(id: number, fileUrl: string, amount: number, invoiceNumber: string): Promise<WorkOrder>

  // Completar con auto-cierre
  async complete(id: number): Promise<{
    workOrder: WorkOrder;
    closedItems?: VehicleProgramItem[];
    closedAlert?: MaintenanceAlert;
    closedIssue?: MaintenanceIssue;
  }>

  // Creación desde fuentes
  async createFromAlert(alertId: number, data: CreateWODto): Promise<WorkOrder>
  async createFromIssue(issueId: number, data: CreateWODto): Promise<WorkOrder>
}
```

#### UI WorkOrder
**Tasks**:
- [ ] **Página `/dashboard/maintenance/work-orders/page.tsx`**:
  - Tabla: ID, Vehículo, Título, Status, Técnico, Prioridad, Origen, Fecha, Acciones
  - Badge "Origen": PREVENTIVE (azul), CORRECTIVE (naranja), MANUAL (gris)
  - Filtros: por status, técnico, vehículo, origen
  - Botón: "Nueva Orden Manual"

- [ ] **Form crear/editar WorkOrder**:
  - Campos: título, descripción, vehículo, técnico, prioridad, fecha programada
  - Si desde alerta/issue → campos pre-llenados y readonly
  - Dropdown origen: PREVENTIVE / CORRECTIVE / MANUAL (si manual)

- [ ] **WorkOrder Details Page**:
  - Header: ID + Status badge + Prioridad
  - Info: Vehículo, Técnico, Fechas, Origen
  - Section: Descripción
  - Section: Factura
    - Si NO tiene → Botón "Subir Factura" (UploadThing)
    - Si tiene → Preview PDF/imagen + monto + número
  - Section: Items/Repuestos (si desde preventivo)
  - Botón: "Completar Orden" (solo si tiene factura)

### Week 2: Auto-cierre + Conexiones

#### Lógica de Auto-cierre
**Tasks**:
- [ ] **Implementar `WorkOrderService.complete()`**:
```typescript
async complete(id: number): Promise<CompleteResult> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: { maintenanceAlert: { include: { programPackage: true } } }
  });

  // Validar que tenga factura
  if (!workOrder.invoiceUrl) {
    throw new Error('WorkOrder must have an invoice before completion');
  }

  // 1. Actualizar WorkOrder
  await prisma.workOrder.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });

  let closedItems: VehicleProgramItem[] = [];
  let closedAlert: MaintenanceAlert | null = null;
  let closedIssue: MaintenanceIssue | null = null;

  // 2. Si origen PREVENTIVE → cerrar items + alerta
  if (workOrder.sourceType === 'PREVENTIVE' && workOrder.maintenanceAlert) {
    const programPackageId = workOrder.maintenanceAlert.programPackageId;

    // Cerrar todos los items del paquete
    closedItems = await prisma.vehicleProgramItem.updateMany({
      where: { packageId: programPackageId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Cerrar alerta
    closedAlert = await prisma.maintenanceAlert.update({
      where: { id: workOrder.sourceId },
      data: {
        status: 'CLOSED',
        closedAt: new Date()
      }
    });
  }

  // 3. Si origen CORRECTIVE → cerrar issue
  if (workOrder.sourceType === 'CORRECTIVE') {
    closedIssue = await prisma.maintenanceIssue.update({
      where: { id: workOrder.sourceId },
      data: {
        status: 'CLOSED',
        updatedAt: new Date()
      }
    });
  }

  return { workOrder, closedItems, closedAlert, closedIssue };
}
```

#### Botón "Crear WorkOrder desde Alerta"
**Tasks**:
- [ ] En `/dashboard/maintenance/alerts/`:
  - Botón "Crear Orden" en cada fila
  - Modal: WorkOrderForm con campos pre-llenados
  - Hook: `useCreateWorkOrderFromAlert()`
  - Al crear → navegar a WorkOrder detail
  - Alerta cambia status PENDING → IN_PROGRESS

#### Botón "Crear WorkOrder desde Issue" (ya implementado Sprint 2)
**Tasks**:
- [ ] Validar que funcione end-to-end:
  - Issue APPROVED → botón "Generar Orden"
  - WorkOrder creada con sourceType=CORRECTIVE
  - Issue.status → IN_PROGRESS

### User Stories Sprint 4

#### US-10: Como Admin/Técnico quiero gestionar órdenes de trabajo
**Acceptance Criteria**:
- [x] Puedo ver lista de todas las WorkOrders
- [x] Puedo crear orden manual o desde alerta/issue
- [x] Puedo asignar técnico
- [x] Veo badge de origen (PREVENTIVE/CORRECTIVE/MANUAL)
- [x] Puedo filtrar por status, técnico, origen

**Story Points**: 8

#### US-11: Como Técnico quiero subir factura al completar trabajo
**Acceptance Criteria**:
- [x] Puedo abrir detalle de WorkOrder asignada a mí
- [x] Botón "Subir Factura" abre UploadThing
- [x] Puedo subir PDF o imagen
- [x] Ingreso monto y número de factura
- [x] Factura se guarda y muestra en WorkOrder

**Story Points**: 5

#### US-12: Como Sistema quiero cerrar automáticamente items y alertas al completar WorkOrder
**Acceptance Criteria**:
- [x] Al hacer click "Completar Orden" valida que tenga factura
- [x] Si origen PREVENTIVE → cierra VehicleProgramItems del paquete
- [x] Si origen PREVENTIVE → cierra MaintenanceAlert
- [x] Si origen CORRECTIVE → cierra MaintenanceIssue
- [x] WorkOrder.status = COMPLETED

**Story Points**: 13

### Deliverables Sprint 4
- ✅ Model WorkOrder actualizado (campos origen + factura)
- ✅ APIs WorkOrder completas
- ✅ UI CRUD WorkOrders
- ✅ Upload factura funcional
- ✅ Lógica auto-cierre implementada
- ✅ Flujo completo end-to-end:
  - Preventivo: Alerta → WO → Cierre items/alerta
  - Correctivo: Issue → WO → Cierre issue
- ✅ Proceso de Cierre: 10% → 100%

**Velocity esperada**: 26 story points

---

## 🚀 SPRINT 5: DASHBOARD OPERATIVO

### Fecha: 09-20 Diciembre 2025 (2 semanas)
**Objetivo**: Visibilidad total del estado de mantenimiento en tiempo real

### Week 1: Métricas en Tiempo Real

#### Dashboard Cards
**Tasks**:
- [ ] Actualizar `/dashboard/page.tsx` con grid de cards:

```typescript
// Card 1: Alertas Pendientes
const { data: pendingAlerts } = useQuery({
  queryKey: ['alerts', 'pending'],
  queryFn: () => alertService.getPending(),
  refetchInterval: 30000 // Refetch cada 30 seg
});

// Card 2: Issues Reportadas (últimas 24h)
const { data: recentIssues } = useQuery({
  queryKey: ['issues', 'recent'],
  queryFn: () => issueService.getRecent(24),
  refetchInterval: 30000
});

// Card 3: WorkOrders Activas
const { data: activeWorkOrders } = useQuery({
  queryKey: ['work-orders', 'active'],
  queryFn: () => workOrderService.getActive(),
  refetchInterval: 30000
});

// Card 4: Vehículos con Mantenimiento Vencido
const { data: overdueVehicles } = useQuery({
  queryKey: ['vehicles', 'overdue'],
  queryFn: () => vehicleService.getOverdue(),
  refetchInterval: 60000
});

// Card 5: Gasto del Mes
const { data: monthlyExpenses } = useQuery({
  queryKey: ['expenses', 'current-month'],
  queryFn: () => expenseService.getCurrentMonth(),
  refetchInterval: 60000
});
```

- [ ] Cada card debe tener:
  - Título
  - Valor numérico grande
  - Icono relevante (Lucide)
  - Indicador trend (↑↓ vs mes anterior)
  - Color coding (verde/amarillo/rojo según thresholds)
  - Click → navegar a página de detalle

#### API para Métricas
**Tasks**:
- [ ] Crear `/api/dashboard/metrics/route.ts`:
```typescript
GET /api/dashboard/metrics → {
  alertsPending: number;
  issuesLast24h: number;
  workOrdersActive: number;
  vehiclesOverdue: number;
  monthlyExpenses: number;
  trends: {
    alerts: number; // % change vs last week
    issues: number;
    workOrders: number;
    expenses: number;
  }
}
```

- [ ] Optimizar queries con agregaciones Prisma

### Week 2: Vistas Operativas + Calendar

#### Vista Calendario Mantenimientos
**Tasks**:
- [ ] **Página `/dashboard/maintenance/calendar/page.tsx`**:
  - Usar `react-day-picker` o librería similar
  - Mostrar VehicleProgramPackages programados próximos 60 días
  - Color coding:
    - Próximos (15 días): Amarillo
    - Esta semana: Naranja
    - Vencidos: Rojo
  - Click en día → modal con lista de mantenimientos
  - Filtro por vehículo

#### Timeline de Vehículo
**Tasks**:
- [ ] **Página `/dashboard/vehicles/[id]/timeline/page.tsx`**:
  - Timeline vertical con todos los eventos del vehículo:
    - OdometerLogs
    - MaintenanceAlerts generadas
    - WorkOrders completadas
    - MaintenanceIssues reportadas
  - Ordenado descendente (más reciente primero)
  - Íconos diferentes por tipo de evento
  - Click → ver detalles del evento

#### Reportes Básicos
**Tasks**:
- [ ] **Reporte: Cumplimiento Preventivo**
  - Card: "% Cumplimiento Preventivo" (completados a tiempo / total programados)
  - Tabla: Vehículos con peor cumplimiento
  - Filtro: último mes / 3 meses / 6 meses

- [ ] **Reporte: Top Vehículos con Más Correctivos**
  - Tabla: Vehículo, # Correctivos, Gasto Total
  - Ordenar descendente
  - Filtro: último mes / 3 meses / 6 meses

- [ ] **Reporte: Gastos por Vehículo**
  - Tabla: Vehículo, Gastos Preventivo, Gastos Correctivo, Total
  - Gráfico barras (Recharts)

#### Export Excel
**Tasks**:
- [ ] Crear `ExcelService` usando ExcelJS:
```typescript
class ExcelServiceClass {
  async exportVehicles(): Promise<Buffer>
  async exportWorkOrders(filters: WOFilters): Promise<Buffer>
  async exportExpenseReport(startDate: Date, endDate: Date): Promise<Buffer>
}
```

- [ ] Botón "Exportar Excel" en reportes principales
- [ ] Download automático del archivo

### User Stories Sprint 5

#### US-13: Como Admin quiero ver métricas clave en dashboard
**Acceptance Criteria**:
- [x] Dashboard muestra 5 cards principales
- [x] Valores se actualizan automáticamente cada 30-60 seg
- [x] Veo indicadores de tendencia
- [x] Cards usan color coding (verde/amarillo/rojo)
- [x] Click en card navega a detalle

**Story Points**: 8

#### US-14: Como Admin quiero ver calendario de mantenimientos programados
**Acceptance Criteria**:
- [x] Veo calendario con paquetes programados próximos 60 días
- [x] Color coding por proximidad (verde/amarillo/rojo)
- [x] Puedo filtrar por vehículo
- [x] Click en día muestra lista de mantenimientos
- [x] Puedo navegar meses

**Story Points**: 8

#### US-15: Como Admin quiero ver reportes de cumplimiento y gastos
**Acceptance Criteria**:
- [x] Veo % cumplimiento preventivo
- [x] Veo top 10 vehículos con más correctivos
- [x] Veo reporte de gastos por vehículo con gráfico
- [x] Puedo exportar reportes a Excel
- [x] Filtros: último mes / 3 meses / 6 meses

**Story Points**: 13

### Deliverables Sprint 5
- ✅ Dashboard con métricas en tiempo real
- ✅ Refetch automático cada 30-60 seg
- ✅ Vista calendario de mantenimientos
- ✅ Timeline de vehículo
- ✅ Reportes básicos (cumplimiento, correctivos, gastos)
- ✅ Export Excel funcional
- ✅ Dashboard Operativo: 25% → 100%

**Velocity esperada**: 29 story points

---

## 🚀 SPRINT 6: MANTENIMIENTO PREDICTIVO

### Fecha: 23 Dic 2025 - 03 Ene 2026 (2 semanas)
**Objetivo**: Implementar features predictivas básicas (health score + patrones)

### Week 1: Vehicle Health Score

#### Algoritmo Health Score
**Tasks**:
- [ ] Crear `HealthScoreService`:
```typescript
class HealthScoreServiceClass {
  async calculateHealthScore(vehicleId: number): Promise<HealthScore> {
    const vehicle = await this.getVehicleData(vehicleId);

    let score = 100;

    // Factor 1: Correctivos últimos 3 meses (peso: 30%)
    const correctivesCount = vehicle.correctivesLast3Months;
    score -= correctivesCount * 5; // -5 puntos por cada correctivo

    // Factor 2: Preventivos vencidos (peso: 40%)
    const overdueCount = vehicle.overdueMaintenances;
    score -= overdueCount * 10; // -10 puntos por cada vencido

    // Factor 3: Días sin mantenimiento (peso: 20%)
    const daysSinceLastMaintenance = vehicle.daysSinceLastMaintenance;
    score -= (daysSinceLastMaintenance / 30) * 5; // -5 puntos por mes sin mant.

    // Factor 4: Gasto vs promedio flota (peso: 10%)
    const expenseRatio = vehicle.expenses / vehicle.avgFleetExpense;
    if (expenseRatio > 1.5) score -= 10; // -10 si gasta 50% más que promedio

    // Clamp entre 0-100
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      level: this.getHealthLevel(score),
      factors: {
        correctivesLast3Months: correctivesCount,
        overdueMaintenances: overdueCount,
        daysSinceLastMaintenance,
        expenseRatio: expenseRatio.toFixed(2)
      }
    };
  }

  getHealthLevel(score: number): HealthLevel {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'FAIR';
    return 'CRITICAL';
  }
}

interface HealthScore {
  score: number;
  level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'CRITICAL';
  factors: {
    correctivesLast3Months: number;
    overdueMaintenances: number;
    daysSinceLastMaintenance: number;
    expenseRatio: string;
  };
}
```

#### Model VehicleHealthScore (opcional, cache)
**Tasks**:
- [ ] Crear model para cachear scores:
```prisma
model VehicleHealthScore {
  id                Int      @id @default(autoincrement())
  vehicleId         Int      @unique
  score             Int      // 0-100
  level             HealthLevel
  lastCalculated    DateTime @default(now())
  factors           Json     // Factores que contribuyeron al score

  vehicle           Vehicle  @relation(...)

  @@index([score])
  @@index([level])
}

enum HealthLevel {
  EXCELLENT
  GOOD
  FAIR
  CRITICAL
}
```

- [ ] Cron job (o API call) para recalcular scores diariamente

#### UI Health Score
**Tasks**:
- [ ] **Dashboard Card**: "Vehículos en Riesgo"
  - Mostrar count de vehículos con score < 70
  - Click → navegar a ranking completo

- [ ] **Página `/dashboard/analytics/health-ranking/page.tsx`**:
  - Tabla: Vehículo, Score, Level badge, Factores, Acciones
  - Ordenar por score ascendente (peores primero)
  - Color coding:
    - EXCELLENT: Verde
    - GOOD: Azul
    - FAIR: Amarillo
    - CRITICAL: Rojo
  - Botón "Ver Detalles" → modal con breakdown de factores

- [ ] **Badge Health Score** en lista de vehículos:
  - Mostrar score pequeño (ej: 85) con color
  - Tooltip con level

### Week 2: Análisis de Patrones

#### Detectar Patrones Anómalos
**Tasks**:
- [ ] Crear `PatternAnalysisService`:
```typescript
class PatternAnalysisServiceClass {
  // Patrón 1: Items que fallan antes de lo programado
  async detectEarlyFailures(): Promise<Pattern[]> {
    // Query: VehicleProgramItems completados antes del scheduledKm
    // Agrupar por mantItemId
    // Si >30% de casos fallan antes → patrón detectado

    return patterns; // Ej: "Filtro de aire falla 20% antes en clima seco"
  }

  // Patrón 2: Vehículos con uso intensivo
  async detectIntensiveUsage(): Promise<Pattern[]> {
    // Query: Vehículos con km/mes > 150% del promedio
    // Sugerir: Adelantar mantenimientos

    return patterns; // Ej: "Vehículo ABC supera 2000km/mes → ajustar programa"
  }

  // Patrón 3: Mantenimientos recurrentes
  async detectRecurringIssues(): Promise<Pattern[]> {
    // Query: MaintenanceIssues con misma descripción (similarity)
    // Si mismo vehículo + misma issue >3 veces → patrón

    return patterns; // Ej: "Vehículo XYZ reporta falla eléctrica recurrente"
  }
}

interface Pattern {
  type: 'EARLY_FAILURE' | 'INTENSIVE_USAGE' | 'RECURRING_ISSUE';
  vehicleId?: number;
  mantItemId?: number;
  description: string;
  recommendation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  occurrences: number;
}
```

#### UI Análisis de Patrones
**Tasks**:
- [ ] **Página `/dashboard/analytics/patterns/page.tsx`**:
  - Cards por tipo de patrón:
    - "Fallas Tempranas Detectadas" (count)
    - "Vehículos Uso Intensivo" (count)
    - "Issues Recurrentes" (count)
  - Tabla: Patrón, Descripción, Recomendación, Severidad, Acción
  - Botón "Aplicar Recomendación" → ajustar programa automáticamente (opcional)

- [ ] **Dashboard Card**: "Patrones Detectados"
  - Mostrar count de patrones HIGH severity
  - Click → navegar a /analytics/patterns

### User Stories Sprint 6

#### US-16: Como Admin quiero ver health score de cada vehículo
**Acceptance Criteria**:
- [x] Dashboard muestra card "Vehículos en Riesgo"
- [x] Puedo ver ranking completo de todos los vehículos
- [x] Score se muestra con número (0-100) y color
- [x] Puedo ver breakdown de factores que afectan score
- [x] Lista de vehículos muestra badge de health score

**Story Points**: 8

#### US-17: Como Admin quiero detectar patrones anómalos de mantenimiento
**Acceptance Criteria**:
- [x] Sistema detecta items que fallan antes de lo programado
- [x] Sistema detecta vehículos con uso intensivo
- [x] Sistema detecta issues recurrentes
- [x] Veo lista de patrones con recomendaciones
- [x] Dashboard muestra card con patrones HIGH severity

**Story Points**: 13

#### US-18: Como Admin quiero recibir recomendaciones automáticas
**Acceptance Criteria**:
- [x] Sistema sugiere ajustar programa para vehículos uso intensivo
- [x] Sistema recomienda adelantar mantenimiento de items con fallas tempranas
- [x] Sistema alerta sobre issues recurrentes que requieren atención especial
- [x] Recomendaciones se muestran en dashboard de patrones

**Story Points**: 8

### Deliverables Sprint 6
- ✅ HealthScoreService implementado
- ✅ Health scores calculados para todos los vehículos
- ✅ Dashboard con ranking de health scores
- ✅ PatternAnalysisService implementado
- ✅ Detección de 3 tipos de patrones
- ✅ UI análisis de patrones con recomendaciones
- ✅ Mantenimiento Predictivo: 0% → 100% (MVP básico)

**Velocity esperada**: 29 story points

---

## 🚀 SPRINT 7 (OPCIONAL): TESTING & DEPLOYMENT

### Fecha: 06-17 Enero 2026 (2 semanas)
**Objetivo**: Testing completo, performance, deploy a producción

### Week 1: Testing & Bug Fixes

#### Testing Suite
**Tasks**:
- [ ] Setup Vitest + Testing Library:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] Configurar `vitest.config.ts`

- [ ] **Unit Tests - Services** (target: 80% coverage):
  - HealthScoreService
  - PatternAnalysisService
  - WorkOrderService
  - MaintenanceAlertService
  - MaintenanceIssueService

- [ ] **Integration Tests - APIs**:
  - POST /issues → crear novedad
  - POST /issues/:id/approve → aprobar
  - POST /issues/:id/create-workorder → generar WO
  - POST /work-orders/:id/complete → cerrar + auto-cierre

- [ ] **Component Tests**:
  - IssueFormDriver
  - WorkOrderForm
  - AlertCard

#### Bug Fixes
**Tasks**:
- [ ] Revisar issues de sprints anteriores
- [ ] Fix edge cases reportados
- [ ] Mejorar validaciones
- [ ] Mejorar error handling

#### Performance Optimization
**Tasks**:
- [ ] **Lighthouse audit**: Target score >90
- [ ] **Bundle analysis**: Verificar code splitting
- [ ] **Database indexes**: Agregar índices en queries lentas
  ```sql
  CREATE INDEX idx_vehicle_mant_program_vehicle ON VehicleMantProgram(vehicleId);
  CREATE INDEX idx_maintenance_alert_status ON MaintenanceAlert(status);
  CREATE INDEX idx_maintenance_issue_status ON MaintenanceIssue(status);
  ```
- [ ] **Lazy loading**: Componentes pesados (calendario, gráficos)
- [ ] **Image optimization**: Comprimir fotos issues

### Week 2: Deployment & Documentation

#### Pre-deployment
**Tasks**:
- [ ] **Environment variables**: Validar todas en .env.production
- [ ] **Database backup**: Snapshot de Supabase
- [ ] **Prisma migrations**: Aplicar todas en producción
- [ ] **Seed production**: Datos básicos (roles, etc)

#### Deployment Vercel
**Tasks**:
- [ ] Setup proyecto en Vercel
- [ ] Configurar environment variables
- [ ] Deploy a staging: `fleet-care-staging.vercel.app`
- [ ] User acceptance testing en staging
- [ ] Fix bugs de staging
- [ ] Deploy a production: `fleet-care.vercel.app` (o dominio custom)

#### Monitoring
**Tasks**:
- [ ] Setup Vercel Analytics
- [ ] Setup Sentry (error tracking):
```bash
npm install @sentry/nextjs
```
- [ ] Configurar alertas de errores
- [ ] Dashboard de uptime (opcional: Uptime Robot)

#### Documentation
**Tasks**:
- [ ] **README.md completo**:
  - Descripción del proyecto
  - Stack tecnológico
  - Setup local
  - Scripts disponibles
  - Environment variables

- [ ] **DEPLOYMENT.md**:
  - Pasos para deploy
  - Configuración Vercel
  - Configuración Supabase

- [ ] **API_DOCUMENTATION.md**:
  - Endpoints principales
  - Ejemplos de requests/responses

- [ ] **USER_GUIDE.md**:
  - Guía para Admin
  - Guía para Supervisor
  - Guía para Chofer
  - Guía para Técnico

### Deliverables Sprint 7
- ✅ Test coverage >70%
- ✅ Lighthouse score >90
- ✅ Bugs críticos resueltos
- ✅ Deployed a production
- ✅ Monitoring configurado
- ✅ Documentation completa
- ✅ MVP 100% en producción ✨

**Velocity esperada**: 21 story points

---

## 🤔 PREGUNTAS PARA DEFINIR ALCANCE

### 1. WhatsApp Notifications
**Status**: Confirmado para v1.1 (NO MVP)
- ✅ **Acordado**: Sprint 1-6 sin WhatsApp

### 2. Mantenimiento Predictivo
**Pregunta**: ¿Qué nivel necesitas para MVP?

**Opciones**:
- ✅ **Opción A (Recomendado MVP)**: Health Score + patrones básicos (Sprint 6)
- ❌ **Opción B (v2.0)**: Machine Learning avanzado

### 3. Roles PWA
**Pregunta**: ¿Solo choferes usan PWA o también técnicos?

**Opciones**:
- **Solo Choferes**: PWA para reportar issues (Sprint 3)
- **Choferes + Técnicos**: Agregar vista técnico para ejecutar WO desde móvil (Sprint 4)

### 4. Factura/Invoice
**Pregunta**: ¿Factura es solo upload PDF o parsear datos?

**Opciones**:
- ✅ **Simple (Recomendado MVP)**: Solo upload PDF/imagen + campo `totalAmount` (Sprint 4)
- ❌ **Avanzado (v1.1)**: OCR para extraer items → mover feature/ocr-expense-tracking a v1.1

### 5. Inventory
**Pregunta**: ¿Es crítico para MVP o puede esperar?

**Opciones**:
- ✅ **NO crítico (Recomendado)**: Mover a v1.1, enfocarse en flujo mantenimiento
- ❌ **SÍ crítico**: Agregar Sprint 7-8 con stock básico (aumenta timeline 4 semanas)

### 6. Sprint 7 (Testing & Deploy)
**Pregunta**: ¿Incluimos Sprint 7 en timeline MVP o lo hacemos después?

**Opciones**:
- **Incluir Sprint 7**: MVP completo en producción (17 Enero 2026)
- **MVP sin Sprint 7**: Features completas pero sin testing formal (03 Enero 2026)

---

## 📊 MÉTRICAS Y TRACKING

### KPIs por Sprint

| Métrica | Target | Herramienta |
|---------|--------|-------------|
| **Velocity** | 20-30 SP/sprint | GitHub Projects |
| **Code Coverage** | >70% | Vitest |
| **Bug Rate** | <2 bugs/story | GitHub Issues |
| **Lighthouse Score** | >90 | Chrome DevTools |
| **Build Time** | <2 min | Vercel |

### Definition of Done (DoD)

Para considerar una User Story como DONE:

- [x] **Feature implemented**: Código escrito y funcional
- [x] **Tests written**: Unit tests (services) + integration (si aplica)
- [x] **UI responsive**: Mobile + tablet + desktop
- [x] **Code reviewed**: Self-review
- [x] **Documentation**: JSDoc en funciones públicas
- [x] **ESLint clean**: 0 errores
- [x] **TypeScript clean**: 0 errores
- [x] **Performance**: No degradación vs baseline
- [x] **Product owner accepted**: Tested en desarrollo

### Ceremonia de Sprints

#### Sprint Planning (Lunes semana 1)
- **Duración**: 1 hora
- **Objetivo**: Seleccionar user stories del backlog
- **Output**: Sprint backlog con tasks detalladas

#### Daily Standup (Cada día)
- **Duración**: 15 min async
- **Formato**: Mensaje en session
- **Preguntas**:
  - ¿Qué hice ayer?
  - ¿Qué haré hoy?
  - ¿Tengo blockers?

#### Sprint Review (Viernes semana 2)
- **Duración**: 30 min
- **Objetivo**: Demo de features completadas
- **Output**: Feedback y ajustes

#### Sprint Retrospective (Viernes semana 2)
- **Duración**: 30 min
- **Formato**:
  - ¿Qué funcionó bien?
  - ¿Qué mejorar?
  - ¿Qué compromisos tomamos?

---

## 🚨 RISK MANAGEMENT

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Scope creep** | Alta | Alto | Feature flags, strict DoD |
| **Technical debt** | Media | Alto | Code reviews, refactoring |
| **PWA complexity** | Media | Medio | Spike técnico Sprint 2 |
| **Performance issues** | Media | Medio | Lighthouse audits continuas |
| **Supabase downtime** | Baja | Alto | Monitoring, backup plan |

### Contingency Plans

#### Si Sprint 3 (PWA) se atrasa
- **Plan B**: UI web responsive móvil en vez de PWA completa
- Mantener upload de fotos y offline support para v1.1

#### Si Sprint 6 (Predictivo) muy complejo
- **Plan B**: Solo health score, mover patrones a v1.1

#### Si problemas de performance
- Implementar pagination agresiva
- Lazy loading de componentes pesados
- Optimizar queries con índices

---

## 🎯 MILESTONES

### Milestone 1: Preventivo Completo
**Fecha**: 25 Octubre 2025 (fin Sprint 1)
**Criterio**: Sistema preventivo 100% con trigger automático

### Milestone 2: Correctivo Backend
**Fecha**: 08 Noviembre 2025 (fin Sprint 2)
**Criterio**: APIs correctivo completas + upload fotos

### Milestone 3: PWA Funcional
**Fecha**: 22 Noviembre 2025 (fin Sprint 3)
**Criterio**: Choferes pueden reportar desde móvil

### Milestone 4: Flujo Completo End-to-End
**Fecha**: 06 Diciembre 2025 (fin Sprint 4)
**Criterio**: Preventivo + Correctivo → WorkOrder → Cierre automático

### Milestone 5: Dashboard Operativo
**Fecha**: 20 Diciembre 2025 (fin Sprint 5)
**Criterio**: Visibilidad total en tiempo real

### Milestone 6: MVP Feature Complete
**Fecha**: 03 Enero 2026 (fin Sprint 6)
**Criterio**: Predictivo básico funcionando

### Milestone 7 (Opcional): Production Ready
**Fecha**: 17 Enero 2026 (fin Sprint 7)
**Criterio**: Deployed con testing y monitoring

---

## 📋 BACKLOG PRIORIZADO

### Sprint 1 (Preventivo 100%)
- [ ] US-1: Sistema genera alertas automáticamente (8 SP)
- [ ] US-2: Admin ve todas las alertas (5 SP)
- [ ] US-3: Admin crea WorkOrder desde alerta (8 SP)

### Sprint 2 (Correctivo Backend)
- [ ] US-4: Chofer reporta novedades (API) (5 SP)
- [ ] US-5: Supervisor valida novedades (5 SP)
- [ ] US-6: Supervisor genera WO desde issue (5 SP)

### Sprint 3 (Correctivo PWA)
- [ ] US-7: Chofer reporta desde móvil PWA (8 SP)
- [ ] US-8: Supervisor valida novedades UI (8 SP)
- [ ] US-9: Supervisor genera WO UI (5 SP)

### Sprint 4 (Proceso Cierre)
- [ ] US-10: Admin/Técnico gestiona WO (8 SP)
- [ ] US-11: Técnico sube factura (5 SP)
- [ ] US-12: Sistema auto-cierra items/alertas (13 SP)

### Sprint 5 (Dashboard Ops)
- [ ] US-13: Admin ve métricas dashboard (8 SP)
- [ ] US-14: Admin ve calendario mantenimientos (8 SP)
- [ ] US-15: Admin ve reportes y exporta (13 SP)

### Sprint 6 (Predictivo)
- [ ] US-16: Admin ve health score vehículos (8 SP)
- [ ] US-17: Admin detecta patrones anómalos (13 SP)
- [ ] US-18: Admin recibe recomendaciones (8 SP)

### Sprint 7 (Testing & Deploy)
- [ ] Testing suite (8 SP)
- [ ] Bug fixes (5 SP)
- [ ] Performance optimization (5 SP)
- [ ] Deployment (3 SP)

**Total story points**: ~170 SP
**Velocity promedio**: 24 SP/sprint

---

## 🎉 POST-MVP (v1.1 - v2.0)

### Features para v1.1 (Feb-Mar 2026)
- [ ] ⭐ WhatsApp Notifications (Twilio production)
- [ ] ⭐ Inventory System (stock tracking + purchase orders)
- [ ] ⭐ OCR Facturas (feature/ocr-expense-tracking)
- [ ] Notificaciones en tiempo real (WebSockets/Pusher)
- [ ] Vista técnico en PWA (ejecutar WO desde móvil)
- [ ] Advanced filters & search
- [ ] Bulk operations

### Features para v1.2 (Abr-May 2026)
- [ ] Integraciones externas (Google Calendar, Slack)
- [ ] Advanced analytics (BI dashboard)
- [ ] Multi-idioma (i18n)
- [ ] Mobile app nativa (React Native)
- [ ] API pública (REST)

### Features para v2.0 (Jun-Ago 2026)
- [ ] Predictive maintenance avanzado (Machine Learning)
- [ ] Route optimization (para choferes)
- [ ] Fuel management
- [ ] Driver behavior analytics
- [ ] IoT integration (sensores vehículos)

---

## ✅ PRÓXIMOS PASOS INMEDIATOS

### Hoy (07-Oct)
1. ✅ Aprobar este cronograma ajustado
2. ✅ Responder preguntas de alcance (sección anterior)
3. ✅ Decidir: ¿Incluir Sprint 7 o no?

### Esta semana (Sprint 0 - Prep)
1. Push 14-15 commits pendientes a origin/develop
2. Install TanStack Query: `npm install @tanstack/react-query @tanstack/react-query-devtools`
3. Fix 4 ESLint errors (any types)
4. Setup QueryProvider
5. Update README.md
6. GitHub Projects board

### Próximas 2 semanas (Sprint 1)
1. Crear model MaintenanceAlert
2. Implementar trigger automático en OdometerLog
3. Crear APIs alertas
4. Implementar dashboard de alertas
5. Botón "Crear WorkOrder" desde alerta

---

## 📞 SOPORTE Y COMUNICACIÓN

### Canales
- **Daily updates**: .claude/sessions/
- **Issues**: GitHub Issues
- **Docs**: /docs folder
- **Questions**: Session comments

### Horarios
- **Development**: L-V flexible
- **Standups**: Async (log en session)
- **Reviews**: Viernes al finalizar sprint

---

**Cronograma creado**: 07 Octubre 2025
**Última actualización**: 07 Octubre 2025
**Basado en**: Feedback arquitectura real del negocio
**Tiempo estimado MVP**: 12-14 semanas (6-7 sprints)
**Fecha estimada fin**: 31 Diciembre 2025 (Sprint 6) o 17 Enero 2026 (Sprint 7)
