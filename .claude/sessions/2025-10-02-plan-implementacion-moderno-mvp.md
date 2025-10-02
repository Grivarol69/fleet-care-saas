# Plan de Implementación Moderno - MVP Fleet Care SaaS

## Sesión: 02 Octubre 2025
**Contexto**: Plan de implementación usando patrones modernos (Hooks, TanStack Query, Zustand) sin clases de React

---

## 🎯 OBJETIVO PRINCIPAL

Completar MVP en **7.5 sprints (15 semanas)** usando:
- ✅ **React Hooks** (componentes funcionales, sin clases)
- ✅ **TanStack Query** (data fetching, cache, sincronización)
- ✅ **Zustand** (estado global ligero)
- ✅ **Custom Hooks** (lógica reutilizable)
- ✅ **Service Layer** (backend/frontend separation)
- ✅ **Repository Pattern** (acceso a datos)

---

## 📊 GAP ANALYSIS (Estado Actual)

| Módulo | Completado | Faltante | Prioridad | Sprints |
|--------|------------|----------|-----------|---------|
| Gestión Activos | 70% | Categories, history | LOW | 1 |
| Órdenes Trabajo | 40% | UI completa, assignment | **HIGH** | 2 |
| Preventivo | 85% | Auto-gen workflow | LOW | 0.5 |
| Inventario | 15% | Stock system, UI | **HIGH** | 2 |
| Dashboard | 25% | Métricas, exports | MEDIUM | 1.5 |
| Usuarios | 90% | Role-based UI | LOW | 0.5 |

**Total MVP**: 7.5 sprints = 15 semanas

---

## 🏗️ ARQUITECTURA MODERNA PROPUESTA

### Stack de Frontend
```
UI Layer
├── Components (Shadcn + Custom)
├── Pages (Next.js App Router)
└── Hooks (Custom + TanStack Query)

State Management
├── TanStack Query (Server State)
├── Zustand (Client State)
└── React Context (Theme, Auth)

Data Layer
├── API Routes (Next.js)
├── Service Layer (Business Logic)
└── Repository Layer (Prisma)
```

### Patrones Modernos vs Propuesta Original

| Patrón Original | Patrón Moderno | Justificación |
|----------------|----------------|---------------|
| ❌ ErrorBoundary (class) | ✅ Error handling con TanStack Query | Hooks nativos, mejor DX |
| ❌ Singleton class | ✅ Zustand store | Lightweight, hooks-based |
| ❌ Observer class | ✅ TanStack Query + useEffect | Cacheo automático, optimistic updates |
| ✅ Repository Pattern | ✅ Repository Pattern | Backend pattern, mantener |
| ✅ Service Layer | ✅ Service Layer | Backend pattern, mantener |
| ❌ Class-based forms | ✅ React Hook Form + Zod | Ya lo usas, perfecto |

---

## 🚀 IMPLEMENTACIÓN POR SPRINTS

### SPRINT 1 (Semanas 1-2): FOUNDATION MODERNA

**Goal**: Establecer infraestructura moderna sin romper código existente

#### Week 1: Setup Infraestructura
```bash
# Instalar dependencias
npm install @tanstack/react-query zustand
npm install -D @tanstack/react-query-devtools
```

**Tasks**:
1. **Setup TanStack Query**
   ```typescript
   // src/lib/providers/QueryProvider.tsx
   'use client';
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
   import { useState } from 'react';

   export function QueryProvider({ children }: { children: React.ReactNode }) {
     const [queryClient] = useState(() => new QueryClient({
       defaultOptions: {
         queries: {
           staleTime: 60 * 1000, // 1 minuto
           refetchOnWindowFocus: false,
         },
       },
     }));

     return (
       <QueryClientProvider client={queryClient}>
         {children}
         <ReactQueryDevtools initialIsOpen={false} />
       </QueryClientProvider>
     );
   }
   ```

