# Exploration: Onboarding Knowledge Base Precarga

## Current State

El flujo de onboarding actual tiene las siguientes vulnerabilidades documentadas en Engram:

1. **Seed no copia datos globales al tenant** - El tenant queda vacío de metadata (marcas, líneas, items, templates)
2. **Dependencia frágil** - Si el seed global no corrió, el vehicle dummy falla silenciosamente
3. **Wizard saltado** - Pasa de PENDING → COMPLETED sin pasar por pasos intermedios
4. **Sin validación Zod** - El formulario no tiene validación robusta
5. **Sin rollback** - Si el seed falla, el onboarding ya está marcado COMPLETED
6. **No hay manejo de errores** - Errors se loguean pero no se notifica al usuario

## Affected Areas

- `src/actions/onboarding.ts` - Server action de onboarding
- `src/actions/seed-tenant.ts` - Función que crea datos dummy
- `src/app/onboarding/page.tsx` - Wizard UI
- `prisma/seed.ts` - Seed global existente

## Architecture Actual (ya implementada)

La plataforma YA tiene arquitectura de datos globales:
- `isGlobal: true` + `tenantId: null` = dato global (disponible para todos los tenants)
- Modelos con soporte: VehicleBrand, VehicleLine, VehicleType, MantCategory, MantItem, MaintenanceTemplate

## Data Global Existente

| Modelo | Count | Ejemplo |
|--------|-------|---------|
| VehicleBrand | 5 | Toyota, Ford, Chevrolet, Nissan, Mitsubishi |
| VehicleLine | ~20 | Hilux, Ranger, D-MAX, Frontier, L200 |
| VehicleType | 5 | Camioneta 4x4, Camión de Carga, SUV |
| MantCategory | 9 | Motor, Frenos, Transmisión, Suspensión |
| MantItem | ~30 | Cambio aceite, Cambio filtros, Frenos |
| MaintenanceTemplate | 3 | Toyota Hilux Standard, Ford Ranger, Chevy Dmax |

## User Requirement

El usuario propone:
1. **Botón en wizard** preguntando si quiere precargar información
2. **Datos globales** investigados profesionalmente (manuales de fabricantes)
3. **Knowledge Base** expansionado con más templates

**Scope específico del seed (NO incluir):**
- ❌ Vehículos
- ❌ Documentos  
- ❌ Asignación a programas
- ❌ Proveedores
- ❌ Técnicos
- ❌ Drivers

**Scope específico del seed (SÍ incluir):**
- ✅ Marcas de vehículos
- ✅ Líneas
- ✅ Tipos de vehículos
- ✅ Items de mantenimiento
- ✅ Templates con paquetes e items

## Approaches

### Approach 1: Tu Propuesta (Tenant Especial)
- Crear un "tenant especial" para datos globales
- Modificar queries para buscar ahí primero

**Pros:** 
- Simple de entender conceptualmente

**Cons:**
- ❌ Introduce complejidad innecesaria
- ❌ La arquitectura actual ya soporta esto con isGlobal
- ❌ Queries más complejas

**Complexity:** Medium

### Approach 2: Mi Recomendación (Mejorar KB Existente)
- Mantener arquitectura actual: `isGlobal: true`, `tenantId: null`
- Expandir el Knowledge Base con más datos
- Agregar paso intermedio en wizard con checkboxes
- Implementar función de copia robusta

**Pros:**
- ✅ Aprovecha arquitectura existente
- ✅ Menos código nuevo
- ✅ Consistente con el resto del sistema

**Cons:**
- ⚠️ Requiere más trabajo de investigación (agregar templates)

**Complexity:** Low-Medium

## Recommendation

**Approach 2** - La arquitectura ya existe. Solo hay que:
1. Expandir el Knowledge Base (trabajo manual de investigación)
2. Crear el paso de precarga en el wizard
3. Implementar función robusta de copia

## Risks

- **Riesgo 1:** Si no hay templates para las líneas del tenant, el checkbox estará vacío
- **Riesgo 2:** La copia de templates requiere actualizar FKs correctamente (complejo)
- **Riesgo 3:** Performance si el KB global es muy grande

## Ready for Proposal

**SÍ** - La exploración está completa. Recomiendo proceder con Approach 2.

El usuario debe aprobar esta dirección antes de generar proposal/spec/design.
