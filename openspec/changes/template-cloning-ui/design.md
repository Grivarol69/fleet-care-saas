# Design: Template Cloning UI

## Technical Approach
Implementaremos un Modal asistido (`CloneTemplateModal`) que invoca en el cliente peticiones para listar marcas y líneas. Construiremos los selectores usando los componentes `Select` de Shadcn UI y React Hook Form junto con Zod para el tipado. 
El endpoint de backend refactorizará los parámetros de entrada y omitirá deliberadamente cualquier copia relacional hacia `MantItemMasterPart` que pudiera realizarse previamente tras bambalinas, garantizando el aislamiento limpio propuesto por el usuario.

## Architecture Decisions
- **Uso de Modales Intercalados**: En lugar de navegar a una página tipo `/clone/:id`, se usarán Modales para reducir la fricción cognitiva del usuario y mantener el estado de la aplicación estable. React Hook Form es una excelente opción.
- **State management de selects encadenados**: Se utilizará SWR o fetch directos on-mount para cargar las Marcas de vehículos. Al seleccionar una Marca, se disparará el fetching para las Líneas asociadas.
- **Backend Clean Copy**: Al utilizar `prisma.$transaction`, el copiado de arreglos anidados (`packages.create.packageItems.create`) es una directiva de Prisma muy segura, pero se controlará explícitamente qué campos viajan para que los repuestos queden atrás.

## File Changes
1. **MODIFIED** `src/app/api/maintenance/mant-template/clone/route.ts`: Modificar esquema Zod (`name`, `vehicleBrandId`, `vehicleLineId`) y estructura transaccional prisma para aplicarlos, excluyendo el link de partes.
2. **MODIFIED** `src/app/(dashboard)/maintenance/programs/[id]/page.tsx`: Inyectar `<CloneTemplateModal />` junto a los botones de edición.
3. **NEW** `src/components/maintenance/templates/CloneTemplateModal.tsx`: Presentational y Container modal dialog.

## Data Flow
```ascii
[UI] User clicks "Clonar"
    │
    ▼
[UI] Modal Opens (Fetch Brands)
    │
    ▼
[UI] User Selects Brand (Fetch Lines corresponding to Brand)
    │
    ▼
[UI] User creates name and submits
    │
    ▼
[API] POST /api/maintenance/mant-template/clone
Payload: { templateId, name, vehicleBrandId, vehicleLineId }
    │
    ▼
[DB] Prisma creates MaintenanceTemplate 
     (Tenant scoped, associated with new Brand/Line, tasks copied, parts omitted)
    │
    ▼
[API] Redirect to /maintenance/programs/<new_id>
```

## Testing Strategy
- Manualmente, confirmar el Modal apertura y correcta cascada de los selects "Marca -> Linea".
- Ejecutar clonación y verificar que al abrir el nuevo plan:
    - Su información de Cabecera refleje el nuevo vehículo.
    - Sus tareas/ítems se listen correctamente.
    - Los ítems reporten carecer de repuestos (requiere adición manual).
