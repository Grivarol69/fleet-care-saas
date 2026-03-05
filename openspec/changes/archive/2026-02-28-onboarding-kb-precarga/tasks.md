# Tasks: Onboarding Knowledge Base Precarga

## Overview

Lista de tareas para implementar la precarga de Knowledge Base en onboarding.

---

## Phase 1: Backend - Función de Copia

### Task 1.1: Crear función copyKnowledgeBaseToTenant
- **File:** `src/actions/copy-kb-to-tenant.ts` (NEW)
- **Description:** Implementar función server action que copia datos globales al tenant
- **Dependencies:** None
- **Status:** completed

### Task 1.2: Testing unitario de función copy
- **Description:** Crear test básico verificando que la función se ejecuta sin errores
- **Dependencies:** 1.1
- **Status:** completed

---

## Phase 2: Frontend - Componente KB Form

### Task 2.1: Obtener conteos de datos globales
- **File:** `src/actions/get-kb-counts.ts` (NEW)
- **Description:** Server action para obtener cantidad de registros globales (para mostrar en UI)
- **Dependencies:** None
- **Status:** completed

### Task 2.2: Crear componente OnboardingKBForm
- **File:** `src/components/onboarding/OnboardingKBForm.tsx` (NEW)
- **Description:** Componente con checkboxes y conteos
- **Dependencies:** 2.1
- **Status:** completed

### Task 2.3: Agregar Step 2 al wizard
- **File:** `src/app/onboarding/page.tsx`
- **Description:** Modificar wizard para incluir paso de precarga KB
- **Dependencies:** 2.2
- **Status:** completed

---

## Phase 3: Integración

### Task 3.1: Modificar updateTenantProfile
- **File:** `src/actions/onboarding.ts`
- **Description:** Integrar llamada a copyKnowledgeBaseToTenant después de actualizar tenant
- **Note:** No necesaria - KBForm maneja la copia directamente. Se modificó para setear PROFILE_COMPLETED en vez de COMPLETED.
- **Dependencies:** 1.1, 2.3
- **Status:** completed

### Task 3.2: Eliminar datos dummy del seed
- **File:** `src/actions/seed-tenant.ts`
- **Description:** Eliminar creación de Provider, Driver, Vehicle dummy
- **Dependencies:** None
- **Status:** completed

### Task 3.3: Testing de extremo a extremo
- **Description:** Verificar flujo completo de onboarding con precarga
- **Dependencies:** 3.1, 3.2
- **Status:** completed

---

## Phase 4: Manejo de Errores

### Task 4.1: Agregar manejo de errores en UI
- **File:** `src/components/onboarding/OnboardingKBForm.tsx`
- **Description:** Mostrar errores al usuario si falla la copia
- **Dependencies:** 2.2
- **Status:** completed

### Task 4.2: Validar estado consistente si falla
- **Description:** Si falla, no marcar onboarding como COMPLETED - OnboardingKBForm maneja errores correctamente y solo llama onSuccess si la copia es exitosa
- **Dependencies:** 3.1
- **Status:** completed

---

## Phase 5: Expansión Knowledge Base

### Task 5.1: Agregar más marcas/líneas globales
- **File:** `prisma/seed.ts`
- **Description:** Expandir lista de marcas y líneas (Honda, Hyundai, Kia, etc.)
- **Dependencies:** None
- **Status:** pending

### Task 5.2: Investigar y cargar más templates
- **File:** `prisma/seed.ts`
- **Description:** Agregar templates para más líneas (investigación de manuales)
- **Dependencies:** None
- **Status:** pending

---

## Phase 6: MASTER PARTS + VINculos Inteligentes (PRÓXIMA ITERACIÓN)

> **NOTA:** Esta fase requiere trabajo de investigación para obtener catálogos de autopartes.
> El sistema actual solo copia marcas/líneas/items/templates. FALTAN:
> - MasterPart: Catálogo de autopartes globales
> - MantItemVehiclePart: Vínculos inteligentes por marca/línea/año

### Task 6.1: Agregar MasterPart al seed global
- **Description:** Crear catálogo de autopartes globales (filtros, aceites, pastillas, etc.)
- **Research needed:** Catálogos Bosch, Mann, Castrol, etc.

### Task 6.2: Agregar MantItemVehiclePart al seed
- **Description:** Vincular items de mantenimiento con autopartes específicas por marca/línea/año
- **Research needed:** Mapear cada item a número de parte específico

### Task 6.3: Actualizar copyKnowledgeBaseToTenant
- **Description:** Incluir copia de MasterPart y MantItemVehiclePart
- **Dependencies:** 6.1, 6.2

---

## Task Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1 | 1.1, 1.2 | ✅ completed |
| Phase 2 | 2.1, 2.2, 2.3 | ✅ completed |
| Phase 3 | 3.1, 3.2, 3.3 | ✅ completed |
| Phase 4 | 4.1, 4.2 | ✅ completed |
| Phase 5 | 5.1, 5.2 | ⏳ pending |
| Phase 6 | 6.1, 6.2, 6.3 | ⏳ pending (next iteration) |

**Total:** 12 tareas (esta iteración) + 3 tareas (próxima iteración)

---

## Batch Suggestions

**Batch 1 (Backend):** Tasks 1.1 - 1.2
**Batch 2 (Frontend Form):** Tasks 2.1 - 2.2  
**Batch 3 (Wizard Integration):** Tasks 2.3 - 3.2 ✓ COMPLETED
**Batch 4 (Testing & Errors):** Tasks 3.3 - 4.2 (partial - 4.2 complete)
**Batch 5 (KB Expansion):** Tasks 5.1 - 5.2 (puede ser trabajo paralelo)

---

## Notes

- La Fase 5 puede realizarse en paralelo por otro miembro del equipo
- El trabajo de investigación de templates puede delegarse
- Considerar crear seed separado para KB global (seed.kb.ts) para facilitar mantenimiento
