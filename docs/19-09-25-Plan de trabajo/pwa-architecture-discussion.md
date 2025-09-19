# Sesión 18 Septiembre 2025 - Arquitectura PWA y Definición Multi-Tenant

## Contexto del Proyecto
Fleet Care SaaS - Continuación del desarrollo post-implementación sistema odómetro.

## Objetivo de la Sesión
Definir arquitectura PWA para conductores y estructura multi-tenant para el primer cliente.

## Discusión Técnica Arquitectónica - PWA para Conductores

### Decisiones Tomadas
1. **PWA dentro del mismo proyecto** - NO schema separado
2. **Estructura template-based** para checklists (Template → ChecklistItems)
3. **Conectividad offline** con sincronización posterior
4. **Validación por supervisor** para mantenimiento correctivo
5. **Frecuencia configurable** por tenant/industria

### Arquitectura de Checklists - Template Pattern
```prisma
ChecklistTemplate
├── ChecklistItemTemplate (items del template)
├── VehicleChecklist (instancias completadas)
└── ChecklistItemResponse (respuestas por item)
```

**Ventajas**:
- Configurabilidad total por tenant
- Escalabilidad para diferentes industrias
- Mantenimiento centralizado de templates

### Sistema de Presets por Industria - DECISIÓN CLAVE
**Insight importante**: Auto-configuración inteligente basada en onboarding wizard.

**Industrias identificadas**:
- LOGISTICS (camiones larga distancia)
- CONSTRUCTION (volquetas)
- PASSENGER_TRANSPORT (buses medianos/chicos)
- RENTAL (camionetas alquiler)

## Caso de Uso Real - Primer Cliente

### Estructura Multi-Empresa (4 empresas bajo un cliente):

1. **Empresa Volquetas**
   - Tipo: CONSTRUCTION
   - Vehículos: Volquetas de construcción
   - Inspección: EVERY_USE (alta exigencia)
   - Mantenimiento: Por horas motor

2. **Empresa Transporte Pasajeros**
   - Tipo: PASSENGER_TRANSPORT  
   - Vehículos: Buses 24+1 y 16+1 pax
   - Inspección: DAILY (regulaciones estrictas)
   - Mantenimiento: Por km + inspecciones regulatorias

3. **Empresa Carga Larga Distancia**
   - Tipo: LOGISTICS
   - Vehículos: Camiones de carga
   - Inspección: PRE_TRIP/POST_TRIP
   - Mantenimiento: Por km + tiempo

4. **Empresa Alquiler Camionetas**
   - Tipo: RENTAL
   - Vehículos: Camionetas
   - Inspección: Cada alquiler + semanal
   - Mantenimiento: Por km + uso intensivo

### Implicaciones Técnicas Multi-Tenant

**Cada empresa necesita**:
- Templates de checklist específicos
- Perfiles de mantenimiento diferenciados
- Configuraciones de alerta personalizadas
- Tipos de vehículo particulares
- Frecuencias de inspección según regulaciones

## Arquitectura Multi-Tenant - Subdomain-based

### Decisión Técnica: Subdominios
- **Estructura**: `{tenant}.localhost:3000` para desarrollo
- **Ventajas**: Aislamiento visual, branding, URLs semánticas
- **Implementación**: Middleware Next.js para subdomain detection
- **Producción**: Wildcard domains en Vercel (requiere plan Pro+)

### Mapeo Cliente Real
```
forescar.localhost:3000      → Landing/Auth principal
volquetas.localhost:3000     → Empresa construcción (volquetas)
transporte.localhost:3000    → Transporte pasajeros (buses)
logistica.localhost:3000     → Carga larga distancia (camiones)
alquiler.localhost:3000      → Alquiler camionetas
admin.localhost:3000         → Super-admin multi-tenant
```

## Próximos Pasos Identificados

### Para Mañana - Feature Multi-Tenant
1. **Crear branch feature/multi-tenant** para desarrollo aislado
2. **Implementar middleware** subdomain detection
3. **4 presets automáticos** basados en cliente real
4. **Sistema de onboarding** con wizard inteligente
5. **Auto-generación** configuraciones por industria

