# Sesión 22 Octubre 2025 - Mejora Navbar para Presentación

**Fecha**: 22 Octubre 2025
**Branch**: `develop`
**Estado**: ✅ Navbar mejorado con botones accionables y estadísticas en tiempo real

---

## 🎯 Objetivo de la Sesión

Mejorar el navbar del dashboard para la presentación del software, reemplazando links estáticos por botones con iconos, badges informativos y acciones rápidas.

---

## 📋 Problema Inicial

El navbar tenía 3 links simples sin información contextual:
- "Odómetro"
- "Lista de Vehículos"
- "Dashboard"

**Limitaciones**:
- No mostraban información útil (contadores, alertas)
- No eran visualmente atractivos para presentación
- Faltaban acciones rápidas (crear OT, buscar vehículo)
- No había indicador de estado activo

---

## ✅ Cambios Implementados

### 1. Navbar Mejorado con Botones Accionables

**Archivo**: `src/components/layout/Navbar/Navbar.tsx`

**Nuevas características**:
```tsx
// Botones con iconos y badges
<Button variant="ghost" size="sm" className="gap-2">
  <Gauge className="h-4 w-4" />
  Registrar Km
</Button>

<Button variant="ghost" size="sm" className="gap-2">
  <Car className="h-4 w-4" />
  Flota
  <Badge variant="secondary">{totalVehicles}</Badge>
</Button>

<Button variant="ghost" size="sm" className="gap-2">
  <Bell className="h-4 w-4" />
  Alertas
  <Badge variant="destructive" className="animate-pulse">{criticalAlerts}</Badge>
</Button>

<Button variant="ghost" size="sm" className="gap-2">
  <Wrench className="h-4 w-4" />
  Órdenes
  <Badge variant="secondary">{openWorkOrders}</Badge>
</Button>
```

---

### 2. Tooltips Informativos

**Instalado**: `@radix-ui/react-tooltip` via shadcn

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button>...</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Ver lista completa de vehículos</p>
  </TooltipContent>
</Tooltip>
```

**Ventajas**:
- Ayuda contextual al hover
- Mejora UX para nuevos usuarios
- Información adicional sin ocupar espacio

---

### 3. Búsqueda Rápida de Vehículos

```tsx
<form onSubmit={handleSearch} className="relative">
  <Search className="absolute left-2.5 top-2.5 h-4 w-4" />
  <Input
    placeholder="Buscar vehículo..."
    className="pl-8 w-[200px] h-9"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
</form>
```

**Funcionalidad**:
- Búsqueda en tiempo real
- Redirige a `/dashboard/vehicles/fleet?search={query}`
- Input con icono de lupa

---

### 4. Indicador de Costos del Mes

```tsx
<Button variant="outline" size="sm" className="gap-2">
  <DollarSign className="h-4 w-4" />
  <span className="text-xs">Mes:</span>
  <span className="font-bold">${monthCosts}k</span>
</Button>
```

**Tooltip**: "Costos de mantenimiento del mes actual"

**Nota**: Actualmente muestra valor mock ($16.8k). Se actualizará con datos reales cuando se implemente el sistema de facturación (Invoice).

---

### 5. CTA: Nueva Orden de Trabajo

```tsx
<Button size="sm" className="gap-2">
  <Plus className="h-4 w-4" />
  Nueva Orden
</Button>
```

**Acción**: Redirige a `/dashboard/maintenance/work-orders?action=create`

---

### 6. Estado Activo Visual

```tsx
const isActive = (path: string) => pathname === path;

<Button
  variant={isActive('/dashboard/vehicles/fleet') ? 'default' : 'ghost'}
  size="sm"
  onClick={() => router.push('/dashboard/vehicles/fleet')}
>
  ...
