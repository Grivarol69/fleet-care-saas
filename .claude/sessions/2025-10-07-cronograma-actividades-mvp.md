# Cronograma de Actividades MVP - Fleet Care SaaS

## Sesión: 07 Octubre 2025
**Contexto**: Cronograma detallado basado en diagnóstico 07-Oct + planes 30-Sep y 02-Oct

---

## 🎯 VISIÓN GENERAL

### Timeline MVP Completo
- **Inicio**: 07 Octubre 2025
- **Fin estimado**: ~31 Enero 2026
- **Duración**: 7 sprints (14 semanas / 3.5 meses)
- **Metodología**: Agile Scrum Adaptado
- **Sprint duration**: 2 semanas c/u

### Progreso Actual
- **Completado**: 55% del MVP
- **Restante**: 45% (7 sprints)

---

## 📅 ROADMAP DE SPRINTS

```
OCT 2025         NOV 2025         DIC 2025         ENE 2026
Week: 1  2  3  4  1  2  3  4  1  2  3  4  1  2  3  4
      [S1][S2][S3][S4][S5][S6][S7]
       ↑   ↑   ↑   ↑   ↑   ↑   ↑
      WO  WO  PM  INV INV DASH POLISH
```

**Leyenda**:
- **WO**: Work Orders (Órdenes de Trabajo)
- **PM**: Preventive Maintenance (Completar preventivo)
- **INV**: Inventory System (Sistema de Inventario)
- **DASH**: Dashboard & Reporting
- **POLISH**: Testing, Bug fixes, Deploy prep

---

## 🚀 SPRINT 0: PREPARACIÓN (Esta semana)

### Fecha: 07-11 Octubre 2025
**Objetivo**: Preparar infraestructura técnica y organizacional

### Tasks Técnicas

#### 1. Git & Repository
- [ ] Push 14-15 commits pendientes a `origin/develop`
- [ ] Crear branch `feature/work-orders-mvp` desde develop
- [ ] Setup GitHub Projects board (Kanban)
- [ ] Crear labels: `priority`, `effort`, `type`, `sprint-N`

#### 2. Code Quality
- [ ] Fix 4 ESLint errors (`any` type) en:
  - `src/app/api/alerts/test/route.ts`
  - `src/app/api/maintenance/alerts/route.ts`
  - `src/app/dashboard/maintenance/vehicle-programs/components/VehicleProgramsList.tsx`
- [ ] Suprimir warnings _field/_error con eslint-disable (aceptables)

#### 3. Dependencies
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

#### 4. Configuration
- [ ] Setup TanStack Query Provider en `src/lib/providers/QueryProvider.tsx`
- [ ] Wrap app con QueryProvider en `app/layout.tsx`
- [ ] Configurar React Query Devtools
- [ ] Validar variables de entorno (.env)

#### 5. Documentation
- [ ] Actualizar README.md con info real del proyecto
- [ ] Documentar estructura de carpetas
- [ ] Crear CONTRIBUTING.md básico

### Deliverables Sprint 0
- ✅ Repository sincronizado y organizado
- ✅ TanStack Query configurado
- ✅ ESLint limpio (0 errors)
- ✅ Documentation actualizada
- ✅ GitHub Projects board listo

**Tiempo estimado**: 3-4 horas

---

## 🛠️ SPRINT 1: WORK ORDERS FOUNDATION

### Fecha: 14-25 Octubre 2025 (2 semanas)
**Objetivo**: Infraestructura moderna + Work Orders backend completo

### Week 1: Modern Infrastructure (07-Oct Plan)

#### 1. Service Layer - WorkOrderService
```typescript
// src/lib/services/workorder.service.ts
class WorkOrderServiceClass extends BaseService {
  async getAll(): Promise<WorkOrder[]>
  async getById(id: number): Promise<WorkOrder>
  async getByTechnician(techId: number): Promise<WorkOrder[]>
  async create(data: CreateWorkOrderDto): Promise<WorkOrder>
  async update(id: number, data: UpdateWorkOrderDto): Promise<WorkOrder>
  async updateStatus(id: number, status: WorkOrderStatus): Promise<WorkOrder>
  async assign(id: number, technicianId: number): Promise<WorkOrder>
  async delete(id: number): Promise<void>

  // Business logic
  async calculateTotalCost(id: number): Promise<number>
  async generateFromPackage(packageId: number): Promise<WorkOrder>
}
```

