# Sesión 20 Octubre 2025 - Arquitectura de Templates de Mantenimiento + Priorización MVP

**Fecha**: 20 Octubre 2025
**Branch**: `develop`
**Objetivo**: Definir arquitectura completa de templates de mantenimiento y priorizar para MVP

---

## 🎯 Contexto de la Sesión

### Problema Identificado:

1. **MantItem estaba contaminado** - Contenía datos específicos de vehículos (ej: "usar aceite 5W-40 para Hilux")
2. **TenantId nullable peligroso** - 20 empresas con Hilux NO deberían tener 20 templates idénticos
3. **Duplicación innecesaria** - Sin sistema de compartición de templates oficiales
4. **Falta de flujo claro** - ¿Cómo se asignan templates a vehículos nuevos?
5. **Inferencia incorrecta** - Sistema calculaba próximo mantenimiento sin conocer historial real

### Decisiones Clave:

1. ✅ **MantItem limpio y general** - Sin datos específicos de vehículos
2. ✅ **PackageItem con specificNotes** - Datos específicos van aquí (ej: tipo de aceite para Hilux)
3. ✅ **Templates Oficiales + Templates de Tenant** - Separación clara, sin tenantId nullable
4. ✅ **Copy-on-use** - Tenant descarga copia del template oficial y la modifica sin contaminar original
5. ✅ **firstMaintenanceKm** - Usuario indica cuándo es el próximo mantenimiento (precisión 100%)

---

## 📐 Arquitectura Definitiva

### Principios Fundamentales:

```
NIVEL 1: BIBLIA DE FLEET CARE (Oficial - Solo lectura para tenants)
  ↓ (COPY ON USE)
NIVEL 2: TEMPLATES DEL TENANT (Copia privada - Modificable)
  ↓ (ASIGNAR A VEHÍCULO)
NIVEL 3: PROGRAMA DE MANTENIMIENTO (Vehículo específico con firstMaintenanceKm)
```

### Flujo Completo:

```
┌─────────────────────────────────────────────────────────────┐
│ FLEET CARE (Administradores)                                │
├─────────────────────────────────────────────────────────────┤
│ 1. Crear OfficialMaintenanceTemplate                        │
│    - Toyota Hilux 2020-2024 Diesel                          │
│    - OfficialPackage: 5k, 10k, 20k, 40k km                  │
│    - OfficialPackageItem: con specificNotes                 │
│                                                              │
│ 2. Fuentes de templates:                                    │
│    - Manual (cargado por Fleet Care)                        │
│    - Manufacturer (manual oficial)                          │
│    - Web Scraping (IA extrae de web) ← POST-MVP             │
│    - AI Generated (IA genera) ← POST-MVP                    │
└─────────────────────────────────────────────────────────────┘
                           ↓ COPY
┌─────────────────────────────────────────────────────────────┐
│ TENANT (Cliente SaaS)                                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Onboarding (MVP):                                        │
│    - Registrar tipos de vehículos: Toyota Hilux 2024        │
│    - Sistema BUSCA en biblia oficial                        │
│    - Sistema COPIA template al tenant                       │
│                                                              │
│ 2. Modificación (Opcional):                                 │
│    - Tenant modifica SU copia:                              │
│      • Cambiar intervalo 5k → 7.5k km                       │
│      • Agregar item custom: "Revisión GPS"                  │
│    - wasModified = true                                     │
│                                                              │
│ 3. Crear Vehículo:                                          │
│    - Ingresar: ABC-123, Toyota Hilux 2024                   │
│    - Sistema detecta template compatible                    │
│    - Si no existe → copia de oficial (copy-on-the-fly)      │
│                                                              │
│ 4. Asignar Plan:                                            │
│    - Kilometraje actual: 28,300 km                          │
│    - firstMaintenanceKm: 30,000 km (usuario lo indica)      │
│    - Sistema genera items programados:                      │
│      • 30,000 km, 35,000 km, 40,000 km, etc.               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Schema Prisma - Arquitectura Completa

### NIVEL 1: Templates Oficiales (Biblia de Fleet Care)

```prisma
// ============================================
// TEMPLATES OFICIALES - Solo Fleet Care
// ============================================

model OfficialMaintenanceTemplate {
  id              String   @id @default(cuid())

  // Identificación
  code            String   @unique  // "TOYOTA-HILUX-2020-2024-DIESEL"
  name            String              // "Plan Mantenimiento Toyota Hilux Diesel 2020-2024"

  // Aplicabilidad (Filtros para matching automático)
  brand           String              // "TOYOTA"
  model           String              // "HILUX"
  yearFrom        Int?                // 2020
  yearTo          Int?                // 2024
  engineType      String?             // "DIESEL_2.8L"
  transmission    String?             // "MANUAL", "AUTOMATICA"
  fuelType        String?             // "DIESEL", "GASOLINA", "GAS"

  // Metadata
  description     String?  @db.Text
  source          TemplateSource       // MANUFACTURER, WEB_SCRAPING, MANUAL, AI_GENERATED
  sourceUrl       String?              // URL del manual oficial
  confidence      Float    @default(1.0) // 0-1 (para templates de IA)

  isActive        Boolean  @default(true)
  isVerified      Boolean  @default(false) // Verificado por experto de Fleet Care

  version         Int      @default(1)
  createdBy       String?  // Usuario Fleet Care que lo creó
  verifiedBy      String?  // Usuario Fleet Care que lo verificó

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relaciones
  packages        OfficialPackage[]
  tenantCopies    MaintenanceTemplate[] @relation("SourceOfficial")

  @@index([brand, model])
  @@index([code])
  @@index([source])
  @@index([isActive, isVerified])
}

enum TemplateSource {
  MANUFACTURER     // Manual oficial del fabricante
  WEB_SCRAPING     // Extraído de web con IA (POST-MVP)
  MANUAL           // Cargado manualmente por Fleet Care
  AI_GENERATED     // Generado por IA (POST-MVP)
  TENANT_PROPOSAL  // Propuesto por tenant (POST-MVP)
}

