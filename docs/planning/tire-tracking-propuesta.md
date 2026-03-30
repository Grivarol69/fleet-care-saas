# Tire Tracking — Propuesta de Diseño

**Fecha:** 2026-03-20
**Estado:** En discusión — NO iniciado
**Módulo relacionado:** fuel-tracking (referencia de arquitectura)

---

## 1. Contexto y Motivación

El cliente necesita:

- Saber cuándo se colocaron neumáticos nuevos en cada vehículo
- Conocer en qué posición está cada neumático (rueda delantera derecha, trasera izquierda, etc.)
- Registrar el desgaste mediante inspecciones periódicas (% de vida útil)
- Registrar rotaciones entre posiciones
- Dar de baja neumáticos cuando se retiran del servicio
- Visualizar todo esto de forma gráfica con un diagrama del vehículo

---

## 2. Decisión de Arquitectura — Módulo Separado

**Decisión:** Tire tracking es un módulo independiente, no un tab dentro de las Órdenes de Trabajo.

**Razón principal:** Una rotación de neumáticos es una operación de 5 minutos que en la vida real no genera una OT formal. Obligar a abrir una OT para rotar neumáticos hace el sistema burocrático y la gente deja de usarlo. Lo mismo aplica para medición de desgaste en inspección rutinaria.

**Analogía:** Similar a `fuel-tracking` — módulo propio con su entrada en la sidebar.

**Vínculo con OT:** Las acciones de neumático realizadas dentro de una OT de mantenimiento pueden referenciarse opcionalmente a través del campo `workOrderId` en `TireEvent`. No es obligatorio.

---

## 3. Navegación y UX

### Entrada en Sidebar

```
/dashboard/tires
```

Nueva entrada en el sidebar (igual que Combustible, Mantenimiento, etc.)

### Pantalla 1 — Lista de Vehículos

Similar a la pantalla de asignación de vehículos a planes de mantenimiento:

- Grilla/tabla de todos los vehículos del tenant
- Columnas: Patente, Marca, Modelo, Tipo, Neumáticos instalados, Alertas
- Click en un vehículo → navega al detalle

### Pantalla 2 — Detalle de Vehículo

Layout dividido:

- **Izquierda:** Tabla de eventos del vehículo (historial)
- **Derecha:** Diagrama SVG del vehículo con posiciones de ruedas

#### Interacción con el diagrama

- **Click en posición vacía** → abre buscador de neumáticos `IN_STOCK` → selecciona → crea evento ALTA
- **Click en neumático instalado** → abre dialog con:
  - Número de serie
  - Marca y rodado
  - Fecha de instalación
  - Km al momento de instalación
  - Último % de vida útil registrado
  - Indicador visual (semáforo)
  - Botones de acción: `[Registrar Revisión]` `[Rotar]` `[Dar de Baja]`

#### Semáforo de vida útil

| Rango   | Color    | Significado       |
| ------- | -------- | ----------------- |
| 70–100% | Verde    | Buen estado       |
| 30–69%  | Amarillo | Atención          |
| < 30%   | Rojo     | Reemplazar pronto |

---

## 4. Representación Gráfica del Vehículo

### Decisión: SVG por categoría de vehículo (NO por marca/modelo)

Obtener imágenes reales de cada marca/modelo es inviable:

- No existe base de datos pública estandarizada con vista cenital
- Las imágenes de fabricantes son de marketing, sin perspectiva consistente
- Para superponer ruedas se necesita precisión controlable → SVG
- Todos los sistemas de flota del mercado (Fleetio, Samsara, Chevin) usan este mismo enfoque

### Categorías de vehículo → SVG

| Categoría (`bodyType`) | Cubre                       | Ruedas |
| ---------------------- | --------------------------- | ------ |
| `SEDAN_SUV`            | Autos, SUVs                 | 4      |
| `PICKUP`               | Hilux, Ranger, Amarok       | 4      |
| `VAN`                  | Sprinter, Transit, furgones | 4      |
| `LIGHT_TRUCK`          | Camión ligero (pacha)       | 6      |
| `MEDIUM_TRUCK`         | Camión 3 ejes               | 10     |
| `HEAVY_TRUCK`          | Camión 4 ejes               | 14     |
| `SEMI`                 | Tracto + semirremolque      | 18     |

