# Sesión 2025-10-20: Calendario de Programación de Mantenimientos

## Contexto

Después de implementar el rediseño del dashboard con componentes separados (HighRiskVehicles, MaintenanceCalendar), detectamos un error conceptual: **los vencimientos de mantenimiento son por kilometraje, NO por fecha**.

El calendario quedaba vacío porque no había forma de saber CUÁNDO un vehículo llegaría a los km de vencimiento.

## Solución Propuesta: Programación de Mantenimientos

Convertir el calendario de una simple visualización a una **herramienta de gestión proactiva** permitiendo a los usuarios **programar cuándo enviarán vehículos al taller**.

---

## Arquitectura de Datos

### Nueva Tabla: `ScheduledMaintenance`

**Por qué tabla separada:**
- Soporta mantenimiento preventivo (top-down: paquete → items)
- Soporta mantenimiento correctivo (bottom-up: item → paquete)
- Permite modificar/reprogramar sin afectar alertas
- Historial de cambios y trazabilidad
- Escalable para talleres, mecánicos, costos reales

### Schema Prisma Propuesto

```prisma
model ScheduledMaintenance {
  id            Int       @id @default(autoincrement())
  tenantId      String    // Multi-tenant

  // === REFERENCIA ===
  vehicleId     Int
  vehicle       Vehicle   @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  // === AGRUPACIÓN (funciona para preventivo Y correctivo) ===
  packageName   String    // "10,000 km" o "Correctivo 2025-01-15"
  packageType   String    // "PREVENTIVE" | "CORRECTIVE"
  scheduledKm   Int?      // Solo para preventivo (snapshot del km programado)

  // === PROGRAMACIÓN ===
  scheduledDate DateTime  // Fecha en que se enviará al taller
  scheduledBy   String    // Usuario que programó (email o ID)
  notes         String?   // Notas adicionales del usuario

  // === ESTADO ===
  status        String    @default("PLANNED")
  // Estados posibles:
  // - PLANNED: Programado inicialmente
  // - CONFIRMED: Confirmado con taller (POST-MVP)
  // - IN_PROGRESS: En taller (POST-MVP)
  // - COMPLETED: Completado (genera WorkOrder)
  // - CANCELLED: Cancelado por el usuario
  // - RESCHEDULED: Reprogramado (apunta a nuevo schedule)

  // === REFERENCIAS A ALERTAS (muchos a muchos) ===
  alertIds      Int[]     // IDs de MaintenanceAlert que agrupa
  // Ejemplo preventivo: [1, 2, 3, 4] (cambio aceite, filtros, etc.)
  // Ejemplo correctivo: [15, 16] (reparación frenos detectada)

  // === COSTOS Y TIEMPOS (snapshot al programar) ===
  estimatedCost     Decimal?  @db.Decimal(10, 2)  // Suma de costos estimados
  estimatedDuration Decimal?  @db.Decimal(5, 2)   // Suma de horas estimadas

  // === TALLER (opcional MVP, importante POST-MVP) ===
  workshopId    Int?
  workshop      Workshop? @relation(fields: [workshopId], references: [id])
  workshopName  String?   // Nombre del taller (si no está en sistema)

  // === HISTORIAL DE REPROGRAMACIONES ===
  rescheduledFrom Int?  // ID del schedule anterior si fue reprogramado
  rescheduledTo   Int?  // ID del nuevo schedule si se reprogramó
  previousSchedule ScheduledMaintenance? @relation("RescheduleHistory", fields: [rescheduledFrom], references: [id], onDelete: SetNull)
  nextSchedule     ScheduledMaintenance? @relation("RescheduleHistory")

  // === AUDITORÍA ===
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([tenantId, vehicleId])
  @@index([tenantId, scheduledDate])  // Importante para calendario
  @@index([tenantId, status])
  @@index([tenantId, packageType])
}
```

---

## Flujos de Trabajo

### 1. Mantenimiento Preventivo (MVP)

**Origen:** Sistema detecta alertas automáticamente basadas en VehicleMantProgram

**Flujo:**
1. Sistema agrupa alertas por vehículo y paquete en `HighRiskVehicles`
2. Usuario expande vehículo → ve paquetes con sus items
3. Usuario click en **"📅 Programar Mantenimiento"** (botón en header del paquete)
4. Se abre `ScheduleMaintenanceModal`:
   - Muestra: placa, paquete, items incluidos
   - Muestra: costo total estimado, horas estimadas
   - Inputs:
     - **Fecha programada** (date picker)
     - **Taller** (opcional, autocomplete)
     - **Notas** (textarea opcional)
   - Botón **"Confirmar Programación"**
