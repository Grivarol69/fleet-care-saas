# Delta for Work Orders

## ADDED Requirements

### Requirement: Scheduled Date en WorkOrderCreateWizard

El `WorkOrderCreateWizard` DEBE exponer un campo opcional de fecha programada (`scheduledDate`) en el Paso 2.

El campo MAY quedar vacío; si se completa, el sistema DEBE enviarlo al endpoint `POST /api/maintenance/work-orders` como `scheduledDate` y almacenarlo en `WorkOrder.startDate`.

#### Scenario: OT correctiva creada con fecha programada

- GIVEN el usuario está en el Paso 2 del wizard de nueva OT
- WHEN completa el campo "Fecha programada" con una fecha válida y confirma el formulario
- THEN la OT se crea con `WorkOrder.startDate` igual a la fecha seleccionada
- AND la OT aparece en el calendario en el día correspondiente

#### Scenario: OT correctiva creada sin fecha programada

- GIVEN el usuario está en el Paso 2 del wizard de nueva OT
- WHEN deja vacío el campo "Fecha programada" y confirma el formulario
- THEN la OT se crea con `WorkOrder.startDate = null`
- AND la OT NO aparece en el calendario como item de fecha exacta

#### Scenario: Fecha programada inválida

- GIVEN el usuario está en el Paso 2 del wizard de nueva OT
- WHEN ingresa una fecha con formato inválido en "Fecha programada"
- THEN el formulario MUST NOT permitir el submit
- AND DEBE mostrar un mensaje de error en el campo
