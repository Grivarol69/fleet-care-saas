# Design: Onboarding Knowledge Base Precarga

## Overview

Diseño técnico para implementar la precarga de Knowledge Base en el onboarding.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ONBOARDING WIZARD                        │
├─────────────────────────────────────────────────────────────────┤
│  Step 1: Perfil        │  Step 2: Precarga KB  │  Step 3: Listo │
│  (country, currency)   │  (checkboxes)         │  (redirect)    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER ACTIONS                             │
├─────────────────────────────────────────────────────────────────┤
│  updateTenantProfile(formData)                                  │
│       │                                                         │
│       ├── update tenant: country, currency                      │
│       │                                                         │
│       └── copyKnowledgeBaseToTenant(tenantId, options)          │
│                │                                                │
│                └── Prisma Transaction                           │
│                        ├── copyVehicleMetadata()                │
│                        ├── copyMaintenanceItems()               │
│                        └── copyMaintenanceTemplates()           │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### Frontend

#### New Component: OnboardingKBForm

**Location:** `src/components/onboarding/OnboardingKBForm.tsx`

**Props:**
```typescript
type OnboardingKBFormProps = {
  tenantId: string;
  onSuccess: () => void;
};
```

**UI:**
- Checkbox "Marcas, Líneas y Tipos" (global)
- Checkbox "Items de Mantenimiento" (global)
- Lista de checkboxes por cada línea que tiene templates disponibles:
  - Ejemplo: "Toyota Hilux (3 planes)", "Ford Ranger (2 planes)"
- Botón "Continuar sin precargar" siempre visible
- Loading state durante submit
- Error message display

**Dependencies:**
- shadcn/ui checkbox
- shadcn/ui button
- react-hook-form

### Backend

#### New Server Action: getAvailableTemplates

**Location:** `src/actions/get-kb-counts.ts`

```typescript
type TemplateOption = {
  lineId: string;
  brandName: string;
  lineName: string;
  templateCount: number;
  packageCount: number;
};

type KBCounts = {
  brands: number;
  lines: number;
  types: number;
  categories: number;
  items: number;
  templates: TemplateOption[]; // Only lines with templates
};

async function getKBCounts(): Promise<KBCounts> {
  // Get counts and only lines that have templates
}
```

#### New Server Action: copyKnowledgeBaseToTenant

**Location:** `src/actions/copy-kb-to-tenant.ts`

