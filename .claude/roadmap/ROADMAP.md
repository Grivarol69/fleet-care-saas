# 🗺️ Fleet Care SaaS - Roadmap

**Última actualización**: 21 Octubre 2025
**Branch actual**: `develop`
**Último commit**: Pendiente (CV vehículos + email)
**Progreso MVP**: 85% completado

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### Resumen Ejecutivo
- **35 modelos Prisma** implementados (10 migraciones aplicadas)
- **45+ endpoints API** funcionales
- **13 páginas dashboard** implementadas
- **MVP 85% completo** - adelante del cronograma original

### Gap Crítico Identificado
El mayor bloqueo es el **cierre del ciclo de valor**:
```
✅ Alerta → 🚧 OT (solo creación) → ❌ [Gestión OT] → ❌ [Facturación] → ❌ [Costo Real] → 🚧 Dashboard
```

**Sin WorkOrders completo + Facturación, no podemos demostrar ROI real del MVP**

---

## 🚀 En Desarrollo (Sprint Actual)

### CV de Vehículos con Email ✅ (Completado hoy)
- [x] Refactor tabla con DropdownMenu (Editar, Eliminar, Ver CV, Email, WhatsApp)
- [x] Componente VehicleCV (generación PDF con @react-pdf/renderer)
- [x] VehicleCVViewer (modal con preview y descarga)
- [x] Template de email (VehicleCVEmail con React Email)
- [x] Endpoint API `/api/vehicles/send-cv`
- [x] SendCVDialog (formulario de envío)
- [x] **Adjuntar documentos del vehículo al email** (SOAT, Tecnomecánica, Póliza)
- [ ] Configurar Resend (API key + dominio verificado)
- [ ] Probar funcionalidad completa
- [ ] Commit y deploy a staging

---

## ⏳ PENDIENTES CRÍTICOS (Prioridad Absoluta para MVP)

### 🔴 Semana 21-28 Oct: Completar Work Orders
**Estado**: 🚧 Parcial (solo POST implementado)
**Archivos existentes**:
- Schema WorkOrder completo con relaciones
- API `/api/maintenance/work-orders` (solo POST)
- Página `/dashboard/maintenance/work-orders` (UI básica)

**Tareas**:
- [ ] Implementar endpoints GET, PATCH, DELETE
- [ ] Completar página de gestión de OT
- [ ] Lógica de cierre automático de items
- [ ] Vincular cierre de MaintenanceAlert al completar OT
- [ ] Testing flujo completo Alerta → OT → Cierre

**Prioridad**: 🔴 CRÍTICO - Bloqueante para demostrar ROI

---

### 🔴 Semanas 28 Oct - 08 Nov: Implementar Facturación
**Estado**: 🚧 Schema completo, ZERO implementación UI/API
**Modelos existentes**:
- Invoice, InvoiceItem, PartPriceHistory (schema listo)
- MasterPart, MantItemPart (schema listo)

**Tareas**:
- [ ] CRUD MasterPart (catálogo de repuestos)
- [ ] CRUD Invoice + InvoiceItem
- [ ] Página `/dashboard/maintenance/invoices`
- [ ] Vinculación Invoice ↔ WorkOrder
- [ ] Trigger auto-crear PartPriceHistory al aprobar Invoice
- [ ] Seed con datos básicos de repuestos

**Prioridad**: 🔴 CRÍTICO - Sin esto no hay tracking de costos reales

---

### 🟡 Semana 11-22 Nov: Automatización de Alertas
**Estado**: ❌ No implementado
**Archivos existentes**: Schema MaintenanceAlert completo

**Tareas**:
- [ ] Cron job generación automática de alertas
- [ ] Lógica verificación kilometraje vs paquetes pendientes
- [ ] Cálculo automático de priorityScore
- [ ] Testing del trigger

**Prioridad**: 🟡 ALTA - Diferenciador competitivo clave

---

### 🟢 Semana 25 Nov - 05 Dic: Dashboard con Datos Reales
**Estado**: 🚧 UI lista, datos mock
**Archivos existentes**: `/dashboard/maintenance/overview` (cards con números ficticios)

