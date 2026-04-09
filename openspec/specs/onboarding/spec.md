# Onboarding Specification

## Purpose

Define the required behavior for creating new Tenants and prepopulating their initial database state, as well as the UI interaction between Clerk's Organization creation and the internal Onboarding Wizard.

## Requirements

### Requirement: Clerk Organization Name Sync

The system MUST automatically capture the Organization Name defined by the user in the Clerk `<OrganizationList>` component and use it to complete the internal Tenant profile without asking the user to type it again.

#### Scenario: User creates a new Organization in Clerk
- GIVEN the user is on the `/onboarding` page and sees the Clerk Organization List
- WHEN the user creates an organization named "Logistica Los Andes"
- THEN the system redirects to the internal Onboarding Wizard
- AND the internal form MUST hide the "Organization Name" input
- AND the system MUST submit "Logistica Los Andes" as the tenant name during profile completion.

### Requirement: Tenant Seed Data

The system MUST NOT seed global entities (Brands, Types, Categories) during `seedTenantData`. Instead, it MUST seed exactly one dummy instance of core entities necessary for a complete demonstration of the system's capabilities.

#### Scenario: A new tenant completes onboarding
- GIVEN a tenant has just submitted their profile (country, currency)
- WHEN the `seedTenantData` action is executed
- THEN the system MUST create 1 dummy `Vehicle`
- AND the system MUST create 1 dummy `Driver`
- AND the system MUST create 1 dummy `Provider`
- AND the system MUST NOT create any `VehicleBrand`, `VehicleType`, or `MantCategory`.

---

## Knowledge Base Preload Feature

This section specifies the requirements for the Knowledge Base preload feature in the onboarding wizard.

### Problem Statement

El onboarding actual no permite al usuario precargar datos globales y depende de datos dummy frágil que fallan silenciosamente.

### Goals

1. Permitir al usuario elegir qué datos precargar durante onboarding
2. Copiar datos globales (Knowledge Base) al tenant de forma robusta
3. Eliminar datos dummy del flujo de onboarding
4. Proporcionar feedback claro de cuántos datos se cargarán

### User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-01 | Como nuevo usuario, quiero ver qué datos puedo precargar antes de confirmar | MUST |
| US-02 | Como nuevo usuario, quiero elegir qué categorías precargar (marcas, items, templates) | MUST |
| US-03 | Como nuevo usuario, quiero ver cuántos datos se van a cargar | MUST |
| US-04 | Como nuevo usuario, si la precarga falla, quiero saber qué pasó | MUST |
| US-05 | Como nuevo usuario, quiero poder proceder sin precargar nada | MUST |

### Functional Requirements

#### FR-01: Paso de Precarga KB en Wizard

- El wizard debe tener un paso intermedio (Paso 2) entre Perfil y Listo
- Este paso muestra opciones de precarga
- El usuario puede proceder sin seleccionar nada

#### FR-02: Opciones de Precarga

El paso 2 debe mostrar checkboxes **solo para las líneas que tienen templates disponibles** en el KB global:

| Opción | Label | Default | Descripción |
|--------|-------|---------|-------------|
| vehicleMetadata | Marcas, Líneas y Tipos | Checked | Copia VehicleBrand, VehicleLine, VehicleType |
| maintenanceItems | Items de Mantenimiento | Checked | Copia MantCategory y MantItem |
| line_{lineId} | {Marca} {Línea} | Unchecked | Template disponible para esta línea |

**Regla:** Solo mostrar checkbox si existe al menos un `MaintenanceTemplate` con `isGlobal: true` para esa línea.

#### FR-02b: Opción de No Precargar

- El usuario puede proceder sin seleccionar ninguna opción
- Botón "Continuar sin precargar" siempre disponible
- Si no selecciona nada, el onboarding se completa sin copiar datos

#### FR-03: Preview de Cantidad

- Cada checkbox debe mostrar la cantidad de registros que se copiarán
- Ejemplo: "Marcas, Líneas y Tipos (~30 registros)"

#### FR-04: Función de Copia