**Tasks**:
- [ ] Crear `BaseService` class
- [ ] Implementar WorkOrderService completo
- [ ] Crear DTOs (Zod schemas)
- [ ] Agregar error handling centralizado

#### 2. Custom Hooks - useWorkOrders
```typescript
// src/hooks/useWorkOrders.ts
export function useWorkOrders()          // Query all
export function useWorkOrder(id: number) // Query single
export function useMyWorkOrders()        // Query by current user
export function useCreateWorkOrder()     // Mutation create
export function useUpdateWorkOrder()     // Mutation update
export function useAssignWorkOrder()     // Mutation assign
export function useDeleteWorkOrder()     // Mutation delete
```

**Tasks**:
- [ ] Implementar custom hooks con TanStack Query
- [ ] Configurar cache invalidation
- [ ] Agregar optimistic updates
- [ ] Implementar error handling con toast

#### 3. APIs - Work Orders Backend
```
/api/maintenance/work-orders/
├── route.ts               (GET all, POST create)
├── [id]/route.ts          (GET, PUT, DELETE)
├── [id]/assign/route.ts   (POST assign to technician)
└── [id]/status/route.ts   (PATCH update status)
```

**Tasks**:
- [ ] Crear estructura de APIs REST
- [ ] Implementar CRUD completo
- [ ] Agregar validaciones con Zod
- [ ] Implementar filtros (by status, technician, vehicle, date)
- [ ] Testing con Thunder Client/Postman

### Week 2: Work Orders UI

#### 4. Components Structure
```
src/components/work-orders/
├── WorkOrdersList.tsx          (Tabla principal)
├── WorkOrderCard.tsx           (Card view alternativa)
├── WorkOrderForm.tsx           (Form crear/editar)
├── WorkOrderDetails.tsx        (Modal/página detalles)
├── WorkOrderStatusBadge.tsx    (Status visual)
├── WorkOrderPriorityBadge.tsx  (Priority visual)
├── AssignTechnicianDialog.tsx  (Dialog asignación)
└── WorkOrderFilters.tsx        (Filtros sidebar)
```

**Tasks**:
- [ ] Crear componentes UI con Shadcn
- [ ] Implementar formularios con React Hook Form + Zod
- [ ] Agregar loading states (Skeletons)
- [ ] Implementar error boundaries
- [ ] Mobile responsive

#### 5. Pages
```
/dashboard/maintenance/work-orders/
├── page.tsx                 (Lista principal)
├── new/page.tsx             (Crear nueva)
├── [id]/page.tsx            (Detalles/editar)
└── my-orders/page.tsx       (Mis órdenes - Técnico view)
```

**Tasks**:
- [ ] Crear páginas Next.js
- [ ] Integrar hooks y components
- [ ] Implementar navegación
- [ ] Agregar breadcrumbs

### User Stories Sprint 1

#### US-1: Como Admin quiero crear órdenes de trabajo correctivas
**Acceptance Criteria**:
- [x] Puedo acceder a formulario de creación desde dashboard
- [x] Formulario valida campos requeridos
- [x] Puedo seleccionar vehículo de un dropdown
- [x] Puedo asignar prioridad (LOW, MEDIUM, HIGH, CRITICAL)
- [x] Puedo agregar descripción detallada
- [x] Orden se crea con status PENDING
- [x] Recibo confirmación visual (toast)

**Story Points**: 5

#### US-2: Como Admin quiero asignar órdenes a técnicos
**Acceptance Criteria**:
- [x] Puedo ver lista de órdenes PENDING
- [x] Puedo abrir modal de asignación
- [x] Veo lista de técnicos disponibles
- [x] Al asignar, estado cambia a IN_PROGRESS
- [x] Técnico recibe notificación (toast en su sesión)

**Story Points**: 3

#### US-3: Como Técnico quiero ver mis órdenes asignadas
**Acceptance Criteria**:
- [x] Accedo a página "Mis Órdenes"
- [x] Veo solo órdenes asignadas a mí
- [x] Puedo filtrar por status
- [x] Veo prioridad con color coding
- [x] Puedo actualizar status a COMPLETED
- [x] Puedo agregar notas de trabajo

**Story Points**: 5

