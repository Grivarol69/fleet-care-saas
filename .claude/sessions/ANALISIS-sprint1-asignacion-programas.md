# Análisis Sprint 1 - Asignación de Programas & Recalculo

**Fecha**: 07 Octubre 2025
**Contexto**: Preparación Sprint 1 - Preventivo Core
**Objetivo**: Documentar estado actual y gaps de funcionalidad

---

## 🎯 Funcionalidad Objetivo

### Flujo Completo de Mantenimiento Preventivo

```
1. ASIGNACIÓN
   Admin selecciona template → Ingresa km inicial vehículo
   └─> Sistema genera VehicleMantProgram con todos los packages/items
       └─> scheduledKm = assignmentKm + triggerKm

2. MONITOREO AUTOMÁTICO
   Cron diario verifica km actual vs scheduledKm
   └─> Si km actual >= (scheduledKm - 3000) → Genera alerta

3. EJECUCIÓN
   Técnico ejecuta mantenimiento → Registra km REAL de ejecución
   └─> Sistema actualiza executedKm (puede ser diferente a scheduledKm)

4. RECALCULO
   Al completar item → Sistema recalcula SIGUIENTE mantenimiento
   └─> próximoKm = executedKm + triggerKm (NO assignmentKm)
       └─> Genera nuevo VehicleProgramItem para siguiente ciclo
```

---

## ✅ LO QUE YA TENEMOS

### 1. Modelos Prisma (100% Completos)

#### VehicleMantProgram
```prisma
model VehicleMantProgram {
  id                    Int      @id @default(autoincrement())
  tenantId              String
  vehicleId             Int

  name                  String   // "Programa Toyota Hilux ABC-123"
  description           String?
  generatedFrom         String?  // "Template: Toyota Hilux v1.0"
  generatedBy           String?  // User ID

  // KILOMETRAJE INICIAL ✅
  assignmentKm          Int      // Km del vehículo cuando se asignó
  nextMaintenanceKm     Int?     // Próximo vencimiento calculado
  nextMaintenanceDesc   String?

  isActive              Boolean  @default(true)
  status                Status   @default(ACTIVE)

  vehicle               Vehicle                  @relation(...)
  packages              VehicleProgramPackage[]
}
```

**Campo clave**: `assignmentKm` → Km inicial del vehículo al asignar template ✅

#### VehicleProgramPackage
```prisma
model VehicleProgramPackage {
  id              Int      @id @default(autoincrement())
  tenantId        String
  programId       Int

  name            String   // "Mantenimiento 15,000 km"
  triggerKm       Int?     // 15000, 30000, etc.
  packageType     MantType @default(PREVENTIVE)

  // KILOMETRAJE ESPECÍFICO DEL VEHÍCULO ✅
  scheduledKm     Int?     // Km programado = assignmentKm + triggerKm
  executedKm      Int?     // Km REAL de ejecución (puede diferir)

  status          WorkOrderStatus @default(PENDING)

  program         VehicleMantProgram    @relation(...)
  items           VehicleProgramItem[]
}
```

**Campos clave**:
- `triggerKm`: Intervalo del template (ej: 2000 km)
- `scheduledKm`: Km calculado específico (ej: 34000 = 32000 + 2000)
- `executedKm`: Km real cuando se ejecutó (ej: 34500 por retraso)

#### VehicleProgramItem
```prisma
model VehicleProgramItem {
  id                    Int      @id @default(autoincrement())
  tenantId              String
  packageId             Int
  mantItemId            Int

  mantType              MantType
  priority              Priority @default(MEDIUM)

  // KILOMETRAJE ✅
  scheduledKm           Int?     // Km programado
  detectedKm            Int?     // Para correctivos
  executedKm            Int?     // Km real de ejecución

  // FECHAS
  scheduledDate         DateTime?
  executedDate          DateTime?

  // COSTOS
  estimatedCost         Decimal?
  actualCost            Decimal?

  status                WorkOrderStatus @default(PENDING)

  package               VehicleProgramPackage @relation(...)
  mantItem              MantItem @relation(...)
}
```

**Estado**: ✅ Modelos completos y migrados

---

### 2. API POST - Generar Programa (100% Funcional)

**Endpoint**: `POST /api/maintenance/vehicle-programs`

**Ubicación**: `src/app/api/maintenance/vehicle-programs/route.ts`