5. Al confirmar:
   ```typescript
   POST /api/maintenance/schedule
   {
     vehicleId: 123,
     packageName: "10,000 km",
     packageType: "PREVENTIVE",
     scheduledKm: 10000,
     scheduledDate: "2025-10-25T09:00:00Z",
     alertIds: [1, 2, 3, 4],
     estimatedCost: 45000,
     estimatedDuration: 2.5,
     notes: "Revisar también el sistema de frenos"
   }
   ```
6. Backend crea registro en `ScheduledMaintenance`
7. Frontend actualiza:
   - Calendario muestra la placa en la fecha
   - Paquete en `HighRiskVehicles` muestra badge: **"📅 25 Oct"**

### 2. Mantenimiento Correctivo (POST-MVP)

**Origen:** Usuario detecta problema y crea alerta manualmente

**Flujo:**
1. Usuario crea alerta correctiva (ej: "Ruido en motor")
2. Sistema crea "paquete virtual":
   ```typescript
   {
     packageName: "Correctivo 2025-10-20 14:30",  // Con timestamp
     packageType: "CORRECTIVE",
     alertIds: [42]  // Solo el item detectado inicialmente
   }
   ```
3. Usuario puede:
   - Agregar más items al mismo paquete (ej: "Revisar transmisión también")
   - Programar igual que preventivo
4. Se escala bottom-up: item → paquete → programación

### 3. Reprogramar Mantenimiento

**Flujo:**
1. Usuario ve calendario, click en placa programada
2. Se abre modal con detalles del schedule
3. Opciones:
   - **"Reprogramar"**: Cambia fecha
   - **"Cancelar"**: Marca como CANCELLED
   - **"Confirmar"**: Marca como CONFIRMED (POST-MVP)

**Lógica de Reprogramación:**
```typescript
PATCH /api/maintenance/schedule/:id/reschedule
{
  newDate: "2025-10-28T10:00:00Z",
  reason: "Taller no disponible el 25"
}

// Backend:
async function rescheduleMaintenanceSchedule(scheduleId, newDate, reason) {
  // 1. Obtener schedule original
  const original = await prisma.scheduledMaintenance.findUnique({
    where: { id: scheduleId }
  });

  // 2. Crear nuevo schedule (copia con nueva fecha)
  const newSchedule = await prisma.scheduledMaintenance.create({
    data: {
      ...original,
      id: undefined,  // Nuevo ID
      scheduledDate: newDate,
      notes: `${original.notes || ''}\n\nReprogramado: ${reason}`,
      rescheduledFrom: scheduleId,
      status: 'PLANNED',
      createdAt: new Date(),
    }
  });

  // 3. Marcar el anterior como RESCHEDULED y linkear
  await prisma.scheduledMaintenance.update({
    where: { id: scheduleId },
    data: {
      status: 'RESCHEDULED',
      rescheduledTo: newSchedule.id
    }
  });

  return newSchedule;
}
```

**Resultado:**
- Historial completo de cambios
- Métricas de reprogramaciones (useful para análisis)
- Trazabilidad: quién reprogramó, cuándo, por qué

---

## Componentes UI

### 1. `ScheduleMaintenanceModal`

**Props:**
```typescript
interface ScheduleMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: number;
    plate: string;
    photo: string;
  };
  package: {
    name: string;
    scheduledKm: number;
    alerts: MaintenanceAlert[];
  };
  onSuccess: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────────────────┐
│ 📅 Programar Mantenimiento                  │
├─────────────────────────────────────────────┤
│                                             │
│ 🚗 Vehículo: ABC-123                        │
│ 📦 Paquete: 10,000 km                       │
│                                             │
│ ━━━ Items a Realizar ━━━                    │
│ ✓ Cambio de aceite motor        $8,000     │
│ ✓ Filtro de aceite              $3,500     │
│ ✓ Filtro de aire                $4,200     │
│ ✓ Rotación de neumáticos        $12,000    │
│                                             │
│ Total Estimado: $27,700 • 2.5 hrs          │
│                                             │
│ ━━━ Programación ━━━                        │
│ Fecha: [📅 25/10/2025]                      │
│ Taller: [Autocomplete opcional]            │
│ Notas: [Textarea]                           │
│                                             │
│         [Cancelar]  [Confirmar Programación]│
└─────────────────────────────────────────────┘
```

### 2. Botón en `HighRiskVehicles`

