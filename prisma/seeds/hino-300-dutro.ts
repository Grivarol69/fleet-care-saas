import { PrismaClient } from '@prisma/client';

export async function seedHino300Dutro(prisma: PrismaClient) {
  console.log('\n=== SEED: Hino 300 Dutro ===\n');

  // ========================================
  // 1. Crear Marca y Línea
  // ========================================
  console.log('1. Creando marca y línea...');

  const hino = await prisma.vehicleBrand.upsert({
    where: { name: 'Hino' },
    update: {},
    create: {
      name: 'Hino',
      isGlobal: true,
      tenantId: null,
    },
  });

  const dutro300 = await prisma.vehicleLine.upsert({
    where: { brandId_name: { brandId: hino.id, name: '300 Dutro' } },
    update: {},
    create: {
      name: '300 Dutro',
      brandId: hino.id,
      isGlobal: true,
      tenantId: null,
    },
  });

  console.log(`   ✓ Marca: ${hino.name}`);
  console.log(`   ✓ Línea: ${dutro300.name}`);

  // ========================================
  // 2. Obtener categorías existentes
  // ========================================
  console.log('\n2. Obteniendo categorías...');

  const categories = await prisma.mantCategory.findMany({
    where: { isGlobal: true },
  });

  const getCategory = (name: string) =>
    categories.find((c) => c.name === name);

  const catMotor = getCategory('Motor');
  const catTransmision = getCategory('Transmision');
  const catFrenos = getCategory('Frenos');
  const catSuspension = getCategory('Suspension');
  const catElectrico = getCategory('Electrico');
  const catLubricacion = getCategory('Lubricacion');
  const catFiltros = getCategory('Filtros');
  const catNeumaticos = getCategory('Neumaticos');
  const catCarroceria = getCategory('Carroceria');

  // ========================================
  // 3. Crear MantItems específicos para camiones
  // ========================================
  console.log('\n3. Creando MantItems específicos para Hino 300...');

  const mantItems = await Promise.all([
    // Motor [0-2]
    prisma.mantItem.create({
      data: {
        name: 'Engrase general',
        description: 'Engrase de puntos de lubricación del chasís',
        mantType: 'PREVENTIVE',
        categoryId: catLubricacion?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Control guaya acelerador',
        description: 'Verificar funcionamiento de la guaya del acelerador',
        mantType: 'PREVENTIVE',
        categoryId: catMotor?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Calibrar valvulas',
        description: 'Ajuste de valvulas del motor',
        mantType: 'PREVENTIVE',
        categoryId: catMotor?.id || '',
        type: 'SERVICE',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Transmision [3-4]
    prisma.mantItem.create({
      data: {
        name: 'Ajuste cardanes crucetas flanches',
        description: 'Ajuste de cardanes, crucetas y flanches',
        mantType: 'PREVENTIVE',
        categoryId: catTransmision?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion respiradero transmision',
        description: 'Verificar estado del respiradero de transmisión',
        mantType: 'PREVENTIVE',
        categoryId: catTransmision?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Frenos [5-7]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccionar bandas freno',
        description: 'Verificar estado y ajustar bandas de freno',
        mantType: 'PREVENTIVE',
        categoryId: catFrenos?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion cilindro freno',
        description: 'Verificar estado de cilindro de freno',
        mantType: 'PREVENTIVE',
        categoryId: catFrenos?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion escape sellos ruedas',
        description: 'Verificar estado de sellos de ruedas del sistema de escape',
        mantType: 'PREVENTIVE',
        categoryId: catFrenos?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Suspension [8-10]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion fisuras muelles',
        description: 'Inspección visual de fisuras en muelles',
        mantType: 'PREVENTIVE',
        categoryId: catSuspension?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion bujes suspension',
        description: 'Verificar estado de bujes de suspensión',
        mantType: 'PREVENTIVE',
        categoryId: catSuspension?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Ajustar grapas fijacion muelles',
        description: 'Ajuste de grapas de fijación de muelles',
        mantType: 'PREVENTIVE',
        categoryId: catSuspension?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Electrico [11-12]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion conexion alternador arranque',
        description: 'Verificar conexiones de alternador y motor de arranque',
        mantType: 'PREVENTIVE',
        categoryId: catElectrico?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion baterias',
        description: 'Verificar estado de baterías y terminales',
        mantType: 'PREVENTIVE',
        categoryId: catElectrico?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Refrigeracion [13-14]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion radiador intercooler',
        description: 'Limpiar/soplar radiador e intercooler',
        mantType: 'PREVENTIVE',
        categoryId: catMotor?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Control tension correas',
        description: 'Verificar tensión de correas',
        mantType: 'PREVENTIVE',
        categoryId: catMotor?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Direccion [15-16]
    prisma.mantItem.create({
      data: {
        name: 'Control juego libre direccion',
        description: 'Verificar holgura en la dirección',
        mantType: 'PREVENTIVE',
        categoryId: catSuspension?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion deposito direccion',
        description: 'Verificar estado del depósito de dirección',
        mantType: 'PREVENTIVE',
        categoryId: catSuspension?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Neumaticos [17]
    prisma.mantItem.create({
      data: {
        name: 'Engrase rodamientos ruedas',
        description: 'Lubricar rodamientos de ruedas',
        mantType: 'PREVENTIVE',
        categoryId: catNeumaticos?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Admision [18]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion linea admision',
        description: 'Verificar obstrucción en línea de admisión',
        mantType: 'PREVENTIVE',
        categoryId: catMotor?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    // Carroceria [19]
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion filtro aire cabina',
        description: 'Verificar estado del filtro de aire de cabina',
        mantType: 'PREVENTIVE',
        categoryId: catCarroceria?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion sistema ajuste cabina',
        description: 'Verificar sistema de ajuste de cabina',
        mantType: 'PREVENTIVE',
        categoryId: catCarroceria?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
    prisma.mantItem.create({
      data: {
        name: 'Inspeccion soporte motor transmision',
        description: 'Verificar estado de soportes de motor y transmisión',
        mantType: 'PREVENTIVE',
        categoryId: catMotor?.id || '',
        type: 'ACTION',
        isGlobal: true,
        tenantId: null,
      },
    }),
  ]);

  console.log(`   ✓ ${mantItems.length} MantItems creados`);

  // Aliases para los items nuevos
  const iEngraseGeneral = mantItems[0];
  const iGuayaAcelerador = mantItems[1];
  const iCalibrarValvulas = mantItems[2];
  const iAjusteCardanes = mantItems[3];
  const iRespiraderoTransm = mantItems[4];
  const iBandasFreno = mantItems[5];
  const iCilindroFreno = mantItems[6];
  const iEscapeSellos = mantItems[7];
  const iFisurasMuelles = mantItems[8];
  const iBujesSuspension = mantItems[9];
  const iGrapasMuelles = mantItems[10];
  const iConexAltArr = mantItems[11];
  const iInspeccionBaterias = mantItems[12];
  const iRadiadorIntercooler = mantItems[13];
  const iTensionCorreas = mantItems[14];
  const iJuegoLibreDir = mantItems[15];
  const iDepositoDir = mantItems[16];
  const iRodamientosRuedas = mantItems[17];
  const iLineaAdmision = mantItems[18];
  const iFiltroAireCabina = mantItems[19];
  const iSistemaAjusteCabina = mantItems[20];
  const iSoporteMotorTrans = mantItems[21];

  // ========================================
  // 4. Obtener MantItems existentes del seed base
  // ========================================
  console.log('\n4. Obteniendo MantItems base...');

  const baseItems = await prisma.mantItem.findMany({
    where: { isGlobal: true },
    orderBy: { name: 'asc' },
  });

  const getBaseItem = (name: string) => baseItems.find((i) => i.name === name);

  const iCambioAceite = getBaseItem('Cambio aceite motor');
  const iFiltroAceite = getBaseItem('Cambio filtro aceite');
  const iFiltroAire = getBaseItem('Cambio filtro aire');
  const iFiltroComb = getBaseItem('Cambio filtro combustible');
  const iLiquidoFreno = getBaseItem('Cambio liquido freno');
  const iAceiteTransm = getBaseItem('Cambio aceite transmision');
  const iAjusteEmbrague = getBaseItem('Ajuste embrague');
  const iInspFreno = getBaseItem('Inspeccion pastillas freno');
  const iInspAmort = getBaseItem('Inspeccion amortiguadores');
  const iLubRotulas = getBaseItem('Lubricacion rotulas');
  const iRotNeumaticos = getBaseItem('Rotacion neumaticos');
  const iBalanceo = getBaseItem('Balanceo y alineacion');
  const iLiqDireccion = getBaseItem('Cambio liquido direccion hidraulica');
  const iInspBateria = getBaseItem('Inspeccion bateria');
  const iLimpTerminale = getBaseItem('Limpieza terminales bateria');

  console.log(`   ✓ ${baseItems.length} MantItems base encontrados`);

  // ========================================
  // 5. Crear Template
  // ========================================
  console.log('\n5. Creando Template...');

  const template = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Hino 300 Dutro Standard',
      description: 'Programa mantenimiento preventivo Hino 300 Dutro - Plan General',
      vehicleBrandId: hino.id,
      vehicleLineId: dutro300.id,
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

    console.log(`   ✓ ${name} (${triggerKm.toLocaleString()} km) - ${items.length} items`);
    return pkg;
  }

  // Paquete 10,000 km
  await createPackage(
    'Servicio 10,000 km',
    10000,
    0,
    2.5,
    'MEDIUM',
    [
      { mantItem: iCambioAceite, triggerKm: 10000, estimatedTime: 0.5, order: 1, priority: 'HIGH' },
      { mantItem: iFiltroAceite, triggerKm: 10000, estimatedTime: 0.2, order: 2, priority: 'HIGH' },
      { mantItem: iFiltroComb, triggerKm: 10000, estimatedTime: 0.2, order: 3, priority: 'HIGH' },
      { mantItem: iEngraseGeneral, triggerKm: 10000, estimatedTime: 0.5, order: 4, priority: 'MEDIUM' },
      { mantItem: iBandasFreno, triggerKm: 10000, estimatedTime: 0.3, order: 5, priority: 'MEDIUM' },
      { mantItem: iInspFreno, triggerKm: 10000, estimatedTime: 0.3, order: 6, priority: 'MEDIUM' },
      { mantItem: iInspBateria, triggerKm: 10000, estimatedTime: 0.2, order: 7, priority: 'LOW' },
      { mantItem: iInspeccionBaterias, triggerKm: 10000, estimatedTime: 0.2, order: 8, priority: 'LOW' },
      { mantItem: iRotNeumaticos, triggerKm: 10000, estimatedTime: 0.4, order: 9, priority: 'MEDIUM' },
      { mantItem: iTensionCorreas, triggerKm: 10000, estimatedTime: 0.2, order: 10, priority: 'MEDIUM' },
      { mantItem: iRadiadorIntercooler, triggerKm: 10000, estimatedTime: 0.3, order: 11, priority: 'LOW' },
      { mantItem: iFiltroAire, triggerKm: 10000, estimatedTime: 0.2, order: 12, priority: 'MEDIUM' },
      { mantItem: iFiltroAireCabina, triggerKm: 10000, estimatedTime: 0.2, order: 13, priority: 'LOW' },
      { mantItem: iSistemaAjusteCabina, triggerKm: 10000, estimatedTime: 0.2, order: 14, priority: 'LOW' },
      { mantItem: iGuayaAcelerador, triggerKm: 10000, estimatedTime: 0.2, order: 15, priority: 'LOW' },
      { mantItem: iJuegoLibreDir, triggerKm: 10000, estimatedTime: 0.2, order: 16, priority: 'MEDIUM' },
      { mantItem: iAjusteEmbrague, triggerKm: 10000, estimatedTime: 0.3, order: 17, priority: 'MEDIUM' },
      { mantItem: iLineaAdmision, triggerKm: 10000, estimatedTime: 0.2, order: 18, priority: 'LOW' },
    ]
  );

  // Paquete 20,000 km
  await createPackage(
    'Servicio 20,000 km',
    20000,
    0,
    3.5,
    'MEDIUM',
    [
      { mantItem: iCambioAceite, triggerKm: 20000, estimatedTime: 0.5, order: 1, priority: 'HIGH' },
      { mantItem: iFiltroAceite, triggerKm: 20000, estimatedTime: 0.2, order: 2, priority: 'HIGH' },
      { mantItem: iFiltroComb, triggerKm: 20000, estimatedTime: 0.2, order: 3, priority: 'HIGH' },
      { mantItem: iEngraseGeneral, triggerKm: 20000, estimatedTime: 0.5, order: 4, priority: 'MEDIUM' },
      { mantItem: iBandasFreno, triggerKm: 20000, estimatedTime: 0.3, order: 5, priority: 'MEDIUM' },
      { mantItem: iInspFreno, triggerKm: 20000, estimatedTime: 0.3, order: 6, priority: 'MEDIUM' },
      { mantItem: iInspAmort, triggerKm: 20000, estimatedTime: 0.3, order: 7, priority: 'MEDIUM' },
      { mantItem: iLubRotulas, triggerKm: 20000, estimatedTime: 0.3, order: 8, priority: 'MEDIUM' },
      { mantItem: iInspBateria, triggerKm: 20000, estimatedTime: 0.2, order: 9, priority: 'LOW' },
      { mantItem: iInspeccionBaterias, triggerKm: 20000, estimatedTime: 0.2, order: 10, priority: 'LOW' },
      { mantItem: iConexAltArr, triggerKm: 20000, estimatedTime: 0.2, order: 11, priority: 'MEDIUM' },
      { mantItem: iRotNeumaticos, triggerKm: 20000, estimatedTime: 0.4, order: 12, priority: 'MEDIUM' },
      { mantItem: iBalanceo, triggerKm: 20000, estimatedTime: 0.5, order: 13, priority: 'MEDIUM' },
      { mantItem: iTensionCorreas, triggerKm: 20000, estimatedTime: 0.2, order: 14, priority: 'MEDIUM' },
      { mantItem: iRadiadorIntercooler, triggerKm: 20000, estimatedTime: 0.3, order: 15, priority: 'LOW' },
      { mantItem: iFiltroAire, triggerKm: 20000, estimatedTime: 0.2, order: 16, priority: 'MEDIUM' },
      { mantItem: iFiltroAireCabina, triggerKm: 20000, estimatedTime: 0.2, order: 17, priority: 'LOW' },
      { mantItem: iSistemaAjusteCabina, triggerKm: 20000, estimatedTime: 0.2, order: 18, priority: 'LOW' },
      { mantItem: iGuayaAcelerador, triggerKm: 20000, estimatedTime: 0.2, order: 19, priority: 'LOW' },
      { mantItem: iJuegoLibreDir, triggerKm: 20000, estimatedTime: 0.2, order: 20, priority: 'MEDIUM' },
      { mantItem: iAjusteEmbrague, triggerKm: 20000, estimatedTime: 0.3, order: 21, priority: 'MEDIUM' },
      { mantItem: iLineaAdmision, triggerKm: 20000, estimatedTime: 0.2, order: 22, priority: 'LOW' },
    ]
  );

  // Paquete 30,000 km
  await createPackage(
    'Servicio 30,000 km',
    30000,
    0,
    4.5,
    'HIGH',
    [
      { mantItem: iCambioAceite, triggerKm: 30000, estimatedTime: 0.5, order: 1, priority: 'HIGH' },
      { mantItem: iFiltroAceite, triggerKm: 30000, estimatedTime: 0.2, order: 2, priority: 'HIGH' },
      { mantItem: iFiltroComb, triggerKm: 30000, estimatedTime: 0.2, order: 3, priority: 'HIGH' },
      { mantItem: iEngraseGeneral, triggerKm: 30000, estimatedTime: 0.5, order: 4, priority: 'MEDIUM' },
      { mantItem: iBandasFreno, triggerKm: 30000, estimatedTime: 0.3, order: 5, priority: 'MEDIUM' },
      { mantItem: iInspFreno, triggerKm: 30000, estimatedTime: 0.3, order: 6, priority: 'MEDIUM' },
      { mantItem: iLiquidoFreno, triggerKm: 30000, estimatedTime: 0.5, order: 7, priority: 'HIGH' },
      { mantItem: iAjusteCardanes, triggerKm: 30000, estimatedTime: 0.5, order: 8, priority: 'MEDIUM' },
      { mantItem: iRespiraderoTransm, triggerKm: 30000, estimatedTime: 0.2, order: 9, priority: 'LOW' },
      { mantItem: iAceiteTransm, triggerKm: 30000, estimatedTime: 1.0, order: 10, priority: 'HIGH' },
      { mantItem: iInspAmort, triggerKm: 30000, estimatedTime: 0.3, order: 11, priority: 'MEDIUM' },
      { mantItem: iLubRotulas, triggerKm: 30000, estimatedTime: 0.3, order: 12, priority: 'MEDIUM' },
      { mantItem: iInspBateria, triggerKm: 30000, estimatedTime: 0.2, order: 13, priority: 'LOW' },
      { mantItem: iInspeccionBaterias, triggerKm: 30000, estimatedTime: 0.2, order: 14, priority: 'LOW' },
      { mantItem: iConexAltArr, triggerKm: 30000, estimatedTime: 0.2, order: 15, priority: 'MEDIUM' },
      { mantItem: iRotNeumaticos, triggerKm: 30000, estimatedTime: 0.4, order: 16, priority: 'MEDIUM' },
      { mantItem: iTensionCorreas, triggerKm: 30000, estimatedTime: 0.2, order: 17, priority: 'MEDIUM' },
      { mantItem: iRadiadorIntercooler, triggerKm: 30000, estimatedTime: 0.3, order: 18, priority: 'LOW' },
      { mantItem: iFiltroAire, triggerKm: 30000, estimatedTime: 0.2, order: 19, priority: 'MEDIUM' },
      { mantItem: iFiltroAireCabina, triggerKm: 30000, estimatedTime: 0.2, order: 20, priority: 'LOW' },
      { mantItem: iSistemaAjusteCabina, triggerKm: 30000, estimatedTime: 0.2, order: 21, priority: 'LOW' },
      { mantItem: iGuayaAcelerador, triggerKm: 30000, estimatedTime: 0.2, order: 22, priority: 'LOW' },
      { mantItem: iJuegoLibreDir, triggerKm: 30000, estimatedTime: 0.2, order: 23, priority: 'MEDIUM' },
      { mantItem: iAjusteEmbrague, triggerKm: 30000, estimatedTime: 0.3, order: 24, priority: 'MEDIUM' },
      { mantItem: iLiqDireccion, triggerKm: 30000, estimatedTime: 0.5, order: 25, priority: 'MEDIUM' },
      { mantItem: iLineaAdmision, triggerKm: 30000, estimatedTime: 0.2, order: 26, priority: 'LOW' },
    ]
  );

  // Paquete 40,000 km - Servicio completo
  await createPackage(
    'Servicio 40,000 km',
    40000,
    0,
    6.0,
    'HIGH',
    [
      { mantItem: iCambioAceite, triggerKm: 40000, estimatedTime: 0.5, order: 1, priority: 'HIGH' },
      { mantItem: iFiltroAceite, triggerKm: 40000, estimatedTime: 0.2, order: 2, priority: 'HIGH' },
      { mantItem: iFiltroComb, triggerKm: 40000, estimatedTime: 0.2, order: 3, priority: 'HIGH' },
      { mantItem: iEngraseGeneral, triggerKm: 40000, estimatedTime: 0.5, order: 4, priority: 'MEDIUM' },
      { mantItem: iBandasFreno, triggerKm: 40000, estimatedTime: 0.3, order: 5, priority: 'MEDIUM' },
      { mantItem: iInspFreno, triggerKm: 40000, estimatedTime: 0.3, order: 6, priority: 'MEDIUM' },
      { mantItem: iCilindroFreno, triggerKm: 40000, estimatedTime: 0.3, order: 7, priority: 'MEDIUM' },
      { mantItem: iEscapeSellos, triggerKm: 40000, estimatedTime: 0.2, order: 8, priority: 'LOW' },
      { mantItem: iLiquidoFreno, triggerKm: 40000, estimatedTime: 0.5, order: 9, priority: 'HIGH' },
      { mantItem: iAjusteCardanes, triggerKm: 40000, estimatedTime: 0.5, order: 10, priority: 'MEDIUM' },
      { mantItem: iRespiraderoTransm, triggerKm: 40000, estimatedTime: 0.2, order: 11, priority: 'LOW' },
      { mantItem: iFisurasMuelles, triggerKm: 40000, estimatedTime: 0.3, order: 12, priority: 'MEDIUM' },
      { mantItem: iBujesSuspension, triggerKm: 40000, estimatedTime: 0.3, order: 13, priority: 'MEDIUM' },
      { mantItem: iGrapasMuelles, triggerKm: 40000, estimatedTime: 0.3, order: 14, priority: 'MEDIUM' },
      { mantItem: iRodamientosRuedas, triggerKm: 40000, estimatedTime: 0.4, order: 15, priority: 'MEDIUM' },
      { mantItem: iSoporteMotorTrans, triggerKm: 40000, estimatedTime: 0.3, order: 16, priority: 'MEDIUM' },
      { mantItem: iInspAmort, triggerKm: 40000, estimatedTime: 0.3, order: 17, priority: 'MEDIUM' },
      { mantItem: iLubRotulas, triggerKm: 40000, estimatedTime: 0.3, order: 18, priority: 'MEDIUM' },
      { mantItem: iInspBateria, triggerKm: 40000, estimatedTime: 0.2, order: 19, priority: 'LOW' },
      { mantItem: iInspeccionBaterias, triggerKm: 40000, estimatedTime: 0.2, order: 20, priority: 'LOW' },
      { mantItem: iConexAltArr, triggerKm: 40000, estimatedTime: 0.2, order: 21, priority: 'MEDIUM' },
      { mantItem: iRotNeumaticos, triggerKm: 40000, estimatedTime: 0.4, order: 22, priority: 'MEDIUM' },
      { mantItem: iBalanceo, triggerKm: 40000, estimatedTime: 0.5, order: 23, priority: 'MEDIUM' },
      { mantItem: iTensionCorreas, triggerKm: 40000, estimatedTime: 0.2, order: 24, priority: 'MEDIUM' },
      { mantItem: iRadiadorIntercooler, triggerKm: 40000, estimatedTime: 0.3, order: 25, priority: 'LOW' },
      { mantItem: iDepositoDir, triggerKm: 40000, estimatedTime: 0.2, order: 26, priority: 'LOW' },
      { mantItem: iFiltroAire, triggerKm: 40000, estimatedTime: 0.2, order: 27, priority: 'MEDIUM' },
      { mantItem: iFiltroAireCabina, triggerKm: 40000, estimatedTime: 0.2, order: 28, priority: 'LOW' },
      { mantItem: iSistemaAjusteCabina, triggerKm: 40000, estimatedTime: 0.2, order: 29, priority: 'LOW' },
      { mantItem: iGuayaAcelerador, triggerKm: 40000, estimatedTime: 0.2, order: 30, priority: 'LOW' },
      { mantItem: iJuegoLibreDir, triggerKm: 40000, estimatedTime: 0.2, order: 31, priority: 'MEDIUM' },
      { mantItem: iAjusteEmbrague, triggerKm: 40000, estimatedTime: 0.3, order: 32, priority: 'MEDIUM' },
      { mantItem: iLineaAdmision, triggerKm: 40000, estimatedTime: 0.2, order: 33, priority: 'LOW' },
    ]
  );

  // Paquete 50,000 km
  await createPackage(
    'Servicio 50,000 km',
    50000,
    0,
    2.5,
    'MEDIUM',
    [
      { mantItem: iCambioAceite, triggerKm: 50000, estimatedTime: 0.5, order: 1, priority: 'HIGH' },
      { mantItem: iFiltroAceite, triggerKm: 50000, estimatedTime: 0.2, order: 2, priority: 'HIGH' },
      { mantItem: iFiltroComb, triggerKm: 50000, estimatedTime: 0.2, order: 3, priority: 'HIGH' },
      { mantItem: iEngraseGeneral, triggerKm: 50000, estimatedTime: 0.5, order: 4, priority: 'MEDIUM' },
      { mantItem: iBandasFreno, triggerKm: 50000, estimatedTime: 0.3, order: 5, priority: 'MEDIUM' },
      { mantItem: iInspFreno, triggerKm: 50000, estimatedTime: 0.3, order: 6, priority: 'MEDIUM' },
      { mantItem: iInspAmort, triggerKm: 50000, estimatedTime: 0.3, order: 7, priority: 'MEDIUM' },
      { mantItem: iLubRotulas, triggerKm: 50000, estimatedTime: 0.3, order: 8, priority: 'MEDIUM' },
      { mantItem: iInspBateria, triggerKm: 50000, estimatedTime: 0.2, order: 9, priority: 'LOW' },
      { mantItem: iInspeccionBaterias, triggerKm: 50000, estimatedTime: 0.2, order: 10, priority: 'LOW' },
      { mantItem: iConexAltArr, triggerKm: 50000, estimatedTime: 0.2, order: 11, priority: 'MEDIUM' },
      { mantItem: iRotNeumaticos, triggerKm: 50000, estimatedTime: 0.4, order: 12, priority: 'MEDIUM' },
      { mantItem: iTensionCorreas, triggerKm: 50000, estimatedTime: 0.2, order: 13, priority: 'MEDIUM' },
      { mantItem: iRadiadorIntercooler, triggerKm: 50000, estimatedTime: 0.3, order: 14, priority: 'LOW' },
      { mantItem: iFiltroAire, triggerKm: 50000, estimatedTime: 0.2, order: 15, priority: 'MEDIUM' },
      { mantItem: iFiltroAireCabina, triggerKm: 50000, estimatedTime: 0.2, order: 16, priority: 'LOW' },
      { mantItem: iSistemaAjusteCabina, triggerKm: 50000, estimatedTime: 0.2, order: 17, priority: 'LOW' },
      { mantItem: iGuayaAcelerador, triggerKm: 50000, estimatedTime: 0.2, order: 18, priority: 'LOW' },
      { mantItem: iJuegoLibreDir, triggerKm: 50000, estimatedTime: 0.2, order: 19, priority: 'MEDIUM' },
      { mantItem: iAjusteEmbrague, triggerKm: 50000, estimatedTime: 0.3, order: 20, priority: 'MEDIUM' },
      { mantItem: iLineaAdmision, triggerKm: 50000, estimatedTime: 0.2, order: 21, priority: 'LOW' },
    ]
  );

  // Paquete 60,000 km - Con flushing inyección
  await createPackage(
    'Servicio 60,000 km',
    60000,
    0,
    5.0,
    'HIGH',
    [
      { mantItem: iCambioAceite, triggerKm: 60000, estimatedTime: 0.5, order: 1, priority: 'HIGH' },
      { mantItem: iFiltroAceite, triggerKm: 60000, estimatedTime: 0.2, order: 2, priority: 'HIGH' },
      { mantItem: iFiltroComb, triggerKm: 60000, estimatedTime: 0.2, order: 3, priority: 'HIGH' },
      { mantItem: iEngraseGeneral, triggerKm: 60000, estimatedTime: 0.5, order: 4, priority: 'MEDIUM' },
      { mantItem: iBandasFreno, triggerKm: 60000, estimatedTime: 0.3, order: 5, priority: 'MEDIUM' },
      { mantItem: iInspFreno, triggerKm: 60000, estimatedTime: 0.3, order: 6, priority: 'MEDIUM' },
      { mantItem: iCilindroFreno, triggerKm: 60000, estimatedTime: 0.3, order: 7, priority: 'MEDIUM' },
      { mantItem: iEscapeSellos, triggerKm: 60000, estimatedTime: 0.2, order: 8, priority: 'LOW' },
      { mantItem: iLiquidoFreno, triggerKm: 60000, estimatedTime: 0.5, order: 9, priority: 'HIGH' },
      { mantItem: iAjusteCardanes, triggerKm: 60000, estimatedTime: 0.5, order: 10, priority: 'MEDIUM' },
      { mantItem: iRespiraderoTransm, triggerKm: 60000, estimatedTime: 0.2, order: 11, priority: 'LOW' },
      { mantItem: iAceiteTransm, triggerKm: 60000, estimatedTime: 1.0, order: 12, priority: 'HIGH' },
      { mantItem: iLiqDireccion, triggerKm: 60000, estimatedTime: 0.5, order: 13, priority: 'HIGH' },
      { mantItem: iInspAmort, triggerKm: 60000, estimatedTime: 0.3, order: 14, priority: 'MEDIUM' },
      { mantItem: iLubRotulas, triggerKm: 60000, estimatedTime: 0.3, order: 15, priority: 'MEDIUM' },
      { mantItem: iInspBateria, triggerKm: 60000, estimatedTime: 0.2, order: 16, priority: 'LOW' },
      { mantItem: iInspeccionBaterias, triggerKm: 60000, estimatedTime: 0.2, order: 17, priority: 'LOW' },
      { mantItem: iConexAltArr, triggerKm: 60000, estimatedTime: 0.2, order: 18, priority: 'MEDIUM' },
      { mantItem: iRotNeumaticos, triggerKm: 60000, estimatedTime: 0.4, order: 19, priority: 'MEDIUM' },
      { mantItem: iBalanceo, triggerKm: 60000, estimatedTime: 0.5, order: 20, priority: 'MEDIUM' },
      { mantItem: iTensionCorreas, triggerKm: 60000, estimatedTime: 0.2, order: 21, priority: 'MEDIUM' },
      { mantItem: iRadiadorIntercooler, triggerKm: 60000, estimatedTime: 0.3, order: 22, priority: 'LOW' },
      { mantItem: iDepositoDir, triggerKm: 60000, estimatedTime: 0.2, order: 23, priority: 'LOW' },
      { mantItem: iFiltroAire, triggerKm: 60000, estimatedTime: 0.2, order: 24, priority: 'MEDIUM' },
      { mantItem: iFiltroAireCabina, triggerKm: 60000, estimatedTime: 0.2, order: 25, priority: 'LOW' },
      { mantItem: iSistemaAjusteCabina, triggerKm: 60000, estimatedTime: 0.2, order: 26, priority: 'LOW' },
      { mantItem: iGuayaAcelerador, triggerKm: 60000, estimatedTime: 0.2, order: 27, priority: 'LOW' },
      { mantItem: iJuegoLibreDir, triggerKm: 60000, estimatedTime: 0.2, order: 28, priority: 'MEDIUM' },
      { mantItem: iAjusteEmbrague, triggerKm: 60000, estimatedTime: 0.3, order: 29, priority: 'MEDIUM' },
      { mantItem: iLineaAdmision, triggerKm: 60000, estimatedTime: 0.2, order: 30, priority: 'LOW' },
    ]
  );

  // Paquete 70,000 km
  await createPackage(
    'Servicio 70,000 km',
    70000,
    0,
    2.5,
    'MEDIUM',
    [
      { mantItem: iCambioAceite, triggerKm: 70000, estimatedTime: 0.5, order: 1, priority: 'HIGH' },
      { mantItem: iFiltroAceite, triggerKm: 70000, estimatedTime: 0.2, order: 2, priority: 'HIGH' },
      { mantItem: iFiltroComb, triggerKm: 70000, estimatedTime: 0.2, order: 3, priority: 'HIGH' },
      { mantItem: iEngraseGeneral, triggerKm: 70000, estimatedTime: 0.5, order: 4, priority: 'MEDIUM' },
      { mantItem: iBandasFreno, triggerKm: 70000, estimatedTime: 0.3, order: 5, priority: 'MEDIUM' },
      { mantItem: iInspFreno, triggerKm: 70000, estimatedTime: 0.3, order: 6, priority: 'MEDIUM' },
      { mantItem: iInspAmort, triggerKm: 70000, estimatedTime: 0.3, order: 7, priority: 'MEDIUM' },
      { mantItem: iLubRotulas, triggerKm: 70000, estimatedTime: 0.3, order: 8, priority: 'MEDIUM' },
      { mantItem: iInspBateria, triggerKm: 70000, estimatedTime: 0.2, order: 9, priority: 'LOW' },
      { mantItem: iInspeccionBaterias, triggerKm: 70000, estimatedTime: 0.2, order: 10, priority: 'LOW' },
      { mantItem: iConexAltArr, triggerKm: 70000, estimatedTime: 0.2, order: 11, priority: 'MEDIUM' },
      { mantItem: iRotNeumaticos, triggerKm: 70000, estimatedTime: 0.4, order: 12, priority: 'MEDIUM' },
      { mantItem: iTensionCorreas, triggerKm: 70000, estimatedTime: 0.2, order: 13, priority: 'MEDIUM' },
      { mantItem: iRadiadorIntercooler, triggerKm: 70000, estimatedTime: 0.3, order: 14, priority: 'LOW' },
      { mantItem: iFiltroAire, triggerKm: 70000, estimatedTime: 0.2, order: 15, priority: 'MEDIUM' },
      { mantItem: iFiltroAireCabina, triggerKm: 70000, estimatedTime: 0.2, order: 16, priority: 'LOW' },
      { mantItem: iSistemaAjusteCabina, triggerKm: 70000, estimatedTime: 0.2, order: 17, priority: 'LOW' },
      { mantItem: iGuayaAcelerador, triggerKm: 70000, estimatedTime: 0.2, order: 18, priority: 'LOW' },
      { mantItem: iJuegoLibreDir, triggerKm: 70000, estimatedTime: 0.2, order: 19, priority: 'MEDIUM' },
      { mantItem: iAjusteEmbrague, triggerKm: 70000, estimatedTime: 0.3, order: 20, priority: 'MEDIUM' },
      { mantItem: iLineaAdmision, triggerKm: 70000, estimatedTime: 0.2, order: 21, priority: 'LOW' },
    ]
  );

  // Paquete 100,000 km - Con calibrar valvulas
  await createPackage(
    'Servicio 100,000 km',
    100000,
    0,
    7.0,
    'HIGH',
    [
      { mantItem: iCambioAceite, triggerKm: 100000, estimatedTime: 0.5, order: 1, priority: 'HIGH' },
      { mantItem: iFiltroAceite, triggerKm: 100000, estimatedTime: 0.2, order: 2, priority: 'HIGH' },
      { mantItem: iFiltroComb, triggerKm: 100000, estimatedTime: 0.2, order: 3, priority: 'HIGH' },
      { mantItem: iEngraseGeneral, triggerKm: 100000, estimatedTime: 0.5, order: 4, priority: 'MEDIUM' },
      { mantItem: iBandasFreno, triggerKm: 100000, estimatedTime: 0.3, order: 5, priority: 'MEDIUM' },
      { mantItem: iInspFreno, triggerKm: 100000, estimatedTime: 0.3, order: 6, priority: 'MEDIUM' },
      { mantItem: iCilindroFreno, triggerKm: 100000, estimatedTime: 0.3, order: 7, priority: 'MEDIUM' },
      { mantItem: iEscapeSellos, triggerKm: 100000, estimatedTime: 0.2, order: 8, priority: 'LOW' },
      { mantItem: iLiquidoFreno, triggerKm: 100000, estimatedTime: 0.5, order: 9, priority: 'HIGH' },
      { mantItem: iCalibrarValvulas, triggerKm: 100000, estimatedTime: 1.5, order: 10, priority: 'HIGH' },
      { mantItem: iAjusteCardanes, triggerKm: 100000, estimatedTime: 0.5, order: 11, priority: 'MEDIUM' },
      { mantItem: iRespiraderoTransm, triggerKm: 100000, estimatedTime: 0.2, order: 12, priority: 'LOW' },
      { mantItem: iAceiteTransm, triggerKm: 100000, estimatedTime: 1.0, order: 13, priority: 'HIGH' },
      { mantItem: iFisurasMuelles, triggerKm: 100000, estimatedTime: 0.3, order: 14, priority: 'MEDIUM' },
      { mantItem: iBujesSuspension, triggerKm: 100000, estimatedTime: 0.3, order: 15, priority: 'MEDIUM' },
      { mantItem: iGrapasMuelles, triggerKm: 100000, estimatedTime: 0.3, order: 16, priority: 'MEDIUM' },
      { mantItem: iRodamientosRuedas, triggerKm: 100000, estimatedTime: 0.4, order: 17, priority: 'MEDIUM' },
      { mantItem: iSoporteMotorTrans, triggerKm: 100000, estimatedTime: 0.3, order: 18, priority: 'MEDIUM' },
      { mantItem: iInspAmort, triggerKm: 100000, estimatedTime: 0.3, order: 19, priority: 'MEDIUM' },
      { mantItem: iLubRotulas, triggerKm: 100000, estimatedTime: 0.3, order: 20, priority: 'MEDIUM' },
      { mantItem: iInspBateria, triggerKm: 100000, estimatedTime: 0.2, order: 21, priority: 'LOW' },
      { mantItem: iInspeccionBaterias, triggerKm: 100000, estimatedTime: 0.2, order: 22, priority: 'LOW' },
      { mantItem: iConexAltArr, triggerKm: 100000, estimatedTime: 0.2, order: 23, priority: 'MEDIUM' },
      { mantItem: iRotNeumaticos, triggerKm: 100000, estimatedTime: 0.4, order: 24, priority: 'MEDIUM' },
      { mantItem: iBalanceo, triggerKm: 100000, estimatedTime: 0.5, order: 25, priority: 'MEDIUM' },
      { mantItem: iTensionCorreas, triggerKm: 100000, estimatedTime: 0.2, order: 26, priority: 'MEDIUM' },
      { mantItem: iRadiadorIntercooler, triggerKm: 100000, estimatedTime: 0.3, order: 27, priority: 'LOW' },
      { mantItem: iDepositoDir, triggerKm: 100000, estimatedTime: 0.2, order: 28, priority: 'LOW' },
      { mantItem: iFiltroAire, triggerKm: 100000, estimatedTime: 0.2, order: 29, priority: 'MEDIUM' },
      { mantItem: iFiltroAireCabina, triggerKm: 100000, estimatedTime: 0.2, order: 30, priority: 'LOW' },
      { mantItem: iSistemaAjusteCabina, triggerKm: 100000, estimatedTime: 0.2, order: 31, priority: 'LOW' },
      { mantItem: iGuayaAcelerador, triggerKm: 100000, estimatedTime: 0.2, order: 32, priority: 'LOW' },
      { mantItem: iJuegoLibreDir, triggerKm: 100000, estimatedTime: 0.2, order: 33, priority: 'MEDIUM' },
      { mantItem: iAjusteEmbrague, triggerKm: 100000, estimatedTime: 0.3, order: 34, priority: 'MEDIUM' },
      { mantItem: iLiqDireccion, triggerKm: 100000, estimatedTime: 0.5, order: 35, priority: 'MEDIUM' },
      { mantItem: iLineaAdmision, triggerKm: 100000, estimatedTime: 0.2, order: 36, priority: 'LOW' },
    ]
  );

  console.log('\n=== Seed Hino 300 Dutro COMPLETADO ===\n');

  return {
    brand: hino,
    line: dutro300,
    template,
    mantItemsCreated: mantItems.length,
  };
}
