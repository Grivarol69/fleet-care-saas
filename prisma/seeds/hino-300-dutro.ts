import { PrismaClient } from '@prisma/client';

export async function seedHino300Dutro(prisma: PrismaClient) {
  console.log('\n=== SEED: Hino 300 Dutro ===\n');

  // ========================================
  // 1. Crear Marca y Línea
  // ========================================
  console.log('1. Creando marca y línea...');

  let hino = await prisma.vehicleBrand.findFirst({
    where: { name: 'Hino', tenantId: null },
  });
  if (!hino) {
    hino = await prisma.vehicleBrand.create({
      data: {
        name: 'Hino',
        isGlobal: true,
        tenantId: null,
      },
    });
  }

  let dutro300 = await prisma.vehicleLine.findFirst({
    where: { brandId: hino.id, name: '300 Dutro', tenantId: null },
  });
  if (!dutro300) {
    dutro300 = await prisma.vehicleLine.create({
      data: {
        name: '300 Dutro',
        brandId: hino.id,
        isGlobal: true,
        tenantId: null,
      },
    });
  }

  console.log(`   ✓ Marca: ${hino.name}`);
  console.log(`   ✓ Línea: ${dutro300.name}`);

  // ========================================
  // 2. Obtener MantItems del seed base (temparioKB + core)
  // ========================================
  console.log('\n2. Obteniendo MantItems base...');

  const baseItems = await prisma.mantItem.findMany({
    where: { isGlobal: true },
    orderBy: { name: 'asc' },
  });

  const getBaseItem = (name: string) => baseItems.find(i => i.name === name);

  // Items del temparioKB base
  const iCambioAceite = getBaseItem('Cambio aceite motor');
  const iFiltroAceite = getBaseItem('Cambio filtro aceite');
  const iFiltroAire = getBaseItem('Cambio filtro aire');
  const iFiltroComb = getBaseItem('Cambio filtro combustible');
  const iLiquidoFreno = getBaseItem('Cambio líquido freno');
  const iAceiteTransm = getBaseItem('Cambio aceite transmisión');
  const iAjusteEmbrague = getBaseItem('Ajuste embrague');
  const iRotNeumaticos = getBaseItem('Rotación neumáticos');
  const iBalanceo = getBaseItem('Balanceo ruedas');
  const iLiqDireccion = getBaseItem('Cambio líquido dirección hidráulica');
  const iLimpTerminale = getBaseItem('Limpieza terminales batería');

  // Items migrados al temparioKB desde este seed
  const iEngraseGeneral = getBaseItem('Engrase general');
  const iGuayaAcelerador = getBaseItem('Control guaya acelerador');
  const iCalibrarValvulas = getBaseItem('Calibración válvulas');
  const iAjusteCardanes = getBaseItem('Ajuste cardanes crucetas flanches');
  const iRespiraderoTransm = getBaseItem('Inspeccion respiradero transmision');
  const iBandasFreno = getBaseItem('Inspeccionar bandas freno');
  const iCilindroFreno = getBaseItem('Inspeccion cilindro freno');
  const iEscapeSellos = getBaseItem('Inspeccion escape sellos ruedas');
  const iFisurasMuelles = getBaseItem('Inspeccion fisuras muelles');
  const iBujesSuspension = getBaseItem('Inspeccion bujes suspension');
  const iGrapasMuelles = getBaseItem('Ajustar grapas fijacion muelles');
  const iConexAltArr = getBaseItem('Inspeccion conexion alternador arranque');
  const iInspeccionBaterias = getBaseItem('Inspeccion baterias');
  const iRadiadorIntercooler = getBaseItem('Inspeccion radiador intercooler');
  const iTensionCorreas = getBaseItem('Control tension correas');
  const iJuegoLibreDir = getBaseItem('Ajuste juego dirección');
  const iDepositoDir = getBaseItem('Inspeccion deposito direccion');
  const iRodamientosRuedas = getBaseItem('Engrase rodamientos');
  const iLineaAdmision = getBaseItem('Inspeccion linea admision');
  const iFiltroAireCabina = getBaseItem('Inspeccion filtro aire cabina');
  const iSistemaAjusteCabina = getBaseItem('Inspeccion sistema ajuste cabina');
  const iSoporteMotorTrans = getBaseItem(
    'Inspeccion soporte motor transmision'
  );

  // Items from base temparioKB used in packages
  const iInspFreno = getBaseItem('Inspección general frenos');
  const iInspAmort = getBaseItem('Inspección suspensión');
  const iLubRotulas = getBaseItem('Engrase suspensión');

  // iInspeccionBaterias already covers battery inspection — no separate iInspBateria needed
  void iLimpTerminale;

  console.log(`   ✓ ${baseItems.length} MantItems base encontrados`);

  // ========================================
  // 3. Crear Template
  // ========================================
  console.log('\n3. Creando Template...');

  const template = await prisma.maintenanceTemplate.create({
    data: {
      name: 'Hino 300 Dutro Standard',
      description:
        'Programa mantenimiento preventivo Hino 300 Dutro - Plan General',
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
  // 4. Crear Paquetes con Items
  // ========================================
  console.log('\n4. Creando Paquetes...');

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

  // Paquete 10,000 km
  await createPackage('Servicio 10,000 km', 10000, 0, 2.5, 'MEDIUM', [
    {
      mantItem: iCambioAceite,
      triggerKm: 10000,
      estimatedTime: 0.5,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseGeneral,
      triggerKm: 10000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 10000,
      estimatedTime: 0.3,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 10000,
      estimatedTime: 0.3,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionBaterias,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 7,
      priority: 'LOW',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 10000,
      estimatedTime: 0.4,
      order: 9,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTensionCorreas,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 10,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorIntercooler,
      triggerKm: 10000,
      estimatedTime: 0.3,
      order: 11,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 13,
      priority: 'LOW',
    },
    {
      mantItem: iSistemaAjusteCabina,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 14,
      priority: 'LOW',
    },
    {
      mantItem: iGuayaAcelerador,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 15,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 16,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteEmbrague,
      triggerKm: 10000,
      estimatedTime: 0.3,
      order: 17,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaAdmision,
      triggerKm: 10000,
      estimatedTime: 0.2,
      order: 18,
      priority: 'LOW',
    },
  ]);

  // Paquete 20,000 km
  await createPackage('Servicio 20,000 km', 20000, 0, 3.5, 'MEDIUM', [
    {
      mantItem: iCambioAceite,
      triggerKm: 20000,
      estimatedTime: 0.5,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseGeneral,
      triggerKm: 20000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 20000,
      estimatedTime: 0.3,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 20000,
      estimatedTime: 0.3,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 20000,
      estimatedTime: 0.3,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 20000,
      estimatedTime: 0.3,
      order: 8,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionBaterias,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 9,
      priority: 'LOW',
    },
    {
      mantItem: iConexAltArr,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 11,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 20000,
      estimatedTime: 0.4,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBalanceo,
      triggerKm: 20000,
      estimatedTime: 0.5,
      order: 13,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTensionCorreas,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 14,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorIntercooler,
      triggerKm: 20000,
      estimatedTime: 0.3,
      order: 15,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 16,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 17,
      priority: 'LOW',
    },
    {
      mantItem: iSistemaAjusteCabina,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 18,
      priority: 'LOW',
    },
    {
      mantItem: iGuayaAcelerador,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 19,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 20,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteEmbrague,
      triggerKm: 20000,
      estimatedTime: 0.3,
      order: 21,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaAdmision,
      triggerKm: 20000,
      estimatedTime: 0.2,
      order: 22,
      priority: 'LOW',
    },
  ]);

  // Paquete 30,000 km
  await createPackage('Servicio 30,000 km', 30000, 0, 4.5, 'HIGH', [
    {
      mantItem: iCambioAceite,
      triggerKm: 30000,
      estimatedTime: 0.5,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseGeneral,
      triggerKm: 30000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 30000,
      estimatedTime: 0.3,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 30000,
      estimatedTime: 0.3,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLiquidoFreno,
      triggerKm: 30000,
      estimatedTime: 0.5,
      order: 7,
      priority: 'HIGH',
    },
    {
      mantItem: iAjusteCardanes,
      triggerKm: 30000,
      estimatedTime: 0.5,
      order: 8,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRespiraderoTransm,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 9,
      priority: 'LOW',
    },
    {
      mantItem: iAceiteTransm,
      triggerKm: 30000,
      estimatedTime: 1.0,
      order: 10,
      priority: 'HIGH',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 30000,
      estimatedTime: 0.3,
      order: 11,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 30000,
      estimatedTime: 0.3,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionBaterias,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 13,
      priority: 'LOW',
    },
    {
      mantItem: iConexAltArr,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 15,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 30000,
      estimatedTime: 0.4,
      order: 16,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTensionCorreas,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 17,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorIntercooler,
      triggerKm: 30000,
      estimatedTime: 0.3,
      order: 18,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 19,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 20,
      priority: 'LOW',
    },
    {
      mantItem: iSistemaAjusteCabina,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 21,
      priority: 'LOW',
    },
    {
      mantItem: iGuayaAcelerador,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 22,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 23,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteEmbrague,
      triggerKm: 30000,
      estimatedTime: 0.3,
      order: 24,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLiqDireccion,
      triggerKm: 30000,
      estimatedTime: 0.5,
      order: 25,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaAdmision,
      triggerKm: 30000,
      estimatedTime: 0.2,
      order: 26,
      priority: 'LOW',
    },
  ]);

  // Paquete 40,000 km - Servicio completo
  await createPackage('Servicio 40,000 km', 40000, 0, 6.0, 'HIGH', [
    {
      mantItem: iCambioAceite,
      triggerKm: 40000,
      estimatedTime: 0.5,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseGeneral,
      triggerKm: 40000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iCilindroFreno,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iEscapeSellos,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 8,
      priority: 'LOW',
    },
    {
      mantItem: iLiquidoFreno,
      triggerKm: 40000,
      estimatedTime: 0.5,
      order: 9,
      priority: 'HIGH',
    },
    {
      mantItem: iAjusteCardanes,
      triggerKm: 40000,
      estimatedTime: 0.5,
      order: 10,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRespiraderoTransm,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 11,
      priority: 'LOW',
    },
    {
      mantItem: iFisurasMuelles,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBujesSuspension,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 13,
      priority: 'MEDIUM',
    },
    {
      mantItem: iGrapasMuelles,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 14,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRodamientosRuedas,
      triggerKm: 40000,
      estimatedTime: 0.4,
      order: 15,
      priority: 'MEDIUM',
    },
    {
      mantItem: iSoporteMotorTrans,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 16,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 17,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 18,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionBaterias,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 19,
      priority: 'LOW',
    },
    {
      mantItem: iConexAltArr,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 21,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 40000,
      estimatedTime: 0.4,
      order: 22,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBalanceo,
      triggerKm: 40000,
      estimatedTime: 0.5,
      order: 23,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTensionCorreas,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 24,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorIntercooler,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 25,
      priority: 'LOW',
    },
    {
      mantItem: iDepositoDir,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 26,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 27,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 28,
      priority: 'LOW',
    },
    {
      mantItem: iSistemaAjusteCabina,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 29,
      priority: 'LOW',
    },
    {
      mantItem: iGuayaAcelerador,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 30,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 31,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteEmbrague,
      triggerKm: 40000,
      estimatedTime: 0.3,
      order: 32,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaAdmision,
      triggerKm: 40000,
      estimatedTime: 0.2,
      order: 33,
      priority: 'LOW',
    },
  ]);

  // Paquete 50,000 km
  await createPackage('Servicio 50,000 km', 50000, 0, 2.5, 'MEDIUM', [
    {
      mantItem: iCambioAceite,
      triggerKm: 50000,
      estimatedTime: 0.5,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseGeneral,
      triggerKm: 50000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 8,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionBaterias,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 9,
      priority: 'LOW',
    },
    {
      mantItem: iConexAltArr,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 11,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 50000,
      estimatedTime: 0.4,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTensionCorreas,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 13,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorIntercooler,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 14,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 15,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 16,
      priority: 'LOW',
    },
    {
      mantItem: iSistemaAjusteCabina,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 17,
      priority: 'LOW',
    },
    {
      mantItem: iGuayaAcelerador,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 18,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 19,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteEmbrague,
      triggerKm: 50000,
      estimatedTime: 0.3,
      order: 20,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaAdmision,
      triggerKm: 50000,
      estimatedTime: 0.2,
      order: 21,
      priority: 'LOW',
    },
  ]);

  // Paquete 60,000 km - Con flushing inyección
  await createPackage('Servicio 60,000 km', 60000, 0, 5.0, 'HIGH', [
    {
      mantItem: iCambioAceite,
      triggerKm: 60000,
      estimatedTime: 0.5,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseGeneral,
      triggerKm: 60000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 60000,
      estimatedTime: 0.3,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 60000,
      estimatedTime: 0.3,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iCilindroFreno,
      triggerKm: 60000,
      estimatedTime: 0.3,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iEscapeSellos,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 8,
      priority: 'LOW',
    },
    {
      mantItem: iLiquidoFreno,
      triggerKm: 60000,
      estimatedTime: 0.5,
      order: 9,
      priority: 'HIGH',
    },
    {
      mantItem: iAjusteCardanes,
      triggerKm: 60000,
      estimatedTime: 0.5,
      order: 10,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRespiraderoTransm,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 11,
      priority: 'LOW',
    },
    {
      mantItem: iAceiteTransm,
      triggerKm: 60000,
      estimatedTime: 1.0,
      order: 12,
      priority: 'HIGH',
    },
    {
      mantItem: iLiqDireccion,
      triggerKm: 60000,
      estimatedTime: 0.5,
      order: 13,
      priority: 'HIGH',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 60000,
      estimatedTime: 0.3,
      order: 14,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 60000,
      estimatedTime: 0.3,
      order: 15,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionBaterias,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 16,
      priority: 'LOW',
    },
    {
      mantItem: iConexAltArr,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 18,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 60000,
      estimatedTime: 0.4,
      order: 19,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBalanceo,
      triggerKm: 60000,
      estimatedTime: 0.5,
      order: 20,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTensionCorreas,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 21,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorIntercooler,
      triggerKm: 60000,
      estimatedTime: 0.3,
      order: 22,
      priority: 'LOW',
    },
    {
      mantItem: iDepositoDir,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 23,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 24,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 25,
      priority: 'LOW',
    },
    {
      mantItem: iSistemaAjusteCabina,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 26,
      priority: 'LOW',
    },
    {
      mantItem: iGuayaAcelerador,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 27,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 28,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteEmbrague,
      triggerKm: 60000,
      estimatedTime: 0.3,
      order: 29,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaAdmision,
      triggerKm: 60000,
      estimatedTime: 0.2,
      order: 30,
      priority: 'LOW',
    },
  ]);

  // Paquete 70,000 km
  await createPackage('Servicio 70,000 km', 70000, 0, 2.5, 'MEDIUM', [
    {
      mantItem: iCambioAceite,
      triggerKm: 70000,
      estimatedTime: 0.5,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseGeneral,
      triggerKm: 70000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 70000,
      estimatedTime: 0.3,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 70000,
      estimatedTime: 0.3,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 70000,
      estimatedTime: 0.3,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 70000,
      estimatedTime: 0.3,
      order: 8,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionBaterias,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 9,
      priority: 'LOW',
    },
    {
      mantItem: iConexAltArr,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 11,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 70000,
      estimatedTime: 0.4,
      order: 12,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTensionCorreas,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 13,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorIntercooler,
      triggerKm: 70000,
      estimatedTime: 0.3,
      order: 14,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 15,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 16,
      priority: 'LOW',
    },
    {
      mantItem: iSistemaAjusteCabina,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 17,
      priority: 'LOW',
    },
    {
      mantItem: iGuayaAcelerador,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 18,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 19,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteEmbrague,
      triggerKm: 70000,
      estimatedTime: 0.3,
      order: 20,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaAdmision,
      triggerKm: 70000,
      estimatedTime: 0.2,
      order: 21,
      priority: 'LOW',
    },
  ]);

  // Paquete 100,000 km - Con calibrar valvulas
  await createPackage('Servicio 100,000 km', 100000, 0, 7.0, 'HIGH', [
    {
      mantItem: iCambioAceite,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 1,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroAceite,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 2,
      priority: 'HIGH',
    },
    {
      mantItem: iFiltroComb,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 3,
      priority: 'HIGH',
    },
    {
      mantItem: iEngraseGeneral,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 4,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBandasFreno,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 5,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspFreno,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 6,
      priority: 'MEDIUM',
    },
    {
      mantItem: iCilindroFreno,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 7,
      priority: 'MEDIUM',
    },
    {
      mantItem: iEscapeSellos,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 8,
      priority: 'LOW',
    },
    {
      mantItem: iLiquidoFreno,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 9,
      priority: 'HIGH',
    },
    {
      mantItem: iCalibrarValvulas,
      triggerKm: 100000,
      estimatedTime: 1.5,
      order: 10,
      priority: 'HIGH',
    },
    {
      mantItem: iAjusteCardanes,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 11,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRespiraderoTransm,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 12,
      priority: 'LOW',
    },
    {
      mantItem: iAceiteTransm,
      triggerKm: 100000,
      estimatedTime: 1.0,
      order: 13,
      priority: 'HIGH',
    },
    {
      mantItem: iFisurasMuelles,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 14,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBujesSuspension,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 15,
      priority: 'MEDIUM',
    },
    {
      mantItem: iGrapasMuelles,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 16,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRodamientosRuedas,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 17,
      priority: 'MEDIUM',
    },
    {
      mantItem: iSoporteMotorTrans,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 18,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspAmort,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 19,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLubRotulas,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 20,
      priority: 'MEDIUM',
    },
    {
      mantItem: iInspeccionBaterias,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 21,
      priority: 'LOW',
    },
    {
      mantItem: iConexAltArr,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 23,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRotNeumaticos,
      triggerKm: 100000,
      estimatedTime: 0.4,
      order: 24,
      priority: 'MEDIUM',
    },
    {
      mantItem: iBalanceo,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 25,
      priority: 'MEDIUM',
    },
    {
      mantItem: iTensionCorreas,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 26,
      priority: 'MEDIUM',
    },
    {
      mantItem: iRadiadorIntercooler,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 27,
      priority: 'LOW',
    },
    {
      mantItem: iDepositoDir,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 28,
      priority: 'LOW',
    },
    {
      mantItem: iFiltroAire,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 29,
      priority: 'MEDIUM',
    },
    {
      mantItem: iFiltroAireCabina,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 30,
      priority: 'LOW',
    },
    {
      mantItem: iSistemaAjusteCabina,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 31,
      priority: 'LOW',
    },
    {
      mantItem: iGuayaAcelerador,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 32,
      priority: 'LOW',
    },
    {
      mantItem: iJuegoLibreDir,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 33,
      priority: 'MEDIUM',
    },
    {
      mantItem: iAjusteEmbrague,
      triggerKm: 100000,
      estimatedTime: 0.3,
      order: 34,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLiqDireccion,
      triggerKm: 100000,
      estimatedTime: 0.5,
      order: 35,
      priority: 'MEDIUM',
    },
    {
      mantItem: iLineaAdmision,
      triggerKm: 100000,
      estimatedTime: 0.2,
      order: 36,
      priority: 'LOW',
    },
  ]);

  console.log('\n=== Seed Hino 300 Dutro COMPLETADO ===\n');

  return {
    brand: hino,
    line: dutro300,
    template,
  };
}
