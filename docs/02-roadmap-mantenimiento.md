# 🚀 Fleet Care SaaS - Roadmap Sistema de Mantenimiento Completo

**Fecha:** Mañana - Día 2  
**Objetivo:** Completar el core del sistema de mantenimiento con asignación de templates y odómetro  
**Status:** 🔄 Pendiente de ejecución

---

## 📋 FASE 1: Análisis y Preparación (30 min)

### 1.1 Análisis de fleet-care madre
- [ ] **Revisar schema VehicleMantPlan** en fleet-care/prisma/schema.prisma
- [ ] **Analizar componentes** de asignación template → vehículo
- [ ] **Estudiar funcionalidad** de alertas por kilometraje
- [ ] **Documentar relaciones** entre Vehicle, MantPlan, y VehicleMantPlan

### 1.2 Verificar schema actual de fleet-care-saas
- [ ] **Confirmar** que tenemos Vehicle, MantPlan (template), PlanTask
- [ ] **Identificar** qué tablas faltan para completar el flujo
- [ ] **Planificar migraciones** necesarias

---

## 🗄️ FASE 2: Database Schema Extensions (45 min)

### 2.1 Crear modelo VehicleMantPlan
```prisma
model VehicleMantPlan {
  id                 Int      @id @default(autoincrement())
  tenantId           String
  vehicleId          Int
  mantPlanId         Int      // Template asignado
  assignedDate       DateTime @default(now())
  status             VehiclePlanStatus @default(ACTIVE)
  lastMaintenanceKm  Int?     // Último mantenimiento realizado
  nextMaintenanceKm  Int?     // Próximo mantenimiento programado
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  // Relaciones
  vehicle    Vehicle  @relation(fields: [vehicleId], references: [id])
  mantPlan   MantPlan @relation(fields: [mantPlanId], references: [id])
  
  @@unique([tenantId, vehicleId, mantPlanId])
  @@map("vehicle_mant_plan")
}

enum VehiclePlanStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}
```

### 2.2 Crear modelo Odometer
```prisma
model Odometer {
  id           Int      @id @default(autoincrement())
  tenantId     String
  vehicleId    Int
  currentKm    Int
  previousKm   Int?
  recordedDate DateTime @default(now())
  recordedBy   String?  // Usuario que registró
  notes        String?
  createdAt    DateTime @default(now())
  
  // Relaciones
  vehicle Vehicle @relation(fields: [vehicleId], references: [id])
  
  @@map("odometer")
}
```

### 2.3 Extender modelo Vehicle
```prisma
// Agregar al modelo Vehicle existente:
vehicleMantPlans VehicleMantPlan[]
odometerRecords  Odometer[]
currentKm        Int?              // Kilometraje actual
```

---

## 🔧 FASE 3: API Development (90 min)

### 3.1 APIs para VehicleMantPlan
- [ ] **GET /api/vehicles/[id]/mant-plans** - Obtener planes asignados
- [ ] **POST /api/vehicles/[id]/mant-plans** - Asignar template a vehículo
- [ ] **PUT /api/vehicles/[id]/mant-plans/[planId]** - Actualizar asignación
- [ ] **DELETE /api/vehicles/[id]/mant-plans/[planId]** - Remover asignación

### 3.2 APIs para Odometer
- [ ] **GET /api/vehicles/[id]/odometer** - Historial de kilometraje
- [ ] **POST /api/vehicles/[id]/odometer** - Registrar nuevo kilometraje
- [ ] **PUT /api/vehicles/[id]/odometer/[id]** - Actualizar registro
- [ ] **GET /api/maintenance/alerts** - Alertas por kilometraje

### 3.3 APIs extendidas
- [ ] **GET /api/vehicles/[id]/maintenance-status** - Estado completo mantenimiento
- [ ] **GET /api/dashboard/maintenance-overview** - Vista general del sistema

---

## 🎨 FASE 4: Frontend Components (120 min)

### 4.1 Componente AsignacionTemplates
```
📁 src/app/dashboard/vehicles/[id]/maintenance/
  📄 page.tsx                    // Página principal mantenimiento vehículo
  📁 components/
    📁 TemplateAssignment/
      📄 TemplateAssignment.tsx   // Lista templates asignados
      📄 FormAssignTemplate.tsx   // Modal para asignar nuevo
      📄 TemplateCard.tsx        // Card individual de template
```

### 4.2 Componente Odómetro
```
📁 src/app/dashboard/vehicles/[id]/odometer/
  📄 page.tsx                    // Página odómetro
  📁 components/
    📁 OdometerManager/
      📄 OdometerHistory.tsx     // Historial kilometraje
      📄 FormAddKm.tsx          // Registrar nuevo kilometraje
      📄 KmChart.tsx            // Gráfico evolución
```

### 4.3 Dashboard de Alertas
```
📁 src/app/dashboard/maintenance/alerts/
  📄 page.tsx                    // Dashboard alertas
  📁 components/
    📄 AlertsList.tsx           // Lista alertas activas
    📄 AlertCard.tsx            // Card individual alerta
    📄 AlertsFilters.tsx        // Filtros por tipo/urgencia
```

---

## 📊 FASE 5: Datos de Prueba Realistas (30 min)