</Button>
```

**Resultado**: El botón de la página actual se muestra resaltado

---

### 7. Navbar Responsive (Mobile)

```tsx
{/* Mobile simplified navbar */}
<div className="flex xl:hidden items-center justify-between w-full px-4 py-3 gap-2">
  <Button variant="ghost" size="sm">
    <Car className="h-4 w-4 mr-1" />
    <Badge variant="secondary">{totalVehicles}</Badge>
  </Button>

  <Button variant="ghost" size="sm">
    <AlertTriangle className="h-4 w-4 mr-1" />
    <Badge variant="destructive">{criticalAlerts}</Badge>
  </Button>

  <Button size="sm">
    <Plus className="h-4 w-4" />
  </Button>
</div>
```

**Optimización mobile**:
- Solo iconos + badges (sin texto)
- Prioriza alertas críticas y crear OT
- Espacio optimizado

---

## 🔌 API Endpoint: Estadísticas del Navbar

**Archivo**: `src/app/api/dashboard/navbar-stats/route.ts`

**Endpoint**: `GET /api/dashboard/navbar-stats`

**Response**:
```json
{
  "totalVehicles": 2,
  "criticalAlerts": 45,
  "openWorkOrders": 0,
  "monthCosts": "16.8"
}
```

**Queries**:
```typescript
// Total vehículos activos
const totalVehicles = await prisma.vehicle.count({
    where: { tenantId: TENANT_ID, status: "ACTIVE" }
});

// Alertas críticas (PENDING)
const criticalAlerts = await prisma.maintenanceAlert.count({
    where: { tenantId: TENANT_ID, status: "PENDING" }
});

// Órdenes abiertas (IN_PROGRESS)
const openWorkOrders = await prisma.workOrder.count({
    where: { tenantId: TENANT_ID, status: "IN_PROGRESS" }
});
```

**Auto-refresh**: Cada 30 segundos vía `setInterval`

---

## 🎨 Componentes UI Utilizados

**Instalados/Creados**:
- ✅ `Button` (ya existía)
- ✅ `Badge` (ya existía)
- ✅ `Input` (ya existía)
- ✅ `Separator` (ya existía)
- ✅ `Tooltip` (instalado con shadcn)

**Iconos de lucide-react**:
- `Gauge` - Odómetro
- `Car` - Flota
- `Bell` - Alertas
- `Wrench` - Órdenes de trabajo
- `Search` - Búsqueda
- `DollarSign` - Costos
- `Plus` - Crear
- `FileBarChart` - Dashboard
- `AlertTriangle` - Alertas críticas (mobile)

---

## 💡 Decisiones Técnicas

### 1. ¿Por qué cliente-side en lugar de server-side?

**Decisión**: `'use client'` con `useState` + `useEffect`

**Razones**:
- Navbar necesita interactividad (botones, búsqueda)
- Estadísticas actualizadas en tiempo real
- `usePathname()` para detectar ruta activa
- Menor carga en servidor (fetch cada 30s)

---

### 2. ¿Por qué badges con animación en alertas críticas?

```tsx
<Badge variant="destructive" className="animate-pulse">
  {criticalAlerts}
