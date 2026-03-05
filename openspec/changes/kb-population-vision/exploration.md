## Exploration: KB Population con Claude Vision API

### Current State
Actualmente, el Knowledge Base global (`MantItemVehiclePart` y `MasterPart`) funciona correctamente como concepto, pero poblarlo manualmente tomaría semanas. El SaaS requiere una base sólida pre-cargada con los intervalos de servicio OEM (Toyota, Ford, etc.) y los números de parte correctos para ofrecer un valor inmediato a los nuevos tenants. Existen manuales en PDF donde consta literalmente qué cambiar y en qué intervalo (km/tiempo), pero es trabajo exhaustivo transcribirlos.

### Affected Areas
- `src/app/api/admin/kb/import-manual/route.ts` (Nuevo) — Endpoint SUPER_ADMIN (FormData, PDF upload, Authz).
- Integración Claude API (Módulos de parseo y prompts estandarizados).
- UI Admin: Pantallas de revisión de propuestas (MantItems, MasterParts generadas).
- Base de datos: Creación batch o transaccional de los MantItem y MasterPart globales (tenantId: null).

### Approaches
1. **API Directa en Next.js App Router (Recomendado)** — Endpoint recibe el PDF, lo envía directamente a Anthropic Vision API, e interpreta la respuesta estructurada JSON mediante zod/generative-ai o llamadas a la API de Anthropic nativa.
   - Pros: Todo en TypeScript unificado. Claude 3/3.5 maneja muy bien el formato de las páginas web o imágenes/PDF tabulares.
   - Cons: Puede tener timeout en Vercel Edge/Serverless si el procesamiento del PDF tarda varios segundos (Anthropic Vision suele tardar ~10-30s).
   - Effort: Medium

2. **Procesamiento Asíncrono (Background Jobs)** — Guardar la tarea, y un cron/worker llama a Anthropic.
   - Pros: No experimentará timeouts con Vercel.
   - Cons: Mayor complejidad infraestructural (necesita Redis/Inngest/QStash).
   - Effort: Medium/High

### Recommendation
Opción 1 con uso restringido de `maxDuration` en Next.js (si se permite), o utilizando API route asíncrona (como Inngest o llamando a Vercel Functions with extended timeouts). Dado que es uso interno (SUPER_ADMIN) una UI optimista con polling simple o un streaming response solucionaría temporalmente el tema del timeout.

### Risks
- Timeouts del endpoint al procesar manuales de muchas páginas (Claude API suele limitar tamaño o tiempo).
- Alucinaciones de la API al confundir un aceite de motor con transmisión. Se debe requerir SIEMPRE la aprobación humana.

### Ready for Proposal
Yes — The user already approved the idea in the planning doc. Moving forward with proposal.
