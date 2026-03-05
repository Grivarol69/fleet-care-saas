'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export type TemplateOption = {
  lineId: string;
  brandName: string;
  lineName: string;
  templateCount: number;
  packageCount: number;
};

export type KBCounts = {
  brands: number;
  lines: number;
  types: number;
  categories: number;
  items: number;
  parts: number;
  itemParts: number;
  templates: TemplateOption[];
};

export async function getKBCounts(): Promise<KBCounts> {
  console.log('[KBCounts] Fetching global KB counts...');

  const user = await getCurrentUser();
  if (!user) {
    console.warn('[KBCounts] Unauthenticated request rejected');
    return { brands: 0, lines: 0, types: 0, categories: 0, items: 0, parts: 0, itemParts: 0, templates: [] };
  }

  try {
    const globalQuery = { isGlobal: true, tenantId: null };

    const [
      brandsCount,
      linesCount,
      typesCount,
      categoriesCount,
      itemsCount,
      partsCount,
      itemPartsCount,
    ] = await Promise.all([
      prisma.vehicleBrand.count({
        where: globalQuery,
      }),
      prisma.vehicleLine.count({
        where: globalQuery,
      }),
      prisma.vehicleType.count({
        where: globalQuery,
      }),
      prisma.mantCategory.count({
        where: globalQuery,
      }),
      prisma.mantItem.count({
        where: globalQuery,
      }),
      prisma.masterPart.count({
        where: globalQuery,
      }),
      prisma.mantItemVehiclePart.count({
        where: globalQuery,
      }),
    ]);

    const globalTemplates = await prisma.maintenanceTemplate.findMany({
      where: globalQuery,
      include: {
        line: {
          include: { brand: true },
        },
        packages: true,
      },
    });

    const templateMap = new Map<string, TemplateOption>();

    for (const tpl of globalTemplates) {
      const lineId = tpl.vehicleLineId;
      const existing = templateMap.get(lineId);

      if (existing) {
        existing.templateCount++;
        existing.packageCount += tpl.packages.length;
      } else {
        templateMap.set(lineId, {
          lineId,
          brandName: tpl.line?.brand?.name || 'Unknown',
          lineName: tpl.line?.name || 'Unknown',
          templateCount: 1,
          packageCount: tpl.packages.length,
        });
      }
    }

    const templates = Array.from(templateMap.values()).filter(t => t.templateCount > 0);

    console.log('[KBCounts] Counts:', {
      brands: brandsCount,
      lines: linesCount,
      types: typesCount,
      categories: categoriesCount,
      items: itemsCount,
      parts: partsCount,
      itemParts: itemPartsCount,
      templateLines: templates.length,
    });

    return {
      brands: brandsCount,
      lines: linesCount,
      types: typesCount,
      categories: categoriesCount,
      items: itemsCount,
      parts: partsCount,
      itemParts: itemPartsCount,
      templates,
    };
  } catch (error) {
    console.error('[KBCounts] Error fetching counts:', error);
    return {
      brands: 0,
      lines: 0,
      types: 0,
      categories: 0,
      items: 0,
      parts: 0,
      itemParts: 0,
      templates: [],
    };
  }
}