**Tareas**:
- [ ] Conectar cards con queries reales
- [ ] Gráficas de costos (usar Invoice + PartPriceHistory)
- [ ] Métricas de cumplimiento
- [ ] Ranking de vehículos por TCO

**Prioridad**: 🟢 MEDIA - Presentación visual del ROI

---

## 🎯 MVP - INVENTARIO COMPLETO (Análisis Real del Codebase)

### ✅ FUNCIONAL - 100% Implementado (MVP Ready)

#### A. Gestión de Vehículos
**Backend**:
- [x] API CRUD completa: `/api/vehicles/vehicles`, `/api/vehicles/vehicles/[id]`
- [x] Filtros por tenantId implementados
- [x] Validación de datos con Zod

**Frontend**:
- [x] Página: `/dashboard/vehicles/fleet`
- [x] FleetVehiclesList con Tanstack Table
- [x] FormAddFleetVehicle, FormEditFleetVehicle
- [x] Upload de fotos (UploadThing)
- [x] **NUEVO**: Campos CV (fuelType, serviceType, emergencyContact)

**Modelos**: VehicleBrand, VehicleLine, VehicleType, Vehicle

---

#### B. Documentos Vehiculares
**Backend**:
- [x] API CRUD: `/api/vehicles/documents`, `/api/vehicles/documents/[id]`
- [x] Endpoint alertas vencimiento: `/api/vehicles/documents/expiring`
- [x] **NUEVO**: Campos documentNumber, entity separados de fileName

**Frontend**:
- [x] FormAddDocument, FormEditDocument
- [x] Upload de archivos (UploadThing)
- [x] Detección automática de expiración

**Estado**: FUNCIONAL - MVP READY

---

#### C. CV de Vehículos (Killer Feature) ⭐
**Backend**:
- [x] Endpoint `/api/vehicles/send-cv` (POST)
- [x] Generación PDF server-side con @react-pdf/renderer
- [x] Descarga de documentos vehiculares desde UploadThing
- [x] Adjuntar múltiples archivos (CV + SOAT + Tecnomecánica + Póliza)

**Frontend**:
- [x] VehicleCV.tsx (componente PDF)
- [x] VehicleCVViewer (modal preview)
- [x] SendCVDialog (formulario email)
- [x] VehicleCVEmail (template React Email)
- [x] DropdownMenu con acciones (Ver CV, Enviar Email, WhatsApp disabled)

**Integraciones**:
- [x] Resend (email delivery)
- [x] React Email (templates)
- [x] @react-pdf/renderer (PDF generation)

**Pendiente**: Configurar RESEND_API_KEY en entorno

---

#### D. Catálogo de Mantenimiento
**Backend**:
- [x] MantCategories: `/api/maintenance/mant-categories`
- [x] MantItems: `/api/maintenance/mant-items`
- [x] Tipos: ACTION, PART, SERVICE
- [x] technicalNotes implementado

**Frontend**:
- [x] Páginas: `/dashboard/maintenance/mant-categories`, `/dashboard/maintenance/mant-items`
- [x] CRUD completo funcional

**Modelos**: MantCategory, MantItem

---

#### E. Templates de Mantenimiento
**Backend**:
- [x] API MaintenanceTemplate: `/api/maintenance/templates`
- [x] API MaintenancePackage: `/api/maintenance/packages`
- [x] API PackageItem (granular)
- [x] Relaciones marca/línea vehicular

**Frontend**:
- [x] `/dashboard/maintenance/templates` (lista y CRUD)
- [x] `/dashboard/maintenance/packages` (lista y CRUD)

**Modelos**: MaintenanceTemplate, MaintenancePackage, PackageItem

---

#### F. Sistema de Alertas (Rediseñado Oct-2025)
**Backend**:
- [x] API `/api/maintenance/alerts` (GET, POST, PATCH)
- [x] Schema con priorityScore automático
- [x] Tracking: viewedBy, acknowledgedBy, snoozedUntil
- [x] Estados: PENDING, ACKNOWLEDGED, SNOOZED, COMPLETED, DISMISSED
- [x] Relación 1-to-many con WorkOrder