2. **Setup Zustand Store (Estado Global)**
   ```typescript
   // src/stores/useAppStore.ts
   import { create } from 'zustand';
   import { devtools, persist } from 'zustand/middleware';

   interface AppState {
     // UI State
     sidebarOpen: boolean;
     toggleSidebar: () => void;

     // Feature Flags
     features: {
       newWorkOrderUI: boolean;
       enhancedInventory: boolean;
       advancedReporting: boolean;
     };
     toggleFeature: (feature: keyof AppState['features']) => void;
   }

   export const useAppStore = create<AppState>()(
     devtools(
       persist(
         (set) => ({
           sidebarOpen: true,
           toggleSidebar: () => set((state) => ({
             sidebarOpen: !state.sidebarOpen
           })),

           features: {
             newWorkOrderUI: false,
             enhancedInventory: false,
             advancedReporting: false,
           },
           toggleFeature: (feature) => set((state) => ({
             features: {
               ...state.features,
               [feature]: !state.features[feature],
             },
           })),
         }),
         { name: 'app-store' }
       )
     )
   );
   ```

3. **Crear Service Layer Foundation**
   ```typescript
   // src/lib/services/base.service.ts
   import axios, { AxiosInstance } from 'axios';

   export class BaseService {
     protected api: AxiosInstance;

     constructor() {
       this.api = axios.create({
         baseURL: '/api',
         headers: {
           'Content-Type': 'application/json',
         },
       });

       // Interceptor para errores globales
       this.api.interceptors.response.use(
         (response) => response,
         (error) => {
           // Logging centralizado
           console.error('API Error:', error);
           return Promise.reject(error);
         }
       );
     }
   }
   ```

4. **Crear Repository Pattern Foundation**
   ```typescript
   // src/lib/repositories/base.repository.ts
   import { PrismaClient } from '@prisma/client';

   export class BaseRepository {
     protected prisma: PrismaClient;

     constructor() {
       this.prisma = new PrismaClient();
     }

     protected handleError(error: unknown): never {
       console.error('Repository Error:', error);
       throw error;
     }
   }
   ```

#### Week 2: Service Layer para Vehicles

**Tasks**:
1. **Vehicle Service (Lógica de Negocio)**
   ```typescript
   // src/lib/services/vehicle.service.ts
   import { BaseService } from './base.service';
   import type { Vehicle } from '@prisma/client';

   export interface CreateVehicleDto {
     licensePlate: string;
     make: string;
     model: string;
     year: number;
     vehicleBrandId: number;
     vehicleLineId: number;
   }

   export interface VehicleWithMetrics extends Vehicle {
     currentKm: number;
     maintenanceStatus: 'OK' | 'DUE' | 'OVERDUE';
     lastMaintenanceDate?: Date;
   }

   class VehicleServiceClass extends BaseService {
     async getAll(): Promise<VehicleWithMetrics[]> {
       const response = await this.api.get<Vehicle[]>('/vehicles/vehicles');

       // Enriquecer con métricas (lógica de negocio)
       return response.data.map(vehicle => ({
         ...vehicle,
         currentKm: this.calculateCurrentKm(vehicle),
         maintenanceStatus: this.calculateMaintenanceStatus(vehicle),
       }));
     }

     async getById(id: number): Promise<VehicleWithMetrics> {
       const response = await this.api.get<Vehicle>(`/vehicles/vehicles/${id}`);
       return {
         ...response.data,
         currentKm: this.calculateCurrentKm(response.data),
         maintenanceStatus: this.calculateMaintenanceStatus(response.data),
       };
     }

     async create(data: CreateVehicleDto): Promise<Vehicle> {
       const response = await this.api.post<Vehicle>('/vehicles/vehicles', data);
       return response.data;
     }

     async update(id: number, data: Partial<CreateVehicleDto>): Promise<Vehicle> {
       const response = await this.api.put<Vehicle>(`/vehicles/vehicles/${id}`, data);
       return response.data;
     }

     async delete(id: number): Promise<void> {
       await this.api.delete(`/vehicles/vehicles/${id}`);
     }

     // Lógica de negocio privada
     private calculateCurrentKm(vehicle: any): number {
       // Implementar cálculo real
       return 0;
     }

     private calculateMaintenanceStatus(vehicle: any): 'OK' | 'DUE' | 'OVERDUE' {
       // Implementar lógica real
       return 'OK';
     }
   }

   // Export singleton
   export const vehicleService = new VehicleServiceClass();
   ```

