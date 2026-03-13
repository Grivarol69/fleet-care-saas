# Proposal: Onboarding Knowledge Base Precarga

## Overview

Mejorar el flujo de onboarding para que nuevos tenants puedan precargar el Knowledge Base global (marcas, líneas, tipos, items de mantenimiento, templates) de forma opcional y controlada, en lugar de depender de datos dummy frágil.

## Problem Statement

El flujo actual de onboarding tiene las siguientes vulnerabilidades:

1. **Seed no copia datos globales** - El tenant queda vacío de metadata
2. **Dependencia frágil** - Si el seed global no corrió, falla silenciosamente
3. **Sin opciones para el usuario** - No puede elegir qué precargar
4. **Sin rollback** - Si falla, el onboarding queda marcado COMPLETED

## Proposed Solution

### Arquitectura (YA EXISTE)
La plataforma ya tiene soporte para datos globales:
- `isGlobal: true` + `tenantId: null` = dato global (para todos los tenants)
- Modelos: VehicleBrand, VehicleLine, VehicleType, MantCategory, MantItem, MaintenanceTemplate

**NO se necesita un "Tenant especial"** - La arquitectura actual es suficiente.

### Flujo Propuesto

```
WIZARD ACTUAL:              WIZARD MEJORADO:
─────────────              ─────────────────
Paso 1: Perfil       →     Paso 1: Perfil (país, moneda)
Paso 2: Listo        →     Paso 2: Precarga KB (checkboxes)
                           Paso 3: Listo
```

**Paso 2 "Precarga KB":**
- [x] Marcas, Líneas y Tipos de vehículos (recomendado)
- [x] Items de Mantenimiento (recomendado)
- [ ] Templates de Mantenimiento (opcional - por línea)

### Scope del Seed

**Incluir:**
- ✅ VehicleBrand (todas las globales → copia al tenant)
- ✅ VehicleLine (todas las globales → copia al tenant)
- ✅ VehicleType (todos los globales → copia al tenant)
- ✅ MantCategory (todas las globales → copia al tenant)
- ✅ MantItem (todos los globales → copia al tenant)
- ✅ MaintenanceTemplate + MaintenancePackage + PackageItem (seleccionados → copia al tenant)

**NO incluir:**
- ❌ Vehicle (vehículos)
- ❌ Document (documentos)
- ❌ VehicleMantProgram (asignación a programas)
- ❌ Provider (proveedores)
- ❌ Technician (técnicos)
- ❌ Driver (drivers)

### Implementación Requerida

1. **Expandir Knowledge Base Global** (trabajo manual)
   - Agregar más marcas/líneas
   - Investigar manuals de fabricantes para más templates
   - El equipo dev se dedica a investigar y cargar datos profesionales

2. **Nuevo componente UI: OnboardingKBPrecarga**
   - Checkboxes para seleccionar qué copiar
   - Preview de cuántos datos se van a cargar

3. **Nueva función: copyKnowledgeBaseToTenant(tenantId, options)**
   - Transaction de Prisma
   - Copia cada modelo con sus FKs
   - Rollback automático si falla
   - Logging detallado

4. **Modificar onboarding.ts**
   - Agregar paso intermedio
   - Manejo de errores robusto

## Scope

### In Scope
- Onboarding wizard (frontend + server actions)
- Knowledge Base copy function
- UI de selección de precarga

### Out of Scope
- Panel de admin para gestionar KB global (futuro)
- OCR de manuales (manual input)
- Predictivo/AI (futuro)

## Timeline Estimate

- **Fase 1:** UI wizard + función copy (2-3 días)
- **Fase 2:** Testing + fix bugs (1-2 días)
- **Fase 3:** Expandir KB (trabajo continuo paralelo)

## Dependencies

- Sistema de multi-tenancy existente (Prisma + Clerk)
- Datos globales en seed.ts

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| FK copy fail | Medium | High | Transaction con rollback |
| KB vacío | Low | Medium | Validar que existan datos globales antes de mostrar |
| Performance | Low | Low | Copia es por única vez, aceptable |

## Success Criteria

1. ✅ Usuario puede elegir qué precargar en onboarding
2. ✅ Copia funciona sin perder referencias (FKs correctas)
3. ✅ Si falla, el tenant queda en estado consistente
4. ✅ Sin datos dummy (provider, driver, vehicle eliminados del seed)
5. ✅ El usuario ve cuántos datos se van a cargar

---

## Decision Required

**¿Apruebas esta dirección?** 

Opciones:
1. ✅ **Aprobar** - Procedemos con spec, design, tasks
2. ❌ **Modificar** - Indicame qué cambiar
3. ❓ **Más preguntas** - ¿Qué necesitas saber?