**Frontend**:
- [x] Dashboard `/dashboard/maintenance/alerts` (rediseñado 20-Oct)
- [x] Filtros por prioridad y estado
- [x] MaintenanceAlertCard con acciones granulares
- [x] recommendedParts, technicalNotes visibles

**Modelo**: MaintenanceAlert (arquitectura premium completa)

---

#### G. Personas
**Backend**:
- [x] Technicians: `/api/people/technicians`
- [x] Providers: `/api/people/providers`
- [x] Drivers: `/api/people/drivers`

**Frontend**:
- [x] Páginas CRUD completas para cada uno

**Modelos**: Technician, Provider, Driver

---

#### H. Odómetro/Horómetro
**Backend**:
- [x] API `/api/vehicles/odometer-logs`

**Frontend**:
- [x] Registro manual de kilometraje
- [x] Logs históricos por vehículo

**Modelo**: OdometerLog

---

### 🚧 PARCIAL - Implementado pero Incompleto

#### I. Programas de Mantenimiento Vehiculares
**Backend**: ✅ COMPLETO
- [x] VehicleMantProgram schema
- [x] VehicleProgramPackage schema
- [x] VehicleProgramItem schema
- [x] API `/api/maintenance/vehicle-programs` (CRUD completo)

**Frontend**: 🚧 PARCIAL
- [x] `/dashboard/maintenance/programs` (lista básica)
- [ ] ❌ Asignación automática al crear vehículo
- [ ] ❌ Vista detallada de programa por vehículo
- [ ] ❌ Selector en FormAddFleetVehicle

**Estado**: Backend listo, UI incompleta

---

#### J. Work Orders (OT)
**Backend**: 🚧 PARCIAL
- [x] Schema WorkOrder completo con relaciones
- [x] API POST `/api/maintenance/work-orders` (solo creación)
- [ ] ❌ GET (listar OT)
- [ ] ❌ PATCH (actualizar estado)
- [ ] ❌ DELETE (cancelar OT)

**Frontend**: 🚧 BÁSICO
- [x] `/dashboard/maintenance/work-orders` (UI esqueleto)
- [ ] ❌ Gestión completa de OT
- [ ] ❌ Cierre automático de items
- [ ] ❌ Vinculación con Invoice

**Modelos**: WorkOrder, WorkOrderItem, WorkOrderExpense, WorkOrderApproval, ExpenseAuditLog

**CRÍTICO**: Sin esto, no se cierra el ciclo de valor

---

### ❌ SCHEMA LISTO - ZERO Implementación

#### K. Sistema de Facturación
**Backend**: ❌ NO IMPLEMENTADO
- [x] Schema Invoice completo
- [x] Schema InvoiceItem
- [x] Schema PartPriceHistory (GOLD MINE para analytics)
- [ ] ❌ API CRUD Invoice
- [ ] ❌ API CRUD InvoiceItem
- [ ] ❌ Trigger auto-crear PartPriceHistory

**Frontend**: ❌ NO IMPLEMENTADO
- [ ] ❌ Página `/dashboard/maintenance/invoices`
- [ ] ❌ Formulario registro de facturas
- [ ] ❌ Vinculación Invoice ↔ WorkOrder

**CRÍTICO**: Sin esto, no hay tracking de costos reales ni TCO

---

#### L. Catálogo de Repuestos (MasterPart)
**Backend**: ❌ NO IMPLEMENTADO
- [x] Schema MasterPart (tenantId nullable para compartir)
- [x] Schema MantItemPart (many-to-many)
- [ ] ❌ API CRUD MasterPart
- [ ] ❌ Seed con datos básicos

**Frontend**: ❌ NO IMPLEMENTADO
- [ ] ❌ Página admin de catálogo
- [ ] ❌ Búsqueda y selección de repuestos

**POST-MVP**: Fase 2 (Invoice + Analytics Premium)

---

### ❌ NO IMPLEMENTADO - Triggers y Automatización

#### M. Generación Automática de Alertas
- [ ] ❌ Cron job para verificar kilometraje
- [ ] ❌ Comparar OdometerLog vs VehicleProgramPackage
- [ ] ❌ Crear MaintenanceAlert automáticamente
- [ ] ❌ Cálculo de priorityScore