2. **Custom Hooks con TanStack Query**
   ```typescript
   // src/hooks/useVehicles.ts
   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
   import { vehicleService, type CreateVehicleDto, type VehicleWithMetrics } from '@/lib/services/vehicle.service';
   import { toast } from 'sonner';

   const QUERY_KEY = ['vehicles'] as const;

   // Query: Get all vehicles
   export function useVehicles() {
     return useQuery({
       queryKey: QUERY_KEY,
       queryFn: () => vehicleService.getAll(),
     });
   }

   // Query: Get single vehicle
   export function useVehicle(id: number) {
     return useQuery({
       queryKey: [...QUERY_KEY, id],
       queryFn: () => vehicleService.getById(id),
       enabled: !!id, // Solo fetch si hay ID
     });
   }

   // Mutation: Create vehicle
   export function useCreateVehicle() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: (data: CreateVehicleDto) => vehicleService.create(data),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: QUERY_KEY });
         toast.success('Vehículo creado exitosamente');
       },
       onError: (error: any) => {
         toast.error(error.message || 'Error al crear vehículo');
       },
     });
   }

   // Mutation: Update vehicle
   export function useUpdateVehicle() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: ({ id, data }: { id: number; data: Partial<CreateVehicleDto> }) =>
         vehicleService.update(id, data),
       onSuccess: (_, variables) => {
         queryClient.invalidateQueries({ queryKey: QUERY_KEY });
         queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, variables.id] });
         toast.success('Vehículo actualizado exitosamente');
       },
       onError: (error: any) => {
         toast.error(error.message || 'Error al actualizar vehículo');
       },
     });
   }

   // Mutation: Delete vehicle
   export function useDeleteVehicle() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: (id: number) => vehicleService.delete(id),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: QUERY_KEY });
         toast.success('Vehículo eliminado exitosamente');
       },
       onError: (error: any) => {
         toast.error(error.message || 'Error al eliminar vehículo');
       },
     });
   }
   ```

3. **Uso en Componentes**
   ```tsx
   // src/app/dashboard/vehicles/page.tsx
   'use client';
   import { useVehicles, useDeleteVehicle } from '@/hooks/useVehicles';
   import { Button } from '@/components/ui/button';
   import { Loader2 } from 'lucide-react';

   export default function VehiclesPage() {
     const { data: vehicles, isLoading, error } = useVehicles();
     const deleteMutation = useDeleteVehicle();

     if (isLoading) {
       return <div className="flex justify-center p-8">
         <Loader2 className="animate-spin" />
       </div>;
     }

     if (error) {
       return <div className="text-red-600 p-4">
         Error al cargar vehículos: {error.message}
       </div>;
     }

     const handleDelete = async (id: number) => {
       if (confirm('¿Estás seguro de eliminar este vehículo?')) {
         deleteMutation.mutate(id);
       }
     };

     return (
       <div>
         <h1>Vehículos</h1>
         <div className="grid gap-4">
           {vehicles?.map(vehicle => (
             <div key={vehicle.id} className="border p-4 rounded">
               <h3>{vehicle.licensePlate}</h3>
               <p>KM Actual: {vehicle.currentKm}</p>
               <p>Estado: {vehicle.maintenanceStatus}</p>
               <Button
                 onClick={() => handleDelete(vehicle.id)}
                 variant="destructive"
                 disabled={deleteMutation.isPending}
               >
                 {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
               </Button>
             </div>
           ))}
         </div>
       </div>
     );
   }
   ```

**Deliverables Sprint 1**:
- ✅ TanStack Query configurado
- ✅ Zustand store para UI state
- ✅ Vehicle Service + Repository
- ✅ Custom hooks modernos (useVehicles)
- ✅ Error handling centralizado
- ✅ Feature flags system

---

### SPRINT 2 (Semanas 3-4): WORK ORDERS MVP

**Goal**: Sistema completo de órdenes de trabajo correctivas

#### User Stories

