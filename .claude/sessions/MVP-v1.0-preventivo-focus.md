# MVP v1.0 - Enfoque Preventivo & Gestión Financiera

**Fecha de decisión**: 07 Octubre 2025
**Decisión de**: Usuario (Product Owner)
**Fundamento**: Acercarnos más a la presentación del MVP con ciclo de valor completo

---

## 🎯 Cambio Estratégico

### Decisión Original (Cronograma Ajustado)
- Sprint 1: Preventivo 100%
- Sprint 2: Correctivo API
- Sprint 3: PWA Chofer + Técnico
- Sprint 4: Proceso de cierre
- Sprint 5: Dashboard operativo
- Sprint 6: Predictivo básico

### ✅ Nueva Decisión: MVP v1.0 Preventivo-Focus

**Prioridad 1: Ciclo Preventivo Completo**
- Mantenimiento Preventivo 100%
- Órdenes de Trabajo (OT)
- Registro de Facturas
- Gestión de Costos
- Cierre de Items de Mantenimiento
- Dashboard & Métricas

**Movido a versiones futuras:**
- ❌ PWA (Correctivo) → **v1.1**
- ❌ Predictivo (ML) → **v2.0**

---

## 💡 Fundamento de la Decisión

### 1. Ciclo de Valor Completo
```
Trigger Preventivo → Alerta → OT → Ejecución → Factura → Costo → Métrica
```
**Ventaja**: Demostrar ROI y ahorro real en la presentación MVP

### 2. Menos Dispersión Técnica
- **Antes**: Saltar entre preventivo, correctivo, PWA, predictivo
- **Ahora**: Completar preventivo 100% antes de otras áreas
- **Beneficio**: Profundidad > Amplitud

### 3. Presentación MVP más Sólida
**Lo que mostramos**:
- ✅ Sistema que ahorra dinero (costos tracked)
- ✅ Vehículos mejor mantenidos (ranking)
- ✅ Dashboard con métricas reales
- ✅ Alertas que funcionan

**vs Alternativa**:
- PWA bonita pero sin datos de valor
- Muchas features incompletas

### 4. PWA No es Bloqueante
- Preventivo funciona sin PWA (dashboard web)
- PWA es una mejora UX, no core value
- Técnicos pueden usar dashboard web en tablet inicialmente

---

## 📋 MVP v1.0 - Alcance Redefinido

### Core Features (Must Have)

#### 1. Mantenimiento Preventivo 100%
**Componentes**:
- [x] Modelos DB (VehicleMantProgram, Package, Item) ✅
- [ ] Trigger automático (kilometraje/fecha)
- [ ] Generación automática de items programados
- [ ] Sistema de alertas (estados: YELLOW, RED)
- [ ] Notificaciones WhatsApp automáticas

**Entregable**: Sistema que genera alertas sin intervención manual

#### 2. Órdenes de Trabajo (OT)
**Componentes**:
- [ ] Modelo WorkOrder en Prisma
- [ ] API CRUD órdenes de trabajo
- [ ] UI creación OT desde alerta
- [ ] Asignación a técnicos
- [ ] Estados: PENDING, IN_PROGRESS, COMPLETED
- [ ] Vinculación con VehicleProgramItem

**Entregable**: Flujo completo desde alerta → OT → ejecución

#### 3. Registro de Facturas & Costos
**Componentes**:
- [ ] Modelo Invoice/Receipt en Prisma
- [ ] Upload de facturas (UploadThing)
- [ ] Registro manual de costos por OT
- [ ] Vinculación OT → Factura → Costo
- [ ] Campos: monto, proveedor, fecha, concepto

**Entregable**: Tracking financiero completo por OT

#### 4. Cierre de Items de Mantenimiento
**Componentes**:
- [ ] Lógica de cierre automático al completar OT
- [ ] Actualización estado item: PENDING → COMPLETED
- [ ] Registro de fecha/km de ejecución real
- [ ] Recalculo de próximo mantenimiento
- [ ] Generación de siguiente item en programa

**Entregable**: Ciclo cerrado de mantenimiento

#### 5. Lectura Odómetro/Horómetro
**Componentes**:
- [x] Modelo OdometerReading ✅
- [x] UI registro manual ✅
- [ ] Validaciones (no retroceder km)
- [ ] Trigger de alertas al actualizar
- [ ] Historial por vehículo

**Entregable**: Sistema actualizado de kilometraje

#### 6. Dashboard Operativo
**Componentes**:
- [ ] Widget alertas activas (YELLOW, RED)
- [ ] Widget OT en progreso
- [ ] Gráfico costos por mes
- [ ] Ranking vehículos mejor mantenidos
- [ ] Display costos por vehículo
- [ ] Métricas: total gastado, OT completadas, alertas resueltas

