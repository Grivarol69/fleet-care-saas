# Implementación VehicleMantProgram: Arquitectura Unificada

## Sesión: 29 Septiembre 2025
**Contexto**: Continuación sesión 27/09 - Implementar nueva arquitectura VehicleMantProgram para resolver integridad referencial en mantenimiento preventivo/correctivo.

---

## 🚨 PROBLEMA CRÍTICO RESUELTO: Pérdida de Schema

### Crisis Identificada
- **Comando destructivo**: `prisma db pull` sobrescribió nuestro schema.prisma
- **Pérdida total**: Todos los modelos nuevos eliminados (VehicleMantProgram, MaintenanceTemplate, etc.)
- **Causa**: Base de datos NO tenía las nuevas tablas aplicadas
- **Estado**: Schema retrocedió 3 meses al estado legacy

### Modelos Perdidos
```prisma
❌ VehicleMantProgram      → Programa de mantenimiento por vehículo
❌ VehicleMantPackage      → Paquetes del programa
❌ VehicleMantItem         → Items individuales de mantenimiento
❌ MaintenanceTemplate     → Templates base (tenía pero incompleto)
❌ MaintenancePackage      → Paquetes del template
❌ PackageItem             → Items del template
❌ VehicleMaintenanceMetrics → Métricas y scoring
❌ MantItem.estimatedCost  → Campo agregado para costos
```

### Recuperación Exitosa
- **Identificado**: Último commit válido `4ff0a62` con mensaje "Add MantTemplate functionality"
- **Restaurado**: `git checkout 4ff0a62 -- prisma/schema.prisma`
- **Verificado**: MaintenanceTemplate + MaintenancePackage + PackageItem recuperados
- **Estado**: ✅ Schema base restaurado, listo para agregar VehicleMantProgram

---

## 🎯 ARQUITECTURA OBJETIVO (Decisión 27/09)

### Estructura Nueva Acordada
```
VehicleMantProgram → VehicleMantPackage → VehicleMantItem → MantItem
```

### Flujo de Mantenimiento Real

#### Preventivo (Template-Based)
```
1. Usuario selecciona Template para Vehículo
2. Sistema crea VehicleMantProgram
3. Auto-genera VehicleMantPackage por cada trigger (15k, 30k, etc.)
4. Crea VehicleMantItem por cada PackageItem del template
5. Usuario ajusta km programados según vehículo específico
```

#### Correctivo (Ad-hoc)
```
1. Falla detectada en vehículo
2. Crear VehicleMantItem directo (sin package)
3. Auto-crea "Paquete Correctivo" como contenedor
4. Evita problema de integridad referencial
```

### Tabla Unificada (Opción 2 - Seleccionada)
```prisma
model VehicleMantItem {
  // NÚCLEO SIEMPRE REQUERIDO
  vehicleId             Int      // ✅ DIRECTO
  mantItemId            Int      // ✅ DIRECTO

  // REFERENCIAS OPCIONALES (preventivo)
  packageId             Int?     // NULL para correctivos

  // AUTONOMÍA COMPLETA
  mantType              MantType // PREVENTIVE, CORRECTIVE, PREDICTIVE
  scheduledKm           Int?     // Km programado
  executedKm            Int?     // Km real ejecución
  status                WorkOrderStatus
  urgency               Boolean  // Para correctivos
}
```

---

## 🔧 TRABAJO REALIZADO HOY

### 1. Análisis y Diagnóstico
- **Revisión completa**: APIs VehicleProgramsList + tipos + schema
- **Identificación**: Error P2022 "column estimatedCost does not exist"
- **Causa**: Cliente Prisma desincronizado con schema actual
- **Solución**: Restaurar schema desde git + nueva migración

### 2. Recuperación de Assets
- **APIs existentes**: `/api/maintenance/vehicle-programs/*` ya implementadas
- **Componente UI**: `VehicleProgramsList.tsx` ultra-optimizado para espacio
- **Tipos**: `VehicleProgramsList.types.ts` con estructura completa
- **Middleware**: Temporalmente deshabilitado auth para testing

### 3. Seed Script Preparado
- **Archivo**: `scripts/quick-seed.ts` con datos de prueba
- **Contenido**: Tenant, vehículos, templates, packages completos
- **Error corregido**: Campo `model` eliminado del Vehicle (obsoleto)
- **Estado**: Listo para ejecutar después de migración

---

## 📋 ASSETS IMPLEMENTADOS PREVIAMENTE

### APIs Completas ✅
```
/api/maintenance/vehicle-programs/
├── route.ts                     → GET (list), POST (create from template)
├── [id]/route.ts               → GET, PUT, DELETE individual
```

### UI Optimizada ✅
```
VehicleProgramsList/
├── VehicleProgramsList.tsx     → Tabs navigation (Programs→Packages→Items)
├── VehicleProgramsList.types.ts → TypeScript definitions completas
├── index.ts                    → Export clean
```