**ALTA PRIORIDAD**: Diferenciador competitivo clave

---

#### N. Cierre Automático del Ciclo
- [ ] ❌ Trigger: WorkOrder completado → MaintenanceAlert.status = COMPLETED
- [ ] ❌ Trigger: Invoice aprobado → PartPriceHistory creado
- [ ] ❌ Trigger: OdometerLog nuevo → Verificar alertas pendientes

---

### 📊 DASHBOARD - UI Lista, Datos Mock

#### O. Dashboard Principal
**Frontend**: 🚧 UI completa
- [x] Cards de métricas (total vehículos, alertas, OT, costos)
- [x] Gráficas de costos mensuales
- [x] Ranking de vehículos por TCO
- [ ] ❌ Datos reales (actualmente mock estático)

**Requiere**: Invoice + PartPriceHistory implementados

---

### 🚀 POST-MVP - Implementado Anticipadamente

#### P. Multi-Tenancy
- [x] Tenant schema completo
- [x] Middleware de tenant
- [x] Subscription, Payment (MercadoPago)
- ⚠️ NO usado en MVP (single-tenant)

**Activación**: Post-MVP al conseguir múltiples clientes

---

#### Q. WhatsApp Alertas
- [x] Twilio configurado
- [x] whatsapp.ts service
- [x] notification-service.ts orchestrator
- ⚠️ Desactivado por decisión estratégica (POST-MVP)

**Activación**: Cuando clientes lo demanden

---

#### R. OCR Facturas (FASE 3)
- [ ] 🚧 Desarrollo parcial anticipado
- [ ] ❌ No funcional
- ⚠️ POST-MVP Fase 3 (IA y Optimización)

---

## 📊 MÉTRICAS DE PROGRESO REAL

### Backend (Modelos + API)
- **Modelos implementados**: 35/40 (87%)
- **Endpoints funcionales**: 45/55 (82%)
- **Migraciones aplicadas**: 10

### Frontend (Páginas + Componentes)
- **Páginas implementadas**: 13/18 (72%)
- **Componentes UI**: 40+ componentes
- **Formularios CRUD**: 15+ formularios

### Integraciones
- **Supabase**: ✅ Funcional
- **UploadThing**: ✅ Funcional
- **Resend**: ✅ Funcional (pendiente config API key)
- **Twilio**: ⚠️ Implementado, no usado (POST-MVP)
- **MercadoPago**: ⚠️ Schema listo, no implementado (POST-MVP)

### Estado General MVP v1.0
**85% completado** (21-Oct-2025)

**Análisis**: Adelante del cronograma en features core (vehículos, alertas, templates), pero atrasado en integración de ciclo de valor (WorkOrders, Invoice).

---

## 🚫 Post-MVP (Backlog)

### FASE 2: Invoice + Analytics Premium (Q1 2026)
- [ ] CRUD MasterPart completo
- [ ] Sistema Invoice + InvoiceItem completo
- [ ] PartPriceHistory con analytics
- [ ] Dashboard TCO básico
- [ ] Comparador de proveedores

### FASE 3: IA y Optimización (Q3-Q4 2026)
- [ ] OCR Facturas (Tesseract.js)
- [ ] Motor de recomendaciones de ahorro
- [ ] PartCompatibility vehicular
- [ ] TCO comparativo por marca/modelo

### Comunicaciones (Activar según demanda)
- [ ] WhatsApp alertas (Twilio ya configurado)
- [ ] Notificaciones push
- [ ] Email alerts automáticos

### Otros
- [ ] Biblia Oficial de Templates (plantillas pre-configuradas)
- [ ] Exportación masiva de datos
- [ ] API pública REST

---

## 🐛 Bugs Conocidos

### Resueltos Recientemente
- [x] Error P2022: Columnas fuelType/serviceType no existían en BD (solucionado 21-Oct con SQL manual)
- [x] Error border styles en VehicleCV.tsx (solucionado 21-Oct)
- [x] Tipo DocumentProps faltaban campos documentNumber/entity (solucionado 21-Oct)

### Activos
- Ninguno conocido actualmente