model OfficialPackage {
  id                    String   @id @default(cuid())
  officialTemplateId    String
  officialTemplate      OfficialMaintenanceTemplate @relation(fields: [officialTemplateId], references: [id], onDelete: Cascade)

  name                  String   // "Mantenimiento 5,000 km"
  description           String?  @db.Text

  // Intervalos
  intervalKm            Int?
  intervalMonths        Int?
  intervalHours         Int?     // Para maquinaria

  priority              Priority @default(MEDIUM)
  estimatedTimeMinutes  Int?
  estimatedCost         Decimal?

  sequence              Int      @default(0)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relaciones
  items                 OfficialPackageItem[]

  @@index([officialTemplateId])
}

model OfficialPackageItem {
  id                String   @id @default(cuid())
  officialPackageId String
  officialPackage   OfficialPackage @relation(fields: [officialPackageId], references: [id], onDelete: Cascade)

  mantItemId        String
  mantItem          MantItem @relation(fields: [mantItemId], references: [id], onDelete: Restrict)

  // ✅ NOTAS ESPECÍFICAS PARA ESTE VEHÍCULO
  specificNotes     String?  @db.Text  // "Usar aceite Shell Helix 5W-40 sintético para Hilux Diesel"
  technicalSpecs    Json?    // { "oilCapacity": "4.5L", "filterType": "BOSCH-123" }

  isRequired        Boolean  @default(true)
  estimatedCost     Decimal?
  estimatedTime     Int?     // Minutos

  sequence          Int      @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([officialPackageId])
  @@index([mantItemId])
}

// ============================================
// NIVEL 2: Templates del Tenant (Modificables)
// ============================================

model MaintenanceTemplate {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // ✅ RASTREAR PROCEDENCIA
  sourceType              TemplateSourceType
  sourceOfficialId        String?
  sourceOfficial          OfficialMaintenanceTemplate? @relation("SourceOfficial", fields: [sourceOfficialId], references: [id], onDelete: SetNull)

  wasModified             Boolean  @default(false)
  lastSyncedAt            DateTime?

  // Datos del template
  name                    String
  description             String?  @db.Text

  // Aplicabilidad
  brand                   String?
  model                   String?
  yearFrom                Int?
  yearTo                  Int?
  engineType              String?
  transmission            String?

  isActive                Boolean  @default(true)

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  // Relaciones
  packages                Package[]
  vehiclePrograms         VehicleMantProgram[]

  @@index([tenantId])
  @@index([sourceOfficialId])
  @@index([sourceType])
  @@index([brand, model])
}

enum TemplateSourceType {
  OFFICIAL_COPY   // Copiado de OfficialMaintenanceTemplate
  CUSTOM          // Creado desde cero por el tenant
  AI_ASSISTED     // Asistido por IA durante onboarding (POST-MVP)
}

model Package {
  id                    String   @id @default(cuid())
  templateId            String
  template              MaintenanceTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  name                  String
  description           String?  @db.Text
  intervalKm            Int?
  intervalMonths        Int?
  intervalHours         Int?
  priority              Priority @default(MEDIUM)
  estimatedTimeMinutes  Int?
  estimatedCost         Decimal?
  sequence              Int      @default(0)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relaciones
  items                 PackageItem[]
  vehicleProgramItems   VehicleProgramItem[]

  @@index([templateId])
}

model PackageItem {
  id              String   @id @default(cuid())
  packageId       String
  package         Package  @relation(fields: [packageId], references: [id], onDelete: Cascade)

  mantItemId      String
  mantItem        MantItem @relation(fields: [mantItemId], references: [id], onDelete: Restrict)

  // ✅ TENANT PUEDE PERSONALIZAR
  specificNotes   String?  @db.Text
  technicalSpecs  Json?

  isRequired      Boolean  @default(true)
  estimatedCost   Decimal?
  estimatedTime   Int?
  sequence        Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([packageId])
  @@index([mantItemId])
}

// ============================================
// MAESTRO GENERAL: MantItem (Limpio)
// ============================================

model MantItem {
  id              String   @id @default(cuid())

  // ✅ LIMPIO Y GENERAL - Sin datos específicos de vehículos
  code            String   @unique  // "MANT-OIL-CHANGE"
  name            String              // "Cambio de aceite motor"
  category        ItemCategory        // OIL, FILTER, BRAKE, TIRE, etc.
  type            ItemType            // ACTION, PART, SERVICE

  description     String?  @db.Text   // Descripción general

  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relaciones
  officialPackageItems  OfficialPackageItem[]
  packageItems          PackageItem[]

  @@index([category])
  @@index([type])
  @@index([code])
}

enum ItemCategory {
  OIL              // Aceites y lubricantes
  FILTER           // Filtros (aceite, aire, combustible)
  BRAKE            // Frenos
  TIRE             // Neumáticos
  SUSPENSION       // Suspensión
  ENGINE           // Motor
  TRANSMISSION     // Transmisión
  ELECTRICAL       // Sistema eléctrico
  COOLING          // Sistema de enfriamiento
  INSPECTION       // Inspecciones
  OTHER            // Otros
}

enum ItemType {
  ACTION           // Inspección, revisión (no factura artículo)
  PART             // Repuesto facturable
  SERVICE          // Servicio completo externo
}

// ============================================
// NIVEL 3: Programa de Mantenimiento por Vehículo
// ============================================