```typescript
'use server';

import { prisma } from '@/lib/prisma';

export async function copyKnowledgeBaseToTenant(
  tenantId: string,
  options: {
    vehicleMetadata: boolean;
    maintenanceItems: boolean;
    maintenanceTemplates: boolean;
  }
) {
  // Validate options
  if (!options.vehicleMetadata && !options.maintenanceItems && !options.maintenanceTemplates) {
    return { success: true, counts: {} }; // Nothing to do
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const counts = {
        brands: 0,
        lines: 0,
        types: 0,
        categories: 0,
        items: 0,
        templates: 0,
        packages: 0,
        packageItems: 0,
      };

      // 1. Copy Vehicle Metadata (Brand -> Line -> Type)
      if (options.vehicleMetadata) {
        // Fetch global brands
        const globalBrands = await tx.vehicleBrand.findMany({
          where: { isGlobal: true, tenantId: null },
        });

        // Create brand mapping (globalId -> newId)
        const brandMap = new Map<string, string>();
        
        for (const brand of globalBrands) {
          const newBrand = await tx.vehicleBrand.create({
            data: {
              name: brand.name,
              isGlobal: false,
              tenantId,
            },
          });
          brandMap.set(brand.id, newBrand.id);
          counts.brands++;
        }

        // Fetch global lines and copy with new brandId
        const globalLines = await tx.vehicleLine.findMany({
          where: { isGlobal: true, tenantId: null },
        });
        
        const lineMap = new Map<string, string>();
        
        for (const line of globalLines) {
          const newLine = await tx.vehicleLine.create({
            data: {
              name: line.name,
              brandId: brandMap.get(line.brandId)!, // This should work if brand exists
              isGlobal: false,
              tenantId,
            },
          });
          lineMap.set(line.id, newLine.id);
          counts.lines++;
        }

        // Copy global types
        const globalTypes = await tx.vehicleType.findMany({
          where: { isGlobal: true, tenantId: null },
        });

        for (const type of globalTypes) {
          await tx.vehicleType.create({
            data: {
              name: type.name,
              isGlobal: false,
              tenantId,
            },
          });
          counts.types++;
        }
      }

      // 2. Copy Maintenance Items
      if (options.maintenanceItems) {
        // Fetch global categories
        const globalCategories = await tx.mantCategory.findMany({
          where: { isGlobal: true, tenantId: null },
        });

        const categoryMap = new Map<string, string>();

        for (const cat of globalCategories) {
          const newCat = await tx.mantCategory.create({
            data: {
              name: cat.name,
              description: cat.description,
              isGlobal: false,
              tenantId,
            },
          });
          categoryMap.set(cat.id, newCat.id);
          counts.categories++;
        }

        // Fetch global items and copy with new categoryId
        const globalItems = await tx.mantItem.findMany({
          where: { isGlobal: true, tenantId: null },
        });

        for (const item of globalItems) {
          await tx.mantItem.create({
            data: {
              name: item.name,
              description: item.description,
              mantType: item.mantType,
              categoryId: categoryMap.get(item.categoryId)!,
              type: item.type,
              isGlobal: false,
              tenantId,
            },
          });
          counts.items++;
        }
      }

      // 3. Copy Maintenance Templates
      if (options.maintenanceTemplates) {
        // This is complex: templates reference global brands/lines
        // We need to map to the NEW tenant's copies
        
        const globalTemplates = await tx.maintenanceTemplate.findMany({
          where: { isGlobal: true, tenantId: null },
          include: {
            packages: {
              include: { packageItems: true },
            },
          },
        });

        // Get tenant's brand/line copies
        const tenantBrands = await tx.vehicleBrand.findMany({
          where: { tenantId },
        });
        const brandNameToId = new Map(tenantBrands.map(b => [b.name, b.id]));

        const tenantLines = await tx.vehicleLine.findMany({
          where: { tenantId },
        });
        const lineNameToId = new Map(tenantLines.map(l => [l.name, l.id]));

        // Also get global lines for reference
        const globalLines = await tx.vehicleLine.findMany({
          where: { isGlobal: true, tenantId: null },
          include: { brand: true },
        });
        const globalLineToName = new Map(globalLines.map(l => [l.id, l.name]));

        for (const tpl of globalTemplates) {
          // Find matching brand/line in tenant
          const globalLine = globalLines.find(l => l.id === tpl.vehicleLineId);
          if (!globalLine) continue;

          const tenantBrandId = brandNameToId.get(globalLine.brand.name);
          const tenantLineId = lineNameToId.get(globalLine.name);

          if (!tenantBrandId || !tenantLineId) continue; // Skip if no match

          const newTemplate = await tx.maintenanceTemplate.create({
            data: {
              name: tpl.name,
              description: tpl.description,
              vehicleBrandId: tenantBrandId,
              vehicleLineId: tenantLineId,
              version: tpl.version,
              isDefault: tpl.isDefault,
              isGlobal: false,
              tenantId,
            },
          });
          counts.templates++;

          // Copy packages
          for (const pkg of tpl.packages) {
            const newPackage = await tx.maintenancePackage.create({
              data: {
                templateId: newTemplate.id,
                name: pkg.name,
                triggerKm: pkg.triggerKm,
                description: pkg.description,
                estimatedCost: pkg.estimatedCost,
                estimatedTime: pkg.estimatedTime,
                priority: pkg.priority,
                packageType: pkg.packageType,
                isPattern: pkg.isPattern,
              },
            });
            counts.packages++;

            // Copy package items
            for (const pi of pkg.packageItems) {
              await tx.packageItem.create({
                data: {
                  packageId: newPackage.id,
                  mantItemId: pi.mantItemId, // Note: This references global item
                  quantity: pi.quantity,
                  estimatedTime: pi.estimatedTime,
                  notes: pi.notes,
                },
              });
              counts.packageItems++;
            }
          }
        }
      }

      return counts;
    });

    return { success: true, counts: result };
  } catch (error) {
    console.error('[CopyKB] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

## Modified Files

| File | Change |
|------|--------|
| `src/app/onboarding/page.tsx` | Agregar paso 2 con KBForm |
| `src/components/onboarding/OnboardingKBForm.tsx` | NEW - Form de checkboxes |
| `src/actions/onboarding.ts` | Modificar para llamar a copyKBToTenant |
| `src/actions/copy-kb-to-tenant.ts` | NEW - Función de copia |
| `src/actions/seed-tenant.ts` | Eliminar datos dummy |

## Data Flow Details

```
User clicks "Continuar" in Step 2
         │
         ▼
OnboardingKBForm submits
         │
         ▼
updateTenantProfile(formData)
         │
         ├── Update tenant (country, currency)
         │
         └── copyKnowledgeBaseToTenant(tenantId, options)
                   │
                   ▼
            Prisma.$transaction()
                   │
                   ├── copyVehicleMetadata() [if selected]
                   │     ├── Fetch global brands
                   │     ├── Create tenant copies
                   │     ├── Fetch global lines
                   │     ├── Map to new brandIds
                   │     ├── Create tenant copies
                   │     └── Same for types
                   │
                   ├── copyMaintenanceItems() [if selected]
                   │     ├── Fetch global categories
                   │     ├── Create tenant copies
                   │     └── Same for items
                   │
                   └── copyMaintenanceTemplates() [if selected]
                         ├── Fetch global templates
                         ├── Map to tenant's brand/line copies
                         ├── Create template copies
                         ├── Copy packages
                         └── Copy package items
                         
                   │
                   ▼
            Return counts / error
                   │
                   ▼
         redirect('/dashboard')
```

## Error Handling

| Error | Handling |
|-------|----------|
| No global data exists | Show warning, allow continue |
| Brand copy fails | Rollback all, return error |
| FK reference missing | Skip that record, log warning |
| Timeout | Prisma transaction timeout (30s) |

## Security Considerations

1. **Tenant isolation**: All copies use correct `tenantId`
2. **Authorization**: Only authenticated users in onboarding can call
3. **No data leakage**: Global data is read-only, not exposed to client

## Testing Strategy

1. **Unit**: Test copy function with mocked Prisma
2. **Integration**: Full onboarding flow with fresh tenant
3. **E2E**: Playwright test simulating user onboarding
