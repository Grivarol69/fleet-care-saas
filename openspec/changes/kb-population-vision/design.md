# Design: KB Population con Claude Vision API

## Technical Approach

El enfoque técnico se basará en implementar una ruta de API en Next.js (App Router) protegida exclusivamente para usuarios con rol `SUPER_ADMIN`. Esta ruta recibirá un archivo (FormData), lo transformará a Base64 o lo enviará directamente utilizando el SDK `@anthropic-ai/sdk` al modelo `claude-3-5-sonnet-latest` (o similar con capacidades de visión).
Se utilizará un **System Prompt** estricto solicitando la salida en formato JSON que respete la estructura de `MantItem` y `MasterPart`. Finalmente, una UI en el panel de administración permitirá al SUPER_ADMIN visualizar el JSON parseado en una tabla editable y guardarlo transaccionalmente en la base de datos global.

## Architecture Decisions

### Decision: Invocación sincrónica vs Asincrónica

**Choice**: Invocación sincrónica directa desde la API route de Next.js, relajando el `maxDuration` de la ruta.
**Alternatives considered**: Background jobs usando Inngest, Redis o CRON.
**Rationale**: Al ser una herramienta exclusiva de uso interno (`SUPER_ADMIN`), la concurrencia será mínima (1 request a la vez). Implementar infraestructuras como Inngest añade complejidad innecesaria para un MVP. Si Vercel impone restricciones de tiempo irresolubles, dividiremos los PDFs localmente en el cliente antes de enviarlos.

### Decision: Estructura del Prompt y Respuesta

**Choice**: Utilizar "JSON Mode" o "herramientas/tools" nativas de la API de Anthropic para forzar un esquema JSON específico.
**Alternatives considered**: Parseo manual de texto Markdown.
**Rationale**: Garantiza tipado estricto. Zod se utilizará en el servidor para validar que la respuesta de Claude coincida con las interfaces esperadas antes de enviar al cliente.

## Data Flow

    [Cliente UI] ──(Multi-part Form / PDF)──→ [Next.js API Route (/api/admin/kb/import)]
                                                         │
                                                     (Auth Check)
                                                         │
                                                 [Anthropic Claude API]
                                                         │
                                                    (JSON Response)
                                                         │
    [Cliente UI] ←──────(JSON Validad por Zod)───────────┘
         │
    (Admin Edita/Aprueba)
         │
    [Next.js API Route (/api/admin/kb/save)] ──(Prisma $transaction)──→ [Neon DB (tenantId: null)]

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/admin/kb/import/route.ts` | Create | Recibe PDF, llama a Claude, devuelve JSON validado. |
| `src/app/api/admin/kb/save/route.ts` | Create | Guarda batch transaccional de items y partes globally. |
| `src/lib/ai/anthropic.ts` | Create/Modify | Funciones de utilidad para instanciar el SDK de Anthropic. |
| `src/app/(dashboard)/admin/kb-population/page.tsx` | Create | UI principal del dashboard admin para subir e interactuar. |
| `src/app/(dashboard)/admin/kb-population/ReviewTable.tsx` | Create | Componente para mostrar y editar las partes extraídas. |

## Interfaces / Contracts

```typescript
// Esquema esperado de Anthropic y Zod
export const AIKBProposalSchema = z.object({
  vehicleInfo: z.object({
    brand: z.string(),
    model: z.string(),
    engine: z.string().optional(),
    years: z.string().optional(),
  }),
  maintenanceItems: z.array(z.object({
    name: z.string(), // ej. "Cambio de aceite de motor"
    type: z.enum(["PREVENTIVE", "CORRECTIVE", "PREDICTIVE", "EMERGENCY"]),
    intervalKm: z.number().nullable(),
    intervalMonths: z.number().nullable(),
    partsRequired: z.array(z.object({
      name: z.string(),
      partNumber: z.string().optional(), // OEM Number
      quantity: z.number(),
    }))
  }))
});
export type AIKBProposal = z.infer<typeof AIKBProposalSchema>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Zod Schema Validation | Validar mocks de JSON bueno y malo. |
| Integration | API Auth | Testear que un usuario normal reciba 403. |
| E2E | Upload Flow | Simular subida con mock del fetch de anthropic, edición en la UI y guardado final verificando en DB mock. |

## Migration / Rollout

No migration required. Se utilizarán las estructuras de datos existentes (`MantItem` y `MasterPart`), asegurando inyectar `tenantId: null` para que sean globales.

## Open Questions

- [ ] ¿Vercel permitirá suficiente `maxDuration` en la función API (usualmente el límite Hobby/Pro es 10s-60s) para PDFs de 20 páginas? Si falla, iteraremos dividiendo el PDF en el cliente (página por página).