Modificar el header del paquete para agregar botón:

```typescript
// En VehicleAlertRow.tsx, dentro del mapeo de paquetes:
<div className="flex items-center gap-3 mb-3 bg-white rounded-lg px-4 py-3">
  <Checkbox ... />
  <div className="flex-1">
    <span>{pkg.packageName}</span>
    <Badge>{pkg.scheduledKm.toLocaleString()} km</Badge>
  </div>

  {/* NUEVO: Botón Programar */}
  <Button
    variant="outline"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      setScheduleModalOpen(true);
      setSelectedPackage(pkg);
    }}
    className="gap-2"
  >
    <Calendar className="h-4 w-4" />
    Programar
  </Button>

  {/* Si ya está programado, mostrar badge */}
  {pkg.scheduledDate && (
    <Badge className="bg-blue-500 gap-1">
      📅 {format(pkg.scheduledDate, 'dd MMM')}
    </Badge>
  )}
</div>
```

### 3. `MaintenanceCalendar` Actualizado

**Cambios:**
- Hook nuevo: `useScheduledMaintenances()` para obtener programaciones
- Agrupar por fecha las programaciones
- Mostrar placas en días programados
- Color coding:
  - 🔴 Rojo: Vencido programado (urgente)
  - 🟠 Naranja: Crítico programado
  - 🟢 Verde: Normal programado
- Click en placa → Modal con detalles + opciones (reprogramar/cancelar)

```typescript
const { data: schedules } = useScheduledMaintenances({
  status: ['PLANNED', 'CONFIRMED'],
  startDate: firstDayOfMonth,
  endDate: lastDayOfMonth
});

// Agrupar por fecha
const schedulesByDate = schedules?.reduce((acc, schedule) => {
  const dateKey = format(schedule.scheduledDate, 'yyyy-MM-dd');
  if (!acc[dateKey]) acc[dateKey] = [];
  acc[dateKey].push(schedule);
  return acc;
}, {});
```

---

## API Endpoints

### `POST /api/maintenance/schedule`

Crear nueva programación

**Request:**
```typescript
{
  vehicleId: number;
  packageName: string;
  packageType: "PREVENTIVE" | "CORRECTIVE";
  scheduledKm?: number;
  scheduledDate: string;  // ISO 8601
  alertIds: number[];
  workshopId?: number;
  workshopName?: string;
  notes?: string;
}
```

**Response:**
```typescript
{
  id: number;
  vehicleId: number;
  vehiclePlate: string;
  packageName: string;
  scheduledDate: string;
  estimatedCost: number;
  estimatedDuration: number;
  status: "PLANNED";
  createdAt: string;
}
```

### `PATCH /api/maintenance/schedule/:id/reschedule`

Reprogramar

**Request:**
```typescript
{
  newDate: string;  // ISO 8601
  reason?: string;
}
```

**Response:** Nuevo schedule creado

### `PATCH /api/maintenance/schedule/:id/cancel`

Cancelar

**Request:**
```typescript
{
  reason: string;
}
```

**Response:** Schedule marcado como CANCELLED

### `GET /api/maintenance/schedule`

Listar programaciones con filtros

**Query params:**
```typescript
{
  vehicleId?: number;
  status?: string[];  // ["PLANNED", "CONFIRMED"]
  startDate?: string;
  endDate?: string;
  packageType?: "PREVENTIVE" | "CORRECTIVE";
}
```

---

## Hooks React Query

### `useScheduledMaintenances`

```typescript
export function useScheduledMaintenances(filters?: {
  vehicleId?: number;
  status?: string[];
  startDate?: Date;
  endDate?: Date;
}) {
  return useQuery({
    queryKey: ['scheduled-maintenances', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.vehicleId) params.append('vehicleId', filters.vehicleId.toString());
      if (filters?.status) params.append('status', filters.status.join(','));
      if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());

      const { data } = await axios.get(`/api/maintenance/schedule?${params}`);
      return data;
    },
    staleTime: 30 * 1000,
  });
}
```

### `useCreateSchedule`

```typescript
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleData) => {
      const { data } = await axios.post('/api/maintenance/schedule', scheduleData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
    },
  });
}
```

### `useReschedule`

```typescript
export function useReschedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, newDate, reason }) => {
      const { data } = await axios.patch(
        `/api/maintenance/schedule/${scheduleId}/reschedule`,
        { newDate, reason }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-maintenances'] });
    },
  });
}
```

---

## Plan de Implementación (MVP)