**Entregable**: Dashboard ejecutivo completo

---

## 📅 Cronograma MVP v1.0 (6 Sprints)

### Sprint 1: Preventivo Core (2 semanas)
**Objetivo**: Sistema de alertas funcionando

**Tasks**:
- [ ] Trigger automático (cron job o webhook)
- [ ] Lógica generación items programados
- [ ] Estados de alertas (YELLOW, RED)
- [ ] API alertas por vehículo/tenant
- [ ] UI listado de alertas

**Entregable**: Alertas generadas automáticamente

---

### Sprint 2: Órdenes de Trabajo (2 semanas)
**Objetivo**: Gestión completa de OT

**Tasks**:
- [ ] Modelo WorkOrder + migraciones
- [ ] API CRUD WorkOrder
- [ ] UI crear OT desde alerta
- [ ] Asignación a técnicos
- [ ] Estados y transiciones
- [ ] Vinculación OT ↔ VehicleProgramItem

**Entregable**: Flujo alerta → OT completo

---

### Sprint 3: Facturas & Costos (2 semanas)
**Objetivo**: Tracking financiero

**Tasks**:
- [ ] Modelo Invoice/Receipt + migraciones
- [ ] Upload facturas (UploadThing)
- [ ] Form registro costos por OT
- [ ] Vinculación OT → Factura
- [ ] Cálculo costos totales por vehículo
- [ ] API reportes financieros

**Entregable**: Sistema de costos operativo

---

### Sprint 4: Cierre & Recalculo (2 semanas)
**Objetivo**: Ciclo completo preventivo

**Tasks**:
- [ ] Lógica cierre automático items
- [ ] Actualización estado COMPLETED
- [ ] Registro ejecución real (fecha/km)
- [ ] Recalculo siguiente mantenimiento
- [ ] Generación automática próximo item
- [ ] Testing ciclo completo

**Entregable**: Ciclo cerrado funcionando

---

### Sprint 5: Dashboard & Métricas (1.5 semanas)
**Objetivo**: Visualización de valor

**Tasks**:
- [ ] Widget alertas activas
- [ ] Widget OT en progreso
- [ ] Gráfico costos mensuales (Recharts)
- [ ] Ranking vehículos (health score)
- [ ] Display costos por vehículo
- [ ] Métricas agregadas

**Entregable**: Dashboard presentable

---

### Sprint 6: Refinamiento & Testing (1.5 semanas)
**Objetivo**: MVP production-ready

**Tasks**:
- [ ] Testing E2E ciclo completo
- [ ] Fixes bugs críticos
- [ ] Optimización performance
- [ ] Documentación usuario
- [ ] Validaciones negocio
- [ ] Deploy producción

**Entregable**: **MVP v1.0 LISTO** 🚀

---

## 📊 Comparación de Alcances

| Feature | Cronograma Original | MVP v1.0 Focus | Versión |
|---------|-------------------|----------------|---------|
| Preventivo 100% | ✅ Sprint 1 | ✅ Sprint 1 | v1.0 |
| Correctivo API | ✅ Sprint 2 | ❌ | v1.1 |
| PWA Chofer | ✅ Sprint 3 | ❌ | v1.1 |
| PWA Técnico | ✅ Sprint 3 | ❌ | v1.1 |
| **Órdenes de Trabajo** | ✅ Sprint 4 | ✅ Sprint 2 | v1.0 |
| **Facturas & Costos** | ❌ | ✅ Sprint 3 | v1.0 |
| Proceso Cierre | ✅ Sprint 4 | ✅ Sprint 4 | v1.0 |
| Dashboard Operativo | ✅ Sprint 5 | ✅ Sprint 5 | v1.0 |
| **Ranking Vehículos** | ❌ | ✅ Sprint 5 | v1.0 |
| **Costos por Vehículo** | ❌ | ✅ Sprint 5 | v1.0 |
| Predictivo básico | ✅ Sprint 6 | ❌ | v2.0 |

**Añadido en v1.0**:
- ✅ Órdenes de Trabajo (adelantado)
- ✅ Facturas & Costos (nuevo)
- ✅ Ranking vehículos (nuevo)
- ✅ Display costos (nuevo)

**Movido a futuro**:
- ❌ PWA → v1.1
- ❌ Predictivo → v2.0

---

## 🎯 Timeline Ajustado

```
OCTUBRE        NOVIEMBRE      DICIEMBRE
Week: 1-2  3-4  1-2  3-4  1-2  3-4
     [S1][S2][S3][S4][S5][S6]
      ↓   ↓   ↓   ↓   ↓   ↓
    PREV  OT  $$$  CLS DASH TEST
    AUTO WORK COST LOOP METR PROD
```