### Validaciones Pendientes con Cliente Real
- **Investigar estándares** reales por industria (ver preguntas abajo)
- **Definir estructura permisos** granular entre empresas
- **Evaluar límites y cuotas** por tenant
- **Validar frecuencias** de inspección por tipo de operación

## Preguntas para Investigación en las 4 Empresas

### 1. Empresa Volquetas (CONSTRUCTION)
**Operación y Uso**:
- ¿Cuántas horas promedio trabaja cada volqueta por día?
- ¿Trabajan 24/7 o solo horario diurno?
- ¿Qué distancias recorren típicamente? ¿Solo obra o también traslados largos?
- ¿Cuántos conductores diferentes usan cada volqueta?

**Inspecciones Actuales**:
- ¿Hacen algún tipo de inspección antes de usar la volqueta?
- ¿Qué elementos revisan? (hidráulico, volcado, neumáticos, etc.)
- ¿Quién es responsable si se daña durante el trabajo?
- ¿Han tenido accidentes por falta de mantenimiento?

**Mantenimiento**:
- ¿Cada cuánto hacen mantenimiento? ¿Por horas o por tiempo?
- ¿Qué tipo de mantenimientos son más frecuentes?
- ¿Tienen talleres propios o tercerizan?
- ¿Llevan registro de costos de mantenimiento por vehículo?

### 2. Empresa Transporte Pasajeros (PASSENGER_TRANSPORT)
**Regulaciones y Compliance**:
- ¿Qué inspecciones exige el gobierno para transporte de pasajeros?
- ¿Cada cuánto deben hacer revisión técnica vehicular?
- ¿Tienen que reportar kilómetros a alguna entidad?
- ¿Hay multas por no cumplir inspecciones?

**Operación Diaria**:
- ¿Cuántos turnos hacen los buses? (mañana, tarde, noche)
- ¿Quién revisa el bus antes de cada turno?
- ¿Qué pasa si un conductor detecta un problema durante el recorrido?
- ¿Tienen buses de respaldo para emergencias?

**Mantenimiento Crítico**:
- ¿Qué elementos son más críticos para pasajeros? (frenos, puertas, etc.)
- ¿Han tenido problemas graves con pasajeros por fallas mecánicas?
- ¿Cada cuánto revisan frenos específicamente?

### 3. Empresa Carga Larga Distancia (LOGISTICS)
**Operación y Rutas**:
- ¿Qué distancias típicas recorren? ¿Viajes de cuántos días?
- ¿Los conductores duermen en ruta o regresan el mismo día?
- ¿Qué revisan antes de un viaje largo?
- ¿Qué pasa si se daña el camión en carretera? ¿Tienen cobertura?

**Documentación y Compliance**:
- ¿Qué documentos debe llevar cada conductor?
- ¿Hay controles de peso y documentación en ruta?
- ¿Registran kilómetros de cada viaje?
- ¿Tienen seguimiento GPS de los camiones?

**Mantenimiento Preventivo**:
- ¿Cada cuántos km hacen mantenimiento?
- ¿Qué fallas son más comunes en larga distancia?
- ¿Tienen talleres en diferentes ciudades?

### 4. Empresa Alquiler Camionetas (RENTAL)
**Modelo de Negocio**:
- ¿Alquilan por días, semanas, meses?
- ¿Qué revisan cuando devuelven el vehículo?
- ¿Quién es responsable de daños durante el alquiler?
- ¿Cada cuánto rotan los vehículos?

**Control de Estado**:
- ¿Cómo documentan el estado del vehículo al entregarlo?
- ¿Qué problemas son más frecuentes? (rayones, golpes, mecánicos)
- ¿Tienen fotos/videos del estado inicial?
- ¿Hacen limpieza profunda entre alquileres?

**Mantenimiento Intensivo**:
- ¿Cada cuánto hacen mantenimiento considerando el uso intensivo?
- ¿Qué elementos se gastan más rápido por el uso rotativo?
- ¿A partir de qué kilometraje/tiempo retiran un vehículo?

