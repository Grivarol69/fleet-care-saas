# Análisis de Base de Datos - Planes de Mantenimiento Fleet Care SaaS
**Fecha:** 2025-09-17  
**Sesión:** Análisis de datos de mantenimiento y alertas

## Objetivo
Buscar en la base de datos vehículos con planes de mantenimiento activos para identificar candidatos ideales para pruebas de alertas de mantenimiento.

## Hallazgos Principales

### Estructura de Base de Datos Analizada
- **Esquema:** `/prisma/schema.prisma` - 25 vehículos, 11 con planes activos
- **Datos de prueba:** Generados por `/prisma/seed.ts` con datos realistas
- **Relaciones clave:** Vehicle → VehicleMantPlan → VehicleMantPlanItem

### Vehículos Críticos Identificados

#### 1. **QRS-345 (Toyota Corolla 2023)** ⭐ RECOMENDADO
- **ID:** 19
- **Kilometraje actual:** 4,000 km
- **Próximo mantenimiento:** Lavado y Encerado a los 5,000 km
- **Para alertas:** Registrar 4,900 km (diferencia de 100 km = ALTO)

#### 2. **WXY-901 (Ford Focus 2021)** ⭐ CRÍTICO
- **ID:** 21
- **Kilometraje actual:** 29,000 km
- **Próximo mantenimiento:** Cambio de Aceite Motor a los 30,000 km
- **Para alertas:** Registrar 29,800 km (diferencia de 200 km = CRÍTICO)

#### 3. **ABC-123 (Toyota Hilux 2022)**
- **ID:** 1
- **Kilometraje actual:** 15,000 km
- **Próximo mantenimiento:** Rotación de Neumáticos a los 20,000 km
- **Para alertas:** Registrar 19,500 km (diferencia de 500 km = ALTO)

#### 4. **JKL-012 (Nissan Frontier 2020)**
- **ID:** 4
- **Kilometraje actual:** 45,000 km
- **Próximo mantenimiento:** Rotación de Neumáticos a los 48,000 km
- **Para alertas:** Registrar 47,500 km (diferencia de 500 km = ALTO)

## Estructura de Alertas
```sql
-- Niveles definidos en el sistema:
CRÍTICO: ≤ 500 km o vencido
ALTO: 501-1000 km
MEDIO: 1001-5000 km  
BAJO: > 5000 km
```

## Consultas Realizadas
1. **Vehículos con planes activos:** 11 de 25 vehículos
2. **Mantenimientos pendientes:** 76 items programados
3. **Mantenimientos críticos:** 3 elementos próximos a vencer

## Conversación Técnica Clave
- **Problema:** Necesidad de datos específicos para pruebas de alertas de mantenimiento
- **Solución:** Consultas complejas con joins múltiples (Vehicle → VehicleMantPlan → VehicleMantPlanItem → MantItem)
- **Scripts temporales:** Creados para análisis específico, luego eliminados
- **Prisma Studio:** Utilizado como herramienta de soporte (puerto 5555)

## Archivos Analizados
- `/prisma/schema.prisma` - Estructura completa de la BD
- `/prisma/seed.ts` - 1,221 líneas de datos de prueba realistas
- `/seed.log` - Confirmación de 25 vehículos creados exitosamente

## Recomendación Final
Usar **QRS-345** o **WXY-901** para pruebas de alertas críticas, ya que tienen mantenimientos muy próximos que permiten validar el sistema de alertas en escenarios realistas.