### Día 1: Base de Datos y Backend
- [ ] Crear migration: `ScheduledMaintenance` table
- [ ] Actualizar Prisma schema
- [ ] Correr migration: `npx prisma migrate dev --name add_scheduled_maintenance`
- [ ] Crear API: `POST /api/maintenance/schedule`
- [ ] Crear API: `GET /api/maintenance/schedule`
- [ ] Crear API: `PATCH /api/maintenance/schedule/:id/reschedule`
- [ ] Crear API: `PATCH /api/maintenance/schedule/:id/cancel`

### Día 2: Hooks y Componentes
- [ ] Crear hooks:
  - `useScheduledMaintenances`
  - `useCreateSchedule`
  - `useReschedule`
  - `useCancelSchedule`
- [ ] Crear componente: `ScheduleMaintenanceModal`
- [ ] Modificar: `HighRiskVehicles` (agregar botón Programar + badge si programado)
- [ ] Modificar: `MaintenanceCalendar` (mostrar programaciones)

### Día 3: Testing y Pulido
- [ ] Testing flujo completo: programar → ver en calendario → reprogramar
- [ ] Validaciones: no permitir programar en fechas pasadas
- [ ] UX: loading states, error handling
- [ ] Métricas básicas: % vehículos programados

---

## Beneficios para el Usuario

### Operacionales
- ✅ **Planificación proactiva**: Evita mantenimientos de emergencia
- ✅ **Visibilidad centralizada**: Todo en un calendario
- ✅ **Evita conflictos**: No programar múltiples vehículos mismo día
- ✅ **Coordinación con talleres**: Agenda con anticipación

### Financieros
- ✅ **Mejor negociación**: Programar con tiempo = mejores precios
- ✅ **Evita sobrecostos**: Mantenimiento preventivo < correctivo
- ✅ **Control de presupuesto**: Ve inversión estimada mensual

### Métricas (POST-MVP)
- ✅ **% Mantenimientos planificados vs reactivos**
- ✅ **Tiempo promedio de anticipación**
- ✅ **Tasa de reprogramación por taller** (identifica talleres poco confiables)
- ✅ **Costo real vs estimado** (mejora precisión de estimaciones)

---

## Escalabilidad POST-MVP

### Integraciones
- **Talleres**: Confirmación automática de disponibilidad
- **Notificaciones**: WhatsApp/Email 24h antes
- **WorkOrders**: Crear automáticamente al marcar COMPLETED
- **GPS**: Alertar si vehículo se acerca al taller el día programado

### IA y Optimización
- **Sugerencia de fechas óptimas**: Basado en patrones de uso
- **Detección de anomalías**: Vehículo no llegó al taller
- **Recomendación de talleres**: Por precio, calidad, distancia

### Analítica Avanzada
- Dashboard de programaciones
- Heatmap de disponibilidad de talleres
- Predicción de costos futuros
- ROI de mantenimiento preventivo

---

## Estado Actual

### ✅ Completado (Hoy)
- Rediseño completo del dashboard
- Componentes separados: `HighRiskVehicles`, `MaintenanceCalendar`
- KPIs compactos en `MaintenanceMetrics`
- Arquitectura documentada de `ScheduledMaintenance`

### 🔄 Pendiente (Mañana)
- Implementación de `ScheduledMaintenance` table
- APIs de programación/reprogramación
- Modal de programación
- Integración con calendario

### 📋 Backlog
- Gestión de talleres
- Confirmaciones automáticas
- Notificaciones
- Métricas avanzadas

---

## Notas Técnicas

### Decisiones Importantes

1. **Tabla separada vs campo en Alert**:
   - ✅ Tabla separada permite historial y escalabilidad

2. **Relación con AlertIds vs foreign key directa**:
   - ✅ Array de IDs más flexible para agrupar dinámicamente

3. **Snapshot de costos vs cálculo dinámico**:
   - ✅ Snapshot preserva el valor al momento de programar

4. **Soft delete vs hard delete**:
   - ✅ No eliminamos, marcamos como CANCELLED para auditoría

### Consideraciones de Performance

- Índices en `(tenantId, scheduledDate)` para calendario
- Índices en `(tenantId, status)` para filtros
- Paginación en lista de schedules (POST-MVP)
- Cache de 30s en React Query (balance freshness/performance)

---

## Referencias

- Sesión anterior: `2025-10-20-rediseno-dashboard-alertas-ux.md`
- Arquitectura templates: `2025-10-20-arquitectura-templates-mantenimiento-mvp.md`
- Checkpoint alertas: `CHECKPOINT-2025-10-10.md`
