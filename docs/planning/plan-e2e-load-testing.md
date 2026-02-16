# Plan de Implementación: E2E & Load Testing

**Fecha**: 16 Febrero 2026
**Objetivo**: Implementar Nivel 3 (E2E) y Nivel 4 (Carga) de la estrategia de testing.
**Herramientas**: Playwright (E2E), k6 (Carga)

---

## FASE 1: Nivel 3 - E2E Testing (Playwright)

**Objetivo**: Validar flujos críticos de usuario final (UI) que no pueden ser cubiertos totalmente por tests de integración.

### 1.1 Configuración Inicial
- [ ] Instalar Playwright: `pnpm add -D @playwright/test`
- [ ] Instalar navegadores: `npx playwright install chromium`
- [ ] Configurar `playwright.config.ts`:
    - Base URL: `http://localhost:3000`
    - Auth storage state (para no loguearse en cada test)
    - Tracing y video en fallo
    - Timeout: 30s

### 1.2 Escenarios Críticos a Automatizar

#### A. Autenticación y Onboarding (Smoke Test)
- **Archivo**: `e2e/auth.spec.ts`
- **Casos**:
    1.  Login exitoso (mocked o real con usuario de test)
    2.  Redirección a dashboard según rol
    3.  Logout

#### B. Flujo de Orden de Trabajo (Preventiva)
- **Archivo**: `e2e/work-orders/preventive-flow.spec.ts`
- **Flujo**:
    1.  Navegar a "Nueva Orden"
    2.  Seleccionar vehículo
    3.  Seleccionar alertas pendientes (Wizard)
    4.  Completar formulario de creación
    5.  Verificar redirección a detalle de OT
    6.  Verificar estado PENDING

#### C. Gestión de Vehículos (CRUD)
- **Archivo**: `e2e/vehicles/crud.spec.ts`
- **Flujo**:
    1.  Crear nuevo vehículo
    2.  Verificar que aparece en lista
    3.  Editar kilometraje
    4.  Verificar actualización

### 1.3 Ejecución
- Comando: `npx playwright test`
- Reporte: HTML Report

---

## FASE 2: Nivel 4 - Load Testing (k6)

**Objetivo**: Verificar comportamiento del sistema bajo carga concurrente (50-100 usuarios activos).

### 2.1 Preparación
- [ ] Instalar k6 (Local o Docker)
- [ ] Script de Seed Masivo (`prisma/seed-stress.ts` - *ya existente, verificar*)

### 2.2 Escenarios de Carga

#### A. Navegación General (Baseline)
- **Archivo**: `load-tests/navigation.js`
- **Comportamiento**: Login -> Dashboard -> Lista Vehículos -> Lista OTs
- **Carga**: 50 VUs (Virtual Users) durante 5 minutos

#### B. Creación Masiva de OTs (Stress)
- **Archivo**: `load-tests/create-wo.js`
- **Comportamiento**: POST /api/maintenance/work-orders
- **Carga**: 20 VUs creando órdenes simultáneamente
- **Objetivo**: Detectar race conditions o bloqueos de DB

### 2.3 Metricas de Éxito (Thresholds)
- `http_req_duration`: p95 < 500ms
- `http_req_failed`: < 1%

---

## Cronograma Estimado

1.  **Día 1**: Setup Playwright + Auth Test + Vehicle Test
2.  **Día 2**: Work Order E2E Flow (Complejo)
3.  **Día 3**: Setup k6 + Navigation Load Test
4.  **Día 4**: Stress Test + Análisis de Resultados