Cada SVG es una **silueta vista desde arriba**, bien diseñada (con volumen, sombra, detalle). Las ruedas se renderizan como una capa SVG encima de la silueta, con coordenadas exactas por posición.

### Fuentes de SVGs

- The Noun Project / Flaticon (íconos con licencia)
- Diseño custom por categoría (opción preferida — se hace una vez, se reutiliza siempre)

### Configuración de ejes (`axleConfig`)

El `axleConfig` del vehículo determina qué posiciones están disponibles en el SVG:

| Código       | Nombre                      | Ejes                | Ruedas totales |
| ------------ | --------------------------- | ------------------- | -------------- |
| `STANDARD_4` | Auto / SUV / Pickup         | 2 simples           | 4 (+repuesto)  |
| `PACHA_6`    | Camión ligero trasero doble | 1 simple + 1 doble  | 6 (+repuesto)  |
| `TRUCK_10`   | Camión 3 ejes               | 1 simple + 2 dobles | 10 (+repuesto) |
| `TRUCK_14`   | Camión 4 ejes               | 1 simple + 3 dobles | 14 (+repuesto) |
| `SEMI_18`    | Tracto + semirremolque      | múltiples           | 18             |

---

## 5. Modelo de Datos

### 5.1 `Tire` — El objeto físico

```prisma
model Tire {
  id           String     @id @default(uuid())
  tenantId     String
  serialNumber String                          // único por tenant
  brand        String
  tireSize     String                          // ej: "245/70R16"
  model        String?
  purchaseDate DateTime?
  status       TireStatus @default(IN_STOCK)
  workOrderId  String?                         // OT por la que ingresó (opcional)

  vehicleTire  VehicleTire?
  events       TireEvent[]
  tenant       Tenant      @relation(...)

  @@unique([tenantId, serialNumber])
  @@index([tenantId])
  @@index([status])
}

enum TireStatus {
  IN_STOCK   // Disponible para instalar
  INSTALLED  // Actualmente en un vehículo
  RETIRED    // Dado de baja — estado terminal (no vuelve a stock)
}
```

**Nota importante:** Cuando un neumático se retira de un vehículo, va directamente a `RETIRED`. No existe vuelta a `IN_STOCK`. Si el neumático todavía sirve, igualmente se da de baja del sistema (decisión de diseño acordada).

### 5.2 `VehicleTire` — Asignación actual (estado presente)

```prisma
model VehicleTire {
  id          String       @id @default(uuid())
  tenantId    String
  vehicleId   String
  tireId      String       @unique            // un neumático, un único lugar
  position    TirePosition                    // posición actual
  installedAt DateTime
  installedKm Int?
  removedAt   DateTime?                       // null = activo, fecha = retirado

  vehicle     Vehicle      @relation(...)
  tire        Tire         @relation(...)
  events      TireEvent[]
  tenant      Tenant       @relation(...)

  @@index([vehicleId])
  @@index([tenantId])
}
```

**Lógica de estado:**

- `removedAt IS NULL` = neumático actualmente instalado en esa posición
- `removedAt IS NOT NULL` = historial (ya fue retirado)

### 5.3 `TireEvent` — Historial completo (append-only)