- **Sprint 1**: 07-18 Oct (Preventivo auto)
- **Sprint 2**: 21 Oct - 01 Nov (Work Orders)
- **Sprint 3**: 04-15 Nov (Facturas & Costos)
- **Sprint 4**: 18-29 Nov (Cierre & Loop)
- **Sprint 5**: 02-13 Dic (Dashboard & Métricas)
- **Sprint 6**: 16-20 Dic (Testing & Deploy)

**Fin MVP v1.0**: 20 Diciembre 2025 🎉

---

## 💼 Valor de Negocio - MVP v1.0

### Lo que podemos demostrar:
1. **Ahorro real**: "Este sistema ahorró $X en mantenimientos preventivos vs correctivos"
2. **Vehículos sanos**: "Ranking de flota por health score, top 3 mejor mantenidos"
3. **Control financiero**: "Costos totales por vehículo, tendencias mensuales"
4. **Automatización**: "0 mantenimientos olvidados, alertas automáticas"
5. **Trazabilidad**: "De alerta → OT → factura → costo en un solo flujo"

### vs Alternativa (con PWA):
- PWA bonita pero sin datos que demuestren valor
- Features técnicas sin ROI claro
- Dispersión entre correctivo y preventivo
- Dashboard vacío o con datos mock

---

## 🚀 Roadmap Post-MVP

### v1.1 - Correctivo & PWA (Q1 2026)
- PWA Chofer (reportar issues)
- PWA Técnico (atender OT)
- Mantenimiento correctivo completo
- Proceso de cierre correctivo

### v1.2 - Inventario & Repuestos (Q2 2026)
- Gestión inventario
- Control de stock
- Alertas de reposición
- Costos por repuesto

### v2.0 - Predictivo & ML (Q3 2026)
- Health score con ML
- Predicción de fallas
- Mantenimiento basado en condición
- Análisis de patrones

---

## 📝 Decisiones Técnicas Clave

### 1. Modelo WorkOrder
```prisma
model WorkOrder {
  id                String   @id @default(uuid())
  tenantId          String
  vehicleId         String
  programItemId     String?  // Vinculación con preventivo

  type              WorkOrderType // PREVENTIVE, CORRECTIVE
  priority          Priority      // LOW, MEDIUM, HIGH, CRITICAL
  status            WOStatus      // PENDING, IN_PROGRESS, COMPLETED, CANCELLED

  title             String
  description       String?
  assignedToId      String?       // Técnico

  scheduledDate     DateTime?
  completedDate     DateTime?

  // Costos
  estimatedCost     Decimal?
  actualCost        Decimal?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  vehicle           Vehicle  @relation(fields: [vehicleId], references: [id])
  programItem       VehicleProgramItem? @relation(fields: [programItemId], references: [id])
  invoices          Invoice[]
}
```

### 2. Modelo Invoice/Receipt
```prisma
model Invoice {
  id              String   @id @default(uuid())
  tenantId        String
  workOrderId     String

  invoiceNumber   String?
  providerId      String?

  amount          Decimal
  concept         String
  date            DateTime

  fileUrl         String?  // Upload factura

  createdAt       DateTime @default(now())

  workOrder       WorkOrder @relation(fields: [workOrderId], references: [id])
  provider        Provider? @relation(fields: [providerId], references: [id])
}
```

### 3. Trigger Preventivo
**Opciones evaluadas**:
- **Vercel Cron Jobs** (preferida para MVP)
- GitHub Actions cron
- Webhook externo

**Decisión**: Vercel Cron @ 6:00 AM diario
```typescript
// src/app/api/cron/preventive-check/route.ts
export async function GET() {
  // 1. Obtener vehículos con programas activos
  // 2. Verificar km actual vs próximo mantenimiento
  // 3. Generar alertas YELLOW/RED según umbral
  // 4. Enviar notificaciones WhatsApp
}
```

---

## ✅ Ventajas del Nuevo Enfoque

1. **Presentación MVP más impactante**: ROI + datos reales
2. **Ciclo completo cerrado**: Preventivo → OT → Costo → Métrica
3. **Menos complejidad técnica**: Sin PWA en v1.0
4. **Más profundidad**: Preventivo 100% completo
5. **Demo convincente**: Dashboard con métricas financieras reales

---

## 📚 Referencias

- **Cronograma Original**: `.claude/sessions/2025-10-07-cronograma-ajustado-arquitectura-real.md`
- **Decisiones Alcance**: `.claude/sessions/2025-10-07-decisiones-alcance-mvp.md`
- **Checkpoint Actual**: `.claude/sessions/CHECKPOINT-2025-10-07.md`

---

**Decisión final**: MVP v1.0 enfocado en ciclo preventivo completo con gestión financiera

**Próximo paso**: Iniciar Sprint 1 - Preventivo Core

**Status**: ✅ Documentado y aprobado