### Preguntas Transversales para Todas
**Tecnología Actual**:
- ¿Usan algún sistema para registrar mantenimientos?
- ¿Cómo llevan control de gastos por vehículo?
- ¿Los conductores reportan problemas? ¿Cómo?
- ¿Usan WhatsApp, Excel, papel, o algún sistema?

**Dolores y Necesidades**:
- ¿Cuál es el mayor problema que tienen con el mantenimiento?
- ¿Se les han pasado mantenimientos importantes?
- ¿Han tenido accidentes por falta de mantenimiento?
- ¿Qué les gustaría automatizar o simplificar?

**Presupuesto y ROI**:
- ¿Cuánto gastan mensualmente en mantenimiento?
- ¿Estarían dispuestos a pagar por un sistema que reduzca costos?
- ¿Qué beneficio valorarían más: reducir costos, evitar accidentes, cumplir regulaciones?

## Conclusiones Técnicas

**Arquitectura sólida definida**: 
- Template-based approach VALIDADO
- Multi-tenant con subdominios
- PWA offline-first con sync
- Presets automáticos por industria

**Caso de uso real identificado**:
- 4 industrias diferentes bajo un cliente
- Necesidades específicas por vertical
- Oportunidad para validar architecture real

**Próximo hito**: Research con cliente + demostración funcional multi-tenant.

## Módulo Crítico Identificado: Control Financiero y Trazabilidad

### El Dolor Mayor: "¿Dónde se fue mi dinero?"

**Insight clave**: El control financiero granular es la diferenciación más importante vs competencia.

### KPIs Financieros Críticos
1. **Costo por vehículo en período**: "¿Cuánto gasté en el camión X entre enero-marzo?"
2. **Historial de repuestos**: "Todas las veces que compré filtros de aire, precios, proveedores"
3. **Trazabilidad de autorizaciones**: "Quién autorizó el gasto de $500 en frenos del bus Y"
4. **Auditoría completa**: Historial total de mantenimiento por vehículo
5. **Detección de irregularidades**: Patrones anómalos en gastos/proveedores

### Arquitectura Propuesta - Financial Tracking

```prisma
model WorkOrder {
  id                 String @id @default(cuid())
  vehicleId          String
  requestedBy        String // User ID solicitante
  authorizedBy       String? // User ID autorizador
  
  status             WorkOrderStatus
  priority           Priority
  estimatedCost      Decimal?
  actualCost         Decimal?
  
  // Trazabilidad financiera
  costCenter         String? // Centro de costos
  budgetCode         String? // Código presupuestario
  
  items              WorkOrderItem[]
  expenses           WorkOrderExpense[]
  approvals          WorkOrderApproval[]
}

model WorkOrderItem {
  id            String @id @default(cuid())
  workOrderId   String
  
  // Detalles del item
  description   String
  partNumber    String?
  brand         String?
  supplier      String
  
  // Costos
  unitPrice     Decimal
  quantity      Int
  totalCost     Decimal
  
  // Trazabilidad
  purchasedBy   String // User ID
  invoiceNumber String?
  receiptUrl    String?
  
  workOrder WorkOrder @relation(fields: [workOrderId], references: [id])
}

model WorkOrderApproval {
  id            String @id @default(cuid())
  workOrderId   String
  approverLevel Int // 1=supervisor, 2=manager, 3=admin
  
  approvedBy    String // User ID
  approvedAt    DateTime
  amount        Decimal
  notes         String?
  
  workOrder WorkOrder @relation(fields: [workOrderId], references: [id])
}

model ExpenseAuditLog {
  id              String @id @default(cuid())
  workOrderId     String
  action          AuditAction // CREATED, APPROVED, MODIFIED, PAID
  
  previousValue   Json?
  newValue        Json
  
  performedBy     String // User ID
  performedAt     DateTime @default(now())
  ipAddress       String?
  
  workOrder WorkOrder @relation(fields: [workOrderId], references: [id])
}
```

### Reportes Anti-Fraude y Auditoría

**1. Detección de Irregularidades**:
- Proveedores nuevos con gastos altos
- Patrones de compra anómalos por empleado
- Diferencias entre presupuesto estimado vs real
- Gastos fuera de horario laboral