</Badge>
```

**Razón**: Llamar la atención del usuario sobre alertas urgentes durante la presentación.

---

### 3. ¿Por qué separators entre secciones?

```tsx
<Separator orientation="vertical" className="h-6 mx-1" />
```

**Razón**: Agrupar visualmente botones relacionados (navegación | búsqueda | acciones).

---

## 📊 Archivos Creados/Modificados

### Modificados:
```
✅ src/components/layout/Navbar/Navbar.tsx
```

### Creados:
```
✅ src/app/api/dashboard/navbar-stats/route.ts
✅ src/components/ui/tooltip.tsx (vía shadcn)
```

---

## 🎯 Funcionalidades Agregadas al Navbar

| Botón | Icono | Badge | Tooltip | Acción |
|-------|-------|-------|---------|--------|
| **Registrar Km** | Gauge | - | "Registrar lectura del odómetro" | → `/dashboard/vehicles/odometer` |
| **Flota** | Car | Total vehículos | "Ver lista completa de vehículos" | → `/dashboard/vehicles/fleet` |
| **Alertas** | Bell | Alertas críticas (pulse) | "Alertas de mantenimiento (¡Críticas!)" | → `/dashboard/maintenance/alerts` |
| **Órdenes** | Wrench | OT abiertas | "Órdenes de trabajo abiertas" | → `/dashboard/maintenance/work-orders` |
| **Dashboard** | FileBarChart | - | "Vista general y reportes" | → `/dashboard` |
| **Buscar** | Search | - | Input de búsqueda | → `/dashboard/vehicles/fleet?search={query}` |
| **Costos** | DollarSign | Valor del mes | "Costos de mantenimiento del mes actual" | - |
| **Nueva Orden** | Plus | - | "Crear nueva orden de trabajo" | → `/dashboard/maintenance/work-orders?action=create` |

---

## 🚀 Para la Presentación

**Ventajas visuales**:
1. ✅ **Información en tiempo real** - Badges con contadores actualizados
2. ✅ **Alertas visibles** - Badge rojo con animación pulse
3. ✅ **Acceso rápido** - Botones a funcionalidades clave
4. ✅ **Búsqueda instantánea** - Input de búsqueda de vehículos
5. ✅ **CTA destacado** - Botón "Nueva Orden" con color primario
6. ✅ **Estado visual** - Botón activo resaltado
7. ✅ **Responsive** - Mobile optimizado con iconos

---

## 📋 Pendientes (POST-MVP)

### Cuando se implemente Invoice:

**Actualizar cálculo de costos**:
```typescript
// Reemplazar mock por:
const monthCostsRaw = await prisma.invoice.aggregate({
    where: {
        tenantId: TENANT_ID,
        status: "APPROVED",
        createdAt: { gte: currentMonth }
    },
    _sum: { totalAmount: true }
});

const monthCosts = (monthCostsRaw._sum.totalAmount || 0) / 1000; // En miles
```

### Funcionalidades adicionales (opcional):

- [ ] Dropdown de vehículos (selector rápido en navbar)
- [ ] Notificaciones push con campana animada
- [ ] Filtros activos (badge con contador de filtros aplicados)
- [ ] Breadcrumbs para navegación profunda
- [ ] Quick actions menu (menú contextual)

---

## 🎯 Testing Manual

**Checklist para probar**:
1. ✅ Ver que badges muestren contadores reales
2. ✅ Verificar que alertas críticas tengan badge rojo con pulse
3. ✅ Click en cada botón navega a la ruta correcta
4. ✅ Botón activo se muestra resaltado
5. ✅ Hover en botones muestra tooltips
6. ✅ Búsqueda redirige con query string
7. ✅ Botón "Nueva Orden" navega con `?action=create`
8. ✅ Mobile muestra versión simplificada
9. ✅ Estadísticas se actualizan cada 30s

---

## 💎 Logros de la Sesión

1. ✅ **Navbar profesional** - Apto para presentación de software
2. ✅ **Información contextual** - Badges con estadísticas en tiempo real
3. ✅ **UX mejorada** - Tooltips, estados visuales, búsqueda rápida
4. ✅ **Acciones rápidas** - CTA "Nueva Orden" y búsqueda instantánea
5. ✅ **API eficiente** - Endpoint optimizado para estadísticas
6. ✅ **Responsive** - Mobile y desktop optimizados
7. ✅ **Animaciones** - Badge pulse en alertas críticas

---

---

## 📧 Deploy a Staging: Funcionalidad CV por Email

### Errores de Tipos y Soluciones

**Problema**: Build fallaba en Vercel por errores de TypeScript con `exactOptionalPropertyTypes: true`

#### Error 1: tenant.logo (null vs undefined)
```typescript
// ❌ Error: tipo 'string | null' no compatible con 'string | undefined'
<VehicleCV tenant={tenant} />

// ✅ Solución: spread operator pattern
<VehicleCV
  {...(tenant && {
    tenant: {
      name: tenant.name,
      ...(tenant.logo && { logo: tenant.logo })
    }
  })}