**Input**:
```json
{
  "vehicleId": 123,
  "templateId": 5,
  "assignmentKm": 32000,
  "generatedBy": "user-abc-123"
}
```

**Lógica Implementada** (líneas 48-202):

```typescript
// 1. Validar que vehículo no tenga programa activo
const existingProgram = await prisma.vehicleMantProgram.findUnique({
  where: { vehicleId: vehicleId }
});

if (existingProgram) {
  return error 400 // Un vehículo solo puede tener un programa
}

// 2. Obtener template con packages e items
const template = await prisma.maintenanceTemplate.findUnique({
  where: { id: templateId },
  include: {
    packages: {
      include: {
        packageItems: {
          include: { mantItem: true }
        }
      }
    }
  }
});

// 3. Crear programa + packages + items en transacción
await prisma.$transaction(async (tx) => {
  // 3a. Crear VehicleMantProgram
  const program = await tx.vehicleMantProgram.create({
    data: {
      tenantId: TENANT_ID,
      vehicleId: vehicleId,
      assignmentKm: assignmentKm, // ✅ Km inicial guardado
      // ...
    }
  });

  // 3b. Por cada package del template
  for (const templatePackage of template.packages) {
    // ✅ CALCULAR scheduledKm = assignmentKm + triggerKm
    const scheduledKm = assignmentKm + templatePackage.triggerKm;

    const vehiclePackage = await tx.vehicleProgramPackage.create({
      data: {
        programId: program.id,
        triggerKm: templatePackage.triggerKm,  // Del template
        scheduledKm: scheduledKm,               // Calculado ✅
        status: 'PENDING'
        // ...
      }
    });

    // 3c. Por cada item del package
    for (const packageItem of templatePackage.packageItems) {
      await tx.vehicleProgramItem.create({
        data: {
          packageId: vehiclePackage.id,
          mantItemId: packageItem.mantItemId,
          scheduledKm: scheduledKm, // ✅ Mismo km del package
          status: 'PENDING'
          // ...
        }
      });
    }
  }

  // 3d. Crear package vacío para correctivos
  await tx.vehicleProgramPackage.create({
    data: {
      name: "Items Mantenimiento Correctivo",
      packageType: 'CORRECTIVE',
      triggerKm: null,
      status: 'PENDING'
    }
  });
});
```

**Output**: Programa completo con packages e items creados

**Ejemplo Práctico**:

**Input**:
- Vehículo ingresa con `32,000 km`
- Template tiene paquetes cada `2,000 km` (2k, 4k, 6k, ...)

**Output generado**:
```
VehicleMantProgram {
  assignmentKm: 32000

  packages: [
    {
      name: "Mantenimiento 2,000 km"
      triggerKm: 2000
      scheduledKm: 34000  // 32000 + 2000 ✅
      items: [...items con scheduledKm: 34000]
    },
    {
      name: "Mantenimiento 4,000 km"
      triggerKm: 4000
      scheduledKm: 36000  // 32000 + 4000 ✅
      items: [...items con scheduledKm: 36000]
    },
    // ... más paquetes
  ]
}
```

**Estado**: ✅ API completa y funcional

---

### 3. API GET - Consultar Programas (100% Funcional)

**Endpoint**: `GET /api/maintenance/vehicle-programs?vehicleId=123`

**Ubicación**: Mismo archivo, líneas 6-46

**Funcionalidad**:
- Lista todos los programas (o filtra por vehicleId)
- Include completo: vehicle, packages, items, mantItem
- Order by createdAt desc

**Estado**: ✅ Funcional

---

### 4. API Alertas - Cálculo Automático (70% Funcional)

**Endpoint**: `GET /api/maintenance/alerts`

**Ubicación**: `src/app/api/maintenance/alerts/route.ts`

**Lógica Implementada** (líneas 9-79):