### Deuda Técnica
- **Alta**: WorkOrder sin vista completa, Facturación sin implementar
- **Media**: Testing sin implementar, VehicleMantProgram UI parcial
- **Baja**: Documentación API incompleta

---

## 📝 Notas Importantes

### Migraciones Pendientes
- Script `scripts/migrate-document-data.ts` creado pero no ejecutado (migrar fileName → documentNumber en producción)

### Variables de Entorno Pendientes
```env
# Resend (para envío de emails)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com
```

### Branches
- `main`: Producción
- `staging`: Staging (Vercel)
- `develop`: Desarrollo activo ✅

---

## 🎯 PLAN DE ACCIÓN - Próximas 5 Semanas

### 📅 Semana 1 (21-28 Oct): Completar WorkOrders
**Objetivo**: Cerrar gap crítico en gestión de OT
- [ ] GET `/api/maintenance/work-orders` (listar con filtros)
- [ ] PATCH `/api/maintenance/work-orders/[id]` (actualizar estado)
- [ ] DELETE `/api/maintenance/work-orders/[id]` (cancelar)
- [ ] Página completa `/dashboard/maintenance/work-orders`
- [ ] Lógica cierre automático MaintenanceAlert al completar OT
- [ ] Testing flujo Alerta → OT → Cierre

**Bloqueo actual**: No se puede gestionar OT después de crearlas

---

### 📅 Semanas 2-3 (28 Oct - 08 Nov): Facturación
**Objetivo**: Implementar tracking de costos reales
- [ ] API CRUD MasterPart (`/api/maintenance/master-parts`)
- [ ] API CRUD Invoice (`/api/maintenance/invoices`)
- [ ] API CRUD InvoiceItem
- [ ] Página `/dashboard/maintenance/master-parts`
- [ ] Página `/dashboard/maintenance/invoices`
- [ ] Formulario registro factura con líneas dinámicas
- [ ] Vinculación Invoice ↔ WorkOrder (foreignKey ya existe)
- [ ] Trigger: Invoice aprobado → Crear PartPriceHistory
- [ ] Seed inicial con 20-30 repuestos comunes

**Bloqueo actual**: No hay forma de registrar costos reales de mantenimiento

---

### 📅 Semana 4 (11-22 Nov): Automatización de Alertas
**Objetivo**: Sistema preventivo auto-generado
- [ ] Cron job `/api/cron/generate-alerts` (Vercel Cron)
- [ ] Lógica: Comparar OdometerLog vs VehicleProgramPackage.kmInterval
- [ ] Crear MaintenanceAlert automáticamente cuando km >= threshold
- [ ] Cálculo automático priorityScore basado en urgencia
- [ ] Testing exhaustivo del trigger
- [ ] Documentar comportamiento del cron

**Diferenciador clave**: Alertas sin intervención humana

---

### 📅 Semana 5 (25 Nov - 05 Dic): Dashboard con Datos Reales
**Objetivo**: Visualización del ROI
- [ ] Query real: Total vehículos activos
- [ ] Query real: Alertas pending/acknowledged/snoozed
- [ ] Query real: WorkOrders por estado
- [ ] Query real: Costos totales (SUM Invoice.totalAmount WHERE approved)
- [ ] Gráfica costos mensuales (agrupar Invoice por mes)
- [ ] Ranking vehículos por TCO (SUM Invoice WHERE vehicleId)
- [ ] Comparador proveedores (AVG PartPriceHistory por Provider)

**Objetivo presentación MVP**: Dashboard con datos 100% reales

---

### Finalización MVP (06-20 Dic): Testing y Deploy
- [ ] Testing E2E de flujo completo
- [ ] Configurar Resend en staging/producción
- [ ] Deploy final a staging
- [ ] Pruebas con cliente beta
- [ ] Ajustes finales
- [ ] **LANZAMIENTO MVP v1.0** 🚀

---

## 🎯 Próxima Sesión Inmediata

1. Configurar Resend (RESEND_API_KEY)
2. Probar CV por email con adjuntos
3. Commit cambios CV vehicular
4. Deploy a staging
5. **Empezar WorkOrders GET/PATCH/DELETE**