### Deliverables Sprint 1
- ✅ WorkOrderService completo y testeado
- ✅ Custom hooks con TanStack Query
- ✅ APIs REST work-orders funcionales
- ✅ UI completa CRUD work orders
- ✅ Assignment workflow implementado
- ✅ Técnico view funcional
- ✅ 3 User Stories completadas

**Velocity esperada**: 13 story points

---

## 🛠️ SPRINT 2: WORK ORDERS ADVANCED

### Fecha: 28 Oct - 08 Nov 2025 (2 semanas)
**Objetivo**: Features avanzadas + Integration con preventivo

### User Stories Sprint 2

#### US-4: Como Admin quiero ver dashboard de órdenes
**Tasks**:
- [ ] Dashboard cards: Total, Pending, In Progress, Completed
- [ ] Lista órdenes agrupadas por status
- [ ] Filtros: por técnico, vehículo, fecha range, prioridad
- [ ] Vista calendario (opcional)

**Story Points**: 8

#### US-5: Como Sistema quiero generar órdenes desde mantenimiento preventivo
**Tasks**:
- [ ] Trigger automático al llegar a km programado
- [ ] WorkOrder generada desde VehicleProgramPackage
- [ ] Pre-llenar items desde VehicleProgramItems
- [ ] Notificación a Admin
- [ ] Log de generación automática

**Story Points**: 13

#### US-6: Como Admin quiero registrar costos de órdenes
**Tasks**:
- [ ] Formulario agregar WorkOrderItem (repuestos)
- [ ] Formulario agregar WorkOrderExpense (mano de obra, etc)
- [ ] Cálculo automático costo total
- [ ] Mostrar breakdown de costos
- [ ] Comparar estimado vs real

**Story Points**: 8

### Refactoring Tasks
- [ ] Completar User Management UI (0.5 día)
- [ ] Completar Asset Management gaps (1 día)
- [ ] Agregar vehicle health status visual

### Deliverables Sprint 2
- ✅ Dashboard de órdenes funcional
- ✅ Auto-generación desde preventivo
- ✅ Sistema de costos completo
- ✅ User Management completo
- ✅ Asset Management completo (75% → 100%)

**Velocity esperada**: 29 story points

---

## 🛠️ SPRINT 3: PREVENTIVE MAINTENANCE POLISH

### Fecha: 11-22 Noviembre 2025 (2 semanas)
**Objetivo**: Completar módulo preventivo al 100%

### User Stories Sprint 3

#### US-7: Como Admin quiero ver calendario de mantenimientos
**Tasks**:
- [ ] Vista calendario con packages programados
- [ ] Color coding por estado (upcoming, due, overdue)
- [ ] Filtro por vehículo, técnico
- [ ] Click para ver detalles/generar orden

**Story Points**: 8

#### US-8: Como Sistema quiero enviar alertas WhatsApp automáticas
**Tasks**:
- [ ] Configurar Twilio en production (.env)
- [ ] Cron job para check mantenimientos próximos
- [ ] Template mensaje WhatsApp
- [ ] Envío a Admin cuando faltan 500km
- [ ] Log de mensajes enviados
- [ ] Dashboard de alertas

**Story Points**: 13

#### US-9: Como Admin quiero reportes de cumplimiento preventivo
**Tasks**:
- [ ] Reporte: Mantenimientos completados vs programados
- [ ] Reporte: Vehículos con mantenimientos vencidos
- [ ] Export PDF/Excel
- [ ] Filtros por fecha, vehículo

**Story Points**: 8

### Deliverables Sprint 3
- ✅ Calendar view funcional
- ✅ WhatsApp alerts production ready
- ✅ Reportes preventivo
- ✅ Preventive maintenance: 90% → 100%

**Velocity esperada**: 29 story points

---

## 🛠️ SPRINT 4: INVENTORY SYSTEM - PARTE 1

### Fecha: 25 Nov - 06 Dic 2025 (2 semanas)
**Objetivo**: Stock tracking básico + movements

### User Stories Sprint 4

#### US-10: Como Admin quiero registrar cantidades de stock
**Tasks**:
- [ ] Agregar campo `stock` a MantItem model
- [ ] Agregar campo `minStock` (threshold)
- [ ] Migration para agregar campos
- [ ] UI: editar stock actual
- [ ] Validación: no permitir stock negativo

**Story Points**: 5