/>
```

#### Error 2: cylinder (string vs number)
```typescript
// ❌ Error: definición incorrecta del tipo (schema: Int)
interface Vehicle {
  cylinder?: string;
}

// ✅ Corrección: tipo según schema
interface Vehicle {
  cylinder?: number;  // Prisma schema: cylinder Int?
}
```

#### Error 3: DropdownMenuCheckboxItem checked prop
```typescript
// ❌ Error: checked puede ser undefined pero tipo no lo permite
<DropdownMenuPrimitive.CheckboxItem checked={checked} />

// ✅ Solución: spread operator condicional
<DropdownMenuPrimitive.CheckboxItem
  {...(checked !== undefined && { checked })}
/>
```

#### Error 4: Uso de 'any' prohibido por ESLint
```typescript
// ❌ Error: @typescript-eslint/no-explicit-any
vehicle={vehicle as any}

// ✅ Solución: crear tipo específico VehicleCVData
type VehicleCVData = {
  licensePlate: string;
  year: number;           // Obligatorio
  color: string;          // Obligatorio
  mileage: number;        // Obligatorio
  brand?: { name: string };
  cylinder?: number;
  // ... campos opcionales
}

vehicle={vehicle as VehicleCVData}
```

#### Error 5: Mapeo de documents con null values
```typescript
// ❌ Error: documentNumber puede ser 'string | null' pero se espera 'string | undefined'
documents={documents}

// ✅ Solución: mapear con spread operator
documents={documents.map(doc => ({
  type: doc.type,
  ...(doc.documentNumber && { documentNumber: doc.documentNumber }),
  ...(doc.expiryDate && { expiryDate: doc.expiryDate }),
  ...(doc.entity && { entity: doc.entity })
}))}
```

#### Error 6: FleetVehicle con campos null
```typescript
// ❌ Error: campos como cylinder, bodyWork son 'type | null' en DB
vehicle={{
  cylinder: viewingVehicleCV.cylinder,  // puede ser null
  year: viewingVehicleCV.year           // puede ser null
}}

// ✅ Solución: valores por defecto + spread operator
vehicle={{
  licensePlate: viewingVehicleCV.licensePlate,
  year: viewingVehicleCV.year ?? 0,      // default para obligatorios
  color: viewingVehicleCV.color ?? "",
  mileage: viewingVehicleCV.mileage,
  ...(viewingVehicleCV.cylinder && { cylinder: viewingVehicleCV.cylinder }),
  ...(viewingVehicleCV.bodyWork && { bodyWork: viewingVehicleCV.bodyWork }),
  // ... resto de campos opcionales con spread
}}
```

---

### Patrón Spread Operator (Clave para exactOptionalPropertyTypes)

**Concepto**: Con `exactOptionalPropertyTypes: true`, TypeScript NO permite:
```typescript
// ❌ PROHIBIDO
{ key: value ?? undefined }  // undefined explícito no está permitido
{ key: null }                // null no es compatible con undefined
```

**Solución**: Solo incluir la propiedad si existe
```typescript
// ✅ CORRECTO
...(value && { key: value })  // Solo agrega la propiedad si value es truthy
```

**Ejemplo real del proyecto**:
```typescript
// route.tsx - Construir vehicleData para PDF
const vehicleData = {
  licensePlate: vehicle.licensePlate,  // Siempre incluido
  year: vehicle.year,                   // Siempre incluido
  color: vehicle.color,                 // Siempre incluido
  ...(vehicle.brand && { brand: { name: vehicle.brand.name } }),
  ...(vehicle.cylinder && { cylinder: vehicle.cylinder }),
  ...(vehicle.photo && { photo: vehicle.photo }),
  // Solo incluye propiedades que existen y no son null
};
```

---

### Archivos Modificados (Deploy Fix)

```
✅ src/app/dashboard/vehicles/fleet/components/VehicleCV/VehicleCVViewer.tsx
   - Agregar tipo VehicleCVData
   - Aplicar spread operator para tenant.logo
   - Mapear documents eliminando nulls
   - Cambiar cylinder: string → number

