/**
 * SEED DE KNOWLEDGE BASE GLOBAL
 *
 * Este seed está diseñado para ejecutarse en PRODUCCIÓN.
 * Solo crea datos globales reutilizables entre todos los tenants.
 *
 * NO crea:
 * - Tenants
 * - Usuarios
 * - Vehículos
 * - Datos operacionales
 *
 * Uso: npm run seed:kb
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('⚠️  SEED KB TEMPORALMENTE DESHABILITADO');
  console.log('⚠️  Será reescrito con nueva arquitectura:');
  console.log('   - categoryId en MantItem');
  console.log('   - mantItemId opcional en WorkOrderItem');
  console.log('   - Sistema de inventario\n');
  console.log(
    '📝 Ver: .claude/sessions/2026-01-21-plan-estrategico-opcion-b-completo.md\n'
  );

  return; // Early return - deshabilitar seed

  // CÓDIGO ORIGINAL COMENTADO PARA REFERENCIA
  /*
  console.log('🌱 Starting Knowledge Base Seed...\n');
  console.log('⚠️  This seed ONLY creates global catalog data');
  console.log('⚠️  NO tenants, users, or operational data will be created\n');

  // ========================================
  // PARTE 1: MARCAS Y LÍNEAS GLOBALES
  // ========================================
  console.log('📚 Creating Global Brands and Lines...\n');

  const toyota = await prisma.vehicleBrand.create({
    data: { name: 'Toyota', isGlobal: true, tenantId: null }
  });

  const nissan = await prisma.vehicleBrand.create({
    data: { name: 'Nissan', isGlobal: true, tenantId: null }
  });

  const chevrolet = await prisma.vehicleBrand.create({
    data: { name: 'Chevrolet', isGlobal: true, tenantId: null }
  });

  const ford = await prisma.vehicleBrand.create({
    data: { name: 'Ford', isGlobal: true, tenantId: null }
  });

  const mitsubishi = await prisma.vehicleBrand.create({
    data: { name: 'Mitsubishi', isGlobal: true, tenantId: null }
  });

  console.log('✓ Created 5 global brands\n');

  // Líneas por marca
  const hilux = await prisma.vehicleLine.create({
    data: { name: 'Hilux', brandId: toyota.id, isGlobal: true, tenantId: null }
  });

  const landCruiser = await prisma.vehicleLine.create({
    data: { name: 'Land Cruiser', brandId: toyota.id, isGlobal: true, tenantId: null }
  });

  const frontier = await prisma.vehicleLine.create({
    data: { name: 'Frontier', brandId: nissan.id, isGlobal: true, tenantId: null }
  });

  const npr = await prisma.vehicleLine.create({
    data: { name: 'NPR', brandId: chevrolet.id, isGlobal: true, tenantId: null }
  });

  const dmax = await prisma.vehicleLine.create({
    data: { name: 'D-MAX', brandId: chevrolet.id, isGlobal: true, tenantId: null }
  });

  const ranger = await prisma.vehicleLine.create({
    data: { name: 'Ranger', brandId: ford.id, isGlobal: true, tenantId: null }
  });

  const l200 = await prisma.vehicleLine.create({
    data: { name: 'L200', brandId: mitsubishi.id, isGlobal: true, tenantId: null }
  });

  console.log('✓ Created 7 global vehicle lines\n');

  // ========================================
  // PARTE 2: TIPOS DE VEHÍCULOS
  // ========================================
  console.log('Creating vehicle types...');

  await prisma.vehicleType.create({
    data: { name: 'Camioneta 4x4', isGlobal: true, tenantId: null }
  });

  await prisma.vehicleType.create({
    data: { name: 'Camión de Carga', isGlobal: true, tenantId: null }
  });

  await prisma.vehicleType.create({
    data: { name: 'SUV', isGlobal: true, tenantId: null }
  });

  console.log('✓ Created 3 vehicle types\n');

  // ========================================
  // PARTE 3: CATEGORÍAS Y ITEMS DE MANTENIMIENTO
  // ========================================
  console.log('Creating maintenance categories and items...\n');

  // Categorías
  const catMotor = await prisma.mantCategory.create({
    data: {
      name: 'Motor y Lubricación',
      description: 'Mantenimiento del motor, aceites y filtros',
      isGlobal: true,
      tenantId: null
    }
  });

  const catFreno = await prisma.mantCategory.create({
    data: {
      name: 'Sistema de Frenos',
      description: 'Frenos, pastillas, discos y líquido',
      isGlobal: true,
      tenantId: null
    }
  });

  const catSuspension = await prisma.mantCategory.create({
    data: {
      name: 'Suspensión y Dirección',
      description: 'Amortiguadores, rotulas, dirección',
      isGlobal: true,
      tenantId: null
    }
  });

  const catElectrico = await prisma.mantCategory.create({
    data: {
      name: 'Sistema Eléctrico',
      description: 'Batería, alternador, luces',
      isGlobal: true,
      tenantId: null
    }
  });

  const catTransmision = await prisma.mantCategory.create({
    data: {
      name: 'Transmisión',
      description: 'Caja de cambios, embrague, cardán',
      isGlobal: true,
      tenantId: null
    }
  });

  const catNeumaticos = await prisma.mantCategory.create({
    data: {
      name: 'Neumáticos',
      description: 'Llantas, presión, alineación y balanceo',
      isGlobal: true,
      tenantId: null
    }
  });

  const catInspeccion = await prisma.mantCategory.create({
    data: {
      name: 'Inspección General',
      description: 'Revisiones y diagnósticos generales',
      isGlobal: true,
      tenantId: null
    }
  });

  console.log('✓ Created 7 maintenance categories\n');

  // Items de mantenimiento
  const items = await Promise.all([
    // Motor y Lubricación
    prisma.mantItem.create({
      data: {
        name: 'Cambio de Aceite Motor',
        description: 'Cambio de aceite de motor y filtro',
        categoryId: catMotor.id,
        estimatedDuration: 45,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio Filtro Aire',
        description: 'Reemplazo de filtro de aire del motor',
        categoryId: catMotor.id,
        estimatedDuration: 15,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio Filtro Combustible',
        description: 'Reemplazo de filtro de combustible',
        categoryId: catMotor.id,
        estimatedDuration: 30,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Cambio Filtro Habitáculo',
        description: 'Reemplazo de filtro de aire acondicionado',
        categoryId: catMotor.id,
        estimatedDuration: 20,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Revisión Nivel Refrigerante',
        description: 'Verificación y completado de líquido refrigerante',
        categoryId: catMotor.id,
        estimatedDuration: 10,
        isGlobal: true,
        tenantId: null
      }
    }),
    // Sistema de Frenos
    prisma.mantItem.create({
      data: {
        name: 'Inspección Pastillas Freno',
        description: 'Revisión de espesor de pastillas delanteras y traseras',
        categoryId: catFreno.id,
        estimatedDuration: 30,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspección Discos Freno',
        description: 'Medición de espesor y estado de discos',
        categoryId: catFreno.id,
        estimatedDuration: 30,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Revisión Líquido Frenos',
        description: 'Verificación nivel y estado del líquido de frenos',
        categoryId: catFreno.id,
        estimatedDuration: 15,
        isGlobal: true,
        tenantId: null
      }
    }),
    // Suspensión y Dirección
    prisma.mantItem.create({
      data: {
        name: 'Inspección Terminales Dirección',
        description: 'Revisión de terminales y rotulas de dirección',
        categoryId: catSuspension.id,
        estimatedDuration: 45,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspección Amortiguadores',
        description: 'Verificación de estado y fugas de amortiguadores',
        categoryId: catSuspension.id,
        estimatedDuration: 30,
        isGlobal: true,
        tenantId: null
      }
    }),
    // Sistema Eléctrico
    prisma.mantItem.create({
      data: {
        name: 'Revisión Batería',
        description: 'Verificación de carga, bornes y tensión de batería',
        categoryId: catElectrico.id,
        estimatedDuration: 20,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspección Luces',
        description: 'Verificación de todas las luces del vehículo',
        categoryId: catElectrico.id,
        estimatedDuration: 15,
        isGlobal: true,
        tenantId: null
      }
    }),
    // Transmisión
    prisma.mantItem.create({
      data: {
        name: 'Cambio Aceite Transmisión',
        description: 'Cambio de aceite de caja de cambios',
        categoryId: catTransmision.id,
        estimatedDuration: 60,
        isGlobal: true,
        tenantId: null
      }
    }),
    // Neumáticos
    prisma.mantItem.create({
      data: {
        name: 'Revisión Presión Llantas',
        description: 'Verificación y ajuste de presión en todas las llantas',
        categoryId: catNeumaticos.id,
        estimatedDuration: 15,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Rotación de Llantas',
        description: 'Rotación de llantas según patrón del fabricante',
        categoryId: catNeumaticos.id,
        estimatedDuration: 45,
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.mantItem.create({
      data: {
        name: 'Alineación y Balanceo',
        description: 'Alineación de dirección y balanceo de llantas',
        categoryId: catNeumaticos.id,
        estimatedDuration: 90,
        isGlobal: true,
        tenantId: null
      }
    }),
    // Inspección General
    prisma.mantItem.create({
      data: {
        name: 'Inspección Multipunto',
        description: 'Revisión general de sistemas del vehículo',
        categoryId: catInspeccion.id,
        estimatedDuration: 60,
        isGlobal: true,
        tenantId: null
      }
    }),
  ]);

  console.log(`✓ Created ${items.length} maintenance items\n`);

  // ========================================
  // PARTE 4: CATÁLOGO DE REPUESTOS (MasterPart)
  // ========================================
  console.log('Creating master parts catalog...\n');

  await Promise.all([
    // Aceites
    prisma.masterPart.create({
      data: {
        partNumber: 'ACE-SYN-5W30-1L',
        name: 'Aceite Sintético 5W-30',
        description: 'Aceite motor sintético 5W-30, 1 litro',
        category: 'Lubricantes',
        brand: 'Shell Helix',
        unitOfMeasure: 'Litro',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.masterPart.create({
      data: {
        partNumber: 'ACE-SYN-10W40-1L',
        name: 'Aceite Sintético 10W-40',
        description: 'Aceite motor sintético 10W-40, 1 litro',
        category: 'Lubricantes',
        brand: 'Mobil Super',
        unitOfMeasure: 'Litro',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.masterPart.create({
      data: {
        partNumber: 'ACE-MIN-15W40-1L',
        name: 'Aceite Mineral 15W-40',
        description: 'Aceite motor mineral 15W-40, 1 litro',
        category: 'Lubricantes',
        brand: 'Castrol GTX',
        unitOfMeasure: 'Litro',
        isGlobal: true,
        tenantId: null
      }
    }),
    // Filtros
    prisma.masterPart.create({
      data: {
        partNumber: 'FIL-ACE-BOSCH-0986AF1042',
        name: 'Filtro Aceite BOSCH',
        description: 'Filtro de aceite universal BOSCH 0986AF1042',
        category: 'Filtros',
        brand: 'BOSCH',
        unitOfMeasure: 'Unidad',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.masterPart.create({
      data: {
        partNumber: 'FIL-AIRE-MANN-C30130',
        name: 'Filtro Aire MANN',
        description: 'Filtro de aire MANN C30130',
        category: 'Filtros',
        brand: 'MANN',
        unitOfMeasure: 'Unidad',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.masterPart.create({
      data: {
        partNumber: 'FIL-COMB-BOSCH-F026403006',
        name: 'Filtro Combustible BOSCH',
        description: 'Filtro de combustible BOSCH F026403006',
        category: 'Filtros',
        brand: 'BOSCH',
        unitOfMeasure: 'Unidad',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.masterPart.create({
      data: {
        partNumber: 'FIL-HAB-MANN-CU2545',
        name: 'Filtro Habitáculo MANN',
        description: 'Filtro de aire acondicionado MANN CU2545',
        category: 'Filtros',
        brand: 'MANN',
        unitOfMeasure: 'Unidad',
        isGlobal: true,
        tenantId: null
      }
    }),
    // Frenos
    prisma.masterPart.create({
      data: {
        partNumber: 'PAST-FRENO-BOSCH-0986AB3682',
        name: 'Pastillas Freno Delanteras',
        description: 'Pastillas de freno delanteras BOSCH 0986AB3682',
        category: 'Frenos',
        brand: 'BOSCH',
        unitOfMeasure: 'Juego',
        isGlobal: true,
        tenantId: null
      }
    }),
    prisma.masterPart.create({
      data: {
        partNumber: 'LIQ-FRENO-DOT4-500ML',
        name: 'Líquido Frenos DOT4',
        description: 'Líquido de frenos DOT4, 500ml',
        category: 'Frenos',
        brand: 'Castrol',
        unitOfMeasure: 'Botella',
        isGlobal: true,
        tenantId: null
      }
    }),
    // Refrigerante
    prisma.masterPart.create({
      data: {
        partNumber: 'REFRIG-LONG-LIFE-1L',
        name: 'Refrigerante Long Life',
        description: 'Refrigerante anticongelante long life, 1 litro',
        category: 'Refrigerantes',
        brand: 'Shell',
        unitOfMeasure: 'Litro',
        isGlobal: true,
        tenantId: null
      }
    }),
  ]);

  console.log('✓ Created 10 master parts\n');

  // ========================================
  // PARTE 5: PLANTILLAS DE MANTENIMIENTO
  // ========================================
  console.log('Creating maintenance templates...\n');

  // Obtener items para reutilizar
  const itemAceite = items[0];
  const itemFiltroAire = items[1];
  const itemFiltroCombustible = items[2];
  const itemFiltroHabitaculo = items[3];
  const itemRefrigerante = items[4];
  const itemPastillas = items[5];
  const itemDiscos = items[6];
  const itemLiquidoFreno = items[7];
  const itemTerminales = items[8];
  const itemAmortiguadores = items[9];
  const itemBateria = items[10];
  const itemLuces = items[11];
  const itemAceiteTransmision = items[12];
  const itemPresionLlantas = items[13];
  const itemRotacion = items[14];
  const itemAlineacion = items[15];
  const itemInspeccion = items[16];

  // ========================================
  // PLANTILLA 1: TOYOTA HILUX
  // Basado en información oficial de Toyota Colombia
  // ========================================
  console.log('Creating Toyota Hilux template...');

  const templateHilux = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Toyota Hilux - Plan Estándar',
      description: 'Plan de mantenimiento preventivo oficial para Toyota Hilux. Basado en manual del fabricante Colombia.',
      brandId: toyota.id,
      lineId: hilux.id,
      isGlobal: true,
      tenantId: null
    }
  });

  // Hilux - Package 1000 km (Inicial)
  const hiluxPkg1k = await prisma.maintenancePackage.create({
    data: {
      name: 'Revisión 1,000 km',
      description: 'Primer mantenimiento - Revisión inicial del vehículo nuevo',
      templateId: templateHilux.id,
      triggerKm: 1000,
      estimatedCost: 80000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg1k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 1,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg1k.id,
        mantItemId: itemPresionLlantas.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
  ]);

  // Hilux - Package 5000 km
  const hiluxPkg5k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 5,000 km',
      description: 'Mantenimiento básico - Aceite y filtros principales',
      templateId: templateHilux.id,
      triggerKm: 5000,
      estimatedCost: 280000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg5k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '5 litros aceite sintético 5W-30'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg5k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg5k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 3,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg5k.id,
        mantItemId: itemPresionLlantas.id,
        sortOrder: 4,
        isRequired: true
      }
    }),
  ]);

  // Hilux - Package 10000 km
  const hiluxPkg10k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 10,000 km',
      description: 'Mantenimiento estándar - Aceite, filtros e inspección completa',
      templateId: templateHilux.id,
      triggerKm: 10000,
      estimatedCost: 350000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg10k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '5 litros aceite sintético 5W-30'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg10k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg10k.id,
        mantItemId: itemFiltroCombustible.id,
        sortOrder: 3,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg10k.id,
        mantItemId: itemFiltroHabitaculo.id,
        sortOrder: 4,
        isRequired: false
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg10k.id,
        mantItemId: itemPastillas.id,
        sortOrder: 5,
        isRequired: false,
        notes: 'Solo inspección'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg10k.id,
        mantItemId: itemRotacion.id,
        sortOrder: 6,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg10k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 7,
        isRequired: true
      }
    }),
  ]);

  // Hilux - Package 20000 km
  const hiluxPkg20k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 20,000 km',
      description: 'Mantenimiento intermedio - Incluye revisión de frenos y suspensión',
      templateId: templateHilux.id,
      triggerKm: 20000,
      estimatedCost: 480000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '5 litros aceite sintético 5W-30'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemFiltroCombustible.id,
        sortOrder: 3,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemFiltroHabitaculo.id,
        sortOrder: 4,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemPastillas.id,
        sortOrder: 5,
        isRequired: false,
        notes: 'Inspección y cambio si es necesario'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemDiscos.id,
        sortOrder: 6,
        isRequired: false,
        notes: 'Solo inspección'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemTerminales.id,
        sortOrder: 7,
        isRequired: false
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemRotacion.id,
        sortOrder: 8,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemAlineacion.id,
        sortOrder: 9,
        isRequired: false
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg20k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 10,
        isRequired: true
      }
    }),
  ]);

  // Hilux - Package 50000 km
  const hiluxPkg50k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 50,000 km',
      description: 'Mantenimiento mayor - Incluye transmisión y revisión completa',
      templateId: templateHilux.id,
      triggerKm: 50000,
      estimatedCost: 780000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '5 litros aceite sintético 5W-30'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemFiltroCombustible.id,
        sortOrder: 3,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemFiltroHabitaculo.id,
        sortOrder: 4,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemAceiteTransmision.id,
        sortOrder: 5,
        isRequired: true,
        notes: 'Cambio de aceite de transmisión'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemPastillas.id,
        sortOrder: 6,
        isRequired: true,
        notes: 'Cambio de pastillas delanteras y traseras'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemLiquidoFreno.id,
        sortOrder: 7,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemRefrigerante.id,
        sortOrder: 8,
        isRequired: true,
        notes: 'Cambio completo de refrigerante'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemAmortiguadores.id,
        sortOrder: 9,
        isRequired: false,
        notes: 'Inspección detallada'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemRotacion.id,
        sortOrder: 10,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemAlineacion.id,
        sortOrder: 11,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: hiluxPkg50k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 12,
        isRequired: true
      }
    }),
  ]);

  console.log('✓ Created Toyota Hilux template with 5 packages\n');

  // ========================================
  // PLANTILLA 2: NISSAN FRONTIER
  // Basado en información oficial de Nissan Colombia
  // ========================================
  console.log('Creating Nissan Frontier template...');

  const templateFrontier = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Nissan Frontier - Plan Estándar',
      description: 'Plan de mantenimiento preventivo oficial para Nissan Frontier. Basado en manual del fabricante Colombia.',
      brandId: nissan.id,
      lineId: frontier.id,
      isGlobal: true,
      tenantId: null
    }
  });

  // Frontier - Package 5000 km
  const frontierPkg5k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 5,000 km',
      description: 'Mantenimiento básico - Inspección general y ajustes',
      templateId: templateFrontier.id,
      triggerKm: 5000,
      estimatedCost: 220000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg5k.id,
        mantItemId: itemTerminales.id,
        sortOrder: 1,
        isRequired: false,
        notes: 'Inspección terminales y rotulas'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg5k.id,
        mantItemId: itemLuces.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg5k.id,
        mantItemId: itemBateria.id,
        sortOrder: 3,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg5k.id,
        mantItemId: itemPresionLlantas.id,
        sortOrder: 4,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg5k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 5,
        isRequired: false,
        notes: 'Solo revisión'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg5k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 6,
        isRequired: true
      }
    }),
  ]);

  // Frontier - Package 10000 km
  const frontierPkg10k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 10,000 km',
      description: 'Mantenimiento estándar - Aceite, filtros y sistema de frenos',
      templateId: templateFrontier.id,
      triggerKm: 10000,
      estimatedCost: 380000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg10k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '4.5 litros aceite sintético 5W-30'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg10k.id,
        mantItemId: itemPastillas.id,
        sortOrder: 2,
        isRequired: false,
        notes: 'Inspección y limpieza sistema de frenos'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg10k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 3,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg10k.id,
        mantItemId: itemBateria.id,
        sortOrder: 4,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg10k.id,
        mantItemId: itemTerminales.id,
        sortOrder: 5,
        isRequired: false
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg10k.id,
        mantItemId: itemLuces.id,
        sortOrder: 6,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg10k.id,
        mantItemId: itemPresionLlantas.id,
        sortOrder: 7,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg10k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 8,
        isRequired: true
      }
    }),
  ]);

  // Frontier - Package 20000 km
  const frontierPkg20k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 20,000 km',
      description: 'Mantenimiento intermedio - Incluye filtros adicionales y rotación',
      templateId: templateFrontier.id,
      triggerKm: 20000,
      estimatedCost: 450000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg20k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '4.5 litros aceite sintético 5W-30'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg20k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg20k.id,
        mantItemId: itemFiltroCombustible.id,
        sortOrder: 3,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg20k.id,
        mantItemId: itemFiltroHabitaculo.id,
        sortOrder: 4,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg20k.id,
        mantItemId: itemPastillas.id,
        sortOrder: 5,
        isRequired: false,
        notes: 'Inspección completa'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg20k.id,
        mantItemId: itemRotacion.id,
        sortOrder: 6,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg20k.id,
        mantItemId: itemBateria.id,
        sortOrder: 7,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg20k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 8,
        isRequired: true
      }
    }),
  ]);

  // Frontier - Package 40000 km
  const frontierPkg40k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 40,000 km',
      description: 'Mantenimiento mayor - Incluye transmisión y sistemas críticos',
      templateId: templateFrontier.id,
      triggerKm: 40000,
      estimatedCost: 680000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '4.5 litros aceite sintético 5W-30'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemFiltroCombustible.id,
        sortOrder: 3,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemFiltroHabitaculo.id,
        sortOrder: 4,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemAceiteTransmision.id,
        sortOrder: 5,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemPastillas.id,
        sortOrder: 6,
        isRequired: true,
        notes: 'Cambio de pastillas'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemLiquidoFreno.id,
        sortOrder: 7,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemRotacion.id,
        sortOrder: 8,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemAlineacion.id,
        sortOrder: 9,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: frontierPkg40k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 10,
        isRequired: true
      }
    }),
  ]);

  console.log('✓ Created Nissan Frontier template with 4 packages\n');

  // ========================================
  // PLANTILLA 3: CHEVROLET NPR
  // Basado en información oficial de camiones comerciales
  // ========================================
  console.log('Creating Chevrolet NPR template...');

  const templateNPR = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Chevrolet NPR - Plan Comercial',
      description: 'Plan de mantenimiento preventivo para camión comercial Chevrolet NPR. Uso intensivo.',
      brandId: chevrolet.id,
      lineId: npr.id,
      isGlobal: true,
      tenantId: null
    }
  });

  // NPR - Package 10000 km
  const nprPkg10k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 10,000 km',
      description: 'Mantenimiento estándar - Aceite y filtros principales',
      templateId: templateNPR.id,
      triggerKm: 10000,
      estimatedCost: 520000, // COP (camión comercial más costoso)
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: nprPkg10k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '13 cuartos aceite motor diesel 15W-40'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg10k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 2,
        isRequired: true,
        notes: 'Filtro principal de aire'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg10k.id,
        mantItemId: itemFiltroCombustible.id,
        sortOrder: 3,
        isRequired: true,
        notes: 'Filtro principal de combustible'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg10k.id,
        mantItemId: itemPastillas.id,
        sortOrder: 4,
        isRequired: false,
        notes: 'Inspección sistema de frenos'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg10k.id,
        mantItemId: itemPresionLlantas.id,
        sortOrder: 5,
        isRequired: true,
        notes: 'Verificar presión llantas duales'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg10k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 6,
        isRequired: true,
        notes: 'Inspección multipunto comercial'
      }
    }),
  ]);

  // NPR - Package 20000 km
  const nprPkg20k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 20,000 km',
      description: 'Mantenimiento intermedio - Incluye filtros y revisión completa',
      templateId: templateNPR.id,
      triggerKm: 20000,
      estimatedCost: 680000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: nprPkg20k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '13 cuartos aceite motor diesel 15W-40'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg20k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg20k.id,
        mantItemId: itemFiltroCombustible.id,
        sortOrder: 3,
        isRequired: true,
        notes: 'Filtro principal + sedimentador'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg20k.id,
        mantItemId: itemPastillas.id,
        sortOrder: 4,
        isRequired: false,
        notes: 'Inspección y ajuste de frenos'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg20k.id,
        mantItemId: itemTerminales.id,
        sortOrder: 5,
        isRequired: false,
        notes: 'Inspección dirección y suspensión'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg20k.id,
        mantItemId: itemRotacion.id,
        sortOrder: 6,
        isRequired: true,
        notes: 'Rotación llantas duales'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg20k.id,
        mantItemId: itemBateria.id,
        sortOrder: 7,
        isRequired: true,
        notes: 'Verificar baterías (2 unidades)'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg20k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 8,
        isRequired: true
      }
    }),
  ]);

  // NPR - Package 30000 km
  const nprPkg30k = await prisma.maintenancePackage.create({
    data: {
      name: 'Mantenimiento 30,000 km',
      description: 'Mantenimiento completo - Fin de garantía incluida fabricante',
      templateId: templateNPR.id,
      triggerKm: 30000,
      estimatedCost: 850000, // COP
      isGlobal: true,
      tenantId: null
    }
  });

  await Promise.all([
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemAceite.id,
        sortOrder: 1,
        isRequired: true,
        notes: '13 cuartos aceite motor diesel 15W-40'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemFiltroAire.id,
        sortOrder: 2,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemFiltroCombustible.id,
        sortOrder: 3,
        isRequired: true,
        notes: 'Filtro principal + sedimentador'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemAceiteTransmision.id,
        sortOrder: 4,
        isRequired: true,
        notes: 'Cambio aceite transmisión comercial'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemPastillas.id,
        sortOrder: 5,
        isRequired: true,
        notes: 'Cambio pastillas de freno'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemLiquidoFreno.id,
        sortOrder: 6,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemRefrigerante.id,
        sortOrder: 7,
        isRequired: true,
        notes: 'Cambio refrigerante motor diesel'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemTerminales.id,
        sortOrder: 8,
        isRequired: false,
        notes: 'Inspección completa suspensión y dirección'
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemRotacion.id,
        sortOrder: 9,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemAlineacion.id,
        sortOrder: 10,
        isRequired: true
      }
    }),
    prisma.packageItem.create({
      data: {
        packageId: nprPkg30k.id,
        mantItemId: itemInspeccion.id,
        sortOrder: 11,
        isRequired: true,
        notes: 'Inspección completa pre-garantía'
      }
    }),
  ]);

  console.log('✓ Created Chevrolet NPR template with 3 packages\n');

  // ========================================
  // RESUMEN FINAL
  // ========================================
  console.log('\n========================================');
  console.log('✅ KNOWLEDGE BASE SEED COMPLETED');
  console.log('========================================\n');

  const brandCount = await prisma.vehicleBrand.count();
  const lineCount = await prisma.vehicleLine.count();
  const typeCount = await prisma.vehicleType.count();
  const categoryCount = await prisma.mantCategory.count();
  const itemCount = await prisma.mantItem.count();
  const partCount = await prisma.masterPart.count();
  const templateCount = await prisma.maintenanceTemplate.count();
  const packageCount = await prisma.maintenancePackage.count();
  const packageItemCount = await prisma.packageItem.count();

  console.log('📊 Summary:');
  console.log(`   - Brands: ${brandCount}`);
  console.log(`   - Lines: ${lineCount}`);
  console.log(`   - Types: ${typeCount}`);
  console.log(`   - Categories: ${categoryCount}`);
  console.log(`   - Maintenance Items: ${itemCount}`);
  console.log(`   - Master Parts: ${partCount}`);
  console.log(`   - Templates: ${templateCount}`);
  console.log(`   - Packages: ${packageCount}`);
  console.log(`   - Package Items: ${packageItemCount}\n`);

  console.log('🎯 Templates Created:');
  console.log('   1. Toyota Hilux - 5 packages (1k, 5k, 10k, 20k, 50k km)');
  console.log('   2. Nissan Frontier - 4 packages (5k, 10k, 20k, 40k km)');
  console.log('   3. Chevrolet NPR - 3 packages (10k, 20k, 30k km)\n');

  console.log('⚠️  NEXT STEPS:');
  console.log('   1. Create SUPER_ADMIN account in Clerk dashboard manually');
  console.log('   2. Create Platform Tenant in database linked to SUPER_ADMIN');
  console.log('   3. Configure production environment variables');
  console.log('   4. Test client onboarding flow (sign-up → create org → load data via UI)\n');

  console.log('✅ Database is ready for production deployment!\n');
  */
} // Fin de main()

main()
  .catch(e => {
    console.error('❌ Error in seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
