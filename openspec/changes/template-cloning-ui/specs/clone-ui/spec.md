# Specifications: Template Cloning UI

## 1. Módulos Modificados

### 1.1 `POST /api/maintenance/mant-template/clone`
- **ADDED**: El Zod Schema debe requerir `vehicleBrandId` (string) y `vehicleLineId` (string).
- **ADDED**: El Zod Schema debe requerir `name` (string).
- **MODIFIED**: Al crear el clon en base de datos (`newTemplate`), asignar el `name`, `vehicleBrandId`, y `vehicleLineId` proveídos desde el frontend, en lugar de heredar los del origen con el prefijo "(Copia)".
- **REMOVED**: Durante la copia en cascada (`packageItems.create`), actualmente se vinculan tanto los `mantItemId` como se arrastran relaciones. No se deben clonar ni asociar `MasterParts` en la copia. El plan clonado tendrá los ítems de mantenimiento (tareas), pero estarán desvinculados de repuestos específicos de la marca origen.

### 1.2 Interfaz: Template Detail (`src/app/(dashboard)/maintenance/programs/[id]/page.tsx`)
- **ADDED**: Un botón de acción visible etiquetado como "Usar como plantilla" o "Clonar plan".
- **ADDED**: Al hacer clic, se debe abrir un componente modal interactivo.

### 1.3 Nuevo Componente: `CloneTemplateModal`
- **ADDED**: Desarrollar un componente Dialog utilizando Shadcn UI.
- **ADDED**: Dicho modal debe contener un pequeño formulario:
  - Input Text: Nuevo Nombre del Plan (Requerido).
  - Select / Combobox: Elija la Marca destino (Requerido).
  - Select / Combobox: Elija la Línea destino (Requerido, condicionado por la Marca).
- **ADDED**: Un botón Submit que consuma el endpoint modificado de `/clone`.
- **ADDED**: Lógica de Toast notificando éxito o fallo, con redirección al nuevo template creado.

## 2. Escenarios BDD

**Scenario**: Clonar un plan hacia un nuevo vehículo
- **Given** que soy un administrador y estoy visualizando el plan de "Toyota Hilux"
- **When** abro el modal de clonar y especifico "Plan Nissan", selecciono la marca "Nissan" y la línea "Frontier" y hago clic en clonar.
- **Then** el sistema crea un nuevo template llamado "Plan Nissan" asignado a la Frontier, y omito copiar los repuestos vinculados a las tareas originales del Toyota.

**Scenario**: Intentar clonar sin indicar marca destino
- **Given** que abrí el modal de clonado.
- **When** intento guardar sin seleccionar una Marca destino.
- **Then** el formulario me arroja un error de validación requiriendo los campos y el botón de clonar no invoca a la API.