✅ src/app/dashboard/vehicles/fleet/components/FleetVehiclesList/FleetVehiclesList.tsx
   - Construir objeto vehicle explícito para VehicleCVViewer
   - Aplicar defaults para year, color (campos obligatorios)
   - Aplicar spread operator para campos opcionales

✅ src/components/ui/dropdown-menu.tsx
   - Aplicar spread operator condicional para checked prop
```

---

### Build Exitoso

**Comando**: `pnpm run build`

**Resultado**: ✅ Compilación exitosa
- Solo warnings preexistentes (sin errores)
- Type-check aprobado
- Deploy a staging exitoso

**Commits**:
```bash
327cb5d - fix: solucionar errores de tipos en VehicleCVViewer y dropdown-menu
453e6ed - Merge develop → staging
```

---

### Testing en Staging

**Funcionalidad probada**:
1. ✅ Ver CV de vehículo (modal con PDFViewer)
2. ✅ Descargar CV como PDF
3. ✅ Enviar CV por email con documentos adjuntos
4. ✅ Email recibido con 4 archivos:
   - CV_PLACA_fecha.pdf
   - SOAT_PLACA.pdf
   - Tecnomecanica_PLACA.pdf
   - Poliza_PLACA.pdf

**Configuración Resend**:
```env
RESEND_API_KEY=re_HucvUFm1_K7XUpbE6YSaofLF8oN8jb1qk
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## 💡 Conversaciones Técnicas Clave

### 1. API Routes pueden ser .tsx cuando usan JSX

**Pregunta**: "¿Tiene sentido renombrar route.ts a route.tsx si es una API?"

**Respuesta**: Sí, es correcto. Next.js permite API routes en `.tsx` cuando:
- Generan JSX (PDFs con @react-pdf/renderer)
- Renderizan emails (React Email)
- Necesitan componentes React server-side

**Ejemplo**: `src/app/api/vehicles/send-cv/route.tsx`
```tsx
const pdfBuffer = await renderToBuffer(
  <VehicleCV vehicle={vehicleData} />  // JSX en API route
);
```

### 2. Política "0 Deuda Técnica"

**Enfoque**: No shortcuts, resolver problemas correctamente desde el inicio

**Aplicación en esta sesión**:
- ❌ Rechazamos `as any` (prohibido por ESLint)
- ✅ Creamos tipo específico `VehicleCVData`
- ❌ Rechazamos `key: value ?? undefined`
- ✅ Usamos spread operator pattern
- ❌ Rechazamos ignorar warnings de tipos
- ✅ Corregimos tipos según schema (cylinder: number)

**Resultado**: Build limpio, types seguros, código mantenible

### 3. exactOptionalPropertyTypes Strict Mode

**Configuración** (`tsconfig.json`):
```json
{
  "exactOptionalPropertyTypes": true
}
```

**Impacto**: TypeScript distingue entre:
- `prop?: T` - puede ser T o NO estar presente
- `prop?: T | undefined` - puede ser T, undefined o NO estar presente

**Patrón para cumplir**:
```typescript
// NO incluir propiedad si no existe
...(value && { prop: value })

// En lugar de
prop: value ?? undefined
```

---

## 📊 Resumen Deploy a Staging

**Objetivos**:
1. ✅ Corregir errores de tipos para build exitoso
2. ✅ Mantener política "0 deuda técnica"
3. ✅ Deploy funcional en Vercel staging
4. ✅ Probar funcionalidad de envío de CV por email

**Commits del deploy**:
```
327cb5d - fix: solucionar errores de tipos en VehicleCVViewer y dropdown-menu
453e6ed - Merge develop → staging
```

**Tiempo total debug + fix**: ~30 minutos
**Errores corregidos**: 8 errores de TypeScript
**Build status**: ✅ Exitoso en Vercel

---

**Próxima sesión**: Por definir (WhatsApp CV, Multi-tenant dropdown, u otra funcionalidad)

**Estado Final**: ✅ Navbar + CV por Email desplegados en staging y funcionando correctamente