### 5.1 Seed con Vehículos Reales
```typescript
// Ejemplos realistas para testing:

// Toyota Hilux 2020 - Transporte urbano
Vehicle: {
  patent: "ABC123",
  brand: "Toyota", 
  line: "Hilux",
  year: 2020,
  currentKm: 85000
}

// Ford Transit 2019 - Delivery
Vehicle: {
  patent: "DEF456", 
  brand: "Ford",
  line: "Transit", 
  year: 2019,
  currentKm: 120000
}

// Chevrolet Onix 2021 - Ejecutivo
Vehicle: {
  patent: "GHI789",
  brand: "Chevrolet", 
  line: "Onix",
  year: 2021, 
  currentKm: 45000
}
```

### 5.2 Templates por Tipo de Vehículo
```typescript
// Template Básico - Vehículos livianos
MantPlan: {
  name: "Plan Básico Urbano",
  vehicleBrand: "Toyota",
  vehicleLine: "Hilux", 
  planTasks: [
    { mantItem: "Cambio Aceite", triggerKm: 10000 },
    { mantItem: "Filtro Aire", triggerKm: 20000 },
    { mantItem: "Revisión General", triggerKm: 15000 }
  ]
}

// Template Pesado - Vehículos comerciales  
MantPlan: {
  name: "Plan Comercial Intensivo", 
  vehicleBrand: "Ford",
  vehicleLine: "Transit",
  planTasks: [
    { mantItem: "Cambio Aceite", triggerKm: 8000 },
    { mantItem: "Revisión Frenos", triggerKm: 15000 },
    { mantItem: "Mantenimiento Transmisión", triggerKm: 25000 }
  ]
}
```

### 5.3 Asignaciones Template → Vehículo
```typescript
VehicleMantPlan: [
  {
    vehicle: "Toyota Hilux ABC123",
    mantPlan: "Plan Básico Urbano", 
    lastMaintenanceKm: 80000,
    nextMaintenanceKm: 90000,    // Próximo cambio aceite
    status: "ACTIVE"
  },
  {
    vehicle: "Ford Transit DEF456",
    mantPlan: "Plan Comercial Intensivo",
    lastMaintenanceKm: 112000, 
    nextMaintenanceKm: 120000,   // ALERTA: Ya pasó!
    status: "ACTIVE"
  }
]
```

---

## 🚨 FASE 6: Sistema de Alertas (45 min)

### 6.1 Lógica de Alertas
- [ ] **Alertas por Kilometraje:** Vehículo supera triggerKm
- [ ] **Alertas por Tiempo:** Mantenimiento vencido por fecha
- [ ] **Niveles de Urgencia:** Info, Warning, Critical
- [ ] **Notificaciones:** Dashboard badges, emails

### 6.2 Componente AlertCard
```typescript
interface Alert {
  id: string;
  vehiclePatent: string;
  vehicleBrand: string; 
  maintenanceType: string;
  currentKm: number;
  requiredKm: number;
  overdue: number;        // Km de atraso
  urgency: 'info' | 'warning' | 'critical';
  dueDate?: Date;
}
```

---

## 🧪 FASE 7: Testing & Validation (30 min)

### 7.1 Test Cases
- [ ] **Asignar template** a vehículo nuevo
- [ ] **Registrar kilometraje** y verificar alertas
- [ ] **Vehículo con múltiples templates** asignados
- [ ] **Alertas vencidas** (km superado)
- [ ] **Historial mantenimientos** por vehículo

### 7.2 User Acceptance Testing
- [ ] **Flujo completo:** Crear template → Asignar → Registrar km → Ver alerta
- [ ] **Performance:** Dashboard carga rápido con muchos vehículos
- [ ] **UX:** Interface intuitiva para operadores de flota

---

## 🎯 FASE 8: Integration & Deployment (30 min)

### 8.1 Integrar con Sistema Existente
- [ ] **Navbar:** Agregar link a "Alertas de Mantenimiento"
- [ ] **Dashboard principal:** Mostrar resumen alertas críticas
- [ ] **Perfil vehículo:** Tab de "Mantenimiento" con templates y alertas

### 8.2 Deployment
- [ ] **Run deployment-check.sh**
- [ ] **Verificar build local**
- [ ] **Push y deploy a Vercel**
- [ ] **Testing en producción**

---

## 🎊 RESULTADO ESPERADO AL FINAL DEL DÍA:

### ✅ Funcionalidades Completadas:
1. **Templates de Mantenimiento** ✓ (Ya listo)
2. **Asignación Template → Vehículo** 🆕
3. **Sistema de Odómetro** 🆕  
4. **Dashboard de Alertas** 🆕
5. **Datos realistas de prueba** 🆕

### 🚀 Flujo Completo Funcionando:
```
👤 Usuario crea template "Plan Toyota Hilux"
     ↓
🚚 Asigna template a vehículo específico  
     ↓
📊 Registra kilometraje actual (85,000km)
     ↓  
🚨 Sistema genera alerta: "Cambio aceite en 5,000km"
     ↓
📱 Dashboard muestra todas las alertas activas
```

---

## 📞 CONTINGENCIA:

Si alguna fase se atrasa:
- **Prioridad 1:** VehicleMantPlan (asignación template)
- **Prioridad 2:** Odometer (registro kilometraje) 
- **Prioridad 3:** Sistema alertas
- **Prioridad 4:** UI/UX polish

---

**🤖 Preparado por:** Claude Code Assistant  
**📅 Para ejecutar:** Mañana  
**⏱️ Tiempo estimado:** 6-7 horas  
**🎯 Outcome:** Sistema de mantenimiento completamente funcional