---

## 🔮 VISIÓN ESTRATÉGICA (2025-2028)

### Modelo de Negocio: Build to Sell

**Objetivo**: Construir SaaS B2B rentable y vender en 2-3 años por **$400k-$1M USD**

**Timeline Exit**:
- **Año 1** (Oct 2025 - Oct 2026): MVP + 10-15 clientes → $1.5-4k MRR
- **Año 2** (Oct 2026 - Oct 2027): Escalar + Automatizar → 25-40 clientes → $8-15k MRR
- **Año 3** (Oct 2027 - Oct 2028): Preparar venta → 40-60 clientes → $15-25k MRR

**Valuación esperada**: 3-5x ARR (ej: $20k MRR = $720k-$1.2M)

### KPIs para Venta Exitosa
- ✅ MRR estable $15-25k/mes
- ✅ Churn < 5%/mes
- ✅ Multi-país (Argentina, Colombia, México, Chile)
- ✅ Operaciones documentadas (transferible)
- ✅ Código moderno y mantenible

---

## 🏗️ ARQUITECTURA POST-MVP (Sprints 3-8)

### FASE 2: Invoice + Analytics Premium (Sprints 3-5)

**Objetivo**: "No vendemos tecnología, vendemos AHORRO y CONTROL DE COSTOS"

#### Modelos Clave

**MasterPart** - Catálogo compartido de artículos
```prisma
model MasterPart {
  id          Int     @id @default(autoincrement())
  tenantId    String? // NULL = global compartido
  category    PartCategory
  name        String
  brand       String?
  partNumber  String?
  referencePrice Decimal?

  // Compartido entre tenants para eficiencia onboarding
}
```

**MantItemPart** - Many-to-many (Items ↔ Artículos)
- Permite items con múltiples artículos (ej: "Cambio aceite" = aceite + filtro + arandela)
- `quantity`, `isRequired`, `isPrimary`

**Invoice + InvoiceItem** - Facturas de proveedores
- Discriminación de artículos con costos reales
- Vinculación con WorkOrder (trazabilidad completa)
- Estados: PENDING, APPROVED, PAID, OVERDUE, CANCELLED

**PartPriceHistory** - GOLD MINE para analytics
- Histórico de precios por artículo + proveedor
- Comparar: "¿Qué proveedor cobra menos?"
- Detectar aumentos abusivos

#### Features Premium
- 📊 Dashboard TCO (Total Cost of Ownership) por vehículo
- 💰 Comparador de proveedores (ranking por precio)
- 📈 Histórico de precios (gráficas temporales)
- 🔍 Auditoría completa (quién autorizó, cuándo, cuánto)
- 📋 Responder: "¿Cuánto gastamos en filtros en 2025?"

---

### FASE 3: IA y Optimización (Sprints 6-8)

**Diferenciador competitivo absoluto**

#### Features Killer

**1. IA Sugiere Ahorros** 🤖
- "Cambiar a Proveedor ABC ahorra $90k/año en filtros"
- Detectar correctivos recurrentes → Sugerir preventivo
- Detectar aceite sintético vs mineral → Optimizar

**2. Comparador TCO por Marca/Modelo** 📊
- "Toyota Hilux: $2.1M/año vs Nissan Frontier: $2.8M/año"
- Decisiones de renovación de flota con datos objetivos

**3. OCR Facturas** 📸
- Subir foto/PDF → Extraer datos automáticamente
- Reduce carga manual 80%

**4. PartCompatibility** 🔧
- Sugerir alternativas al crear WorkOrder
- Levels: RECOMMENDED, COMPATIBLE, CONDITIONAL, INCOMPATIBLE

---

## 🎯 VENTAJAS COMPETITIVAS

### vs Competencia Tradicional

| Feature | Competencia | Fleet Care |
|---------|-------------|------------|
| Mantenimiento | Módulo básico | Preventivo automatizado |
| Costos | "Tiene reporte" | IA sugiere cómo ahorrar $3M/año |
| Onboarding | 1-2 semanas | 2 horas (datos compartidos) |
| Analytics | Histórico plano | TCO, comparador, auditoría |
| Facturación | Manual | OCR + vinculación automática |