model VehicleMantProgram {
  id              String   @id @default(cuid())
  vehicleId       String
  vehicle         Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  templateId      String
  template        MaintenanceTemplate @relation(fields: [templateId], references: [id], onDelete: Restrict)

  isActive        Boolean  @default(true)
  startDate       DateTime @default(now())

  // ✅ DATO CLAVE: Kilometraje del PRIMER mantenimiento
  firstMaintenanceKm    Int?     // Usuario lo indica: ej: 30,000 km
  firstMaintenanceDate  DateTime? // Opcional: fecha del primer mantenimiento

  // Esto nos permite calcular los siguientes:
  // Si firstMaintenanceKm = 30,000 y el intervalo es 5,000:
  // → Próximos: 30k, 35k, 40k, 45k, 50k, etc.

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items           VehicleProgramItem[]

  @@index([vehicleId])
  @@index([templateId])
}

model VehicleProgramItem {
  id              String   @id @default(cuid())
  programId       String
  program         VehicleMantProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  packageId       String
  package         Package  @relation(fields: [packageId], references: [id], onDelete: Restrict)

  // ✅ Calculado basándose en firstMaintenanceKm
  nextDueKm       Int?
  nextDueDate     DateTime?
  nextDueHours    Int?

  status          ProgramItemStatus @default(PENDING)
  priority        Priority

  // Datos de ejecución
  completedAt     DateTime?
  completedKm     Int?
  completedHours  Int?
  workOrderId     String?
  workOrder       WorkOrder? @relation(fields: [workOrderId], references: [id], onDelete: SetNull)

  estimatedTimeMinutes  Int?
  estimatedCost         Decimal?
  actualCost            Decimal?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([programId])
  @@index([packageId])
  @@index([status])
}

