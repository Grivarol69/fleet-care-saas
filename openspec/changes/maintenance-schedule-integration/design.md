# Design: maintenance-schedule-integration

## Technical Approach

4 cambios quirúrgicos, sin schema migration. El patrón de datos sigue el stack existente: TanStack Query + axios para fetching, `requireCurrentUser()` + `tenantPrisma` en la API, react-hook-form + zod en el wizard.

## Architecture Decisions

| Decisión | Elección | Alternativa descartada | Razón |
|----------|----------|------------------------|-------|
| Fetching en Calendar | `useQuery` (TanStack) | `useSWR` | El resto del módulo de mantenimiento usa TanStack; SWR solo aparece en financial dashboard |
| Nuevo hook vs fetch directo | Nuevo `useMaintenanceSchedule` en `hooks/` | Fetch inline en el componente | Consistencia con `useMaintenanceAlerts`; testeable independientemente |
| Ubicación del calendario | Dentro de `alerts/page.tsx` | Nueva página `/schedule` | Contexto correcto sin nueva navegación; el usuario ya está en alertas cuando necesita el schedule |
| Dos colecciones en un endpoint | `{ scheduledWorkOrders, pendingAlerts }` | Dos endpoints separados | Menos requests; el calendar necesita ambos al mismo tiempo |

## Data Flow

```
WorkOrderCreateWizard (Paso 2)
  form.scheduledDate ──→ POST /api/maintenance/work-orders
                              ↓
                     WorkOrder.startDate (DB)

CreateWorkOrderModal (ya funciona)
  scheduledDate ────────────────────────────────────┘

                    GET /api/maintenance/schedule
                              │
              ┌───────────────┴────────────────┐
              ↓                                ↓
   WorkOrder WHERE                  MaintenanceAlert WHERE
   startDate != null                workOrderId = null
   status IN [PENDING, APPROVED]    status IN [PENDING, ACKNOWLEDGED]
              │                                │
              └───────────┬───────────────────┘
                          ↓
             useMaintenanceSchedule() hook
                          ↓
               MaintenanceCalendar component
          ┌───────────────┴──────────────┐
          ↓                              ↓
   Capa sólida (azul)           Capa outline (azul punteado)
   fecha exacta de WO           fecha estimada km/100
```

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/app/api/maintenance/schedule/route.ts` | Crear | GET handler: WOs programados + alertas pendientes |
| `src/lib/hooks/useMaintenanceAlerts.ts` | Crear hook adicional | Agregar `useMaintenanceSchedule` al final del archivo |
| `src/components/layout/MaintenanceCalendar/MaintenanceCalendar.tsx` | Modificar | Reemplazar `useMaintenanceAlerts` por `useMaintenanceSchedule`; rendering de dos capas |
| `src/components/maintenance/work-orders/WorkOrderCreateWizard.tsx` | Modificar | Agregar `scheduledDate` a formSchema + UI + payload |
| `src/app/dashboard/maintenance/alerts/page.tsx` | Modificar | Importar y montar `<MaintenanceCalendar />` |

## Interfaces / Contracts

```ts
// GET /api/maintenance/schedule — response shape
interface ScheduleResponse {
  scheduledWorkOrders: {
    id: string;
    title: string;
    startDate: string; // ISO
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status: 'PENDING' | 'APPROVED';
    vehicle: { licensePlate: string };
  }[];
  pendingAlerts: {
    id: string;
    itemName: string;
    vehiclePlate: string;
    kmToMaintenance: number;
    alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }[];
}

// useMaintenanceSchedule — nuevo hook en useMaintenanceAlerts.ts
export function useMaintenanceSchedule() {
  return useQuery({
    queryKey: ['maintenance-schedule'],
    queryFn: async () => {
      const { data } = await axios.get<ScheduleResponse>('/api/maintenance/schedule');
      return data;
    },
    staleTime: 60 * 1000, // 1 min (schedule cambia menos que alertas)
  });
}

// WorkOrderCreateWizard — formSchema addendum
scheduledDate: z.string().optional()
// payload addendum
scheduledDate: values.scheduledDate || undefined
```

## Calendar Component — Rendering Logic

```
// El MaintenanceCalendar refactorizado combina ambas capas en alertsByDate:
const { data } = useMaintenanceSchedule();

// Capa 1: WOs con fecha exacta
data.scheduledWorkOrders.forEach(wo => {
  const dateKey = new Date(wo.startDate).getDate().toString();
  grouped[dateKey].push({ plate: wo.vehicle.licensePlate, type: 'scheduled', ... });
});

// Capa 2: alertas con fecha estimada (igual que hoy, km/100)
data.pendingAlerts.forEach(alert => {
  const daysToMaintenance = Math.floor(alert.kmToMaintenance / 100);
  // solo las del mes visible
  grouped[dateKey].push({ plate: alert.vehiclePlate, type: 'estimated', ... });
});
```

## Testing Strategy

| Capa | Qué probar | Cómo |
|------|-----------|------|
| API | GET /api/maintenance/schedule retorna 200 + shape correcta | Browser / curl manual |
| API | 401 sin sesión | curl sin cookie |
| UI wizard | `scheduledDate` llega a DB después de submit | Crear OT, verificar en Prisma Studio |
| UI calendar | Eventos visibles en fecha correcta | Browser, navegar al mes de la OT |
| Type check | Sin errores TS | `pnpm type-check` |

## Migration / Rollout

Sin migración. `WorkOrder.startDate` ya existe. Los 4 archivos son reversibles independientemente. No se necesita feature flag.

## Open Questions

- Ninguna. Diseño completo.