**2. Auditoría Completa**:
- Trail completo: Solicitud → Aprobación → Compra → Pago
- Documentos escaneados adjuntos
- Firmas digitales de autorizaciones
- Historial de modificaciones

**3. KPIs Ejecutivos**:
```sql
-- Costo total por vehículo en período
SELECT vehicleId, SUM(actualCost) 
FROM WorkOrder 
WHERE createdAt BETWEEN '2024-01-01' AND '2024-03-31'
GROUP BY vehicleId;

-- Historial de repuesto específico
SELECT wo.*, woi.* 
FROM WorkOrderItem woi
JOIN WorkOrder wo ON woi.workOrderId = wo.id
WHERE woi.description LIKE '%filtro aire%'
ORDER BY wo.createdAt DESC;

-- Top 10 gastos por empleado
SELECT authorizedBy, SUM(actualCost) as total
FROM WorkOrder
GROUP BY authorizedBy
ORDER BY total DESC
LIMIT 10;
```

### Diferenciación Competitiva BRUTAL

**Otros sistemas**: "Aquí están tus mantenimientos"
**Fleet Care**: "Aquí está cada centavo que gastaste, quién lo autorizó, y por qué"

**Valor para el empresario**:
- ✅ Control total anti-fraude
- ✅ Auditorías automáticas
- ✅ Optimización de proveedores
- ✅ Presupuestos realistas basados en histórico
- ✅ Detección temprana de sobrecostos

**Esta feature = GAME CHANGER total** 🚀

## Visión Estratégica y Modelo de Negocio

### Filosofía del Producto
**"SaaS puro + IA-First + Zero Technical Debt"**

### Estructura Empresarial Innovadora
- **Equipo**: 1 persona + agentes IA especializados
- **Modelo operativo**: Ingresos pasivos permiten enfoque en calidad sobre velocidad
- **Sin presiones financieras**: Tiempo para hacer las cosas correctamente
- **Ventaja competitiva**: Costos operativos mínimos = precios disruptivos

### Límites y Escalabilidad Inteligente
- **Máximo 100 vehículos por empresa**: Mantiene complejidad manejable
- **Foco en calidad**: No en volumen masivo
- **Prevención de scope creep**: Mantenerse como SaaS, NO ERP
- **Anticipación de fallas**: Diseño defensivo desde día 1

### Diferenciación Tecnológica
1. **IA-First Architecture**:
   - Chatbot integrado para soporte/consultas
   - Automatización con n8n
   - Detección automática de patrones/fraude
   - Predictive maintenance con ML

2. **SaaS Moderno vs Legacy ERP**:
   - Interface moderna y responsive
   - PWA para conductores
   - Real-time sync y offline capability
   - Multi-tenant con subdominios

3. **Características Disruptivas**:
   - Control financiero granular (anti-fraude)
   - Presets automáticos por industria
   - Onboarding inteligente (5 minutos setup)
   - Integración total IA + automatización

### Ventajas Competitivas Insuperables

**1. Costo Operativo Ultra-Bajo**:
```
Competencia tradicional:
- Equipo 10-50 personas
- Oficinas + infraestructura
- Gastos operativos altos
- Precios: $50-200/vehículo/mes

Fleet Care:
- Equipo: 1 + IA agents
- Sin oficinas ni empleados
- Costos mínimos
- Precios posibles: $10-30/vehículo/mes
```

**2. Calidad Sin Compromisos**:
- Tiempo para perfeccionar cada feature
- Zero technical debt desde el inicio
- Arquitectura sólida y escalable
- Testing exhaustivo pre-producción

**3. Agilidad Total**:
- Decisiones instantáneas (no comités)
- Pivoting rápido según feedback
- Features nuevas sin burocracia interna
- Soporte directo del fundador

### Estrategia de Comercialización (para discusión futura)

**Hipótesis inicial**:
- **Pricing disruptivo**: 60-80% menor que competencia
- **Value proposition**: "Misma funcionalidad, fracción del costo"
- **Target inicial**: Empresas 10-50 vehículos (sweet spot)
- **Demo killer**: Control financiero + detección fraude

