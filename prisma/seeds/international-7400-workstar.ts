import { PrismaClient } from '@prisma/client';

export async function seedInternational7400WorkStar(prisma: PrismaClient) {
  console.log('\n=== SEED: International 7400 WorkStar ===\n');

  // ========================================
  // 1. Crear Marca y Línea
  // ========================================
  console.log('1. Creando marca y línea...');

  let internacional = await prisma.vehicleBrand.findFirst({
    where: { name: 'International', tenantId: null },
  });
  if (!internacional) {
    internacional = await prisma.vehicleBrand.create({
      data: {
        name: 'International',
        isGlobal: true,
        tenantId: null,
      },
    });
  }

  let workstar7400 = await prisma.vehicleLine.findFirst({
    where: { brandId: internacional.id, name: '7400 WorkStar', tenantId: null },
  });
  if (!workstar7400) {
    workstar7400 = await prisma.vehicleLine.create({
      data: {
        name: '7400 WorkStar',
        brandId: internacional.id,
        isGlobal: true,
        tenantId: null,
      },
    });
  }

  console.log(`   ✓ Marca: ${internacional.name}`);
  console.log(`   ✓ Línea: ${workstar7400.name}`);

  // ========================================
  // 2. Obtener categorías existentes
  // ========================================
  console.log('\n2. Obteniendo categorías...');

  const categories = await prisma.mantCategory.findMany({
    where: { isGlobal: true },
  });

  const getCategory = (name: string) => categories.find(c => c.name === name);

  const catMotor = getCategory('Motor');
  const catTransmision = getCategory('Transmision');
  const catFrenos = getCategory('Frenos');
  const catSuspension = getCategory('Suspension');
  const catElectrico = getCategory('Electrico');
  const catLubricacion = getCategory('Lubricacion');
  const catFiltros = getCategory('Filtros');
  const catNeumaticos = getCategory('Neumaticos');
  const catCarroceria = getCategory('Carroceria');
  const catRefrigeracion = getCategory('Refrigeracion');

  // ========================================
  // 3. Crear MantItems específicos para International 7400 WorkStar
  // ========================================
  console.log(
    '\n3. Creando MantItems específicos para International 7400 WorkStar...'
  );

  const mantItems = await Promise.all([
    // Motor [0-3]
    prisma.mantItem.create({
      data: {
        name: 'Engrase general chasis',
        description:
          'Engrase de puntos de lubricación del chasís y componentes',

        categoryId: catLubricacion?.id || '', // FIXED
        type: 'SERVICE', // FIXED
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Ajuste valvulas motor',
        description: 'Ajuste de válvulas del motor MaxxForce',

        categoryId: catMotor?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion turbocharger',
        description: 'Verificar estado y funcionamiento del turbocharger',

        categoryId: catMotor?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion bomba inyectores',
        description: 'Verificar estado de bomba de inyectores',

        categoryId: catMotor?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Transmision [4-6]
    prisma.mantItem.create({
      data: {
        name: 'Ajuste cardanes crucetas',
        description: 'Ajuste de cardanes, crucetas y flanches',

        categoryId: catTransmision?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion respiradero transmision',
        description: 'Verificar estado del respiradero de transmisión',

        categoryId: catTransmision?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion embrague',
        description: 'Verificar estado y ajuste del embrague',

        categoryId: catTransmision?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Frenos [7-10]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion bandas freno',
        description: 'Verificar estado y ajustar bandas de freno',

        categoryId: catFrenos?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion tambores discos freno',
        description: 'Verificar estado de tambores y discos de freno',

        categoryId: catFrenos?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion valvula alivio freno',
        description: 'Verificar funcionamiento de válvula de alivio de freno',

        categoryId: catFrenos?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion sellos ruedas',
        description: 'Verificar estado de sellos de ruedas',

        categoryId: catFrenos?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Suspension [11-14]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion muelles ballestas',
        description: 'Inspección visual de fisuras en muelles y ballestas',

        categoryId: catSuspension?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion bujes suspension',
        description: 'Verificar estado de bujes de suspensión',

        categoryId: catSuspension?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Ajuste grapas muelles',
        description: 'Ajuste de grapas de fijación de muelles',

        categoryId: catSuspension?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion estabilizadora',
        description: 'Verificar estado de barra estabilizadora',

        categoryId: catSuspension?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Electrico [15-17]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion alternador arranque',
        description:
          'Verificar funcionamiento de alternador y motor de arranque',

        categoryId: catElectrico?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion baterias sistema',
        description: 'Verificar estado de baterías y conexiones del sistema',

        categoryId: catElectrico?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Verificacion luces indicadores',
        description:
          'Verificar funcionamiento de luces e indicadores del tablero',

        categoryId: catElectrico?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Refrigeracion [18-19]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion radiador refrigeracion',
        description: 'Limpiar/soplar radiador y sistema de refrigeración',

        categoryId: catRefrigeracion?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion mangueras refrigerante',
        description:
          'Verificar estado de mangueras del sistema de refrigeración',

        categoryId: catRefrigeracion?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Direccion [20-21]
    prisma.mantItem.create({
      data: {
        name: 'Control juego libre direccion',
        description: 'Verificar holgura en el sistema de dirección',

        categoryId: catSuspension?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion bomba direccion hidraulica',
        description: 'Verificar estado de bomba de dirección hidráulica',

        categoryId: catSuspension?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Neumaticos [22-23]
    prisma.mantItem.create({
      data: {
        name: 'Engrase rodamientos ruedas',
        description: 'Lubricar rodamientos de ruedas',

        categoryId: catNeumaticos?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion presion neumaticos',
        description: 'Verificar presión de neumáticos',

        categoryId: catNeumaticos?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Admision [24]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion filtro aire motor',
        description: 'Verificar estado del filtro de aire del motor',

        categoryId: catFiltros?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Carroceria [25-27]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion filtro aire cabina',
        description: 'Verificar estado del filtro de aire de cabina',

        categoryId: catCarroceria?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion condicionador aire',
        description: 'Verificar sistema de aire acondicionado',

        categoryId: catCarroceria?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion asientos seguridad',
        description: 'Verificar estado de asientos y cinturones de seguridad',

        categoryId: catCarroceria?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Tren motriz [28-29]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion diferencial',
        description: 'Verificar estado y nivel de aceite del diferencial',

        categoryId: catTransmision?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion cardan ejemp',
        description: 'Verificar estado del cardán y eje propeller',

        categoryId: catTransmision?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Sistema combustible [30-31]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion linea combustible',
        description: 'Verificar estado de líneas de combustible',

        categoryId: catMotor?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Drenaje agua separador combustible',
        description: 'Drenar agua del separador de combustible',

        categoryId: catFiltros?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
  ]);

  console.log(`   ✓ ${mantItems.length} MantItems creados`);

  // Aliases para los items nuevos
  const iEngraseChasis = mantItems[0];
  const iAjusteValvulas = mantItems[1];
  const iTurbocharger = mantItems[2];
  const iBombaInyectores = mantItems[3];
  const iAjusteCardanes = mantItems[4];
  const iRespiraderoTransm = mantItems[5];
  const iInspeccionEmbrague = mantItems[6];
  const iBandasFreno = mantItems[7];
  const iTamboresDiscos = mantItems[8];
  const iValvulaAlivio = mantItems[9];
  const iSellosRuedas = mantItems[10];
  const iMuellesBallestas = mantItems[11];
  const iBujesSuspension = mantItems[12];
  const iGrapasMuelles = mantItems[13];
  const iEstabilizadora = mantItems[14];
  const iAltArr = mantItems[15];
  const iBateriasSistema = mantItems[16];
  const iLucesIndicadores = mantItems[17];
  const iRadiadorRefrigeracion = mantItems[18];
  const iMangueraRefrigerante = mantItems[19];
  const iJuegoLibreDir = mantItems[20];
  const iBombaDir = mantItems[21];
  const iRodamientosRuedas = mantItems[22];
  const iPresionNeumaticos = mantItems[23];
  const iFiltroAireMotor = mantItems[24];
  const iFiltroAireCabina = mantItems[25];
  const iAireAcondicionado = mantItems[26];
  const iAsientosSeguridad = mantItems[27];
  const iDiferencial = mantItems[28];
  const iCardanEje = mantItems[29];
  const iLineaCombustible = mantItems[30];
  const iDrenajeAgua = mantItems[31];

  // ========================================
  // 4. Obtener MantItems existentes del seed base
  // ========================================
  console.log('\n4. Obteniendo MantItems base...');

  const baseItems = await prisma.mantItem.findMany({
    where: { isGlobal: true },
    orderBy: { name: 'asc' },
  });

  const getBaseItem = (name: string) => baseItems.find(i => i.name === name);

  const iCambioAceite = getBaseItem('Cambio aceite motor');
  const iFiltroAceite = getBaseItem('Cambio filtro aceite');
  const iFiltroAire = getBaseItem('Cambio filtro aire');
  const iFiltroComb = getBaseItem('Cambio filtro combustible');
  const iLiquidoFreno = getBaseItem('Cambio liquido frenos'); // FIXED
  const iAceiteTransm = getBaseItem('Cambio aceite transmision');
  const iInspFreno = getBaseItem('Inspeccion pastillas freno');
  const iInspAmort = getBaseItem('Inspeccion amortiguadores');
  const iLubRotulas = getBaseItem('Lubricacion rotulas');
  const iRotNeumaticos = getBaseItem('Rotacion neumaticos');
  const iBalanceo = getBaseItem('Balanceo y alineacion');
  const iLiqDireccion = getBaseItem('Cambio liquido direccion hidraulica');
  const iInspBateria = getBaseItem('Inspeccion bateria');

  // const iTensionCorreas = getBaseItem('Tension correas'); // REMOVED (no existe en KB)

  console.log(`   ✓ ${baseItems.length} MantItems base encontrados`);

  // ========================================
  // 5. Crear Template
  // ========================================
  console.log('\n5. Creando Template...');

  const template = await prisma.maintenanceTemplate.create({
    data: {
      name: 'International 7400 WorkStar Standard',
      description:
        'Programa mantenimiento preventivo International 7400 WorkStar - Plan General',
      vehicleBrandId: internacional.id,
      vehicleLineId: workstar7400.id,
      version: '1.0',
      isDefault: true,
      isGlobal: true,
      tenantId: null,
    },
  });

  console.log(`   ✓ Template: ${template.name}`);

  // ========================================
  // 6. Crear Paquetes con Items
  // ========================================
  console.log('\n6. Creando Paquetes...');

  // Helper para crear paquetes
  async function createPackage(
    name: string,
    triggerKm: number,
    estimatedCost: number,
    estimatedTime: number,
    priority: 'LOW' | 'MEDIUM' | 'HIGH',
    items: Array<{
      mantItem: any;
      triggerKm: number;
      estimatedTime: number;
      order: number;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
    }>
  ) {
    const pkg = await prisma.maintenancePackage.create({
      data: {
        templateId: template.id,
        name,
        triggerKm,
        estimatedCost,
        estimatedTime,
        priority,
        packageType: 'PREVENTIVE',
        status: 'ACTIVE',
      },
    });

    for (const item of items) {
      await prisma.packageItem.create({
        data: {
          packageId: pkg.id,
          mantItemId: item.mantItem.id,
          triggerKm: item.triggerKm,
          estimatedTime: item.estimatedTime,
          order: item.order,
          priority: item.priority,
          status: 'ACTIVE',
        },
      });
    }

    console.log(
      `   ✓ ${name} (${triggerKm.toLocaleString()} km) - ${items.length} items`
    );
    return pkg;
  }

  // Paquete 25,000 km (Primer servicio)
  await createPackage('Servicio 25,000 km', 25000, 0, 3.0, 'MEDIUM', [
    {
      mantItem: iCambioAceite,
      triggerKm: 25000,
      estimatedTime: 1.0,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 25000,
      estimatedTime: 0.3,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 25000,
      estimatedTime: 0.3,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseChasis,
      triggerKm: 25000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 25000,
      estimatedTime: 0.4,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 25000,
      estimatedTime: 0.4,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspBateria,
      triggerKm: 25000,
      estimatedTime: 0.2,
      order: 7,
      priority: 'LOW',
    },
    {
      mantItem: iBateriasSistema,
      triggerKm: 25000,
      estimatedTime: 0.3,
      order: 8,
      priority: 'LOW',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 25000,
      estimatedTime: 0.5,
      order: 9,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 25000,
      estimatedTime: 0.3,
      order: 10,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 25000,
      estimatedTime: 0.2,
      order: 11,
      priority: 'LOW',
    },
    {
      mantItem: iPresionNeumaticos,
      triggerKm: 25000,
      estimatedTime: 0.3,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iDrenajeAgua,
      triggerKm: 25000,
      estimatedTime: 0.2,
      order: 13,
      priority: 'MEDIUM',
    },
  ]);

  // Paquete 50,000 km (Servicio mayor)
  await createPackage('Servicio 50,000 km', 50000, 0, 5.0, 'HIGH', [
    {
      mantItem: iCambioAceite,
      triggerKm: 50000,
      estimatedTime: 1.0,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseChasis,
      triggerKm: 50000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 50000,
      estimatedTime: 0.4,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 50000,
      estimatedTime: 0.4,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTamboresDiscos,
      triggerKm: 50000,
      estimatedTime: 0.4,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLiquidoFreno,
      triggerKm: 50000,
      estimatedTime: 0.8,
      order: 8,
      priority: 'HIGH',
    },
    {
      mantItem: iAjusteCardanes,
      triggerKm: 50000,
      estimatedTime: 0.6,
      order: 9,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRespiraderoTransm,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 10,
      priority: 'LOW',
    },
    {
      mantItem: iAceiteTransm,
      triggerKm: 50000,
      estimatedTime: 1.5,
      order: 11,
      priority: 'HIGH',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 50000,
      estimatedTime: 0.4,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 50000,
      estimatedTime: 0.4,
      order: 13,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspBateria,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 14,
      priority: 'LOW',
    },
    {
      mantItem: iBateriasSistema,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 15,
      priority: 'LOW',
    },
    {
      mantItem: iAltArr,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 16,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 50000,
      estimatedTime: 0.5,
      order: 17,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBalanceo,
      triggerKm: 50000,
      estimatedTime: 0.6,
      order: 18,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorRefrigeracion,
      triggerKm: 50000,
      estimatedTime: 0.4,
      order: 19,
      priority: 'LOW',
    },
    {
      mantItem: iMangueraRefrigerante,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 20,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 21,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 22,
      priority: 'LOW',
    },
    {
      mantItem: iAireAcondicionado,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 23,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 24,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionEmbrague,
      triggerKm: 50000,
      estimatedTime: 0.4,
      order: 25,
      priority: 'MEDIUM',
    },
    {
      mantItem: iDrenajeAgua,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 26,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaCombustible,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 27,
      priority: 'LOW',
    },
  ]);

  // Paquete 75,000 km
  await createPackage('Servicio 75,000 km', 75000, 0, 3.5, 'MEDIUM', [
    {
      mantItem: iCambioAceite,
      triggerKm: 75000,
      estimatedTime: 1.0,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 75000,
      estimatedTime: 0.3,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 75000,
      estimatedTime: 0.3,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseChasis,
      triggerKm: 75000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 75000,
      estimatedTime: 0.4,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 75000,
      estimatedTime: 0.4,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 75000,
      estimatedTime: 0.4,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 75000,
      estimatedTime: 0.4,
      order: 8,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspBateria,
      triggerKm: 75000,
      estimatedTime: 0.2,
      order: 9,
      priority: 'LOW',
    },
    {
      mantItem: iBateriasSistema,
      triggerKm: 75000,
      estimatedTime: 0.3,
      order: 10,
      priority: 'LOW',
    },
    {
      mantItem: iAltArr,
      triggerKm: 75000,
      estimatedTime: 0.3,
      order: 11,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 75000,
      estimatedTime: 0.5,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorRefrigeracion,
      triggerKm: 75000,
      estimatedTime: 0.4,
      order: 13,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 75000,
      estimatedTime: 0.3,
      order: 14,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 75000,
      estimatedTime: 0.2,
      order: 15,
      priority: 'LOW',
    },
    {
      mantItem: iAireAcondicionado,
      triggerKm: 75000,
      estimatedTime: 0.3,
      order: 16,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 75000,
      estimatedTime: 0.3,
      order: 17,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionEmbrague,
      triggerKm: 75000,
      estimatedTime: 0.4,
      order: 18,
      priority: 'MEDIUM',
    },
    {
      mantItem: iDrenajeAgua,
      triggerKm: 75000,
      estimatedTime: 0.2,
      order: 19,
      priority: 'MEDIUM',
    },
  ]);

  // Paquete 100,000 km (Servicio completo)
  await createPackage('Servicio 100,000 km', 100000, 0, 8.0, 'HIGH', [
    {
      mantItem: iCambioAceite,
      triggerKm: 100000,
      estimatedTime: 1.0,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseChasis,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteValvulas,
      triggerKm: 100000,
      estimatedTime: 2.0,
      order: 5,
      priority: 'HIGH',
    },
    {
      mantItem: iTurbocharger,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBombaInyectores,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 8,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 9,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTamboresDiscos,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 10,
      priority: 'MEDIUM',
    },
    {
      mantItem: iValvulaAlivio,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 11,
      priority: 'MEDIUM',
    },
    {
      mantItem: iSellosRuedas,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 12,
      priority: 'LOW',
    },
    {
      mantItem: iLiquidoFreno,
      triggerKm: 100000,
      estimatedTime: 0.8,
      order: 13,
      priority: 'HIGH',
    },
    {
      mantItem: iAjusteCardanes,
      triggerKm: 100000,
      estimatedTime: 0.6,
      order: 14,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRespiraderoTransm,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 15,
      priority: 'LOW',
    },
    {
      mantItem: iAceiteTransm,
      triggerKm: 100000,
      estimatedTime: 1.5,
      order: 16,
      priority: 'HIGH',
    },
    {
      mantItem: iDiferencial,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 17,
      priority: 'MEDIUM',
    },
    {
      mantItem: iCardanEje,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 18,
      priority: 'MEDIUM',
    },
    {
      mantItem: iMuellesBallestas,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 19,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBujesSuspension,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 20,
      priority: 'MEDIUM',
    },
    {
      mantItem: iGrapasMuelles,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 21,
      priority: 'MEDIUM',
    },
    {
      mantItem: iEstabilizadora,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 22,
      priority: 'LOW',
    },
    {
      mantItem: iRodamientosRuedas,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 23,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 24,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 25,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspBateria,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 26,
      priority: 'LOW',
    },
    {
      mantItem: iBateriasSistema,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 27,
      priority: 'LOW',
    },
    {
      mantItem: iAltArr,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 28,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLucesIndicadores,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 29,
      priority: 'LOW',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 30,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBalanceo,
      triggerKm: 100000,
      estimatedTime: 0.6,
      order: 31,
      priority: 'MEDIUM',
    },
    {
      mantItem: iPresionNeumaticos,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 32,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorRefrigeracion,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 33,
      priority: 'LOW',
    },
    {
      mantItem: iMangueraRefrigerante,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 34,
      priority: 'LOW',
    },
    {
      mantItem: iBombaDir,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 35,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLiqDireccion,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 36,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 37,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAireMotor,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 38,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 39,
      priority: 'LOW',
    },
    {
      mantItem: iAireAcondicionado,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 40,
      priority: 'LOW',
    },
    {
      mantItem: iAsientosSeguridad,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 41,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 42,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionEmbrague,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 43,
      priority: 'MEDIUM',
    },
    {
      mantItem: iDrenajeAgua,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 44,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaCombustible,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 45,
      priority: 'LOW',
    },
  ]);

  // Paquete 125,000 km
  await createPackage('Servicio 125,000 km', 125000, 0, 3.5, 'MEDIUM', [
    {
      mantItem: iCambioAceite,
      triggerKm: 125000,
      estimatedTime: 1.0,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 125000,
      estimatedTime: 0.3,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 125000,
      estimatedTime: 0.3,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseChasis,
      triggerKm: 125000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 125000,
      estimatedTime: 0.4,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 125000,
      estimatedTime: 0.4,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 125000,
      estimatedTime: 0.4,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 125000,
      estimatedTime: 0.4,
      order: 8,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspBateria,
      triggerKm: 125000,
      estimatedTime: 0.2,
      order: 9,
      priority: 'LOW',
    },
    {
      mantItem: iBateriasSistema,
      triggerKm: 125000,
      estimatedTime: 0.3,
      order: 10,
      priority: 'LOW',
    },
    {
      mantItem: iAltArr,
      triggerKm: 125000,
      estimatedTime: 0.3,
      order: 11,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 125000,
      estimatedTime: 0.5,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorRefrigeracion,
      triggerKm: 125000,
      estimatedTime: 0.4,
      order: 13,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 125000,
      estimatedTime: 0.3,
      order: 14,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 125000,
      estimatedTime: 0.2,
      order: 15,
      priority: 'LOW',
    },
    {
      mantItem: iAireAcondicionado,
      triggerKm: 125000,
      estimatedTime: 0.3,
      order: 16,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 125000,
      estimatedTime: 0.3,
      order: 17,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionEmbrague,
      triggerKm: 125000,
      estimatedTime: 0.4,
      order: 18,
      priority: 'MEDIUM',
    },
    {
      mantItem: iDrenajeAgua,
      triggerKm: 125000,
      estimatedTime: 0.2,
      order: 19,
      priority: 'MEDIUM',
    },
  ]);

  // Paquete 150,000 km
  await createPackage('Servicio 150,000 km', 150000, 0, 6.0, 'HIGH', [
    {
      mantItem: iCambioAceite,
      triggerKm: 150000,
      estimatedTime: 1.0,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseChasis,
      triggerKm: 150000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 150000,
      estimatedTime: 0.4,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 150000,
      estimatedTime: 0.4,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTamboresDiscos,
      triggerKm: 150000,
      estimatedTime: 0.4,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iValvulaAlivio,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 8,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLiquidoFreno,
      triggerKm: 150000,
      estimatedTime: 0.8,
      order: 9,
      priority: 'HIGH',
    },
    {
      mantItem: iAjusteCardanes,
      triggerKm: 150000,
      estimatedTime: 0.6,
      order: 10,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRespiraderoTransm,
      triggerKm: 150000,
      estimatedTime: 0.2,
      order: 11,
      priority: 'LOW',
    },
    {
      mantItem: iAceiteTransm,
      triggerKm: 150000,
      estimatedTime: 1.5,
      order: 12,
      priority: 'HIGH',
    },
    {
      mantItem: iDiferencial,
      triggerKm: 150000,
      estimatedTime: 0.5,
      order: 13,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 150000,
      estimatedTime: 0.4,
      order: 14,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 150000,
      estimatedTime: 0.4,
      order: 15,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspBateria,
      triggerKm: 150000,
      estimatedTime: 0.2,
      order: 16,
      priority: 'LOW',
    },
    {
      mantItem: iBateriasSistema,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 17,
      priority: 'LOW',
    },
    {
      mantItem: iAltArr,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 18,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 150000,
      estimatedTime: 0.5,
      order: 19,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBalanceo,
      triggerKm: 150000,
      estimatedTime: 0.6,
      order: 20,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorRefrigeracion,
      triggerKm: 150000,
      estimatedTime: 0.4,
      order: 21,
      priority: 'LOW',
    },
    {
      mantItem: iMangueraRefrigerante,
      triggerKm: 150000,
      estimatedTime: 0.2,
      order: 22,
      priority: 'LOW',
    },
    {
      mantItem: iBombaDir,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 23,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLiqDireccion,
      triggerKm: 150000,
      estimatedTime: 0.5,
      order: 24,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 25,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 150000,
      estimatedTime: 0.2,
      order: 26,
      priority: 'LOW',
    },
    {
      mantItem: iAireAcondicionado,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 27,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 28,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionEmbrague,
      triggerKm: 150000,
      estimatedTime: 0.4,
      order: 29,
      priority: 'MEDIUM',
    },
    {
      mantItem: iDrenajeAgua,
      triggerKm: 150000,
      estimatedTime: 0.2,
      order: 30,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaCombustible,
      triggerKm: 150000,
      estimatedTime: 0.3,
      order: 31,
      priority: 'LOW',
    },
  ]);

  // Paquete 200,000 km (Servicio mayor completo)
  await createPackage('Servicio 200,000 km', 200000, 0, 10.0, 'HIGH', [
    {
      mantItem: iCambioAceite,
      triggerKm: 200000,
      estimatedTime: 1.0,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseChasis,
      triggerKm: 200000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteValvulas,
      triggerKm: 200000,
      estimatedTime: 2.0,
      order: 5,
      priority: 'HIGH',
    },
    {
      mantItem: iTurbocharger,
      triggerKm: 200000,
      estimatedTime: 0.5,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBombaInyectores,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 8,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 9,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTamboresDiscos,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 10,
      priority: 'MEDIUM',
    },
    {
      mantItem: iValvulaAlivio,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 11,
      priority: 'MEDIUM',
    },
    {
      mantItem: iSellosRuedas,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 12,
      priority: 'LOW',
    },
    {
      mantItem: iLiquidoFreno,
      triggerKm: 200000,
      estimatedTime: 0.8,
      order: 13,
      priority: 'HIGH',
    },
    {
      mantItem: iAjusteCardanes,
      triggerKm: 200000,
      estimatedTime: 0.6,
      order: 14,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRespiraderoTransm,
      triggerKm: 200000,
      estimatedTime: 0.2,
      order: 15,
      priority: 'LOW',
    },
    {
      mantItem: iAceiteTransm,
      triggerKm: 200000,
      estimatedTime: 1.5,
      order: 16,
      priority: 'HIGH',
    },
    {
      mantItem: iDiferencial,
      triggerKm: 200000,
      estimatedTime: 0.5,
      order: 17,
      priority: 'HIGH',
    },
    {
      mantItem: iCardanEje,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 18,
      priority: 'MEDIUM',
    },
    {
      mantItem: iMuellesBallestas,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 19,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBujesSuspension,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 20,
      priority: 'MEDIUM',
    },
    {
      mantItem: iGrapasMuelles,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 21,
      priority: 'MEDIUM',
    },
    {
      mantItem: iEstabilizadora,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 22,
      priority: 'LOW',
    },
    {
      mantItem: iRodamientosRuedas,
      triggerKm: 200000,
      estimatedTime: 0.5,
      order: 23,
      priority: 'HIGH',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 24,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 25,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspBateria,
      triggerKm: 200000,
      estimatedTime: 0.2,
      order: 26,
      priority: 'LOW',
    },
    {
      mantItem: iBateriasSistema,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 27,
      priority: 'LOW',
    },
    {
      mantItem: iAltArr,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 28,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLucesIndicadores,
      triggerKm: 200000,
      estimatedTime: 0.2,
      order: 29,
      priority: 'LOW',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 200000,
      estimatedTime: 0.5,
      order: 30,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBalanceo,
      triggerKm: 200000,
      estimatedTime: 0.6,
      order: 31,
      priority: 'MEDIUM',
    },
    {
      mantItem: iPresionNeumaticos,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 32,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorRefrigeracion,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 33,
      priority: 'MEDIUM',
    },
    {
      mantItem: iMangueraRefrigerante,
      triggerKm: 200000,
      estimatedTime: 0.2,
      order: 34,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBombaDir,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 35,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLiqDireccion,
      triggerKm: 200000,
      estimatedTime: 0.5,
      order: 36,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 37,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAireMotor,
      triggerKm: 200000,
      estimatedTime: 0.2,
      order: 38,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 200000,
      estimatedTime: 0.2,
      order: 39,
      priority: 'LOW',
    },
    {
      mantItem: iAireAcondicionado,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 40,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAsientosSeguridad,
      triggerKm: 200000,
      estimatedTime: 0.2,
      order: 41,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 42,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionEmbrague,
      triggerKm: 200000,
      estimatedTime: 0.4,
      order: 43,
      priority: 'MEDIUM',
    },
    {
      mantItem: iDrenajeAgua,
      triggerKm: 200000,
      estimatedTime: 0.2,
      order: 44,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaCombustible,
      triggerKm: 200000,
      estimatedTime: 0.3,
      order: 45,
      priority: 'LOW',
    },
  ]);

  console.log('\n=== Seed International 7400 WorkStar COMPLETADO ===\n');

  return {
    brand: internacional,
    line: workstar7400,
    template,
    mantItemsCreated: mantItems.length,
  };
}