enum ProgramItemStatus {
  PENDING       // Pendiente (lejano)
  YELLOW        // Próximo (1000 km o 30 días)
  RED           // Urgente (500 km o 7 días)
  COMPLETED     // Completado
  OVERDUE       // Vencido
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

---

## 🚀 PRIORIZACIÓN: MVP vs POST-MVP

### ✅ FASE 1: MVP (Implementar YA)

**Objetivo**: Ciclo preventivo básico funcional para presentación

#### 1.1. Schema Prisma (CRITICAL)

**Tareas**:
- [ ] Crear modelos `MaintenanceTemplate`, `Package`, `PackageItem` (tenant)
- [ ] Modificar `MantItem` (limpiar, agregar enums `ItemCategory`, `ItemType`)
- [ ] Crear `VehicleMantProgram` con `firstMaintenanceKm`
- [ ] Crear `VehicleProgramItem` con estados `PENDING`, `YELLOW`, `RED`, `COMPLETED`
- [ ] **NO crear** `OfficialMaintenanceTemplate` (Post-MVP)

**Schema MVP Simplificado**:
```prisma
// SOLO ESTO PARA MVP:

model MaintenanceTemplate {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // SIN sourceOfficialId (no hay biblia oficial en MVP)

  name            String
  description     String?  @db.Text
  brand           String?
  model           String?
  yearFrom        Int?
  yearTo          Int?
  engineType      String?

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  packages        Package[]
  vehiclePrograms VehicleMantProgram[]

  @@index([tenantId])
  @@index([brand, model])
}

model Package {
  id                    String   @id @default(cuid())
  templateId            String
  template              MaintenanceTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  name                  String
  description           String?  @db.Text
  intervalKm            Int?
  intervalMonths        Int?
  priority              Priority @default(MEDIUM)
  estimatedTimeMinutes  Int?
  estimatedCost         Decimal?
  sequence              Int      @default(0)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  items                 PackageItem[]
  vehicleProgramItems   VehicleProgramItem[]

  @@index([templateId])
}

model PackageItem {
  id              String   @id @default(cuid())
  packageId       String
  package         Package  @relation(fields: [packageId], references: [id], onDelete: Cascade)

  mantItemId      String
  mantItem        MantItem @relation(fields: [mantItemId], references: [id], onDelete: Restrict)

  specificNotes   String?  @db.Text  // ✅ Notas específicas
  isRequired      Boolean  @default(true)
  estimatedCost   Decimal?
  estimatedTime   Int?
  sequence        Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([packageId])
  @@index([mantItemId])
}

model MantItem {
  id              String   @id @default(cuid())
  code            String   @unique
  name            String
  category        ItemCategory
  type            ItemType
  description     String?  @db.Text
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  packageItems    PackageItem[]

  @@index([category])
  @@index([type])
}

model VehicleMantProgram {
  id                    String   @id @default(cuid())
  vehicleId             String
  vehicle               Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  templateId            String
  template              MaintenanceTemplate @relation(fields: [templateId], references: [id], onDelete: Restrict)

  isActive              Boolean  @default(true)
  startDate             DateTime @default(now())

  // ✅ CLAVE PARA MVP
  firstMaintenanceKm    Int      // Usuario lo indica
  firstMaintenanceDate  DateTime?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  items                 VehicleProgramItem[]

  @@index([vehicleId])
  @@index([templateId])
}

model VehicleProgramItem {
  id                    String   @id @default(cuid())
  programId             String
  program               VehicleMantProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  packageId             String
  package               Package  @relation(fields: [packageId], references: [id], onDelete: Restrict)

  nextDueKm             Int?
  nextDueDate           DateTime?

  status                ProgramItemStatus @default(PENDING)
  priority              Priority

  completedAt           DateTime?
  completedKm           Int?
  workOrderId           String?

  estimatedTimeMinutes  Int?
  estimatedCost         Decimal?
  actualCost            Decimal?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([programId])
  @@index([packageId])
  @@index([status])
}

enum ProgramItemStatus {
  PENDING
  YELLOW
  RED
  COMPLETED
  OVERDUE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ItemCategory {
  OIL
  FILTER
  BRAKE
  TIRE
  SUSPENSION
  ENGINE
  TRANSMISSION
  ELECTRICAL
  COOLING
  INSPECTION
  OTHER
}

enum ItemType {
  ACTION
  PART
  SERVICE
}
```

**Estimación**: 1 día (migración + seed)

---

#### 1.2. CRUD Templates (Admin Dashboard)

**Objetivo**: Que el tenant pueda crear/editar templates manualmente

**Pantallas**:
1. Lista de Templates
2. Crear Template
3. Editar Template (agregar/quitar packages)
4. Agregar PackageItems con specificNotes

**Rutas**:
- `/dashboard/maintenance/templates` - Lista
- `/dashboard/maintenance/templates/new` - Crear
- `/dashboard/maintenance/templates/[id]` - Editar

**Componentes**:
- `TemplateList.tsx`
- `TemplateForm.tsx`
- `PackageForm.tsx` (nested)
- `PackageItemSelector.tsx` (seleccionar MantItems + agregar notas)

**API Endpoints**:
- `GET /api/maintenance/templates`
- `POST /api/maintenance/templates`
- `GET /api/maintenance/templates/[id]`
- `PUT /api/maintenance/templates/[id]`
- `DELETE /api/maintenance/templates/[id]`

**Estimación**: 3 días

---

#### 1.3. Crear Vehículo con firstMaintenanceKm

**Objetivo**: Al dar de alta vehículo, asignar template y generar plan

**Flujo**:
```
1. Usuario ingresa datos vehículo:
   - Placa: ABC-123
   - Marca: Toyota
   - Modelo: Hilux
   - Año: 2024
   - Km actual: 28,300

2. Sistema sugiere template compatible (si existe)

3. Usuario indica:
   - Próximo mantenimiento: 30,000 km ← CLAVE

4. Sistema crea:
   - Vehicle
   - VehicleMantProgram (con firstMaintenanceKm = 30,000)
   - VehicleProgramItems (30k, 35k, 40k, 45k...)
   - MaintenanceAlerts (para items YELLOW/RED)
```

**Modificar**:
- `components/vehicles/VehicleForm.tsx` - Agregar sección "Plan de Mantenimiento"
- `app/api/vehicles/route.ts` - Crear vehículo + programa

**Nuevo Service**:
- `lib/services/maintenance-program.service.ts`
  - `generateProgramItems(templateId, vehicleId, currentKm, firstMaintenanceKm)`
  - `generateMaintenanceAlerts(programId)`

**Estimación**: 2 días

---

#### 1.4. Generación Automática de Alertas

**Objetivo**: Al crear vehículo, generar alertas para items YELLOW/RED

**Lógica**:
```typescript
function determineStatus(nextDueKm, currentKm) {
  const kmRemaining = nextDueKm - currentKm

  if (kmRemaining <= 0) return 'RED'      // Vencido
  if (kmRemaining <= 500) return 'RED'    // Urgente
  if (kmRemaining <= 1000) return 'YELLOW' // Próximo
  return 'PENDING'
}
```

**Service**:
- `lib/services/maintenance-alerts.service.ts`
  - `generateAlertsForProgram(programId)`
  - `updateAlertsOnOdometerChange(vehicleId, newKm)`

**Estimación**: 1 día

---

#### 1.5. Dashboard de Alertas (Mejorado)

**Objetivo**: Mostrar alertas generadas con info del plan

**Mejoras a pantalla existente**:
- Mostrar `specificNotes` del PackageItem
- Mostrar items del paquete (ej: "Cambio aceite + Filtro aceite + Arandela")
- Botón "Crear Orden de Trabajo" desde alerta

**Estimación**: 1 día

---

#### 1.6. Seed con Datos Realistas

**Objetivo**: Seed con templates, vehículos y alertas para demo

**Contenido**:
```typescript
// 1. MantItems generales
- Cambio aceite motor
- Cambio filtro aceite
- Cambio filtro aire
- Rotación neumáticos
- Inspección frenos
- Revisión suspensión
// ... ~20 items

// 2. Templates
- Toyota Hilux 2020-2024 Diesel
  - Package 5,000 km
  - Package 10,000 km
  - Package 20,000 km
  - Package 40,000 km

- Nissan Frontier 2019-2023
  - Similar estructura

// 3. Vehículos
- 10 vehículos con diferentes km
- Algunos con alertas YELLOW
- Algunos con alertas RED

// 4. Alertas generadas automáticamente
```

**Estimación**: 1 día

---

### ✅ RESUMEN FASE 1 - MVP (9 días de desarrollo)

| Tarea | Estimación | Prioridad |
|-------|------------|-----------|
| 1.1 Schema Prisma + Migración | 1 día | CRITICAL |
| 1.2 CRUD Templates | 3 días | HIGH |
| 1.3 Crear Vehículo + Plan | 2 días | CRITICAL |
| 1.4 Generación Alertas | 1 día | CRITICAL |
| 1.5 Dashboard Alertas | 1 día | MEDIUM |
| 1.6 Seed Realista | 1 día | MEDIUM |
| **TOTAL MVP** | **9 días** | |

**Entregables MVP**:
- ✅ Tenant puede crear templates manualmente
- ✅ Tenant puede asignar template a vehículo
- ✅ Sistema genera plan basado en `firstMaintenanceKm`
- ✅ Alertas automáticas YELLOW/RED
- ✅ Dashboard funcional con datos reales

---

## 🔮 FASE 2: POST-MVP (Después de presentación)

### 2.1. Biblia Oficial de Templates

**Objetivo**: Fleet Care mantiene templates oficiales que los tenants descargan

**Implementar**:
- Modelos `OfficialMaintenanceTemplate`, `OfficialPackage`, `OfficialPackageItem`
- Panel admin Fleet Care para gestionar templates oficiales
- Endpoint `/api/admin/official-templates` (protegido)

**Estimación**: 3 días

---

### 2.2. Copy-on-use en Onboarding

**Objetivo**: Al registrarse, tenant selecciona tipos de vehículos y descarga templates

**Flujo**:
```
Onboarding Wizard:
1. Datos empresa
2. Tipos de vehículos → Buscar en biblia → Copiar al tenant
3. Finalizar
```

**Implementar**:
- Wizard step "Tipos de Vehículos"
- Búsqueda en `OfficialMaintenanceTemplate`
- Copia automática a `MaintenanceTemplate` del tenant
- `sourceType = OFFICIAL_COPY`
- `sourceOfficialId` FK

**Estimación**: 2 días

---

### 2.3. Copy-on-the-fly al Crear Vehículo

**Objetivo**: Si tenant crea vehículo de tipo no registrado, copiar template automáticamente

**Implementar**:
- Modificar `POST /api/vehicles`
- Si no existe template en tenant → Buscar en oficiales → Copiar

**Estimación**: 1 día

---

### 2.4. Sugerencia de Templates con IA (Web Scraping)

**Objetivo**: Si no existe template oficial, buscar en web con IA

**Implementar**:
- Servicio `searchMaintenancePlanWithAI(vehicle)`
- Usar Claude API para extraer info de manuales online
- Crear `OfficialMaintenanceTemplate` con `source = AI_GENERATED`
- Marcar como `isVerified = false`

**Estimación**: 5 días (requiere fine-tuning)

---

### 2.5. Sincronización con Template Oficial

**Objetivo**: Si Fleet Care actualiza template oficial, tenant puede sincronizar

**Implementar**:
- Detección de nueva versión
- Diff entre template oficial y copia del tenant
- UI para revisar cambios y sincronizar (total o selectivo)

**Estimación**: 3 días

---

### 2.6. Propuestas de Tenants

**Objetivo**: Tenant puede proponer template para agregar a biblia oficial

**Implementar**:
- Botón "Proponer para Compartir"
- Modelo `OfficialTemplateProposal`
- Panel Fleet Care para revisar y aprobar
- Al aprobar → crear `OfficialMaintenanceTemplate`

**Estimación**: 2 días

---

### ✅ RESUMEN FASE 2 - POST-MVP (16 días)

| Tarea | Estimación |
|-------|------------|
| 2.1 Biblia Oficial | 3 días |
| 2.2 Copy-on-use Onboarding | 2 días |
| 2.3 Copy-on-the-fly Vehículo | 1 día |
| 2.4 IA Web Scraping | 5 días |
| 2.5 Sincronización | 3 días |
| 2.6 Propuestas Tenants | 2 días |
| **TOTAL POST-MVP** | **16 días** | |

---

## 📊 Casos de Uso Completos

### Caso 1: MVP - Tenant Crea Template Manualmente

```typescript
// PASO 1: Admin crea template
POST /api/maintenance/templates
{
  name: "Plan Mantenimiento Toyota Hilux Diesel 2020-2024",
  brand: "TOYOTA",
  model: "HILUX",
  yearFrom: 2020,
  yearTo: 2024,
  engineType: "DIESEL_2.8L",

  packages: [
    {
      name: "Mantenimiento 5,000 km",
      intervalKm: 5000,
      intervalMonths: 6,
      priority: "MEDIUM",

      items: [
        {
          mantItemId: "mant-oil-change",
          specificNotes: "Usar aceite Shell Helix Ultra 5W-40 sintético. Capacidad: 4.5L",
          isRequired: true,
          estimatedCost: 140000,
          estimatedTime: 30
        },
        {
          mantItemId: "mant-oil-filter",
          specificNotes: "Filtro BOSCH compatible",
          isRequired: true,
          estimatedCost: 45000,
          estimatedTime: 10
        }
      ]
    },
    {
      name: "Mantenimiento 10,000 km",
      intervalKm: 10000,
      intervalMonths: 12,
      priority: "HIGH",

      items: [
        // Incluye todos los de 5k + adicionales
      ]
    }
  ]
}

// PASO 2: Admin crea vehículo
POST /api/vehicles
{
  licensePlate: "ABC-123",
  brand: "TOYOTA",
  model: "HILUX",
  year: 2024,
  engineType: "DIESEL_2.8L",
  initialOdometer: 28300,
  firstMaintenanceKm: 30000  // ← Usuario lo indica
}

// RESULTADO AUTOMÁTICO:
// 1. Vehicle creado
// 2. VehicleMantProgram creado con firstMaintenanceKm = 30000
// 3. VehicleProgramItems generados:
//    - Item 1: nextDueKm = 30,000 (status: YELLOW)
//    - Item 2: nextDueKm = 35,000 (status: PENDING)
//    - Item 3: nextDueKm = 40,000 (status: PENDING)
//    - Item 4: nextDueKm = 45,000 (status: PENDING)
// 4. MaintenanceAlert creada para item YELLOW
```

---

### Caso 2: MVP - 50 Hilux con Template Modificado

```typescript
// PASO 1: Admin crea template (igual que caso 1)

// PASO 2: Admin MODIFICA su template
PUT /api/maintenance/templates/{templateId}/packages/{packageId}
{
  intervalKm: 7500  // Cambió de 5000 a 7500 (aceite sintético de larga duración)
}

POST /api/maintenance/templates/{templateId}/packages/{packageId}/items
{
  mantItemId: "mant-gps-check",
  specificNotes: "Verificar funcionamiento GPS tracker y batería de respaldo",
  isRequired: true,
  estimatedTime: 10
}

// PASO 3: Admin crea 50 vehículos
for (i = 1; i <= 50; i++) {
  POST /api/vehicles
  {
    licensePlate: `HIL-${i.toString().padStart(3, '0')}`,
    brand: "TOYOTA",
    model: "HILUX",
    year: 2024,
    initialOdometer: Math.random() * 50000, // Diferentes km
    firstMaintenanceKm: // Usuario indica para cada uno
  }
}

// RESULTADO:
// ✅ Los 50 vehículos usan el MISMO template modificado
// ✅ Todos tienen intervalo de 7,500 km (no 5,000)
// ✅ Todos incluyen "Revisión GPS" en sus paquetes
// ✅ NO se crearon 50 templates diferentes
```

---

### Caso 3: POST-MVP - Onboarding con Descarga Automática

```typescript
// ONBOARDING WIZARD - Paso "Tipos de Vehículos"

POST /api/onboarding/complete
{
  companyData: { ... },
  userData: { ... },

  vehicleTypes: [
    {
      brand: "TOYOTA",
      model: "HILUX",
      yearFrom: 2020,
      yearTo: 2024,
      engineType: "DIESEL_2.8L"
    },
    {
      brand: "NISSAN",
      model: "FRONTIER",
      yearFrom: 2019,
      yearTo: 2023,
      engineType: "DIESEL_2.5L"
    }
  ]
}

// BACKEND AUTOMÁTICO:
// 1. Crear tenant
// 2. Crear usuario admin
// 3. Para cada vehicleType:
//    a. Buscar en OfficialMaintenanceTemplate
//    b. Copiar a MaintenanceTemplate del tenant
//    c. sourceType = OFFICIAL_COPY
//    d. sourceOfficialId = {id del oficial}

// RESULTADO:
// Tenant creado con 2 templates listos para usar
// Usuario puede empezar a crear vehículos inmediatamente
```

---

## 🎯 Lógica de Generación de Items Programados

### Algoritmo `firstMaintenanceKm`

```typescript
/**
 * Genera items programados basándose en el PRIMER mantenimiento indicado por el usuario
 *
 * @param currentOdometer - Km actual del vehículo (ej: 28,300)
 * @param firstMaintenanceKm - Próximo mantenimiento (ej: 30,000) ← Usuario lo indica
 * @param intervalKm - Intervalo del package (ej: 5,000)
 * @returns nextDueKm - Km del próximo mantenimiento
 */
function calculateNextDueKm(
  currentOdometer: number,
  firstMaintenanceKm: number,
  intervalKm: number
): number {
  if (currentOdometer < firstMaintenanceKm) {
    // Aún no llegamos al primer mantenimiento
    return firstMaintenanceKm
  } else {
    // Ya pasamos el primer mantenimiento
    // Calcular cuántos intervalos han pasado desde firstMaintenanceKm
    const intervalsPassed = Math.floor(
      (currentOdometer - firstMaintenanceKm) / intervalKm
    )

    return firstMaintenanceKm + ((intervalsPassed + 1) * intervalKm)
  }
}

// EJEMPLOS:

// Ejemplo 1: Vehículo nuevo (antes del primer mantenimiento)
calculateNextDueKm(2300, 5000, 5000)
// → 5,000 (primer mantenimiento)

// Ejemplo 2: Vehículo usado (pasó el primer mantenimiento)
calculateNextDueKm(28300, 30000, 5000)
// → 30,000 (primer mantenimiento aún no se hace)

calculateNextDueKm(31000, 30000, 5000)
// intervalsPassed = floor((31,000 - 30,000) / 5,000) = 0
// → 30,000 + ((0 + 1) * 5,000) = 35,000

calculateNextDueKm(43000, 30000, 5000)
// intervalsPassed = floor((43,000 - 30,000) / 5,000) = 2
// → 30,000 + ((2 + 1) * 5,000) = 45,000

// SERIE COMPLETA para vehículo con firstMaintenanceKm = 30,000:
// 30k, 35k, 40k, 45k, 50k, 55k, 60k...
// ✅ PRECISIÓN 100%
```

### Determinación de Estado y Prioridad

```typescript
function determineStatusAndPriority(
  nextDueKm: number,
  currentKm: number,
  basePriority: Priority
): { status: ProgramItemStatus, priority: Priority } {
  const kmRemaining = nextDueKm - currentKm

  if (kmRemaining <= 0) {
    return { status: 'RED', priority: 'CRITICAL' }  // Vencido
  }

  if (kmRemaining <= 500) {
    return { status: 'RED', priority: 'CRITICAL' }  // Urgente
  }

  if (kmRemaining <= 1000) {
    return { status: 'YELLOW', priority: 'HIGH' }   // Próximo
  }

  return { status: 'PENDING', priority: basePriority }  // Normal
}

// EJEMPLOS:

determineStatusAndPriority(30000, 29700, 'MEDIUM')
// kmRemaining = 300
// → { status: 'RED', priority: 'CRITICAL' }

determineStatusAndPriority(30000, 29200, 'MEDIUM')
// kmRemaining = 800
// → { status: 'YELLOW', priority: 'HIGH' }

determineStatusAndPriority(30000, 25000, 'MEDIUM')
// kmRemaining = 5000
// → { status: 'PENDING', priority: 'MEDIUM' }
```

---

## 📝 Notas Técnicas Importantes

### 1. MantItem: Limpio y General

**✅ CORRECTO**:
```prisma
model MantItem {
  code: "MANT-OIL-CHANGE"
  name: "Cambio de aceite motor"
  category: "OIL"
  type: "PART"
  description: "Cambio de aceite y filtro del motor"
}
```

**❌ INCORRECTO** (NO contaminar con datos específicos):
```prisma
model MantItem {
  code: "MANT-OIL-CHANGE-HILUX"  // ❌ NO específico de vehículo
  name: "Cambio aceite Toyota Hilux"  // ❌ NO
  specificNotes: "Usar 5W-40 sintético para Hilux"  // ❌ NO va aquí
}
```

### 2. specificNotes en PackageItem

**✅ CORRECTO** (datos específicos van aquí):
```prisma
model PackageItem {
  mantItemId: "MANT-OIL-CHANGE"  // ← Referencia al item general
  specificNotes: "Usar aceite Shell Helix Ultra 5W-40 sintético para Toyota Hilux Diesel. Capacidad: 4.5L"  // ✅ Aquí sí
}
```

### 3. Separación de Responsabilidades

```
MantItem (General):
  - "Qué hacer" (Cambio aceite motor)
  - Categoría (OIL)
  - Tipo (PART)

PackageItem (Específico):
  - "Cómo hacerlo para ESTE vehículo" (usar 5W-40 sintético, 4.5L)
  - Costo estimado para este vehículo
  - Tiempo estimado
```

### 4. Templates: Oficial vs Tenant

**MVP**:
```
Solo MaintenanceTemplate (pertenece a tenant)
- Tenant crea manualmente
- Tenant modifica libremente
- NO hay templates oficiales
```

**POST-MVP**:
```
OfficialMaintenanceTemplate (Fleet Care)
  ↓ COPY
MaintenanceTemplate (Tenant)
- sourceOfficialId → rastrear origen
- wasModified → saber si tenant lo modificó
- lastSyncedAt → saber cuándo se sincronizó
```

### 5. firstMaintenanceKm: Clave del Sistema

**Problema sin firstMaintenanceKm**:
```typescript
// Vehículo con 28,300 km
// Package cada 5,000 km
// Sistema infiere: próximo = 30,000 km

// ¿Pero qué pasa si...?
// - Último mantenimiento fue a los 27,000 km
// - Siguiente ES a los 32,000 km
// - Usan aceite sintético (intervalo extendido)

// Resultado: ❌ CÁLCULO INCORRECTO
```

**Solución con firstMaintenanceKm**:
```typescript
// Usuario indica: próximo mantenimiento a los 32,000 km
firstMaintenanceKm = 32000

// Siguientes:
// 32,000 (usuario lo indicó) ✓
// 37,000 (32,000 + 5,000) ✓
// 42,000 (37,000 + 5,000) ✓

// Resultado: ✅ PRECISIÓN 100%
```

---

## 🚧 Consideraciones de Implementación

### Migración Prisma

```bash
# 1. Crear migración
npx prisma migrate dev --name add-maintenance-templates

# 2. Verificar en Prisma Studio
npx prisma studio

# 3. Aplicar en staging
npx prisma migrate deploy
```

### Seed con Datos Realistas

```typescript
// prisma/seed.ts

async function seedMaintenanceSystem() {
  // 1. MantItems generales (20-30 items)
  await prisma.mantItem.createMany({
    data: [
      {
        code: 'MANT-OIL-CHANGE',
        name: 'Cambio de aceite motor',
        category: 'OIL',
        type: 'PART',
        description: 'Cambio de aceite y filtro del motor'
      },
      {
        code: 'MANT-OIL-FILTER',
        name: 'Cambio filtro de aceite',
        category: 'FILTER',
        type: 'PART'
      },
      {
        code: 'MANT-AIR-FILTER',
        name: 'Cambio filtro de aire',
        category: 'FILTER',
        type: 'PART'
      },
      {
        code: 'MANT-TIRE-ROTATION',
        name: 'Rotación de neumáticos',
        category: 'TIRE',
        type: 'ACTION'
      },
      {
        code: 'MANT-BRAKE-INSPECTION',
        name: 'Inspección de frenos',
        category: 'BRAKE',
        type: 'ACTION'
      },
      // ... más items
    ]
  })

  // 2. Template Toyota Hilux
  const hiluxTemplate = await prisma.maintenanceTemplate.create({
    data: {
      tenantId: defaultTenantId,
      name: 'Plan Mantenimiento Toyota Hilux Diesel 2020-2024',
      brand: 'TOYOTA',
      model: 'HILUX',
      yearFrom: 2020,
      yearTo: 2024,
      engineType: 'DIESEL_2.8L',

      packages: {
        create: [
          {
            name: 'Mantenimiento 5,000 km',
            intervalKm: 5000,
            intervalMonths: 6,
            priority: 'MEDIUM',
            estimatedTimeMinutes: 60,
            estimatedCost: 250000,
            sequence: 1,

            items: {
              create: [
                {
                  mantItemId: 'mant-oil-change-id',
                  specificNotes: 'Usar aceite Shell Helix Ultra 5W-40 sintético. Capacidad: 4.5L',
                  isRequired: true,
                  estimatedCost: 140000,
                  estimatedTime: 30,
                  sequence: 1
                },
                {
                  mantItemId: 'mant-oil-filter-id',
                  specificNotes: 'Filtro BOSCH compatible o equivalente',
                  isRequired: true,
                  estimatedCost: 45000,
                  estimatedTime: 10,
                  sequence: 2
                },
                {
                  mantItemId: 'mant-tire-rotation-id',
                  specificNotes: 'Verificar presión y desgaste',
                  isRequired: true,
                  estimatedTime: 20,
                  sequence: 3
                }
              ]
            }
          },
          {
            name: 'Mantenimiento 10,000 km',
            intervalKm: 10000,
            intervalMonths: 12,
            priority: 'HIGH',
            estimatedTimeMinutes: 120,
            estimatedCost: 450000,
            sequence: 2,

            items: {
              create: [
                // Incluye todos los de 5k + adicionales
                {
                  mantItemId: 'mant-air-filter-id',
                  specificNotes: 'Filtro de aire de alta eficiencia',
                  isRequired: true,
                  estimatedCost: 65000,
                  estimatedTime: 15,
                  sequence: 1
                },
                {
                  mantItemId: 'mant-brake-inspection-id',
                  specificNotes: 'Inspeccionar pastillas y discos. Reemplazar si espesor < 3mm',
                  isRequired: true,
                  estimatedTime: 30,
                  sequence: 2
                }
              ]
            }
          }
        ]
      }
    }
  })

  // 3. Vehículos con diferentes estados
  const vehicles = [
    { plate: 'HIL-001', km: 4500, firstMaint: 5000 },   // Próximo cercano
    { plate: 'HIL-002', km: 9200, firstMaint: 10000 },  // Próximo cercano
    { plate: 'HIL-003', km: 28300, firstMaint: 30000 }, // Normal
    { plate: 'HIL-004', km: 49800, firstMaint: 50000 }, // Urgente
    { plate: 'HIL-005', km: 50200, firstMaint: 50000 }, // Vencido
  ]

  for (const veh of vehicles) {
    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId: defaultTenantId,
        licensePlate: veh.plate,
        brand: 'TOYOTA',
        model: 'HILUX',
        year: 2024,
        engineType: 'DIESEL_2.8L',
        status: 'ACTIVE',

        odometerReadings: {
          create: {
            value: veh.km,
            type: 'ODOMETER',
            date: new Date(),
            registeredBy: adminUserId
          }
        }
      }
    })

    // Crear programa de mantenimiento
    const programItems = await generateProgramItems({
      templateId: hiluxTemplate.id,
      vehicleId: vehicle.id,
      currentOdometer: veh.km,
      firstMaintenanceKm: veh.firstMaint
    })

    const program = await prisma.vehicleMantProgram.create({
      data: {
        vehicleId: vehicle.id,
        templateId: hiluxTemplate.id,
        firstMaintenanceKm: veh.firstMaint,
        isActive: true,

        items: {
          createMany: {
            data: programItems
          }
        }
      }
    })

    // Generar alertas para items urgentes
    await generateMaintenanceAlerts(program.id)
  }
}
```

---

## 📊 Roadmap de Implementación

### Sprint 1.5 (9 días) - MVP CORE

**Semana 1**:
- [x] Lunes: Schema Prisma + Migración + Seed básico
- [x] Martes-Jueves: CRUD Templates (UI + API)
- [x] Viernes: Testing CRUD Templates

**Semana 2**:
- [x] Lunes-Martes: Crear Vehículo + firstMaintenanceKm
- [x] Miércoles: Generación automática de alertas
- [x] Jueves: Dashboard alertas mejorado
- [x] Viernes: Seed completo + Testing E2E

**Entregable**: MVP funcional con templates manuales

---

### Sprint 2 (5 días) - POST-MVP Fase 1

**Semana 3**:
- [ ] Lunes-Miércoles: Biblia Oficial de Templates
- [ ] Jueves-Viernes: Copy-on-use en Onboarding

**Entregable**: Sistema de templates oficiales básico

---

### Sprint 3 (8 días) - POST-MVP Fase 2

**Semana 4**:
- [ ] Lunes: Copy-on-the-fly
- [ ] Martes-Viernes: IA Web Scraping (investigación + POC)

**Semana 5**:
- [ ] Lunes-Miércoles: Sincronización con oficial
- [ ] Jueves-Viernes: Propuestas de tenants

**Entregable**: Sistema completo con IA

---

## ✅ Checklist de Validación MVP

### Pre-presentación:

- [ ] Schema Prisma migrado correctamente
- [ ] Seed ejecutado con datos realistas
- [ ] CRUD Templates funciona sin errores
- [ ] Crear vehículo con `firstMaintenanceKm` funciona
- [ ] Items programados se generan correctamente
- [ ] Alertas YELLOW/RED se crean automáticamente
- [ ] Dashboard muestra alertas con datos completos
- [ ] Testing E2E: Crear template → Crear vehículo → Ver alertas

### Demo:

- [ ] Mostrar template con packages y items
- [ ] Mostrar `specificNotes` en PackageItem
- [ ] Crear vehículo con km inicial y firstMaintenanceKm
- [ ] Mostrar items programados generados (30k, 35k, 40k...)
- [ ] Mostrar alertas automáticas en dashboard
- [ ] Explicar caso de 50 Hilux con template modificado

---

## 🎯 Decisiones Finales Documentadas

### 1. MantItem Limpio ✅
- **Decisión**: MantItem NO contiene datos específicos de vehículos
- **Razón**: Mantener maestro general reutilizable
- **Implementación**: `specificNotes` va en `PackageItem`

### 2. No tenantId Nullable ✅
- **Decisión**: NO usar `tenantId = NULL` para datos compartidos
- **Razón**: Peligroso - un tenant podría modificar/eliminar datos de otros
- **Implementación MVP**: Solo `MaintenanceTemplate` con `tenantId` obligatorio
- **Implementación POST-MVP**: `OfficialMaintenanceTemplate` (sin tenantId) + `MaintenanceTemplate` (con tenantId)

### 3. Copy-on-use ✅
- **Decisión**: Tenant descarga COPIA del template oficial
- **Razón**: Inmutabilidad de datos oficiales
- **Implementación**: `sourceOfficialId` + `wasModified` + `lastSyncedAt`

### 4. firstMaintenanceKm ✅
- **Decisión**: Usuario indica cuándo es el próximo mantenimiento
- **Razón**: Precisión 100% vs inferencia incorrecta
- **Implementación**: Campo en `VehicleMantProgram`

### 5. Priorización MVP ✅
- **Decisión**: MVP con templates manuales, POST-MVP con biblia oficial e IA
- **Razón**: Acercarnos rápido a presentación con funcionalidad core
- **Implementación**: Roadmap de 9 días para MVP

---

## 📚 Referencias

- **Sesión 10-Oct**: Arquitectura Invoice + MasterPart (`.claude/sessions/Futuro del SaaS/2025-10-10-arquitectura-invoice-masterpart-estrategia.md`)
- **Sesión 07-Oct**: MVP v1.0 Preventivo Focus (`.claude/sessions/MVP-v1.0-preventivo-focus.md`)
- **Sesión 17-Oct**: Estrategia Ambientes y BDs (`.claude/sessions/2025-10-17-estrategia-ambientes-bases-datos.md`)

---

**Estado**: ✅ DOCUMENTADO - Listo para implementar MVP
**Próxima acción**: Iniciar Sprint 1.5 - Día 1: Schema Prisma + Migración
**Fecha de presentación objetivo**: ~15 días (9 días MVP + buffer)

---

**Última actualización**: 20 Octubre 2025 - 18:45
**Documentado por**: Claude + Gustavo
