# Propuesta de Modificaciones al Schema para Gestión Financiera

Este documento detalla los cambios propuestos al archivo `prisma/schema.prisma` para introducir una gestión de costos más granular en las órdenes de trabajo.

## Resumen del Cambio

El objetivo es reemplazar los campos de costo singulares (como `realAmount` en `WorkOrder` y `cost` en `WorkOrderItem`) por un modelo dedicado `WorkOrderExpense`. Esto permitirá desglosar cada gasto de una orden de trabajo en categorías como Repuestos, Mano de Obra, Servicios de Terceros, etc., habilitando un análisis financiero detallado.

---

## 1. Nueva Enumeración (`enum`)

Se propone añadir un nuevo `enum` para categorizar los tipos de gastos.

```prisma
enum ExpenseType {
  PARTS
  LABOR
  SERVICE
  OTHER
}
```

Este `enum` se añadirá al final de la sección de enumeraciones en el archivo `schema.prisma`.

---

## 2. Nuevo Modelo (`model`)

Se creará un nuevo modelo `WorkOrderExpense` que se convertirá en la tabla central para todos los costos asociados a una orden de trabajo.

```prisma
model WorkOrderExpense {
  id          Int         @id @default(autoincrement())
  workOrderId Int
  description String
  type        ExpenseType
  quantity    Decimal     @default(1) @db.Decimal(10, 2)
  unitCost    Decimal     @db.Decimal(10, 2)
  totalCost   Decimal     @db.Decimal(10, 2) // Calculado: quantity * unitCost
  providerId  Int?        // Opcional: Para registrar quién proveyó el repuesto o servicio

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  workOrder   WorkOrder   @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  provider    Provider?   @relation(fields: [providerId], references: [id])

  @@index([workOrderId])
  @@index([providerId])
  @@index([type])
}
```

Este modelo se añadirá después del modelo `WorkOrderItem`.

---

## 3. Modificaciones a Modelos Existentes

Para integrar el nuevo sistema de gastos, los siguientes modelos deben ser modificados.

### a. Modelo `WorkOrder`

- **Eliminar:** El campo `realAmount`. Su valor ahora será una suma calculada de los `totalCost` en `WorkOrderExpense`.
- **Añadir:** Una relación `expenses` hacia el nuevo modelo `WorkOrderExpense`.

```prisma
// En el modelo WorkOrder

// --- CAMBIO ---
// Eliminar la siguiente línea:
// realAmount      Decimal?        @db.Decimal(10, 2)

// Añadir la siguiente línea al final de las relaciones:
expenses        WorkOrderExpense[]
// --- FIN CAMBIO ---
```

### b. Modelo `WorkOrderItem`

- **Eliminar:** El campo `cost`. La responsabilidad del costo se traslada completamente a `WorkOrderExpense`.

```prisma
// En el modelo WorkOrderItem

// --- CAMBIO ---
// Eliminar la siguiente línea:
// cost             Decimal? @db.Decimal(10, 2)
// --- FIN CAMBIO ---
```

### c. Modelo `Provider`

- **Añadir:** Una relación `workOrderExpenses` para poder rastrear todos los gastos (repuestos o servicios) asociados a un proveedor.

```prisma
// En el modelo Provider

// --- CAMBIO ---
// Añadir la siguiente línea al final de las relaciones:
workOrderExpenses   WorkOrderExpense[]
// --- FIN CAMBIO ---
```

---

## Impacto y Pasos Siguientes

1.  **Migración de Base de Datos:** Una vez aplicados estos cambios en `schema.prisma`, deberás ejecutar `npx prisma migrate dev --name financial_module` (o un nombre similar) para generar y aplicar la nueva migración a tu base de datos.
2.  **Ajustes en el Backend:**
    -   La lógica para crear/actualizar `WorkOrder` deberá ser modificada. En lugar de escribir en `realAmount`, deberás crear registros en la tabla `WorkOrderExpense`.
    -   Cualquier lugar donde se lea `realAmount` deberá ser reemplazado por una consulta que sume los `totalCost` de los `WorkOrderExpense` relacionados.
    -   La creación de `WorkOrderItem` ya no incluirá el campo `cost`.
3.  **Ajustes en el Frontend:**
    -   Los formularios para registrar los detalles de una orden de trabajo necesitarán una nueva sección para añadir, editar y eliminar gastos (items de `WorkOrderExpense`).
    -   Los reportes y vistas que mostraban el costo total deberán ser actualizados para usar la nueva estructura de datos.

Esta reestructuración representa una base sólida para futuras funcionalidades, como la gestión de inventario de repuestos y un análisis de rentabilidad más avanzado.