### Riesgos Identificados y Mitigación

**1. Escalabilidad del founder**:
- Solución: Automatización máxima con IA
- Agentes especializados para soporte/ventas

**2. Competencia con más recursos**:
- Solución: Agilidad + pricing + features únicas

**3. Expectativas ERP**:
- Solución: Educación de mercado + límites claros

## Conclusión: Positioning Único

**Fleet Care = "Tesla del software de gestión de flotas"**
- Disruptivo en precio
- Superior en tecnología  
- Enfocado en experiencia de usuario
- Fundador-founder fit perfecto

**Próximas decisiones críticas**:
1. Pricing strategy específica
2. Go-to-market plan
3. Customer acquisition channels
4. Partnership con instaladores/talleres

## Funcionalidades Adicionales de Mantenimiento - Scope Final

### Módulos Pendientes de Definir
1. **Control de Combustible**
   - Registro de cargas
   - Eficiencia por vehículo/conductor
   - Detección de anomalías de consumo

2. **Geolocalización Básica** (solo mantenimiento)
   - Ubicación durante servicios de mantenimiento
   - Talleres cercanos
   - NO tracking de rutas (eso es fleet management)

3. **Control de Neumáticos/Ruedas**
   - Rotación programada
   - Presión y desgaste
   - Historial de cambios

### Límite de Scope Importante
**Fleet Care = SOLO mantenimiento vehicular**
- ✅ Mantenimiento preventivo/correctivo
- ✅ Control financiero de reparaciones
- ✅ Inspecciones y checklists
- ❌ **NO** tracking de rutas
- ❌ **NO** management de conductores
- ❌ **NO** logística de entregas

**Próximo SaaS = Fleet Operations**
- Rutas optimizadas
- Tracking en tiempo real
- Management de entregas
- Integración con Fleet Care

### Timeline MVP Final
**Mes 1**: Multi-tenant + Core mantenimiento + Control financiero
**Mes 2**: PWA + Combustible + Neumáticos + Polish
**Post-MVP**: Geolocalización básica si hay demanda

---

## IMPLEMENTACIÓN MULTI-TENANT - SESIÓN ACTUAL (18 Sept Tarde)

### Arquitectura Rediseñada - Sistema de Paquetes Modulares

**Cambio de Enfoque**: De "presets por industria" a **"paquetes modulares combinables"**

### Sistema de Paquetes (Building Blocks)
```typescript
const MAINTENANCE_PACKAGES = {
  "engine_combustion": {
    name: "Motor Combustión",
    items: [
      { name: "Cambio Aceite Motor", interval: 5000, type: "KM_BASED" },
      { name: "Filtro Aceite", interval: 5000, type: "KM_BASED" },
      // ...
    ]
  },
  "hydraulic_systems": {
    name: "Sistemas Hidráulicos", 
    items: [
      { name: "Aceite Hidráulico", interval: 1000, type: "HOUR_BASED" },
      // ...
    ]
  }
}
```

### Insight Clave: Template vs Instancia
- **Paquete**: Template/molde reutilizable
- **Plan**: Aplicación del template a un vehículo específico  
- **WorkOrder**: Instancia real ejecutada

### Lógica "Reality-Aware" de Mantenimiento
**Problema Real**:
```
Plan ideal: 35,000km → 42,000km → 49,000km
Realidad: 35,000km → 48,500km (tarde) → 55,500km (desde real)
```

**Solución**: Sistema que se adapta al comportamiento humano real, no al ideal.

### Feature "Ranking de Cumplimiento" 
Sistema de scoring que expone públicamente el nivel de cumplimiento:
- **Excelente (95-100%)**: 🏆
- **Bueno (80-94%)**: 👍  
- **Regular (60-79%)**: ⚠️
- **Pobre (40-59%)**: 😬
- **Terrible (0-39%)**: 💀

**Valor**: Presión social constructiva + métricas objetivas para supervisores.

---

## IMPLEMENTACIÓN TÉCNICA COMPLETADA