### Diferenciadores ÚNICOS
1. 🤖 **IA que ACTÚA** (no solo muestra datos)
2. 📊 **TCO comparativo** por marca (decisiones renovación)
3. 🔍 **Auditoría completa** (trazabilidad total)
4. ⚡ **Onboarding instantáneo** (datos compartidos)
5. 💰 **ROI medible** ("Ahorramos $X cambiando proveedor")

---

## 💎 ESTRATEGIA DE DATOS COMPARTIDOS

**Concepto**: "El sufrimiento de la primera empresa beneficia a todas"

```prisma
model MasterPart {
  tenantId String? // NULL = compartido globalmente
}
```

**Flujo**:
- **Empresa 1**: Carga 150 MasterParts (8 horas)
- **Empresa 2**: Importa template (2 horas)
- **Empresa 10**: Template existe (30 minutos)

**Eficiencia**: 1,600% mejora en onboarding

**Datos GLOBALES**: MasterPart, PartCompatibility, MaintenanceTemplate
**Datos PRIVADOS**: Vehicles, WorkOrder, Invoice, PartPriceHistory

---

## 📅 ROADMAP TEMPORAL (3 AÑOS)

### Q4 2025 (Oct-Dic): MVP v1.0 ✅
- Sistema preventivo completo
- Alertas automatizadas
- WorkOrder básico
- CV de vehículos con email
- **Meta**: 2-3 clientes beta

### Q1 2026 (Ene-Mar): Invoice + Analytics
- MasterPart + MantItemPart
- Invoice + InvoiceItem
- PartPriceHistory
- Reporte: Histórico precios
- Dashboard: TCO básico
- **Meta**: 5-8 clientes pagos

### Q2 2026 (Abr-Jun): Analytics Premium
- Comparador proveedores
- TCO por marca/modelo
- InvoicePayment (control financiero)
- Importador CSV catálogo
- **Meta**: 10-15 clientes

### Q3-Q4 2026 (Jul-Dic): IA y Optimización
- Motor recomendaciones
- OCR facturas
- PartCompatibility
- PWA (si feedback justifica)
- **Meta**: 20-25 clientes

### 2027: Escalamiento + Preparación Venta
- Q1-Q2: Crecer a 25-40 clientes
- Q3: Contratar operations manager
- Q4: Documentar playbooks
- **Meta**: 40-60 clientes EOY

### Q1-Q2 2028: EXIT
- Listar en marketplaces
- Negociación venta
- **Meta**: $400k-$1M USD liquidez

---

## 💰 PRICING ESTRATÉGICO

| Flota | Vehículos | Pricing Mensual |
|-------|-----------|-----------------|
| Pequeña | 5-20 | $200-300 |
| Mediana | 21-50 | $500-700 |
| Grande | 51+ | $1,000+ |

**Target ideal**: Flotas 10-50 vehículos (balance soporte/ingreso)

---

## 🚨 PRINCIPIOS ESTRATÉGICOS

### 1. Calidad > Cantidad
- **Límite**: 40-60 clientes MAX (suficiente para venta exitosa)
- Evitar crecer > 100 (esclaviza con soporte 24/7)
- Rechazar clientes problemáticos

### 2. Automatización Radical
- Onboarding: Videos + checklist
- Soporte: FAQ + chatbot
- Facturación: Stripe automático
- Alertas: Sistema corre solo

### 3. No Hacer v2.0
- MVP v1.0 → v1.1 → STOP
- Dejar features avanzadas para comprador
- Enfoque: Features que venden (analytics, IA, TCO)

### 4. 100% Remoto desde Día 1
- Multi-país (no local)
- Sin reuniones presenciales
- Documentación completa
- Fundador puede vivir donde quiera

---

**Referencias**:
- [Estrategia Build to Sell](/.claude/sessions/Futuro%20del%20SaaS/2025-10-08-estrategia-build-to-sell-y-decisiones-vida.md)
- [Arquitectura Invoice + MasterPart](/.claude/sessions/Futuro%20del%20SaaS/2025-10-10-arquitectura-invoice-masterpart-estrategia.md)