#### US-11: Como Sistema quiero trackear movimientos de inventario
**Tasks**:
- [ ] Crear model InventoryMovement (id, mantItemId, type, quantity, date, userId)
- [ ] Types: ENTRY, EXIT, ADJUSTMENT
- [ ] API CRUD movements
- [ ] Hook useInventoryMovements
- [ ] UI: registrar entrada (compra)
- [ ] UI: registrar salida (uso en WorkOrder)
- [ ] Auto-decrementar stock al usar en WorkOrder

**Story Points**: 13

#### US-12: Como Admin quiero ver lista de repuestos con stock
**Tasks**:
- [ ] Tabla items con columnas: Name, Category, Stock, MinStock, Status
- [ ] Status badge: OK (verde), LOW (amarillo), OUT (rojo)
- [ ] Filtro por status
- [ ] Ordenar por stock ascendente
- [ ] Search por nombre/código

**Story Points**: 5

### Deliverables Sprint 4
- ✅ Stock tracking funcional
- ✅ Inventory movements system
- ✅ UI lista de repuestos
- ✅ Auto-decrement en work orders
- ✅ Inventory: 15% → 50%

**Velocity esperada**: 23 story points

---

## 🛠️ SPRINT 5: INVENTORY SYSTEM - PARTE 2

### Fecha: 09-20 Diciembre 2025 (2 semanas)
**Objetivo**: Alertas + Purchase Orders + Reportes

### User Stories Sprint 5

#### US-13: Como Admin quiero recibir alertas de stock bajo
**Tasks**:
- [ ] Dashboard card: "Items bajo stock mínimo"
- [ ] Notificación en sidebar (badge)
- [ ] Email alert (opcional)
- [ ] WhatsApp alert (opcional)
- [ ] Lista de items low stock en dashboard

**Story Points**: 5

#### US-14: Como Admin quiero crear órdenes de compra
**Tasks**:
- [ ] Model PurchaseOrder (id, tenantId, providerId, status, items, total)
- [ ] Model PurchaseOrderItem (id, poId, mantItemId, quantity, unitPrice)
- [ ] API CRUD purchase orders
- [ ] UI: crear PO desde items low stock
- [ ] UI: aprobar PO
- [ ] UI: recibir items (incrementar stock)
- [ ] Status: DRAFT → APPROVED → RECEIVED

**Story Points**: 13

#### US-15: Como Admin quiero reportes de inventario
**Tasks**:
- [ ] Reporte: Valorización de inventario (stock * precio)
- [ ] Reporte: Movimientos por período
- [ ] Reporte: Items más usados
- [ ] Export Excel/PDF
- [ ] Gráfico: valor inventario por categoría

**Story Points**: 8

### Deliverables Sprint 5
- ✅ Alertas de stock bajo
- ✅ Purchase orders completo
- ✅ Reportes de inventario
- ✅ Inventory: 50% → 100%

**Velocity esperada**: 26 story points

---

## 🛠️ SPRINT 6: DASHBOARD & REPORTING

### Fecha: 23 Dic 2025 - 03 Ene 2026 (2 semanas)
**Objetivo**: Dashboard funcional con métricas en tiempo real

### User Stories Sprint 6

#### US-16: Como Admin quiero ver métricas clave en dashboard
**Tasks**:
- [ ] Card: Total vehículos activos
- [ ] Card: Órdenes activas (pending + in_progress)
- [ ] Card: Mantenimientos vencidos
- [ ] Card: Items bajo stock
- [ ] Card: Gastos del mes
- [ ] Refetch automático cada 30 segundos

**Story Points**: 8

#### US-17: Como Admin quiero ver gráficos de tendencias
**Tasks**:
- [ ] Gráfico línea: Gastos últimos 6 meses
- [ ] Gráfico barras: Órdenes por estado
- [ ] Gráfico pie: Gastos por categoría
- [ ] Gráfico barras: Vehículos por tipo
- [ ] Usar Recharts

**Story Points**: 13

#### US-18: Como Admin quiero exportar reportes
**Tasks**:
- [ ] Export Excel: Lista de vehículos
- [ ] Export PDF: Reporte mantenimiento por vehículo
- [ ] Export Excel: Gastos por período
- [ ] Service: ExcelService usando ExcelJS
- [ ] Service: PDFService (usar jsPDF o similar)

**Story Points**: 8

### Deliverables Sprint 6
- ✅ Dashboard con métricas en tiempo real
- ✅ Gráficos de tendencias
- ✅ Export functionality
- ✅ Dashboard: 25% → 100%