### ✅ Schema Prisma Extendido
```prisma
model Tenant {
  // Campos originales...
  
  // NUEVOS campos multi-tenant
  industryPreset      String?  // 'construction', 'logistics', etc.
  businessType        String?  // Descripción libre
  industrySettings    Json?    // Configuraciones específicas
  checklistPresets    Json?    // Templates predefinidos  
  maintenancePresets  Json?    // Reglas de mantenimiento
  onboardingCompleted Boolean @default(false)
  onboardingStep      Int     @default(0)
  maxVehicles         Int     @default(100)
}

enum UserRole {
  SUPER_ADMIN  // Nosotros - acceso total
  ADMIN        // Admin del tenant
  MANAGER      // Manager del tenant  
  USER         // Usuario básico
  DRIVER       // Conductor PWA
}
```

### ✅ TenantProvider/Context Reactivado
- Context para acceso global al tenant
- Auto-detección desde subdomain  
- Manejo de onboarding y redirect automático
- Integration con Supabase auth

### ✅ Middleware Subdomain Detection
```typescript
// middleware.ts - Detecta subdomain y reescribe rutas
function getSubdomain(hostname: string, env?: string): string | null {
  // localhost: parts[0] si no es 'localhost'
  // producción: parts[0] si hay más de 2 partes
}
```

### ✅ Sistema de Presets Dinámicos
4 presets configurados para clientes reales:
- **construction** (Palmar): volquetas, inspección cada uso
- **passenger_transport** (Forescar): buses, inspección diaria
- **logistics** (HFD): carga pesada, pre-trip inspections  
- **rental** (Yevimaquinas): alquiler, inspección por devolución

### ✅ Páginas Tenant Básicas
- `/src/app/tenant/layout.tsx`: Layout con TenantProvider
- `/src/app/tenant/page.tsx`: Dashboard básico funcional
- Muestra información del tenant + debug info

### ✅ Database Migration Exitosa

**SOLUCIÓN DOCUMENTADA - Problema Prisma + Variables ENV**:

**Problema**: Error `P1001: Can't reach database server`
- Variables de entorno no se cargan automáticamente en contexto CLI
- `DATABASE_URL exists: NO` confirmó el problema

**Solución Efectiva**:
1. **Cambiar al directorio correcto**: 
   ```bash
   cd /home/grivarol69/Escritorio/Desarrollo\ Web/fleet-care-saas
   ```

2. **Sin prefijo de variables** (Prisma las carga automáticamente desde ese directorio):
   ```bash
   npx prisma migrate reset --force
   ```

**Lecciones Aprendidas**:
- ✅ **Directorio correcto es CRÍTICO** para que Prisma encuentre `.env`
- ✅ **NO usar `source .env &&`** - Prisma maneja las variables automáticamente
- ✅ **Verificar conexión** primero con comando simple antes de operaciones complejas

**Comandos que FUNCIONAN**:
```bash
# ✅ Correcto - desde directorio del proyecto
cd /ruta/al/proyecto
npx prisma migrate dev

# ❌ Incorrecto - desde otro directorio  
npx prisma migrate dev
```

### ✅ Build Success
- ✅ Compilación exitosa sin errores críticos
- ✅ Tipos TypeScript corregidos
- ✅ Linter warnings resueltos (anti "color rojo")

---

## PRÓXIMOS PASOS INMEDIATOS

### 1. Migración Pendiente
```bash
npx prisma migrate dev --name add-multi-tenant-fields
```

### 2. Configurar Tenants Reales para Testing
- Crear 4 tenants: palmar, forescar, hfd, yevimaquinas
- Con presets automáticos aplicados

### 3. Testing Subdomain Routing  
- Configurar hosts locales
- Validar routing funcional

### 4. Seed Actualizado
- Adaptar seed.ts para nueva estructura
- Incluir tenants de prueba

---

## STATUS ACTUAL: 🟢 LISTO PARA CONTINUAR

**Arquitectura sólida**: ✅ Schema + Context + Middleware + Páginas  
**Base de datos**: ✅ Limpia y sincronizada  
**Build**: ✅ Sin errores críticos  
**Documentación**: ✅ Problema y solución registrados  

**Siguiente acción**: Migración de campos multi-tenant y testing con tenants reales.