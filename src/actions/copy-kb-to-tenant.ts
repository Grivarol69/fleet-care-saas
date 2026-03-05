'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export type CopyKBOptions = {
  vehicleMetadata: boolean;
  maintenanceItems: boolean;
  lineIds: string[];
};

export type CopyKBCounts = {
  brands: number;
  lines: number;
  types: number;
  categories: number;
  items: number;
  templates: number;
  packages: number;
  packageItems: number;
  parts: number;
  itemParts: number;
};

export type CopyKBResult = {
  success: boolean;
  error?: string;
  counts?: CopyKBCounts;
};

export async function copyKnowledgeBaseToTenant(
  tenantId: string,
  options: CopyKBOptions
): Promise<CopyKBResult> {
  const caller = await getCurrentUser();

  if (!caller) {
    return { success: false, error: 'Unauthorized: not authenticated' };
  }

  // Only allow copying to the caller's own tenant (or SUPER_ADMIN operating on any tenant)
  if (!caller.isSuperAdmin && caller.tenantId !== tenantId) {
    return { success: false, error: 'Forbidden: tenantId mismatch' };
  }

  console.log('[CopyKB] Starting copy for tenant:', tenantId, 'options:', options);

  if (!options.vehicleMetadata && !options.maintenanceItems && options.lineIds.length === 0) {
    console.log('[CopyKB] Nothing to copy, returning early');
    return {
      success: true, counts: {
        brands: 0,
        lines: 0,
        types: 0,
        categories: 0,
        items: 0,
        templates: 0,
        packages: 0,
        packageItems: 0,
        parts: 0,
        itemParts: 0,
      }
    };
  }

  if (options.lineIds.length > 0) {
    options.vehicleMetadata = true;
    options.maintenanceItems = true;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const counts: CopyKBCounts = {
        brands: 0,
        lines: 0,
        types: 0,
        categories: 0,
        items: 0,
        templates: 0,
        packages: 0,
        packageItems: 0,
        parts: 0,
        itemParts: 0,
      };

      let brandMap = new Map<string, string>();
      let lineMap = new Map<string, string>();
      let categoryMap = new Map<string, string>();
      let itemMap = new Map<string, string>();
      let partMap = new Map<string, string>();

      if (options.vehicleMetadata) {
        console.log('[CopyKB] Copying vehicle metadata...');

        const globalBrands = await tx.vehicleBrand.findMany({
          where: { isGlobal: true, tenantId: null },
        });

        for (const brand of globalBrands) {
          const existingBrand = await tx.vehicleBrand.findFirst({
            where: { tenantId, name: brand.name },
          });

          if (existingBrand) {
            brandMap.set(brand.id, existingBrand.id);
            counts.brands++;
          } else {
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
        }

        const globalLines = await tx.vehicleLine.findMany({
          where: { isGlobal: true, tenantId: null },
          include: { brand: true },
        });

        for (const line of globalLines) {
          const newBrandId = brandMap.get(line.brandId);
          if (!newBrandId) continue;

          const existingLine = await tx.vehicleLine.findFirst({
            where: { tenantId, brandId: newBrandId, name: line.name },
          });

          if (existingLine) {
            lineMap.set(line.id, existingLine.id);
            counts.lines++;
          } else {
            const newLine = await tx.vehicleLine.create({
              data: {
                name: line.name,
                brandId: newBrandId,
                isGlobal: false,
                tenantId,
              },
            });
            lineMap.set(line.id, newLine.id);
            counts.lines++;
          }
        }

        const globalTypes = await tx.vehicleType.findMany({
          where: { isGlobal: true, tenantId: null },
        });

        for (const type of globalTypes) {
          const existingType = await tx.vehicleType.findFirst({
            where: { tenantId, name: type.name },
          });

          if (!existingType) {
            await tx.vehicleType.create({
              data: {
                name: type.name,
                isGlobal: false,
                tenantId,
              },
            });
          }
          counts.types++;
        }
      }

      if (options.maintenanceItems) {
        console.log('[CopyKB] Copying maintenance items...');

        const globalCategories = await tx.mantCategory.findMany({
          where: { isGlobal: true, tenantId: null },
        });

        for (const cat of globalCategories) {
          const existingCat = await tx.mantCategory.findFirst({
            where: { tenantId, name: cat.name },
          });

          if (existingCat) {
            categoryMap.set(cat.id, existingCat.id);
            counts.categories++;
          } else {
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
        }

        const globalItems = await tx.mantItem.findMany({
          where: { isGlobal: true, tenantId: null },
        });

        for (const item of globalItems) {
          const newCategoryId = categoryMap.get(item.categoryId);
          if (!newCategoryId) continue;

          const existingItem = await tx.mantItem.findFirst({
            where: { tenantId, name: item.name },
          });

          if (existingItem) {
            itemMap.set(item.id, existingItem.id);
            counts.items++;
          } else {
            const newItem = await tx.mantItem.create({
              data: {
                name: item.name,
                description: item.description,
                mantType: item.mantType,
                categoryId: newCategoryId,
                type: item.type,
                isGlobal: false,
                tenantId,
              },
            });
            itemMap.set(item.id, newItem.id);
            counts.items++;
          }
        }

        console.log('[CopyKB] Copying master parts...');
        const globalParts = await tx.masterPart.findMany({
          where: { tenantId: null },
        });

        for (const part of globalParts) {
          const existingPart = await tx.masterPart.findFirst({
            where: { tenantId, code: part.code },
          });

          if (existingPart) {
            partMap.set(part.id, existingPart.id);
            counts.parts++;
          } else {
            const newPart = await tx.masterPart.create({
              data: {
                code: part.code,
                description: part.description,
                category: part.category,
                subcategory: part.subcategory,
                unit: part.unit,
                referencePrice: part.referencePrice,
                tenantId,
              },
            });
            partMap.set(part.id, newPart.id);
            counts.parts++;
          }
        }

        console.log('[CopyKB] Copying intelligent links (MantItemVehiclePart)...');
        const globalItemParts = await tx.mantItemVehiclePart.findMany({
          where: { isGlobal: true, tenantId: null },
        });

        for (const hip of globalItemParts) {
          const newMantItemId = itemMap.get(hip.mantItemId);
          const newBrandId = brandMap.get(hip.vehicleBrandId);
          const newLineId = lineMap.get(hip.vehicleLineId);
          const newPartId = partMap.get(hip.masterPartId);

          if (!newMantItemId || !newBrandId || !newLineId || !newPartId) {
            continue; // No se pueden vincular repuestos si faltan referencias
          }

          const existingLink = await tx.mantItemVehiclePart.findFirst({
            where: {
              tenantId,
              mantItemId: newMantItemId,
              vehicleBrandId: newBrandId,
              vehicleLineId: newLineId,
              masterPartId: newPartId,
            },
          });

          if (!existingLink) {
            await tx.mantItemVehiclePart.create({
              data: {
                mantItemId: newMantItemId,
                vehicleBrandId: newBrandId,
                vehicleLineId: newLineId,
                masterPartId: newPartId,
                yearFrom: hip.yearFrom,
                yearTo: hip.yearTo,
                isGlobal: false,
                tenantId,
              },
            });
            counts.itemParts++;
          }
        }
      }

      if (options.lineIds.length > 0) {
        console.log('[CopyKB] Copying maintenance templates for lines:', options.lineIds);

        const globalTemplates = await tx.maintenanceTemplate.findMany({
          where: {
            isGlobal: true,
            tenantId: null,
            vehicleLineId: { in: options.lineIds },
          },
          include: {
            packages: {
              include: { packageItems: true },
            },
          },
        });

        for (const tpl of globalTemplates) {
          const newLineId = lineMap.get(tpl.vehicleLineId);
          if (!newLineId) {
            console.log('[CopyKB] Skipping template, line not found:', tpl.vehicleLineId);
            continue;
          }

          const newBrandId = tpl.vehicleBrandId ? brandMap.get(tpl.vehicleBrandId) : null;
          if (!newBrandId) {
            console.log('[CopyKB] Skipping template, brand not found:', tpl.vehicleBrandId);
            continue;
          }

          const existingTemplate = await tx.maintenanceTemplate.findFirst({
            where: { tenantId, name: tpl.name },
          });

          let newTemplateId: string;

          if (existingTemplate) {
            newTemplateId = existingTemplate.id;
            counts.templates++;
          } else {
            const newTemplate = await tx.maintenanceTemplate.create({
              data: {
                name: tpl.name,
                description: tpl.description,
                vehicleBrandId: newBrandId,
                vehicleLineId: newLineId,
                version: tpl.version,
                isDefault: tpl.isDefault,
                isGlobal: false,
                tenantId,
              },
            });
            newTemplateId = newTemplate.id;
            counts.templates++;
          }

          for (const pkg of tpl.packages) {
            const existingPackage = await tx.maintenancePackage.findFirst({
              where: { templateId: newTemplateId, name: pkg.name },
            });

            let newPackageId: string;

            if (existingPackage) {
              newPackageId = existingPackage.id;
              counts.packages++;
            } else {
              const newPackage = await tx.maintenancePackage.create({
                data: {
                  templateId: newTemplateId,
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
              newPackageId = newPackage.id;
              counts.packages++;
            }

            for (const pi of pkg.packageItems) {
              const newMantItemId = itemMap.get(pi.mantItemId);
              if (!newMantItemId) {
                console.log('[CopyKB] Skipping package item, item not found:', pi.mantItemId);
                continue;
              }

              const existingPackageItem = await tx.packageItem.findFirst({
                where: { packageId: newPackageId, mantItemId: newMantItemId },
              });

              if (!existingPackageItem) {
                await tx.packageItem.create({
                  data: {
                    packageId: newPackageId,
                    mantItemId: newMantItemId,
                    triggerKm: pi.triggerKm,
                    priority: pi.priority,
                    estimatedTime: pi.estimatedTime,
                    technicalNotes: pi.technicalNotes,
                    isOptional: pi.isOptional,
                    order: pi.order,
                  },
                });
              }
              counts.packageItems++;
            }
          }
        }
      }

      console.log('[CopyKB] Copy completed. Counts:', counts);
      return counts;
    });

    return { success: true, counts: result };
  } catch (error) {
    console.error('[CopyKB] Error during copy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during copy',
    };
  }
}
