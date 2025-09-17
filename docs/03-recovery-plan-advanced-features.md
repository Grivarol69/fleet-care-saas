# 🚀 Fleet Care SaaS - Plan de Recuperación de Funcionalidades Avanzadas

**Fecha:** 12 de Septiembre 2025  
**Estado:** 📋 Documentación y Planificación  
**Prioridad:** 🔥 CRÍTICA - Compromiso con cliente  

---

## 📸 **Análisis de Screenshots - Funcionalidades Comprometidas**

Basado en las 4 screenshots del cliente, estas son las funcionalidades EXACTAS que debemos recuperar/implementar:

### **🖼️ Screenshot #1 - Dashboard Principal (Modo Claro)**
**URL visible:** `hfdmaquinaria.localhost:3000/dashboard`

#### ✅ **Elementos UI Identificados:**
- **Header:** "HFD Maquinaria Pesada" - Sistema multitenant funcionando
- **Navegación:** Odómetro | Lista de Vehículos | Dashboard (tabs superiores)
- **Métricas principales:**
  - 🔴 **Críticas:** 4
  - 🟡 **Atención:** 2  
  - 🔵 **Total Alertas:** 6

#### 📊 **Tabla de Mantenimiento:**
```
Columnas: Imagen | Estado | Placa | Marca | Línea | Item Mantenimiento | KM Actuales | KM Ejecución | KM Restantes
Filas visibles:
- H2 🔴 HFD-202 JCB 3CX "Engrase tren rodaje" 1890 2602 712
- H2 🟡 HFD-203 Komatsu PC200 "Filtro aire pesado" 890 2345 1455  
- H2 🟡 HFD-203 Komatsu PC200 "Cambio aceite motor construcción" 890 4328 3438
- H2 🔴 HFD-201 Caterpillar 320 "Cambio aceite motor construcción" 1240 1486 246
- H2 🔴 HFD-202 JCB 3CX "Filtro combustible pesado" 1890 2044 154
```

#### 🏷️ **Alertas por Estado:**
- 🔴 **Crítico:** Mantenimiento urgente requerido
- 🟡 **Atención:** Próximo mantenimiento programado

#### 📋 **Widget DocumentStats:**
**Título:** "Documentos por Vencer"
**Métricas superiores:** 1 Críticos (1-7 días) | 1 Atención (8-15 días) | 1 Al día (16+ días)

**Tabla:**
```
Vehículo | Documento | Vencimiento | Estado
HFD-202 | Tecnomecánica | 14 sept 2025 | 🔴 Crítico
HFD-202 | Seguro | 14 oct 2025 | 🟡 Atención  
HFD-202 | SOAT | 14 nov 2025 | 🟢 Al día
```
**Footer:** "Total de documentos monitoreados: 3"

---

### **🖼️ Screenshot #2 - Estado de la Flota**
**Funcionalidades:**
- **Sidebar expandido** con jerarquía:
  ```
  Vehículos ▼
    - Listado Vehículos
    - Marcas
    - Líneas  
    - Tipos
    - Vehículos de la Empresa
    - Documentos Obligatorios
    - Odómetro
  ```

#### 📊 **Dashboard de Estado:**
- **Título:** "Estado de la Flota"
- **Resumen General:** Distribución por Estado
- **Gráfico de torta:**
  - 🟢 Operacional 50%
  - 🟡 En Mantenimiento 25%  
  - 🔴 Crítico 25%

#### 📈 **Métricas Clave:**
- **Por Tipo | Por Empresa**
- ✅ **Operacional:** 2 (50.0%)
- 🔧 **En Mantenimiento:** 1 (25.0%)  
- ⚠️ **Crítico:** 1 (25.0%)
- **📊 Total Vehículos:** 4

---

### **🖼️ Screenshot #3 - Dashboard Modo Oscuro**
**Funcionalidades UI Críticas:**
- ✅ **Dark mode completamente implementado**
- 🎨 **Esquema de colores oscuros consistente**
- 🌓 **Toggle modo oscuro** (visible en esquina superior derecha)
- 📊 **Mismos datos pero con tema dark**

**Detalles técnicos del modo oscuro:**
- Fondo principal: Dark gray/black
- Cards: Dark gray con bordes sutiles
- Texto: Blanco/gris claro
- Estados de color mantienen contraste (rojo, amarillo, verde)

---

### **🖼️ Screenshot #4 - Plantillas de Mantenimiento Detallado**
**URL:** `.../dashboard/maintenance/vehicle-template`

#### 🔧 **Funcionalidad Avanzada:**
**Título:** "Plantillas de Mantenimiento por Vehículo"
**Subtítulo:** "Asigna planes de mantenimiento a vehículos específicos de tu flota"

