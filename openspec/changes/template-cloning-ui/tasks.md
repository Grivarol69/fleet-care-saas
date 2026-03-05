# Tasks: Template Cloning UI

## Phase 1: Backend (API modification)

- [x] 1.1 Modificar `src/app/api/maintenance/mant-template/clone/route.ts` para aceptar `name`, `vehicleBrandId` y `vehicleLineId` en el Zod Schema.
- [x] 1.2 Ajustar el objeto `newTemplate` dentro del endpoint para que utilice esos 3 campos en lugar de concatenar "(Copia)" y heredar Brand/Line del template padre.
- [x] 1.3 Garantizar que en el bloque de `packages.create.packageItems.create` dentro de la transacción de Prisma no se arrastren conexiones hacia `MantItemMasterPart`, permitiendo tareas limpias.

## Phase 2: Dialog Modal Component

- [x] 2.1 Crear el componente `src/components/maintenance/templates/CloneTemplateModal.tsx`.
- [x] 2.2 Diseñar el formulario en el componente modal con Shadcn (Dialog, Input, Select, Button).
- [x] 2.3 Implementar SWR o React Query para fetchear `vehicleBrands` (y dependientemente sus correspondientes `vehicleLines` basado en la selección).
- [x] 2.4 Controlar los loading states y la llamada al endpoint `POST /api/maintenance/mant-template/clone` con los datos recogidos en el submit.

## Phase 3: Integration

- [x] 3.1 Abrir `src/app/(dashboard)/maintenance/programs/[id]/page.tsx` y ubicar el Header o la botonera de acciones.
- [x] 3.2 Montar el `<CloneTemplateModal />` como parte de las acciones de este layout.
- [x] 3.3 Conectar el callback del modal para que una vez finalizada la clonación (éxito), use `useRouter().push()` para redirigir al usuario al recién creado template (usando el `newTemplate.id` de respuesta).

## Phase 4: Verification & E2E

- [x] 4.1 Levantar el servidor de Next local. Navegar a un template existente.
- [x] 4.2 Hacer click en "Usar como plantilla", escoger una nueva Línea, guardar y seguir la redirección interactiva.
- [x] 4.3 Comprobar en la base de datos (o la UI) que el nuevo plan se asignó a la marca deseada, que las tareas están creadas y **que no hay master parts vinculadas**.