```prisma
model TireEvent {
  id            String        @id @default(uuid())
  tenantId      String
  vehicleTireId String
  tireId        String
  vehicleId     String

  type          TireEventType
  position      TirePosition              // posición actual / destino
  prevPosition  TirePosition?            // solo en ROTACION
  date          DateTime
  odometer      Int?                     // km del vehículo al momento del evento
  usefulLifePct Int                      // 0–100, ingreso manual del técnico
  treadDepthMm  Decimal?  @db.Decimal(4,1)  // medición opcional en mm
  notes         String?
  performedBy   String                   // userId del técnico
  workOrderId   String?                  // link opcional a OT

  vehicleTire   VehicleTire @relation(...)
  tire          Tire        @relation(...)
  tenant        Tenant      @relation(...)

  @@index([tireId])
  @@index([vehicleId])
  @@index([tenantId])
}

enum TireEventType {
  ALTA      // Instalación en vehículo
  REVISION  // Inspección / medición de desgaste
  ROTACION  // Cambio de posición dentro del mismo vehículo
  BAJA      // Retiro del vehículo → Tire.status = RETIRED
}
```

### 5.4 `TirePosition` — Posiciones por sigla

```prisma
enum TirePosition {
  // Eje delantero (todos los vehículos)
  D_IZQ        // Delantera Izquierda
  D_DER        // Delantera Derecha

  // Eje trasero simple (STANDARD_4)
  T_IZQ        // Trasera Izquierda
  T_DER        // Trasera Derecha

  // Eje trasero 1 doble (PACHA_6, TRUCK_10, TRUCK_14)
  T1_IZQ_EXT   // Trasera 1 Izquierda Exterior
  T1_IZQ_INT   // Trasera 1 Izquierda Interior
  T1_DER_EXT   // Trasera 1 Derecha Exterior
  T1_DER_INT   // Trasera 1 Derecha Interior

  // Eje trasero 2 doble (TRUCK_10, TRUCK_14)
  T2_IZQ_EXT
  T2_IZQ_INT
  T2_DER_EXT
  T2_DER_INT

  // Eje trasero 3 doble (TRUCK_14, SEMI_18)
  T3_IZQ_EXT
  T3_IZQ_INT
  T3_DER_EXT
  T3_DER_INT

  REPUESTO     // Neumático de repuesto
}
```

El `axleConfig` del vehículo define el subconjunto de posiciones válidas. La aplicación valida que no se asigne un neumático a una posición que no corresponde al tipo de vehículo.

---

## 6. Flujo Operativo Completo

### Ingreso de neumáticos al sistema

1. COMPRAS recibe neumáticos (como parte de una OT o compra directa)
2. Crea registros `Tire`: serialNumber, marca, rodado, fecha compra
3. `Tire.status = IN_STOCK`

### Instalación (ALTA)

1. Operador/Técnico va a `/dashboard/tires`
2. Selecciona el vehículo
3. Click en posición vacía en el diagrama SVG
4. Buscador filtra neumáticos `IN_STOCK` del tenant
5. Selecciona el neumático por número de serie
6. Ingresa: fecha, odómetro, % vida útil inicial (100%)
7. Sistema crea:
   - `VehicleTire` (nueva asignación activa)
   - `TireEvent(ALTA, usefulLifePct: 100)`
   - Actualiza `Tire.status = INSTALLED`

### Revisión / Medición de desgaste (REVISION)

1. Click en neumático instalado en el diagrama
2. Selecciona "Registrar Revisión"
3. Ingresa: fecha, odómetro, % vida útil actual, profundidad surco (opcional), notas
4. Sistema crea `TireEvent(REVISION, usefulLifePct: X)`
5. **Si `usefulLifePct < 30`** → Sistema crea alerta automática:
   - Tipo: `AlertType.TIRE_WEAR`
   - Aparece en el dashboard (Watchdog Financiero o sección propia)
   - Mensaje: "Neumático [serial] en [vehículo] posición [pos] al X% de vida útil"

### Rotación (ROTACION)

1. Click en neumático instalado → "Rotar"
2. Selecciona posición destino (debe estar vacía o intercambiar)
3. Ingresa: fecha, odómetro
4. Sistema crea `TireEvent(ROTACION, prevPosition: A, position: B)`
5. Actualiza `VehicleTire.position`

### Baja (BAJA)

1. Click en neumático instalado → "Dar de Baja"
2. Ingresa: fecha, odómetro, % vida útil final, motivo (notas)
3. Sistema:
   - Crea `TireEvent(BAJA)`
   - Actualiza `VehicleTire.removedAt = now()`
   - Actualiza `Tire.status = RETIRED` (estado terminal)

