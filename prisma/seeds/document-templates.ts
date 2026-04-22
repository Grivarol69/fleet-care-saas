import { PrismaClient } from '@prisma/client';

export async function seedDocumentTemplates(
  prisma: PrismaClient
): Promise<void> {
  console.log(
    '\n   [DOCS] Seeding DocumentTypeConfig y DocumentRequirement globales...'
  );

  // 1. Diccionario Global de Documentos (Colombia)
  const docsToCreate = [
    {
      code: 'SOAT',
      name: 'SOAT',
      description: 'Seguro Obligatorio de Accidentes de Tránsito',
      requiresExpiry: true,
      expiryWarningDays: 30,
      expiryCriticalDays: 7,
      sortOrder: 1,
    },
    {
      code: 'TECNOMECANICA',
      name: 'Revisión Técnico-Mecánica',
      description: 'Revisión técnico-mecánica y de emisiones contaminantes',
      requiresExpiry: true,
      expiryWarningDays: 45,
      expiryCriticalDays: 15,
      sortOrder: 2,
    },
    {
      code: 'INSURANCE',
      name: 'Póliza de Responsabilidad / Todo Riesgo',
      description:
        'Póliza de seguro del vehículo (RC Extracontractual / Contractual)',
      requiresExpiry: true,
      expiryWarningDays: 30,
      expiryCriticalDays: 7,
      sortOrder: 3,
    },
    {
      code: 'REGISTRATION',
      name: 'Tarjeta de Propiedad',
      description: 'Licencia de tránsito del vehículo',
      requiresExpiry: false,
      expiryWarningDays: 0,
      expiryCriticalDays: 0,
      sortOrder: 4,
    },
    {
      code: 'MANIFIESTO',
      name: 'Manifiesto de Carga',
      description: 'Documento que ampara el transporte de mercancías',
      requiresExpiry: true, // A menudo es por viaje, pero dejaremos estándar
      expiryWarningDays: 7,
      expiryCriticalDays: 2,
      sortOrder: 5,
    },
    {
      code: 'OTHER',
      name: 'Otro',
      description: 'Otro tipo de documento',
      requiresExpiry: false,
      expiryWarningDays: 30,
      expiryCriticalDays: 7,
      sortOrder: 6,
    },
  ];

  const createdDocsMap = new Map<string, string>();

  for (const doc of docsToCreate) {
    const existing = await prisma.documentTypeConfig.findFirst({
      where: {
        code: doc.code,
        tenantId: null,
        isGlobal: true,
        countryCode: 'CO',
      },
    });

    if (existing) {
      createdDocsMap.set(doc.code, existing.id);
    } else {
      const created = await prisma.documentTypeConfig.create({
        data: {
          tenantId: null,
          isGlobal: true,
          countryCode: 'CO',
          code: doc.code,
          name: doc.name,
          description: doc.description,
          requiresExpiry: doc.requiresExpiry,
          isMandatory: false, // Default is false, overriden by Requirement
          expiryWarningDays: doc.expiryWarningDays,
          expiryCriticalDays: doc.expiryCriticalDays,
          sortOrder: doc.sortOrder,
        },
      });
      createdDocsMap.set(doc.code, created.id);
    }
  }

  // 2. Asociar a VehicleTypes
  const ALL_VEHICLE_TYPES = await prisma.vehicleType.findMany({
    where: { tenantId: null, isGlobal: true },
  });

  const HEAVY_TYPES = [
    'Tractocamión',
    'Volqueta',
    'Camión Pesado',
    'Camión Mediano',
  ];
  const PASSENGER_TYPES = ['Bus', 'Buseta', 'Microbús'];
  const LIGHT_TYPES = [
    'Automóvil',
    'Camioneta',
    'Campero',
    'Furgón',
    'Motocicleta',
  ];
  const UNCONVENTIONAL = [
    'Semirremolque',
    'Maquinaria Agrícola',
    'Maquinaria Industrial',
  ];

  let countReqs = 0;

  for (const vt of ALL_VEHICLE_TYPES) {
    const reqsToCreate: { docCode: string; isMandatory: boolean }[] = [];

    // Todos excepto maquinaria/remolques requieren SOAT y Tecno
    if (!UNCONVENTIONAL.includes(vt.name)) {
      reqsToCreate.push({ docCode: 'SOAT', isMandatory: true });
      reqsToCreate.push({ docCode: 'TECNOMECANICA', isMandatory: true });
    }

    // El Semirremolque requiere su propia tarjeta de registro, opcional tecno
    if (vt.name === 'Semirremolque') {
      reqsToCreate.push({ docCode: 'REGISTRATION', isMandatory: true });
      reqsToCreate.push({ docCode: 'TECNOMECANICA', isMandatory: true });
    }

    // Todos los ligeros/pesados/pasajeros requieren Tarjeta de Propiedad
    if (!['Maquinaria Agrícola', 'Maquinaria Industrial'].includes(vt.name)) {
      reqsToCreate.push({ docCode: 'REGISTRATION', isMandatory: true });
    }

    // Pasajeros y Pesados requieren Seguro/Póliza de forma obligatoria
    if (HEAVY_TYPES.includes(vt.name) || PASSENGER_TYPES.includes(vt.name)) {
      reqsToCreate.push({ docCode: 'INSURANCE', isMandatory: true });
    } else {
      // Para ligeros es opcional
      reqsToCreate.push({ docCode: 'INSURANCE', isMandatory: false });
    }

    // Pesados requieren Manifiesto de Carga (ejemplo)
    if (HEAVY_TYPES.includes(vt.name)) {
      reqsToCreate.push({ docCode: 'MANIFIESTO', isMandatory: true });
    }

    for (const req of reqsToCreate) {
      const docId = createdDocsMap.get(req.docCode);
      if (!docId) continue;

      const existingReq = await prisma.documentRequirement.findFirst({
        where: { documentTypeId: docId, vehicleTypeId: vt.id },
      });

      if (!existingReq) {
        await prisma.documentRequirement.create({
          data: {
            documentTypeId: docId,
            vehicleTypeId: vt.id,
            isMandatory: req.isMandatory,
          },
        });
        countReqs++;
      }
    }
  }

  console.log(
    `   [DOCS] DocumentTypeConfigs creados/validados (${createdDocsMap.size}).`
  );
  console.log(
    `   [DOCS] Vinculados ${countReqs} requerimientos a tipos de vehículos.\n`
  );
}