```typescript
// 1. Obtener items PENDING con scheduledKm
const maintenanceItems = await prisma.vehicleProgramItem.findMany({
  where: {
    status: 'PENDING',
    scheduledKm: { not: null },
    package: {
      program: {
        status: 'ACTIVE',
        isActive: true
      }
    }
  },
  include: {
    package: {
      include: {
        program: {
          include: {
            vehicle: true // Para obtener km actual
          }
        }
      }
    },
    mantItem: true
  }
});

// 2. Calcular estado de alerta para cada item
const alerts = maintenanceItems.map((item) => {
  const vehicle = item.package.program.vehicle;
  const currentKm = vehicle.mileage;          // Km actual del vehículo
  const executionKm = item.scheduledKm;        // Km programado
  const kmToMaintenance = executionKm - currentKm;

  // ✅ DETERMINAR ESTADO (YELLOW/RED)
  let state: "YELLOW" | "RED" = "YELLOW";
  if (kmToMaintenance <= 500) {
    state = "RED";      // Crítico: ≤ 500 km
  } else if (kmToMaintenance <= 2000) {
    state = "YELLOW";   // Atención: ≤ 2000 km
  }

  return {
    id: item.id,
    vehiclePlate: vehicle.licensePlate,
    currentKm: currentKm,
    executionKm: executionKm,
    kmToMaintenance: Math.max(0, kmToMaintenance),
    state: state,
    status: "ACTIVE"
  };
});

// 3. Filtrar solo alertas próximas (≤ 3000 km)
const filteredAlerts = alerts.filter(
  alert => alert.kmToMaintenance <= 3000
);

// 4. Ordenar por urgencia
const sortedAlerts = filteredAlerts.sort(
  (a, b) => a.kmToMaintenance - b.kmToMaintenance
);

return NextResponse.json(sortedAlerts);
```

**Estados de alerta**:
- **RED**: ≤ 500 km restantes (crítico)
- **YELLOW**: ≤ 2000 km restantes (atención)
- **No mostrar**: > 3000 km restantes

**¿Qué falta?**:
- ⚠️ Trigger automático (Cron job)
- ⚠️ Envío de notificaciones WhatsApp
- ⚠️ UI para visualizar alertas

**Estado**: ⚠️ Lógica completa, falta trigger y UI

---

### 5. Sistema de Notificaciones (100% Preparado)

**Ubicación**: `src/lib/notifications/`

**Archivos**:
- `whatsapp.ts` - Cliente Twilio ✅
- `message-templates.ts` - Templates de mensajes ✅
- `notification-service.ts` - Orquestador ✅

**Funcionalidad disponible**:
```typescript
// Servicio listo para usar
const notificationService = getNotificationService();

// Enviar alertas de mantenimiento
await notificationService.sendMaintenanceAlerts(tenantId);

// Obtener alertas
const alerts = await notificationService.getMaintenanceAlerts(tenantId);

// Enviar mensaje de prueba
await notificationService.sendTestAlert(phone, tenantId);
```

**Estado**: ✅ Sistema completo, solo falta integrarlo con trigger

---

## ❌ LO QUE FALTA IMPLEMENTAR

### 1. UI - Formulario Asignar Programa (0% - CRÍTICO)

**¿Dónde debería estar?**
- Opción A: Modal en `/dashboard/maintenance/vehicle-programs/`
- Opción B: Página dedicada `/dashboard/vehicles/fleet/[id]/assign-program`
- **Recomendación**: Opción A (modal en vehicle-programs)

**Componente a crear**: `FormAssignProgram.tsx`

**Funcionalidad necesaria**:
```typescript
interface FormAssignProgramProps {
  vehicleId: number;
  onSuccess: () => void;
}

// Campos del formulario:
// 1. Select: Template (filtrado por marca/línea del vehículo)
// 2. Input: Kilometraje inicial (assignmentKm)
//    - Placeholder: "Ej: 32000"
//    - Validación: Debe ser > 0
//    - Sugerencia: Mostrar km actual del vehículo si existe
// 3. Botón: "Generar Programa"

// Al submit:
POST /api/maintenance/vehicle-programs
{
  vehicleId: vehicleId,
  templateId: selectedTemplateId,
  assignmentKm: parseInt(kmInput),
  generatedBy: currentUserId
}
```