---

## 7. Sistema de Alertas de Desgaste

Cuando `TireEvent.usefulLifePct < 30` al guardar cualquier evento:

```typescript
// En el API endpoint de TireEvent
if (usefulLifePct < TIRE_WEAR_THRESHOLD) {
  await prisma.financialAlert.create({
    // o nueva tabla TireAlert
    data: {
      tenantId,
      type: AlertType.TIRE_WEAR,
      severity: AlertLevel.HIGH,
      status: AlertStatus.PENDING,
      message: `Neumático ${tire.serialNumber} en ${vehicle.licensePlate}
                posición ${position} al ${usefulLifePct}% de vida útil`,
      details: { tireId, vehicleId, position, usefulLifePct },
      vehicleId,
    },
  });
}
```

**Threshold:** 30% (hardcodeado por ahora, parametrizable si se solicita).

---

## 8. Integración con Módulos Existentes

### Con Órdenes de Trabajo

- `TireEvent.workOrderId` es opcional
- Cuando un neumático se instala/retira dentro de una OT → se vincula
- No hay tab de neumáticos dentro de la OT (el módulo es independiente)

### Con Inventario/Compras

- Los neumáticos entran por compras con número de serie
- Pendiente definir: ¿`Tire` es independiente de `MasterPart`/inventario existente, o se integra?
- **Decisión pendiente:** ¿Los neumáticos fluyen por el sistema de inventario existente (con `serialNumber` en `WorkOrderItem`) o tienen su propio flujo de ingreso?

### Con Watchdog Financiero

- Nueva alerta tipo `TIRE_WEAR` se suma a las alertas existentes
- Aparece en el widget "Watchdog Financiero" del dashboard o en sección propia

---

## 9. Campos en `Vehicle` a agregar

```prisma
model Vehicle {
  // ... campos existentes ...
  axleConfig  AxleConfig?   // STANDARD_4 | PACHA_6 | TRUCK_10 | TRUCK_14 | SEMI_18
  bodyType    VehicleBodyType? // Para selección de silueta SVG
  vehicleTires VehicleTire[]
}

enum AxleConfig {
  STANDARD_4   // Auto / SUV / Pickup — 4 ruedas
  PACHA_6      // Camión ligero trasero doble — 6 ruedas
  TRUCK_10     // Camión 3 ejes — 10 ruedas
  TRUCK_14     // Camión 4 ejes — 14 ruedas
  SEMI_18      // Tracto + semirremolque — 18 ruedas
}
```

---

## 10. Preguntas Abiertas / Pendientes

1. **Integración con inventario:** ¿Los neumáticos fluyen por el sistema de compras/inventario existente, o tienen su propio formulario de ingreso en el módulo de neumáticos?

2. **bodyType vs axleConfig:** ¿Son el mismo campo o dos campos separados? (el bodyType determina la silueta SVG, el axleConfig determina las posiciones disponibles — podrían derivar uno del otro)

3. **Silhouettes SVG:** ¿Se diseñan custom o se licencian de un banco de íconos?

4. **Alertas:** ¿Las alertas de desgaste van en el Watchdog Financiero existente o en una sección propia?

5. **Permisos:** ¿Quién puede registrar eventos? ¿Solo TECHNICIAN, o también MANAGER/OWNER?

6. **Aspectos de la propuesta original que no quedaron claros:** El usuario indicó que hay cosas que no le convencen del planteo — pendiente discusión.

---

## 11. SDDs Relacionados (orden de implementación)

| #   | Nombre                 | Dependencia                                             |
| --- | ---------------------- | ------------------------------------------------------- |
| 1   | `wo-workflow-refactor` | Independiente — estados + tabs OT                       |
| 2   | `tire-tracking`        | Requiere `wo-workflow-refactor` para `workOrderId` link |
| 3   | `watchdog-tire-wear`   | Requiere `tire-tracking`                                |