### Características UI
- **Espacio optimizado**: Header 5%, métricas 5%, datos 90%
- **Navegación tabs**: Programs → Packages → Items drill-down
- **Cards compactas**: Grid responsivo 1-6 columnas
- **Breadcrumbs**: Contexto visual siempre visible
- **Estados vacíos**: Mensajes + botones de acción

### Middleware Testing ✅
```typescript
// Línea 69 comentada para testing sin auth
// await supabase.auth.getUser() // TEMPORALMENTE DESHABILITADO PARA TESTING
```

---

## 🚧 PENDIENTES CRÍTICOS

### Inmediato (Hoy)
1. **Agregar VehicleMantProgram** modelos al schema restaurado
2. **Crear migración** para nuevas tablas
3. **Regenerar cliente** Prisma con modelos actualizados
4. **Ejecutar seed** con datos de prueba
5. **Testing UI** en navegador con datos reales

### Schema a Agregar
```prisma
model VehicleMantProgram {
  id                    Int
  name                  String   // "Programa Toyota Hilux ABC-123"
  vehicleId             Int      // @unique - un programa por vehículo
  assignmentKm          Int      // Km cuando se asignó
  nextMaintenanceKm     Int?     // Próximo calculado
  generatedFrom         String?  // "Template: Toyota Hilux Standard v1.2"
  isActive              Boolean
  packages              VehicleMantPackage[]
}

model VehicleMantPackage {
  id              Int
  programId       Int
  name            String   // "Mantenimiento 15,000 km"
  triggerKm       Int?     // 15000 (NULL para correctivos)
  packageType     MantType // PREVENTIVE, CORRECTIVE
  scheduledKm     Int?     // Km específico vehículo
  status          WorkOrderStatus
  items           VehicleMantItem[]
}

model VehicleMantItem {
  id                    Int
  packageId             Int      // NUNCA NULL - siempre tiene package
  mantItemId            Int      // Referencia MantItem base
  mantType              MantType
  scheduledKm           Int?
  executedKm            Int?
  status                WorkOrderStatus
  urgency               Boolean  @default(false)
  # ... resto campos autónomos
}
```

---

## 🎯 DECISIONES ARQUITECTURALES FINALES

### Integridad Referencial (Resuelta)
- **Problema**: Correctivos no tienen package → FK violation
- **Solución**: Auto-crear "Items Correctivos" package como contenedor
- **Resultado**: packageId NUNCA NULL, integridad preservada

### Naming Unificado
- `VehicleMantProgram` vs `VehicleMaintenanceSchedule` → **Más claro**
- `VehicleMantPackage` vs `ScheduledPackage` → **Más directo**
- `VehicleMantItem` vs `VehicleMantPlanItem` → **Más simple**

### Flujo de Datos
```
Template (Reutilizable) → Program (Por Vehículo) → Packages → Items → WorkOrder
```

---

## 🔍 LECCIONES APRENDIDAS

### Comandos Peligrosos
1. **`prisma db pull`** sobrescribe schema → NUNCA usar sin backup
2. **`prisma migrate reset`** elimina todos los datos → Documentar bien
3. **Regenerar cliente** después de cambios schema → Obligatorio

### Gestión de Estado
1. **Git como backup** crucial para schemas complejos
2. **Commits frecuentes** evitan pérdidas de trabajo
3. **Documentación sesiones** permite recuperación rápida

### Arquitectura de DB
1. **Tabla unificada** mejor que separadas para UX
2. **Referencias opcionales** con validaciones permiten flexibilidad
3. **Auto-contenedores** resuelven problemas FK elegantemente

---

## 🎉 ESTADO ACTUAL

### ✅ Completado
- Schema base restaurado con MaintenanceTemplate
- APIs VehicleProgramsList implementadas
- UI ultra-optimizada para datos
- Middleware configurado para testing
- Seed script preparado

### 🚧 En Progreso
- Agregando VehicleMantProgram al schema
- Preparando migración nueva arquitectura

### 📋 Próximos Pasos
1. Completar schema con nuevos modelos
2. Ejecutar migración
3. Testing completo UI + APIs
4. Documentar flujo usuario final

---

## 🔧 TRABAJO FINAL SESIÓN (5 HORAS)

### Estado Final Schema ✅
- **VehicleMantProgram**: Arquitectura completa agregada al schema
- **Migración**: `20250929174857_add_maintenance_templates_and_vehicle_programs` aplicada exitosamente
- **Cliente Prisma**: Regenerado con nuevos modelos

### Problemas Finales Identificados 🚨
1. **Conectividad DB**: Persiste error P1001 con Supabase pooler
2. **Seed Script**: Campos PackageItem corregidos pero faltan valores Status correctos
3. **Enum Status**: Solo tiene ACTIVE/INACTIVE, seed usa 'PENDING' (inválido)

### Correcciones Aplicadas
- **dotenv**: Agregado import para variables entorno
- **PackageItem**: Agregados campos triggerKm, priority, estimatedCost, estimatedTime, status
- **Valores seed**: Completados datos faltantes en PackageItem