#### 📋 **Selector de Vehículo:**
- ☑️ **Vehículo Seleccionado:** HFD-202  
- **Descripción:** "JCB 3CX - Plan: Mantenimiento JCB 3CX - Retroexcavadora"
- **Botón:** "Limpiar Selección"

#### 📊 **Métricas de Estado:**
```
0 Críticos | 2 Preventivos | 1 En Progreso | 1 Completados | 1 Programados
```

#### 📋 **Tabla Items de Mantenimiento (3):**
**Columnas:** Vehículo | Item de Mantenimiento | KM Programado | KM Actual | KM Restantes | Estado | Fecha Estimada | Acciones

**Datos:**
```
HFD-202 | 🔧 Engrase tren rodaje (Preventivo) | 2,602 km | 1,890 km | 712 km | Pendiente | 23 de sept de 2025 | 👁️ ✏️ ⚙️
HFD-202 | 🔧 Filtro combustible pesado (Preventivo) | 2,044 km | 1,890 km | 154 km | En Progreso | 12 de sept de 2025 | 👁️ ✏️
HFD-202 | ⚙️ Revisión mangueras hidráulicas (Predictivo) | 2,185 km | 1,890 km | 295 km | Completado | 14 de sept de 2025 | 👁️ ✏️
```

#### 🎯 **Funcionalidades de Búsqueda:**
- **Filtro:** "Buscar por vehículo o ítem..." 
- **Dropdown:** "Todos" (presumiblemente filtros por estado)

---

## 🎯 **FUNCIONALIDADES CRÍTICAS A IMPLEMENTAR**

### **1. 🌐 Sistema Multitenant con Subdomain**
- **Objetivo:** `hfdmaquinaria.localhost:3000` funcionando
- **Status actual:** ❌ Deshabilitado
- **Archivos clave:** `middleware.ts`, `next.config.ts`

### **2. 📊 MaintenanceStats API Real**
- **Objetivo:** Tabla dinámica conectada a base de datos
- **Status actual:** ❌ Datos hardcodeados
- **API necesaria:** `/api/maintenance/alerts`

### **3. 📋 DocumentStats API Real**  
- **Objetivo:** Widget de documentos con datos reales
- **Status actual:** ❌ Datos hardcodeados
- **API necesaria:** `/api/vehicles/documents/expiring`

### **4. 🌓 Dark Mode Completo**
- **Objetivo:** Toggle funcional + persistencia + estilos
- **Status actual:** ❌ Solo configuración base
- **Archivos:** Theme provider + CSS variables

### **5. 📈 Odómetro con API**
- **Objetivo:** Componente funcional para registro KM
- **Status actual:** ❌ No implementado
- **API necesaria:** `/api/vehicles/[id]/odometer`

### **6. 🔧 Sistema Plantillas Avanzado**
- **Objetivo:** Asignación vehículo → template con estados
- **Status actual:** ❌ CRUD básico solamente
- **Mejoras:** Estados, filtros, búsqueda, métricas

### **7. 📊 Dashboard Estado de Flota**
- **Objetivo:** Gráfico torta + métricas por estado
- **Status actual:** ❌ No implementado  
- **Componente:** FleetStateStats con Chart.js/Recharts

---

## 🗄️ **ESQUEMAS DE BASE DE DATOS REQUERIDOS**

### **Alertas de Mantenimiento (para MaintenanceStats)**
```sql
-- Ya existe VehicleMantPlanItem, necesita:
- Estados calculados basados en kilometraje
- Join con Vehicle, Brand, Line, MantItem
- Lógica de alertas críticas vs atención
```

### **Alertas de Documentos (para DocumentStats)**  
```sql
-- Tabla: VehicleDocument (probablemente falta)
CREATE TABLE vehicle_documents (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id),
  document_type VARCHAR(50), -- 'SOAT', 'TECNOMECANICA', 'SEGURO'
  expiry_date DATE,
  status VARCHAR(20), -- 'ACTIVE', 'EXPIRED', 'EXPIRING'
  file_url VARCHAR(255)
);
```

### **Odómetro (para tracking KM)**
```sql  
-- Tabla: OdometerReading
CREATE TABLE odometer_readings (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id),
  reading_km INTEGER,
  recorded_date TIMESTAMP,
  recorded_by VARCHAR(255),
  notes TEXT
);
```

---

## 🎨 **ESPECIFICACIONES UI/UX EXACTAS**