La función `copyKnowledgeBaseToTenant(tenantId, options)` debe:

1. Aceptar un objeto de opciones `{ vehicleMetadata, maintenanceItems, maintenanceTemplates }`
2. Ejecutar todo en una transaction de Prisma
3. Para cada modelo:
   - Fetch todos los registros `isGlobal: true`
   - Crear copia con `tenantId: tenant.id`
   - Actualizar referencias FK a las nuevas copias
4. Si cualquier operación falla, hacer rollback completo
5. Retornar resultado con éxito/error y conteos

#### FR-05: Manejo de Errores

- Si la precarga falla, mostrar mensaje claro al usuario
- El tenant NO queda con onboarding COMPLETED si falla
- El usuario puede reintentar o continuar sin precarga

#### FR-07: Sistema de Curación de Planes (Futuro)

Los tenants pueden crear sus propios MaintenanceTemplates (`isGlobal: false`). El equipo propietario puede:

1. Ver templates creados por tenants
2. Aprobar e integrar al KB global (`isGlobal: true`)
3. Los nuevos tenants ven los planes "curados" disponibles

**Status:** OUT OF SCOPE para esta implementación - se documenta para futuro

- Eliminar la creación de Provider dummy en seedTenantData
- Eliminar la creación de Driver dummy en seedTenantData
- Eliminar la creación de Vehicle dummy en seedTenantData
- La función seedTenantData ya no es necesaria o queda vacía

### Non-Functional Requirements

#### NFR-01: Performance

- La copia debe completarse en menos de 30 segundos
- Mostrar loading state durante la copia

#### NFR-02: Idempotency

- Si el usuario ya tiene datos precargados, no duplicar
- Verificar existencia antes de crear

#### NFR-03: Logging

- Loggear cada paso de la copia
- Incluir tenantId y cantidad de registros

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Wizard Step 2 │ ──▶ │ Server Action    │ ──▶ │ Prisma          │
│  (Checkboxes)   │     │ copyKBToTenant   │     │ Transaction     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Response +        │
                    │ Redirect          │
                    └──────────────────┘
```

### Database Schema (no changes needed)

La arquitectura existente soporta esto:
- `isGlobal: true` + `tenantId: null` = dato global
- FK references funcionan entre modelos globales

### API Contracts

#### Server Action: copyKnowledgeBaseToTenant

```typescript
type CopyKBOptions = {
  vehicleMetadata: boolean;
  maintenanceItems: boolean;
  maintenanceTemplates: boolean;
};

type CopyKBResult = {
  success: boolean;
  error?: string;
  counts?: {
    brands: number;
    lines: number;
    types: number;
    categories: number;
    items: number;
    templates: number;
    packages: number;
    packageItems: number;
  };
};

// Signature
async function copyKnowledgeBaseToTenant(
  tenantId: string, 
  options: CopyKBOptions
): Promise<CopyKBResult>
```

### Acceptance Criteria

| ID | Criteria | Test |
|----|----------|------|
| AC-01 | El wizard muestra paso de precarga con checkboxes | Visual |
| AC-02 | Cada checkbox muestra cantidad de registros | Visual |
| AC-03 | El usuario puede proceder sin seleccionar nada | Click "Continuar" sin checkboxes |
| AC-04 | Si selecciona todo, se copian todos los datos globales | Query DB post-onboarding |
| AC-05 | Si falla, muestra error y no marca COMPLETED | Forzar error |
| AC-06 | No existen Provider/Driver/Vehicle dummy en tenant nuevo | Query DB |
| AC-07 | El conteo en UI coincide con registros copiados | Comparar UI vs DB |

### Edge Cases

| Case | Handling |
|------|----------|
| KB global vacío | Mostrar mensaje "No hay datos disponibles" |
| Copia parcial (algunos modelos fallan) | Rollback completo, mostrar error |
| Usuario reinicia onboarding | Verificar si ya existen datos, actualizar en lugar de crear |
| Templates pero no líneas对应 | Copiar solo templates cuyas líneas existan en globales |
