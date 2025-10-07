# Decisiones de Alcance MVP - Fleet Care SaaS

## Sesión: 07 Octubre 2025
**Contexto**: Decisiones tomadas para definir alcance final del MVP

---

## ✅ DECISIONES TOMADAS

### 1. PWA - Usuarios
**Decisión**: Choferes Y Técnicos

**Impacto en Sprint 3**:
- ✅ UI Chofer: Reportar novedades correctivas
- ✅ UI Técnico: Ver y ejecutar WorkOrders asignadas desde móvil
- **Effort adicional**: +5 SP (total Sprint 3: 26 SP)

**User Stories agregadas**:
- US-7b: Como Técnico quiero ver mis WorkOrders desde móvil
- US-7c: Como Técnico quiero actualizar status de WO desde móvil
- US-7d: Como Técnico quiero subir factura desde móvil

---

### 2. Factura/Invoice
**Decisión**: Solo upload (MVP)

**Implementación Sprint 4**:
- ✅ Upload PDF/imagen vía UploadThing
- ✅ Campos: `invoiceUrl`, `invoiceAmount`, `invoiceNumber`, `invoiceDate`
- ❌ **NO incluir**: OCR para parsear items (movido a v1.1)

**Feature guardada para v1.1**:
- `feature/ocr-expense-tracking` → v1.1 (Feb-Mar 2026)

---

### 3. Inventory System
**Decisión**: Mover a v1.1

**Justificación**:
- NO es crítico para flujo core de mantenimiento
- Permite enfoque en preventivo + correctivo + cierre
- Reduce timeline MVP: 6 sprints en vez de 8

**Movido a v1.1** (Feb-Mar 2026):
- Stock tracking
- Inventory movements
- Low stock alerts
- Purchase orders
- Reportes valorización

---

### 4. Testing
**Decisión**: Introducir de a poco (incremental)

**Approach**:
- ❌ **NO Sprint 7 dedicado** a testing
- ✅ **Testing incremental** en cada sprint:
  - Cada sprint: 20% effort en tests
  - Services: Unit tests al implementar
  - APIs: Integration tests críticas
  - Components: Tests de formularios importantes

**Target coverage MVP**:
- Services: >70%
- APIs críticas: >60%
- Components: >40%
- **Overall**: >60% (en vez de 80%)

---

## 📅 CRONOGRAMA FINAL AJUSTADO

### Timeline: **6 Sprints = 12 semanas**

```
OCTUBRE        NOVIEMBRE      DICIEMBRE
Week: 1-2  3-4  1-2  3-4  1-2  3-4
     [S1][S2][S3][S4][S5][S6]
      ↓   ↓   ↓   ↓   ↓   ↓
    PREV CORR PWA CLOSE DASH PRED
    100% API  UI  WO+   OPS  ML
          +TEST +TEST +TEST +TEST
```

**Inicio**: 14 Octubre 2025 (Sprint 1)
**Fin MVP**: 20 Diciembre 2025 (Sprint 6)
**Duración**: 12 semanas

---

## 🎯 AJUSTES POR SPRINT

### Sprint 1: PREVENTIVO 100% (sin cambios)
**Effort**: 21 SP
- US-1: Trigger automático alertas (8 SP)
- US-2: Dashboard alertas (5 SP)
- US-3: Crear WO desde alerta (8 SP)

**Testing agregado** (+20% effort = ~4 SP):
- Unit tests: MaintenanceAlertService
- Integration tests: POST /odometer con trigger

---

### Sprint 2: CORRECTIVO BACKEND (sin cambios)
**Effort**: 15 SP
- US-4: Chofer reporta (API) (5 SP)
- US-5: Supervisor valida (5 SP)
- US-6: Generar WO desde issue (5 SP)

**Testing agregado** (+20% effort = ~3 SP):
- Unit tests: MaintenanceIssueService
- Integration tests: Flujo validación completo

---

### Sprint 3: PWA AMPLIADA (ajustado)
**Effort original**: 21 SP
**Effort ajustado**: 26 SP (+5 SP por vista técnico)

#### User Stories Chofer (original):
- US-7: Chofer reporta desde móvil (8 SP)
- US-8: Supervisor valida UI (8 SP)
- US-9: Supervisor genera WO (5 SP)

#### User Stories Técnico (NUEVO):
- US-7b: Técnico ve mis WorkOrders desde móvil (3 SP)
- US-7c: Técnico actualiza status WO desde móvil (2 SP)