**UI/UX sugerida**:
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>
      <Plus className="mr-2" />
      Asignar Programa de Mantenimiento
    </Button>
  </DialogTrigger>

  <DialogContent>
    <DialogHeader>
      <DialogTitle>Asignar Programa de Mantenimiento</DialogTitle>
      <DialogDescription>
        Selecciona un template y registra el kilometraje inicial del vehículo
      </DialogDescription>
    </DialogHeader>

    <Form>
      {/* Select Template */}
      <FormField
        name="templateId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Template de Mantenimiento</FormLabel>
            <Select onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} - {t.brand.name} {t.line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {/* Input Kilometraje Inicial */}
      <FormField
        name="assignmentKm"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Kilometraje Inicial del Vehículo</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Ej: 32000"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Kilometraje actual del vehículo al momento de asignar el programa
            </FormDescription>
          </FormItem>
        )}
      />

      {/* Preview de Paquetes */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Preview de Paquetes</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTemplate.packages.map(pkg => (
              <div key={pkg.id}>
                <Badge>{pkg.name}</Badge>
                <span className="ml-2">
                  Se ejecutará a los {assignmentKm + pkg.triggerKm} km
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DialogFooter>
        <Button type="submit">Generar Programa</Button>
      </DialogFooter>
    </Form>
  </DialogContent>
</Dialog>
```

**Validaciones**:
- Vehículo no puede tener programa activo ya
- Template debe ser compatible (marca/línea)
- assignmentKm > 0 y razonable (< 500000)

**Prioridad**: 🔴 CRÍTICA - Sin esto no se pueden crear programas

---

### 2. Lógica de Recalculo al Completar (0% - CRÍTICA)

**Contexto del problema**:

Cuando un mantenimiento se ejecuta CON RETRASO, el siguiente debe calcularse desde el km REAL de ejecución, no desde el programado original.

**Ejemplo**:

```
Vehículo entra con: 32,000 km
Paquete cada: 2,000 km

✅ CORRECTO:
- 1er mant programado: 34,000 km
- Se ejecuta con retraso a: 34,500 km (executedKm)
- 2do mant debe ser: 36,500 km (34,500 + 2,000) ✅

❌ INCORRECTO:
- 2do mant sería: 36,000 km (34,000 + 2,000) ❌
  → Pierde los 500 km de retraso
```

**¿Dónde implementar?**

**Opción A: Al completar WorkOrder** (Recomendada)
```typescript
// PUT /api/work-orders/[id]/complete
export async function PUT(req: Request, { params }) {
  const { executedKm, completedBy } = await req.json();

  await prisma.$transaction(async (tx) => {
    // 1. Actualizar el item actual a COMPLETED
    await tx.vehicleProgramItem.update({
      where: { id: itemId },
      data: {
        status: 'COMPLETED',
        executedKm: executedKm,
        executedDate: new Date()
      }
    });

    // 2. Obtener info del package para recalcular
    const item = await tx.vehicleProgramItem.findUnique({
      where: { id: itemId },
      include: {
        package: true
      }
    });

    // 3. RECALCULAR siguiente mantenimiento
    const triggerKm = item.package.triggerKm;
    const nextScheduledKm = executedKm + triggerKm; // ✅ Desde km real

    // 4. Generar NUEVO item para siguiente ciclo
    await tx.vehicleProgramItem.create({
      data: {
        tenantId: item.tenantId,
        packageId: item.packageId,
        mantItemId: item.mantItemId,
        mantType: item.mantType,
        scheduledKm: nextScheduledKm, // ✅ Calculado desde executedKm
        status: 'PENDING'
      }
    });
  });
}
```

**Opción B: Endpoint separado**
```typescript
// POST /api/maintenance/vehicle-programs/[id]/recalculate
```

**Decisiones de diseño**:

1. **¿Crear item automáticamente o solo actualizar scheduledKm del package?**
   - Recomendación: Crear NUEVO item para siguiente ciclo
   - Ventaja: Historial completo (un item por cada ejecución)

2. **¿Recalcular todos los paquetes o solo el ejecutado?**
   - Recomendación: Solo el ejecutado
   - Razón: Cada paquete tiene su propio intervalo

3. **¿Qué pasa si se ejecuta ANTES del programado?**
   - Ejemplo: Programado 34,000, ejecutado 33,800
   - Siguiente: 33,800 + 2,000 = 35,800 ✅
   - Ventaja: Flexibilidad

**Prioridad**: 🔴 CRÍTICA - Sin esto los ciclos no se repiten

---

### 3. Trigger Automático - Cron Job (0% - ALTA)

**Objetivo**: Ejecutar verificación diaria de alertas

**Implementación**: Vercel Cron Jobs

**Paso 1: Crear endpoint**

**Archivo**: `src/app/api/cron/preventive-check/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getNotificationService } from '@/lib/notifications/notification-service';

// Validar que solo Vercel Cron pueda llamar
export async function GET(request: Request) {
  // Verificar Authorization header de Vercel Cron
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const notificationService = getNotificationService();
    const tenantId = 'mvp-default-tenant'; // MVP single-tenant

    // Obtener alertas críticas (RED)
    const criticalAlerts = await notificationService.getMaintenanceAlerts(
      tenantId,
      true // urgent only
    );

    console.log(`[CRON] Found ${criticalAlerts.length} critical alerts`);

    // Enviar notificaciones WhatsApp
    if (criticalAlerts.length > 0) {
      const result = await notificationService.sendMaintenanceAlerts(
        tenantId,
        true // urgent only
      );

      console.log(`[CRON] Sent ${result.messagesSent} notifications`);

      return NextResponse.json({
        success: true,
        alertsProcessed: result.alertsProcessed,
        messagesSent: result.messagesSent
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No critical alerts to process'
    });

  } catch (error) {
    console.error('[CRON] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

**Paso 2: Configurar en vercel.json**

**Archivo**: `vercel.json` (root del proyecto)

```json
{
  "crons": [
    {
      "path": "/api/cron/preventive-check",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Schedule**: `0 6 * * *` = Diario a las 6:00 AM

**Paso 3: Configurar CRON_SECRET**

```bash
# En Vercel Dashboard → Settings → Environment Variables
CRON_SECRET=<random-string-here>
```

**Testing local**:
```bash
# Llamar endpoint manualmente
curl http://localhost:3000/api/cron/preventive-check \
  -H "Authorization: Bearer your-cron-secret"
```

**Prioridad**: 🟡 ALTA - Automatización core del sistema

---

### 4. UI - Página de Alertas (0% - ALTA)

**Ubicación**: `src/app/dashboard/maintenance/alerts/page.tsx`

**Funcionalidad**:
- Listar alertas desde API `/api/maintenance/alerts`
- Cards con estados visuales (YELLOW/RED)
- Acción: "Crear Orden de Trabajo"
- Filtros: Por estado, por vehículo

**Componente sugerido**:

```tsx
export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('/api/maintenance/alerts')
      .then(res => res.json())
      .then(setAlerts);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1>Alertas de Mantenimiento</h1>
        <Badge variant="destructive">
          {alerts.filter(a => a.state === 'RED').length} Críticas
        </Badge>
      </div>

      <div className="grid gap-4">
        {alerts.map(alert => (
          <Card key={alert.id} className={cn(
            alert.state === 'RED' && 'border-red-500',
            alert.state === 'YELLOW' && 'border-yellow-500'
          )}>
            <CardHeader>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    alert.state === 'RED' ? 'destructive' : 'warning'
                  }>
                    {alert.state}
                  </Badge>
                  <span className="font-bold">
                    {alert.vehiclePlate}
                  </span>
                </div>
                <Badge variant="outline">
                  {alert.kmToMaintenance} km restantes
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <p>{alert.mantItemDescription}</p>
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Km actual: {alert.currentKm.toLocaleString()}</p>
                <p>Programado: {alert.executionKm.toLocaleString()}</p>
              </div>
            </CardContent>

            <CardFooter>
              <Button onClick={() => createWorkOrder(alert.id)}>
                <Plus className="mr-2" />
                Crear Orden de Trabajo
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Prioridad**: 🟡 ALTA - Interfaz principal de alertas

---

### 5. API - Crear WorkOrder desde Alerta (0% - MEDIA)

**Endpoint**: `POST /api/work-orders/from-alert`

**Input**:
```json
{
  "programItemId": 123,
  "assignedToId": 456,
  "notes": "Revisión preventiva programada"
}
```

**Lógica**:
```typescript
export async function POST(req: Request) {
  const { programItemId, assignedToId, notes } = await req.json();

  // 1. Obtener el item de mantenimiento
  const item = await prisma.vehicleProgramItem.findUnique({
    where: { id: programItemId },
    include: {
      package: {
        include: {
          program: {
            include: { vehicle: true }
          }
        }
      },
      mantItem: true
    }
  });

  // 2. Crear WorkOrder
  const workOrder = await prisma.workOrder.create({
    data: {
      tenantId: item.tenantId,
      vehicleId: item.package.program.vehicleId,
      type: 'PREVENTIVE',
      priority: item.priority,
      status: 'PENDING',
      title: `${item.mantItem.name} - ${item.package.program.vehicle.licensePlate}`,
      description: notes,
      assignedToId: assignedToId,
      scheduledDate: new Date(),
      estimatedCost: item.estimatedCost
    }
  });

  // 3. Vincular con el item (opcional: campo workOrderId en VehicleProgramItem)
  await prisma.vehicleProgramItem.update({
    where: { id: programItemId },
    data: {
      // workOrderId: workOrder.id (si existe el campo)
      status: 'IN_PROGRESS'
    }
  });

  return NextResponse.json(workOrder);
}
```

**Prioridad**: 🟢 MEDIA - Sprint 2 (Work Orders)

---

## 📋 RESUMEN - SPRINT 1 REDEFINIDO

### Tasks CRÍTICAS (Must Have)

| # | Task | Complejidad | Estimación | Prioridad |
|---|------|-------------|------------|-----------|
| 1 | **UI FormAssignProgram** | Media | 4h | 🔴 CRÍTICA |
| 2 | **Lógica Recalculo al Completar** | Alta | 6h | 🔴 CRÍTICA |
| 3 | **UI Página de Alertas** | Media | 4h | 🟡 ALTA |
| 4 | **Cron Job Preventive Check** | Baja | 2h | 🟡 ALTA |
| 5 | **Testing Ciclo Completo** | Media | 4h | 🟡 ALTA |

**Total estimado**: 20 horas (~2 semanas de trabajo)

---

### Tasks SECUNDARIAS (Should Have)

| # | Task | Sprint |
|---|------|--------|
| 6 | API crear WorkOrder desde alerta | Sprint 2 |
| 7 | Notificaciones WhatsApp automáticas | Sprint 1 (ya existe servicio) |
| 8 | Filtros y búsqueda en alertas | Sprint 2 |
| 9 | Dashboard widget alertas | Sprint 5 |

---

## 🎯 DEFINICIÓN DE "DONE" PARA SPRINT 1

### Criterios de Aceptación

✅ **Historia de Usuario**:
> "Como administrador, quiero asignar un programa de mantenimiento a un vehículo ingresando su kilometraje inicial, para que el sistema genere automáticamente todos los mantenimientos programados con las fechas/kms correctos"

**Acceptance Criteria**:
1. Existe botón "Asignar Programa" en UI
2. Modal permite seleccionar template e ingresar km inicial
3. Al confirmar, se genera VehicleMantProgram con todos los packages/items
4. scheduledKm se calcula correctamente (assignmentKm + triggerKm)
5. Vehículo solo puede tener 1 programa activo
6. Se muestra confirmación de éxito con preview de paquetes generados

---

✅ **Historia de Usuario**:
> "Como sistema, quiero recalcular automáticamente el próximo mantenimiento basándome en el kilometraje REAL de ejecución, para mantener los intervalos correctos aunque haya retrasos"

**Acceptance Criteria**:
1. Al completar un mantenimiento, se registra executedKm
2. Se genera nuevo item con scheduledKm = executedKm + triggerKm
3. Si se ejecuta con retraso, el siguiente mantiene el intervalo desde el km real
4. Si se ejecuta anticipado, también ajusta correctamente
5. Historial completo (cada ejecución = 1 item)

---

✅ **Historia de Usuario**:
> "Como administrador, quiero ver un listado de todas las alertas de mantenimiento próximas, ordenadas por urgencia, para priorizar las acciones"

**Acceptance Criteria**:
1. Página `/dashboard/maintenance/alerts` muestra todas las alertas
2. Alertas RED (≤500 km) se destacan visualmente
3. Alertas YELLOW (≤2000 km) visible pero menos urgente
4. Ordenadas por kmToMaintenance (menos km = más urgente)
5. Muestra: placa, km actual, km programado, km restantes, item a ejecutar
6. Actualiza en tiempo real al cambiar kilometraje

---

✅ **Historia de Usuario**:
> "Como sistema, quiero verificar diariamente los vehículos que requieren mantenimiento y enviar notificaciones automáticas, para que nadie se olvide de un mantenimiento"

**Acceptance Criteria**:
1. Cron job se ejecuta diario a las 6:00 AM
2. Detecta alertas críticas (RED)
3. Envía notificación WhatsApp a supervisores
4. Log de ejecución y resultados
5. Manejo de errores (reintentos, fallbacks)

---

## 📊 FLUJO COMPLETO IMPLEMENTADO

### Flujo Exitoso (End-to-End)

```
1. SETUP INICIAL
   └─> Admin crea MaintenanceTemplate
       └─> Define packages (2k, 4k, 6k, 8k...)
           └─> Agrega items a cada package

2. ASIGNACIÓN [SPRINT 1 - TASK 1]
   └─> Admin selecciona vehículo
       └─> Click "Asignar Programa"
           └─> Selecciona template compatible
               └─> Ingresa km inicial: 32,000
                   └─> API genera:
                       - VehicleMantProgram (assignmentKm: 32000)
                       - Package 2k (scheduledKm: 34000)
                       - Package 4k (scheduledKm: 36000)
                       - ... más packages

3. MONITOREO [SPRINT 1 - TASK 4]
   └─> Cron diario @ 6:00 AM
       └─> Verifica km actual vs scheduledKm
           └─> Vehículo ahora tiene 33,600 km
               └─> Package 2k: 34,000 - 33,600 = 400 km → RED ⚠️
                   └─> Genera alerta
                       └─> Envía WhatsApp a supervisores

4. VISUALIZACIÓN [SPRINT 1 - TASK 3]
   └─> Admin entra a /dashboard/maintenance/alerts
       └─> Ve alerta RED: "Cambio aceite - ABC-123 - 400 km restantes"
           └─> Click "Crear Orden de Trabajo" [Sprint 2]

5. EJECUCIÓN [Sprint 2]
   └─> Técnico ejecuta mantenimiento
       └─> Registra km real: 34,500 (con retraso de 500 km)
           └─> Completa WorkOrder

6. RECALCULO [SPRINT 1 - TASK 2]
   └─> Sistema detecta completado
       └─> Marca item actual: COMPLETED (executedKm: 34,500)
           └─> Calcula siguiente: 34,500 + 2,000 = 36,500 km
               └─> Crea nuevo item: scheduledKm: 36,500 ✅
                   └─> Ciclo continúa...
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Semana 1 (Lun 07 - Vie 11 Oct)

**Día 1-2: UI Asignar Programa**
- Crear `FormAssignProgram.tsx`
- Integrar en página vehicle-programs
- Testing con templates existentes

**Día 3: Lógica Recalculo**
- Decidir: ¿Endpoint separado o en completar WO?
- Implementar generación de siguiente item
- Tests unitarios del cálculo

**Día 4-5: UI Alertas + Cron**
- Crear página `/dashboard/maintenance/alerts`
- Implementar Cron Job
- Testing manual del flujo completo

---

### Semana 2 (Lun 14 - Vie 18 Oct)

**Día 1-2: Testing E2E**
- Crear programa desde template
- Simular avance de kilometraje
- Verificar alertas generadas
- Completar mantenimiento
- Verificar recalculo

**Día 3: Fixes & Refinamiento**
- Bugs encontrados en testing
- Validaciones faltantes
- Mejoras UX

**Día 4-5: Documentación & Deploy**
- Documentar flujo para usuarios
- Screenshots de cada paso
- Deploy a staging
- Demo con stakeholders

---

## 📚 REFERENCIAS

### Archivos Clave

1. **API Generar Programa**: `src/app/api/maintenance/vehicle-programs/route.ts`
2. **API Alertas**: `src/app/api/maintenance/alerts/route.ts`
3. **Schema Prisma**: `prisma/schema.prisma` (líneas 895-1020)
4. **Notificaciones**: `src/lib/notifications/`

### Sesiones Anteriores

1. **29-Sep**: Implementación VehicleMantProgram
2. **26-Sep**: Migración MaintenanceTemplate
3. **25-Sep**: Paquetes de mantenimiento

---

## ✅ CHECKLIST PRE-SPRINT 1

Antes de comenzar Sprint 1, verificar:

- [ ] Schema Prisma actualizado con todos los campos
- [ ] API POST /vehicle-programs funcional
- [ ] API GET /alerts funcional
- [ ] Sistema de notificaciones configurado (Twilio)
- [ ] Templates de mantenimiento creados en DB
- [ ] Vehículos de prueba con km actualizados
- [ ] Environment variables configuradas

---

**Documento creado**: 07 Octubre 2025
**Sprint objetivo**: Sprint 1 - Preventivo Core
**Status**: Listo para comenzar implementación
