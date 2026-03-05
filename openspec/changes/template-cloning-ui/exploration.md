## Exploration: Template Cloning UI

### Current State
Actualmente, el backend ya posee un endpoint funcional (`POST /api/maintenance/mant-template/clone`) que permite realizar una copia profunda (Deep Copy) de un plan de mantenimiento (Template Global o de Tenant), copiando sus paquetes e ítems hacia el Tenant del usuario actual. Sin embargo, este endpoint carece de una interfaz gráfica (UI) que lo exponga a los usuarios y presenta riesgos arquitectónicos: al clonar, hereda ciegamente los repuestos originales del modelo anterior, lo que puede causar inconsistencias si se aplica a un vehículo distinto sin revisar.

### Affected Areas
- `src/app/api/maintenance/mant-template/clone/route.ts` — Endpoint existente (posibles modificaciones para aceptar `vehicleBrandId`, `vehicleLineId` y `name`).
- UI principal de Templates de Mantenimiento (donde se lista y visualiza el detalle de los planes).
- Componentes de Modal/Dialog en el frontend para gestionar la entrada del usuario durante el clonado.

### Approaches
1. **Clonado Ciego (1-Click Clone)** — Simplemente agregar un botón que consuma el endpoint actual y cree un plan "(Copia)".
   - Pros: Implementación extremadamente rápida.
   - Cons: Alto riesgo de generar "Data Clutter" (basura en base de datos) con nombres repetitivos ("Copia de Copia") y propensión a errores operativos al mantener repuestos incompatibles para nuevos vehículos.
   - Effort: Low

2. **Clonado Asistido (Wizard / Dialog Modal) [Recomendado]** — Proveer un botón "Usar como plantilla", que abra un Modal interactivo obligando al usuario a:
   - Ingresar un nuevo Nombre.
   - Seleccionar la Marca y Línea de vehículo destino.
   - (Opcional visual) Alertarlo sobre la necesidad de actualizar los repuestos incompatibles dentro de las tareas.
   - Modificar el endpoint de backend para recibir estos atributos y aplicarlos directamente durante el `prisma.$transaction` de la copia.
   - Pros: Mantiene consistencia de la base de datos, fuerza al usuario a catalogar correctamente el nuevo plan, y alerta sobre deuda técnica operativa.
   - Effort: Medium

### Recommendation
Opción 2. Requerir explícitamente Marca, Línea y Nombre en un Modal antes de ejecutar la clonación, previniendo así datos basura y mala categorización. El endpoint de clonación (`/clone`) debe actualizarse para recibir estos datos.

### Risks
- Usuarios ignorando la alerta de "revisión de repuestos" y comprando repuestos equivocados (Toyota para una Nissan) basados en planes clonados ciegamente.
- Complejidad inicial en la UI si la base de datos de Marcas/Líneas (VehicleBrand/VehicleLine) no está ágilmente accesible en el contexto del Dialog.

### Ready for Proposal
Yes — Proceed to document the Assisted Cloning intent.