**Testing agregado** (+20% effort = ~5 SP):
- Component tests: IssueFormDriver
- Component tests: TechnicianWorkOrderView
- E2E: Flujo completo chofer reporta → supervisor aprueba

**Total Sprint 3**: 31 SP (sprint más pesado)

---

### Sprint 4: CIERRE + FACTURA (confirmado simple)
**Effort**: 26 SP
- US-10: Admin/Técnico gestiona WO (8 SP)
- US-11: Técnico sube factura SIMPLE (5 SP)
- US-12: Auto-cierre items/alertas (13 SP)

**Confirmado**:
- ✅ Upload simple PDF/imagen
- ✅ Campos: url, amount, number, date
- ❌ NO OCR

**Testing agregado** (+20% effort = ~5 SP):
- Unit tests: WorkOrderService.complete()
- Integration tests: Auto-cierre end-to-end

---

### Sprint 5: DASHBOARD (sin cambios)
**Effort**: 29 SP
- US-13: Métricas dashboard (8 SP)
- US-14: Calendario mantenimientos (8 SP)
- US-15: Reportes y export (13 SP)

**Testing agregado** (+20% effort = ~6 SP):
- Integration tests: APIs de métricas
- Performance tests: Queries dashboard

---

### Sprint 6: PREDICTIVO (sin cambios)
**Effort**: 29 SP
- US-16: Health score (8 SP)
- US-17: Patrones anómalos (13 SP)
- US-18: Recomendaciones (8 SP)

**Testing agregado** (+20% effort = ~6 SP):
- Unit tests: HealthScoreService
- Unit tests: PatternAnalysisService
- Tests: Algoritmos de scoring

---

## 📊 EFFORT TOTAL

| Sprint | Features | Testing | Total SP |
|--------|----------|---------|----------|
| Sprint 1 | 21 SP | 4 SP | 25 SP |
| Sprint 2 | 15 SP | 3 SP | 18 SP |
| Sprint 3 | 26 SP | 5 SP | 31 SP ⚠️ |
| Sprint 4 | 26 SP | 5 SP | 31 SP ⚠️ |
| Sprint 5 | 29 SP | 6 SP | 35 SP ⚠️ |
| Sprint 6 | 29 SP | 6 SP | 35 SP ⚠️ |
| **Total** | **146 SP** | **29 SP** | **175 SP** |

**Velocity target**: 25-35 SP/sprint
**Nota**: Sprints 3-6 son más pesados (31-35 SP), considerar ajustar si necesario

---

## 🎯 FEATURES OUT OF SCOPE (v1.1)

### Movidos a v1.1 (Feb-Mar 2026)
1. **WhatsApp Notifications** (Twilio production)
2. **Inventory System** (stock + purchase orders)
3. **OCR Facturas** (feature/ocr-expense-tracking)
4. **Notificaciones tiempo real** (WebSockets)
5. **Sprint dedicado testing** (ya incluido incremental)

### Estimación v1.1
**Duration**: 4-6 sprints adicionales
**Timeline**: Feb-Mar 2026

---

## 🚀 SPRINT 3 DETALLADO (Ajustado)

### Week 1: PWA Setup + UI Chofer

#### PWA Configuration (igual)
- [ ] Install next-pwa
- [ ] Configure manifest.json
- [ ] Service worker básico
- [ ] Test instalación móvil

#### UI Chofer (igual)
- [ ] Página `/driver/report-issue/`
- [ ] Form mobile-first
- [ ] Upload 3 fotos (cámara)
- [ ] Offline support
- [ ] Página `/driver/my-issues/`

#### Testing Week 1
- [ ] Component test: IssueFormDriver
- [ ] Test: Offline mode

### Week 2: UI Supervisor + UI Técnico (NUEVO)

#### UI Supervisor (igual)
- [ ] Página `/supervisor/issues/`
- [ ] Validación con fotos
- [ ] Modal aprobar/rechazar
- [ ] Badge notificaciones

#### UI Técnico (NUEVO) ⭐
**Tasks**:
- [ ] **Página `/technician/my-work-orders/page.tsx`** (mobile-first):
  - Lista de WorkOrders asignadas a mí
  - Filtros: PENDING, IN_PROGRESS, COMPLETED
  - Card por WO:
    ```
    [WorkOrder Card]
    ├── Header: Vehículo + Prioridad badge
    ├── Body: Título + Descripción
    ├── Footer: Status + Fecha programada
    └── Acciones: [Ver Detalle] [Actualizar Status]
    ```