**US-1: Como Admin quiero crear órdenes de trabajo**
```typescript
// src/lib/services/workorder.service.ts
import { BaseService } from './base.service';

export interface CreateWorkOrderDto {
  vehicleId: number;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scheduledDate: Date;
  assignedToId?: number;
  estimatedCost?: number;
}

class WorkOrderServiceClass extends BaseService {
  async getAll() {
    const response = await this.api.get('/maintenance/work-orders');
    return response.data;
  }

  async create(data: CreateWorkOrderDto) {
    const response = await this.api.post('/maintenance/work-orders', data);
    return response.data;
  }

  async assign(workOrderId: number, technicianId: number) {
    const response = await this.api.patch(`/maintenance/work-orders/${workOrderId}/assign`, {
      technicianId,
    });
    return response.data;
  }

  async updateStatus(workOrderId: number, status: string) {
    const response = await this.api.patch(`/maintenance/work-orders/${workOrderId}/status`, {
      status,
    });
    return response.data;
  }
}

export const workOrderService = new WorkOrderServiceClass();
```

```typescript
// src/hooks/useWorkOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrderService } from '@/lib/services/workorder.service';

const QUERY_KEY = ['work-orders'] as const;

export function useWorkOrders() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => workOrderService.getAll(),
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workOrderService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useAssignWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, technicianId }: { workOrderId: number; technicianId: number }) =>
      workOrderService.assign(workOrderId, technicianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
```

**US-2: Como Técnico quiero ver mis órdenes asignadas**
```typescript
// src/hooks/useMyWorkOrders.ts
export function useMyWorkOrders() {
  const { data: user } = useAuth(); // Tu hook de auth

  return useQuery({
    queryKey: ['work-orders', 'my-orders'],
    queryFn: () => workOrderService.getByTechnician(user.id),
    enabled: !!user,
  });
}
```

**Deliverables Sprint 2**:
- ✅ WorkOrder service + repository
- ✅ Custom hooks (useWorkOrders, useCreateWorkOrder)
- ✅ UI completa CRUD work orders
- ✅ Assignment a técnicos funcional
- ✅ Status workflow (pending → in_progress → completed)

---

### SPRINT 3 (Semanas 5-6): INVENTORY SYSTEM

**Goal**: Sistema básico de inventario con stock tracking

#### Tasks

1. **Inventory Service**
   ```typescript
   // src/lib/services/inventory.service.ts
   export interface InventoryItem {
     id: number;
     name: string;
     category: string;
     quantity: number;
     minStock: number;
     price: number;
   }

   class InventoryServiceClass extends BaseService {
     async getAll(): Promise<InventoryItem[]> {
       const response = await this.api.get('/inventory/items');
       return response.data;
     }

     async updateStock(itemId: number, quantity: number) {
       const response = await this.api.patch(`/inventory/items/${itemId}/stock`, {
         quantity,
       });
       return response.data;
     }

     async getLowStockItems(): Promise<InventoryItem[]> {
       const response = await this.api.get('/inventory/items?lowStock=true');
       return response.data;
     }
   }

   export const inventoryService = new InventoryServiceClass();
   ```

2. **Inventory Hooks**
   ```typescript
   // src/hooks/useInventory.ts
   export function useInventory() {
     return useQuery({
       queryKey: ['inventory'],
       queryFn: () => inventoryService.getAll(),
     });
   }

   export function useLowStockItems() {
     return useQuery({
       queryKey: ['inventory', 'low-stock'],
       queryFn: () => inventoryService.getLowStockItems(),
       refetchInterval: 30000, // Check cada 30 segundos
     });
   }

   export function useUpdateStock() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
         inventoryService.updateStock(itemId, quantity),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['inventory'] });
       },
     });
   }
   ```

3. **UI Components**
   - Lista de items con tabla (TanStack Table)
   - Form agregar/editar items
   - Alertas de stock bajo

**Deliverables Sprint 3**:
- ✅ Inventory service + repository
- ✅ Stock tracking functionality
- ✅ Low stock alerts
- ✅ UI completa inventario

---

### SPRINT 4 (Semanas 7-8): DASHBOARD & REPORTING

**Goal**: Dashboard funcional con métricas en tiempo real

#### Tasks