**Velocity esperada**: 29 story points

---

## 🛠️ SPRINT 7: TESTING, POLISH & DEPLOYMENT

### Fecha: 06-17 Enero 2026 (2 semanas)
**Objetivo**: Testing, bug fixes, performance, deploy

### Week 1: Testing & Bug Fixes

#### Testing
- [ ] Setup Vitest + Testing Library
- [ ] Unit tests: Services (80% coverage)
- [ ] Integration tests: APIs críticas
- [ ] Component tests: Forms principales
- [ ] E2E tests: User flows críticos (opcional)

#### Bug Fixes
- [ ] Fix bugs reportados en sprints anteriores
- [ ] Resolver edge cases
- [ ] Mejorar validaciones
- [ ] Agregar error handling faltante

#### Performance
- [ ] Audit con Lighthouse
- [ ] Optimizar bundle size (code splitting)
- [ ] Optimizar queries Prisma (índices)
- [ ] Implementar lazy loading components
- [ ] Optimizar imágenes

### Week 2: Deploy & Documentation

#### Deployment
- [ ] Setup Vercel project
- [ ] Configurar environment variables
- [ ] Deploy a staging
- [ ] User acceptance testing
- [ ] Fix bugs de staging
- [ ] Deploy a production
- [ ] Setup monitoring (Sentry/Vercel Analytics)

#### Documentation
- [ ] README.md completo
- [ ] DEPLOYMENT.md
- [ ] API_DOCUMENTATION.md
- [ ] USER_GUIDE.md básico
- [ ] JSDoc en componentes críticos

#### Handoff
- [ ] Demo final del MVP
- [ ] Training session
- [ ] Documentar issues conocidos
- [ ] Roadmap post-MVP
- [ ] Setup support channels

### Deliverables Sprint 7
- ✅ Test coverage >70%
- ✅ Performance score >90
- ✅ Deployed to production
- ✅ Documentation completa
- ✅ MVP 100% ✨

**Velocity esperada**: 21 story points (menos features, más polish)

---

## 📊 MÉTRICAS Y TRACKING

### KPIs por Sprint

| Métrica | Target | Tool |
|---------|--------|------|
| **Velocity** | 20-30 SP/sprint | GitHub Projects |
| **Code Coverage** | >70% | Vitest |
| **Bug Rate** | <2 bugs/story | GitHub Issues |
| **Lighthouse Score** | >90 | Chrome DevTools |
| **Build Time** | <2 min | Vercel |

### Definition of Done (DoD)

Para considerar una User Story como DONE:

- [x] **Feature implemented**: Código escrito y funcional
- [x] **Tests written**: Unit tests + integration tests (si aplica)
- [x] **UI responsive**: Mobile + tablet + desktop
- [x] **Code reviewed**: Self-review + pair programming
- [x] **Documentation**: JSDoc en funciones públicas
- [x] **ESLint clean**: 0 errores, warnings aceptables
- [x] **TypeScript clean**: 0 errores
- [x] **Performance**: No degradación vs baseline
- [x] **Product owner accepted**: Tested en desarrollo

### Ceremonia de Sprints

#### Sprint Planning (Lunes semana 1)
- **Duración**: 1 hora
- **Objetivo**: Seleccionar user stories del backlog
- **Output**: Sprint backlog con tasks asignadas

#### Daily Standup (Cada día laboral)
- **Duración**: 15 min
- **Formato**: Async (mensaje en session)
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
| **Technical debt** | Media | Alto | Code reviews, refactoring sprints |
| **Performance issues** | Media | Medio | Lighthouse audits, profiling |
| **Supabase downtime** | Baja | Alto | Monitoring, backup plan |
| **Dependencies bugs** | Media | Medio | Lock versions, testing |

### Contingency Plans

#### Si Sprint 1-2 se atrasa
- Reducir scope: eliminar US-6 (costos) para v1.1
- Focus: CRUD work orders + assignment (core MVP)

#### Si problemas de performance
- Implementar pagination agresiva
- Lazy load components
- Optimizar queries con Prisma (índices)

#### Si Supabase pausa proyecto
- Configurar Vercel Cron para ping cada 24h
- Upgrade a plan Pro ($25/mes) si necesario

---

## 🎯 MILESTONES

### Milestone 1: Foundation Complete
**Fecha**: 25 Octubre 2025 (fin Sprint 1)
**Criterio**: Work Orders CRUD funcional