- [ ] **Página `/technician/work-orders/[id]/page.tsx`**:
  - Detalle completo de WorkOrder
  - Info: Vehículo, descripción, items (si preventivo)
  - Section: Subir factura (mobile)
    - Capturar foto factura con cámara
    - Campos: Monto, Número factura, Fecha
  - Botón grande: "Marcar como Completada"
  - Status workflow:
    - Si PENDING → Botón "Iniciar Trabajo" (status → IN_PROGRESS)
    - Si IN_PROGRESS + tiene factura → Botón "Completar" (status → COMPLETED)

- [ ] **Component `WorkOrderCard.tsx`**: Card móvil optimizado

- [ ] **Component `UploadInvoiceMobile.tsx`**:
  - Captura foto factura
  - Campos monto + número + fecha
  - Preview antes de subir

#### Notificaciones (igual)
- [ ] Badge sidebar pendientes
- [ ] Toast notifications

#### Testing Week 2
- [ ] Component test: TechnicianWorkOrderView
- [ ] Component test: UploadInvoiceMobile
- [ ] E2E test: Flujo completo chofer → supervisor → técnico

### User Stories Agregadas Sprint 3

#### US-7b: Como Técnico quiero ver mis WorkOrders asignadas desde móvil
**Acceptance Criteria**:
- [x] Accedo a `/technician/my-work-orders` desde móvil
- [x] Veo lista de WO asignadas a mí
- [x] Puedo filtrar por status (PENDING, IN_PROGRESS, COMPLETED)
- [x] Cards son fáciles de leer en móvil (botones grandes)
- [x] Click en card abre detalle

**Story Points**: 3

#### US-7c: Como Técnico quiero actualizar status de WO desde móvil
**Acceptance Criteria**:
- [x] En detalle de WO, botón "Iniciar Trabajo" cambia status a IN_PROGRESS
- [x] Puedo subir foto de factura desde cámara móvil
- [x] Ingreso monto, número y fecha de factura
- [x] Botón "Completar" solo habilitado si tiene factura
- [x] Al completar, WO cambia a COMPLETED y se ejecuta auto-cierre

**Story Points**: 2

### Deliverables Sprint 3 Ajustado
- ✅ PWA instalable
- ✅ UI Chofer: Reportar novedades
- ✅ UI Supervisor: Validar/aprobar
- ✅ UI Técnico: Ver y ejecutar WO desde móvil ⭐
- ✅ Upload factura desde móvil ⭐
- ✅ Offline support
- ✅ Testing incremental (>60% coverage)
- ✅ Mantenimiento Correctivo: 50% → 100%

---

## 🎉 ENTREGABLES FINALES MVP

### Al finalizar Sprint 6 (20 Diciembre 2025)

#### Funcionalidades Completas
1. ✅ **Preventivo 100%**: Templates → Programas → Alertas automáticas
2. ✅ **Correctivo 100%**: PWA Chofer + Supervisor + Técnico móvil
3. ✅ **Proceso Cierre 100%**: WorkOrder + Factura + Auto-cierre items/alertas
4. ✅ **Dashboard 100%**: Métricas tiempo real + Calendario + Reportes
5. ✅ **Predictivo MVP**: Health Score + Patrones básicos

#### Calidad
- ✅ Code coverage >60%
- ✅ TypeScript 0 errores
- ✅ ESLint clean
- ✅ Build exitoso
- ✅ PWA instalable en iOS/Android

#### Deployment
- ⚠️ **Opcional Sprint 6**: Deploy a staging
- 📅 **Post-Sprint 6**: Deploy a producción (semana 21-27 Dic)

---

## 📋 PRÓXIMOS PASOS

### Esta semana (Sprint 0)
1. ✅ Decisiones de alcance tomadas
2. ⏭️ Push commits pendientes
3. ⏭️ Install TanStack Query
4. ⏭️ Fix ESLint errors
5. ⏭️ Setup testing (Vitest)
6. ⏭️ Update README
7. ⏭️ GitHub Projects board

### Sprint 1 (14-25 Oct)
1. Model MaintenanceAlert
2. Trigger automático OdometerLog
3. APIs alertas + Service + Hooks
4. Dashboard alertas UI
5. Botón crear WO desde alerta
6. Tests: AlertService + trigger integration

---

**Decisiones finalizadas**: 07 Octubre 2025
**Timeline final**: 12 semanas (6 sprints)
**Fecha fin MVP**: 20 Diciembre 2025
**Next milestone**: Sprint 0 prep (esta semana)