1. **Metrics Service**
   ```typescript
   // src/lib/services/metrics.service.ts
   export interface DashboardMetrics {
     totalVehicles: number;
     activeWorkOrders: number;
     overdueMaintenances: number;
     lowStockItems: number;
     monthlyExpenses: number;
   }

   class MetricsServiceClass extends BaseService {
     async getDashboardMetrics(): Promise<DashboardMetrics> {
       const response = await this.api.get('/metrics/dashboard');
       return response.data;
     }

     async getMaintenanceReport(startDate: Date, endDate: Date) {
       const response = await this.api.get('/reports/maintenance', {
         params: { startDate, endDate },
       });
       return response.data;
     }
   }

   export const metricsService = new MetricsServiceClass();
   ```

2. **Dashboard Hook**
   ```typescript
   // src/hooks/useDashboard.ts
   export function useDashboardMetrics() {
     return useQuery({
       queryKey: ['dashboard', 'metrics'],
       queryFn: () => metricsService.getDashboardMetrics(),
       refetchInterval: 30000, // Actualizar cada 30 segundos
     });
   }
   ```

3. **Dashboard UI**
   ```tsx
   // src/app/dashboard/page.tsx
   export default function DashboardPage() {
     const { data: metrics, isLoading } = useDashboardMetrics();

     if (isLoading) return <DashboardSkeleton />;

     return (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         <MetricCard
           title="Vehículos Totales"
           value={metrics.totalVehicles}
           icon={<Car />}
         />
         <MetricCard
           title="Órdenes Activas"
           value={metrics.activeWorkOrders}
           icon={<Wrench />}
         />
         {/* etc */}
       </div>
     );
   }
   ```

**Deliverables Sprint 4**:
- ✅ Dashboard con métricas en tiempo real
- ✅ Export a PDF/Excel
- ✅ Reportes básicos maintenance

---

## 🎯 CONSOLIDACIÓN FINAL

### SPRINT 5-6: Polish & Testing
- Testing completo con Vitest
- Performance optimization
- Mobile responsiveness
- Documentation

### SPRINT 7-8: Beta Testing & Launch Prep
- User acceptance testing
- Bug fixes
- Production deployment
- Monitoring setup

---

## 📈 MÉTRICAS DE ÉXITO

### Technical KPIs
- **Code Coverage**: >80%
- **Bundle Size**: <500KB initial load
- **Lighthouse Score**: >90
- **API Response Time**: <200ms p95

### Business KPIs
- **Feature Velocity**: 3-5 stories/sprint
- **Bug Rate**: <2 bugs/story
- **User Satisfaction**: >4.5/5

---

## 🚨 RISK MITIGATION

### Feature Flags (Zustand)
```typescript
// Rollback inmediato si algo falla
const { features } = useAppStore();

if (features.newWorkOrderUI) {
  return <WorkOrdersV2 />;
}
return <WorkOrdersV1 />; // Legacy
```

### Error Boundaries con react-error-boundary
```bash
npm install react-error-boundary
```

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <YourApp />
</ErrorBoundary>
```

---

## 📚 STACK TECNOLÓGICO FINAL

```json
{
  "framework": "Next.js 14 (App Router)",
  "ui": "Shadcn UI + Tailwind CSS",
  "forms": "React Hook Form + Zod",
  "tables": "TanStack Table",
  "state": {
    "server": "TanStack Query",
    "client": "Zustand",
    "auth": "React Context"
  },
  "backend": {
    "database": "Prisma + PostgreSQL",
    "patterns": "Repository + Service Layer"
  },
  "testing": "Vitest + Testing Library",
  "monitoring": "Vercel Analytics + Sentry"
}
```

---

## ✅ PRÓXIMOS PASOS INMEDIATOS

1. **Hoy**: Aprobar este plan
2. **Mañana**: Setup TanStack Query + Zustand
3. **Días 3-5**: Migrar Vehicle hooks a TanStack Query
4. **Semana 2**: Completar Vehicle Service Layer
5. **Semana 3**: Comenzar Work Orders

---

*Plan actualizado con patrones modernos React 16.8+ (Hooks only)*
*Sin clases, usando TanStack Query + Zustand + Custom Hooks*