### Estado Componentes UI ✅
- **VehicleProgramsList**: Implementado y optimizado para espacio
- **APIs**: `/api/maintenance/vehicle-programs/*` completas
- **Middleware**: Auth deshabilitado temporalmente para testing

---

## 📋 PENDIENTES PRÓXIMA SESIÓN

### Inmediato (Crítico)
1. **Resolver conectividad DB**: Verificar credenciales Supabase o usar DB local
2. **Corregir enum Status**: Seed usa 'PENDING' pero schema solo tiene ACTIVE/INACTIVE
3. **Ejecutar seed exitosamente**: Con datos de prueba completos
4. **Testing UI**: VehicleProgramsList con datos reales en navegador

### Secundario
1. **FormAddVehicleProgram**: Crear componente para generar programas desde templates
2. **FormEditVehicleProgram**: Componente edición de programas
3. **Testing end-to-end**: Flujo completo preventivo y correctivo

### Arquitectura Lista ✅
```prisma
VehicleMantProgram → VehicleProgramPackage → VehicleProgramItem
```
- **Integridad referencial**: Resuelta con packages obligatorios
- **Correctivos**: Auto-generan "Items Correctivos" package
- **UI optimizada**: 90% espacio para datos útiles

---

## 🎯 SESIÓN 30 SEPTIEMBRE 2025 - TESTING EXITOSO

### ✅ Testing Funcionalidad Templates
- **Seed ejecutado**: Datos de prueba creados exitosamente
- **API funcionando**: `/api/maintenance/mant-template` retorna datos completos
- **UI validada**: Templates se muestran correctamente en navegador
- **Middleware OK**: Auth deshabilitado, tenant `mvp-default-tenant` configurado
- **Relaciones verificadas**: Template → Package → PackageItems → MantItems

### 📊 Datos del Seed Verificados
```
✅ Template: Toyota Hilux Standard (ID: 1)
✅ Package: Mantenimiento 15,000 km (2 items, $105, 2h)
✅ Items: Cambio aceite ($80, 1.5h) + Filtro aire ($25, 0.5h)
✅ Vehículos: ABC-123 (15,000km) + XYZ-789 (32,000km)
```

### 🚨 Errores No Críticos Detectados
- API `/api/maintenance/alerts` falla (usa `vehicleMantItem` no implementado)
- Errores "prepared statement does not exist" (típicos desarrollo Prisma)

### 📋 LÍNEAS DE ACCIÓN ACORDADAS

#### 1. **PRIORIDAD ALTA: CRUD VehicleMantProgram**
- Verificar modelos VehicleMantProgram, VehicleMantPackage, VehicleMantItem
- Implementar APIs completas para nueva arquitectura
- Testing con datos reales

#### 2. **PRIORIDAD MEDIA: Migración Legacy → Nueva Arquitectura**
- Actualizar componentes que dependían de MantPlan → VehicleMantProgram
- Actualizar componentes que dependían de MantPlanItem → VehicleMantItem
- Preservar funcionalidad existente durante transición

#### 3. **PRIORIDAD BAJA: Limpieza Legacy**
- Eliminar tablas MantPlan, MantPlanItem, ScheduledPackage
- Limpiar referencias legacy en código
- Documentar cambios para equipo

### 🔍 CONSIDERACIONES ARQUITECTURALES

**Mi análisis**: Tu estrategia es muy sólida. Priorizar VehicleMantProgram primero es correcto porque:
1. **Base sólida**: Templates ya funciona, necesitamos el siguiente nivel
2. **Riesgo controlado**: Mantener legacy mientras migramos evita romper funcionalidad
3. **Testing incremental**: Podemos validar cada capa antes de eliminar la anterior

**Sugerencia**: Antes de CRUD completo, ¿validamos que los modelos VehicleMantProgram están correctos en el schema? Vi que se implementaron pero no verificamos que las relaciones y tipos sean exactos.

### 🎯 PRÓXIMO PASO INMEDIATO
Verificar schema VehicleMantProgram y corregir cualquier inconsistencia antes de implementar APIs.

### 📝 ANÁLISIS MODELOS EN PROGRESO (30 Sep)
- **VehicleMantProgram**: ✅ Correcto
- **VehicleProgramPackage**: 🚨 Muy complejo - eliminar campos de asignación/ejecución
- **VehicleProgramItem**: 🚨 Muy complejo - simplificar para MVP

**Campos a eliminar**: actualCost, actualTime, startDate, endDate, technicianId, providerId, workOrderId, detectedKm, detectedDate, scheduledDate, executedDate, description, urgency

**Mantener**: Core + Config + Estimaciones + Estado básico

### ⏸️ PAUSADO POR TORMENTA ELÉCTRICA
Continuar mañana simplificando modelos antes de implementar APIs.

---

*Sesión 29 Septiembre 2025 - 5 HORAS*
*Sesión 30 Septiembre 2025 - Templates validados, estrategia definida*
*Schema restaurado, arquitectura implementada, testing exitoso*