### **🎯 Colores y Estados:**
- 🔴 **Crítico:** `bg-red-100 text-red-800` / Dark: `bg-red-900 text-red-100`
- 🟡 **Atención:** `bg-yellow-100 text-yellow-800` / Dark: `bg-yellow-900 text-yellow-100`  
- 🟢 **Al día:** `bg-green-100 text-green-800` / Dark: `bg-green-900 text-green-100`
- 🔵 **Info:** `bg-blue-100 text-blue-800` / Dark: `bg-blue-900 text-blue-100`

### **📊 Métricas Cards:**
```tsx
// Ejemplo estructura
<Card className="p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-2xl font-bold text-red-600">4</p>
      <p className="text-sm text-gray-600">Críticas</p>
    </div>
    <AlertCircle className="h-8 w-8 text-red-600" />
  </div>
</Card>
```

### **📋 Tabla Responsive:**
- Headers sticky en scroll
- Estados con badges colored
- Acciones con iconos (👁️ ✏️ ⚙️)
- Paginación si >10 items
- Loading skeletons

### **🌓 Dark Mode Toggle:**
- Posición: Header superior derecho
- Icono: Sol/Luna
- Transición suave
- Persistencia en localStorage

---

## 🛤️ **ROADMAP DE IMPLEMENTACIÓN**

### **📅 FASE 1: Fundaciones (Días 1-2)**
1. ✅ Crear branch de recuperación desde `42250a3`
2. 🌐 Rehabilitar multitenant subdomain
3. 🔧 Configurar variables de entorno
4. 🗄️ Verificar/actualizar esquemas de base de datos

### **📅 FASE 2: APIs Core (Días 3-4)**  
1. 📊 `/api/maintenance/alerts` para MaintenanceStats
2. 📋 `/api/vehicles/documents/expiring` para DocumentStats  
3. 📈 `/api/vehicles/[id]/odometer` para Odómetro
4. 📊 `/api/dashboard/fleet-state` para métricas

### **📅 FASE 3: Componentes UI (Días 5-6)**
1. 🎨 Dark mode completo con ThemeProvider
2. 📊 MaintenanceStats conectado a API real
3. 📋 DocumentStats conectado a API real  
4. 📈 Componente Odómetro funcional

### **📅 FASE 4: Features Avanzadas (Días 7-8)**
1. 📊 Dashboard Estado de Flota con gráficos
2. 🔧 Sistema plantillas con filtros/búsqueda
3. 📱 Responsive y pulido UI
4. 🧪 Testing integral

### **📅 FASE 5: Deploy y Validación (Día 9)**
1. 🚀 Deploy a staging
2. ✅ Validación con cliente
3. 🐛 Fixes finales
4. 📚 Documentación

---

## ⚠️ **RIESGOS Y CONSIDERACIONES**

### **🔍 Datos de Prueba:**
- Necesitamos seed robusto que genere datos realistas
- Vehículos: HFD-202, HFD-203, HFD-201 (como en screenshots)
- Fechas de vencimiento próximas para documentos
- Estados variados para testing completo

### **🎯 Consistency con Cliente:**
- ❗ **CRÍTICO:** Los datos/estilos deben coincidir EXACTAMENTE con screenshots
- 🎨 Colores, espaciado, tipografía deben ser idénticos
- 📊 Métricas deben tener misma lógica de cálculo
- 📱 Responsive debe funcionar perfecto

### **🔧 Performance:**
- Dashboard carga rápido (< 2 segundos)
- APIs optimizadas con índices DB
- Lazy loading para tablas grandes
- Caching estratégico

---

## 🎯 **CRITERIOS DE ACEPTACIÓN**

### **✅ Funcional:**
- [ ] Multitenant con subdomain funciona
- [ ] MaintenanceStats muestra datos reales  
- [ ] DocumentStats muestra datos reales
- [ ] Dark mode toggle funciona y persiste
- [ ] Odómetro permite registrar KM
- [ ] Dashboard flota muestra gráfico torta
- [ ] Plantillas tienen filtros y búsqueda

### **🎨 Visual:**  
- [ ] UI/UX idéntica a screenshots
- [ ] Responsive en mobile/tablet
- [ ] Animaciones suaves
- [ ] Estados de carga apropiados
- [ ] Error handling user-friendly

### **⚡ Técnico:**
- [ ] TypeScript strict sin errores
- [ ] APIs con validación Zod
- [ ] Tests unitarios críticos
- [ ] Performance Lighthouse >90
- [ ] SEO básico implementado

---

**🎯 OBJETIVO:** Entregar al cliente exactamente lo que vio en las screenshots, funcional al 100%.

**⏰ TIMELINE:** 9 días máximo

**👤 STAKEHOLDER:** Cliente ya vio las funcionalidades y las espera

---

*Documento creado: 12 Sep 2025 | Autor: Claude Code Assistant*
*Próxima actualización: Al completar cada fase*