### Milestone 2: Core Features Complete
**Fecha**: 22 Noviembre 2025 (fin Sprint 3)
**Criterio**: Work Orders + Preventivo 100%

### Milestone 3: MVP Feature Complete
**Fecha**: 20 Diciembre 2025 (fin Sprint 5)
**Criterio**: Inventory system 100%

### Milestone 4: Production Ready
**Fecha**: 17 Enero 2026 (fin Sprint 7)
**Criterio**: Deployed to production ✨

---

## 📋 BACKLOG PRIORIZADO

### Sprint 0 (Prep)
- [x] Push commits pendientes
- [x] Setup TanStack Query
- [x] Fix ESLint errors
- [x] Update README
- [x] GitHub Projects board

### Sprint 1 (Work Orders Foundation)
- [ ] US-1: Admin crear órdenes (5 SP)
- [ ] US-2: Admin asignar técnicos (3 SP)
- [ ] US-3: Técnico ver mis órdenes (5 SP)

### Sprint 2 (Work Orders Advanced)
- [ ] US-4: Dashboard órdenes (8 SP)
- [ ] US-5: Auto-generar desde preventivo (13 SP)
- [ ] US-6: Registrar costos (8 SP)

### Sprint 3 (Preventive Polish)
- [ ] US-7: Calendario mantenimientos (8 SP)
- [ ] US-8: WhatsApp alerts (13 SP)
- [ ] US-9: Reportes preventivo (8 SP)

### Sprint 4 (Inventory Part 1)
- [ ] US-10: Stock tracking (5 SP)
- [ ] US-11: Inventory movements (13 SP)
- [ ] US-12: Lista repuestos (5 SP)

### Sprint 5 (Inventory Part 2)
- [ ] US-13: Alertas stock bajo (5 SP)
- [ ] US-14: Purchase orders (13 SP)
- [ ] US-15: Reportes inventario (8 SP)

### Sprint 6 (Dashboard)
- [ ] US-16: Métricas clave (8 SP)
- [ ] US-17: Gráficos tendencias (13 SP)
- [ ] US-18: Export reportes (8 SP)

### Sprint 7 (Testing & Deploy)
- [ ] Testing suite (8 SP)
- [ ] Bug fixes (5 SP)
- [ ] Performance optimization (5 SP)
- [ ] Deployment (3 SP)

**Total story points**: ~170 SP
**Velocity promedio**: 24 SP/sprint

---

## 🎉 POST-MVP (v1.1 - v1.5)

### Features para v1.1 (Feb-Mar 2026)
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Mobile app (React Native)
- [ ] Advanced filters & search
- [ ] Bulk operations
- [ ] API pública (REST)

### Features para v1.2 (Abr-May 2026)
- [ ] OCR para recibos (feature/ocr-expense-tracking)
- [ ] Integraciones (Google Calendar, Slack)
- [ ] Advanced analytics (BI)
- [ ] Multi-idioma (i18n)

### Features para v2.0 (Jun-Ago 2026)
- [ ] Predictive maintenance (ML)
- [ ] Route optimization
- [ ] Fuel management
- [ ] Driver behavior analytics

---

## 📞 SOPORTE Y COMUNICACIÓN

### Canales
- **Daily updates**: .claude/sessions/
- **Issues**: GitHub Issues
- **Docs**: /docs folder
- **Questions**: Session comments

### Horarios
- **Development**: L-V 9am-6pm (flexible)
- **Standups**: Async (log en session)
- **Reviews**: Viernes 5pm

---

## ✅ PRÓXIMOS PASOS INMEDIATOS

### Hoy (07-Oct)
1. ✅ Aprobar este cronograma
2. ✅ Decidir: ¿Comenzamos Sprint 0 prep hoy o mañana?

### Esta semana (Sprint 0)
1. Push commits a origin/develop
2. Setup TanStack Query
3. Fix ESLint
4. GitHub Projects setup

### Próxima semana (Sprint 1 - Week 1)
1. Crear WorkOrderService
2. Implementar custom hooks
3. APIs REST work orders

---

**Cronograma creado**: 07 Octubre 2025
**Última actualización**: 07 Octubre 2025
**Basado en**: Diagnóstico 07-Oct + Planes 30-Sep y 02-Oct
**Tiempo estimado total**: 14 semanas (7 sprints)
