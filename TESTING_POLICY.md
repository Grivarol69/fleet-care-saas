# Testing Policy

## Objetivo
La suite debe maximizar confianza de negocio, no volumen. Cada test debe responder una pregunta concreta: que riesgo real detecta si falla.

## Capas

### Unit test
- Prueba lógica pura.
- No usa DB, red, Next.js, Clerk ni Prisma real.
- Aplica a cálculos, validaciones, reglas de transición, permisos puros, mapeos y normalización.

### Integration test
- Prueba colaboración entre módulos propios y persistencia real.
- Usa DB de test real cuando el comportamiento dependa de Prisma, transacciones, constraints o aislamiento multi-tenant.
- Puede invocar servicios o handlers, pero debe validar comportamiento observable, no llamadas internas.

### E2E
- Prueba journeys críticos desde UI o entrada HTTP real.
- Debe cubrir flujos como login/onboarding, creación de vehículo, alertas, work orders, compras, facturación y dashboard.
- Deben ser pocos, estables y de alto valor.

## Qué se mockea

### Se puede mockear
- APIs externas: Siigo, Resend, Clerk hosted UI, Twilio, Uploadthing, Document AI.
- Tiempo, UUIDs, colas o retries cuando hagan el test no determinista.
- Integraciones fuera de este repo.

### No se debe mockear
- Reglas de dominio propias.
- Prisma en integration tests.
- Autorización interna si el objetivo es validar permisos reales.
- Flujos críticos completos en e2e.

## Contratos entre subagentes
- Cada contrato entre subagentes debe tener tests de esquema de entrada, esquema de salida, campos obligatorios, compatibilidad hacia atrás, idempotencia y manejo de errores.
- Deben existir fixtures de artefactos válidos e inválidos.
- No se testea que un agente llamó a otro. Se testea que produjo el artefacto correcto y consumible.

## Engram
- Debe tener tests de persistencia round-trip.
- Debe tener tests de lectura por id, scope y sesión.
- Debe tener tests de consistencia tras múltiples escrituras.
- Debe tener tests de aislamiento entre sesiones, cambios o tenants.
- Debe tener tests de regresión de formato y versionado.
- Debe tener tests de recuperación ante datos incompletos o corruptos.
- Si Engram no vive en este repo, esos tests deben vivir en el repo que implementa la integración real.

## Naming

### Archivos
- `*.unit.test.ts`
- `*.integration.test.ts`
- `*.contract.test.ts`
- `*.e2e.spec.ts`

### Descripciones
- Deben describir comportamiento, no implementación.
- Formato recomendado: `debe ... cuando ...`.

### Prohibido
- Nombres como `misc`, `utils2`, `final-test`.
- Llamar `e2e` a un test que no ejecuta un flujo real del sistema.

## Fixtures y factories
- Preferir builders o factories de dominio, no factories por tabla cuando el caso requiere contexto de negocio.
- Cada fixture debe hacer explícito qué invariante representa.
- Los defaults deben ser válidos y mínimos.
- Las factories no deben ocultar decisiones críticas del test.
- El cleanup debe estar centralizado.
- No se debe duplicar setup o cleanup manual si ya existe un helper compartido.

## Anti-patrones prohibidos
- Tests que prueban lógica definida dentro del propio test.
- Tests de implementación interna en vez de comportamiento observable.
- Mocks de Prisma en tests que pretenden validar integración.
- E2E que solo comprueban redirects repetidos sin cubrir journeys de negocio.
- `skip` permanente sin ticket o fecha de remoción.
- Asserts débiles como `toBeDefined()` cuando se puede validar semántica de negocio.
- Snapshots grandes de payloads o UI sin intención clara.
- Fixtures opacas que crean medio sistema sin necesidad.
- Tests con nombres vagos.
- Duplicación masiva de auth mocks y cleanup.
- Usar `jsdom` para tests de backend o DB si no es necesario.

## Reglas operativas
- Todo cambio de negocio debe añadir o ajustar tests en la capa correcta.
- Todo bug corregido debe dejar al menos un test de regresión.
- Si un test es frágil y no protege comportamiento crítico, se elimina o se reescribe.
- La suite debe poder ejecutarse por capas de forma independiente.
- Verde local y en CI o no cuenta como cobertura real.

## Prioridad
1. Unit de lógica crítica.
2. Integration de dominio y persistencia.
3. Contract tests de subagentes y Engram.
4. E2E de journeys críticos.
