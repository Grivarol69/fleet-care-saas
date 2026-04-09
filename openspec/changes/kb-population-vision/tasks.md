# Tasks: KB Population con Claude Vision API

## Phase 1: Foundation & AI Service

- [x] 1.1 Instalar dependencias `@anthropic-ai/sdk` y chequear variable de entorno `ANTHROPIC_API_KEY_APP` en `.env` (o `.env.local`).
- [x] 1.2 Crear el archivo `src/lib/ai/anthropic.ts` para exportar el cliente inicializado de Anthropic.
- [x] 1.3 Crear schemas Zod en `src/lib/validations/kb-ai.ts` para estructurar la respuesta esperada de Claude (`AIKBProposalSchema` basado en el `design.md`).

## Phase 2: Core Implementation (Admin Endpoints)

- [x] 2.1 Crear middleware de verificación de rol o usar `requireCurrentUser()` para garantizar rol `SUPER_ADMIN` en los futuros endpoints.
- [x] 2.2 Crear `src/app/api/admin/kb/import/route.ts` que reciba un archivo `FormData`, inicialice el cliente Anthropic con Vision, procese el PDF/imagen, valide la salida con Zod, y retorne el JSON al front. (Incluir `export const maxDuration = 60` para prevenir timeouts en Vercel).
- [x] 2.3 Crear `src/app/api/admin/kb/save/route.ts` que reciba la data ya revisada (`AIKBProposal`) y ejecute un `prisma.$transaction` insertando `MasterPart` y `MantItem` vinculados, con `isGlobal: true` (o `tenantId: null` dependiendo de cómo está estructurado el schema global).

## Phase 3: Integration & UI

- [x] 3.1 Agregar enlace a "KB AI Population" en la barra lateral del panel de administrador (`/admin`).
- [x] 3.2 Crear vista de página `src/app/(dashboard)/admin/kb-population/page.tsx` con un área de subida de archivos (drag & drop o `input type="file"`).
- [x] 3.3 Crear componente `src/app/(dashboard)/admin/kb-population/ReviewTable.tsx` que reciba el JSON, permita edición en línea (inputs para cambiar nombres y kilómetros si la IA se equivoca).
- [x] 3.4 Conectar el botón "Aprobar y Guardar al KB Global" en la vista que llame al endpoint `/save` y muestre toasts de éxito o error.

## Phase 4: Testing & Cleanup

- [x] 4.1 Subir manualmente un recibo o imagen de manual corto (Toyota o Ford) comprobando logs internos y flujo.
- [x] 4.2 Revisar si los ítems insertados quedan visibles en el formulario de creación de tareas de mantenimiento globales.
- [x] 4.3 Clean up consoles y comentarios de debugging.
