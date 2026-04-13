import { PrismaClient } from '@prisma/client';

export async function seedTemparioAutomotriz(prisma: PrismaClient) {
  console.log('\n=== SEED: Tempario Automotriz ===\n');

  console.log('1. Creando Tempario principal...');

  const tempario = await prisma.tempario.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Tempario Automotriz Standard',
      description:
        'Tempario estándar de mano de obra para mantenimiento y reparación de vehículos automotores',
      isGlobal: true,
      tenantId: null,
      isActive: true,
    },
  });

  console.log(`   ✓ Tempario: ${tempario.name}`);

  console.log('\n2. Creando TemparioItems por categoría...');

  const categories = [
    {
      name: 'Motor',
      items: [
        { code: 'M001', description: 'Cambio aceite motor', hours: 0.5 },
        { code: 'M002', description: 'Cambio filtro aceite', hours: 0.25 },
        { code: 'M003', description: 'Cambio filtro aire', hours: 0.2 },
        { code: 'M004', description: 'Cambio filtro combustible', hours: 0.3 },
        { code: 'M005', description: 'Cambio filtro respiradero', hours: 0.2 },
        { code: 'M006', description: 'Calibración válvulas', hours: 1.5 },
        { code: 'M007', description: 'Rectificación motor', hours: 12.0 },
        { code: 'M008', description: 'Cambio juntas motor', hours: 8.0 },
        { code: 'M009', description: 'Cambio retenes motor', hours: 3.0 },
        { code: 'M010', description: 'Cambio bomba aceite', hours: 2.0 },
        { code: 'M011', description: 'Cambio cadena distribución', hours: 4.0 },
        { code: 'M012', description: 'Cambio tensor distribución', hours: 1.5 },
        { code: 'M013', description: 'Cambio correa distribución', hours: 3.5 },
        { code: 'M014', description: 'Cambio radiator', hours: 1.5 },
        {
          code: 'M015',
          description: 'Cambio manguera refrigerante',
          hours: 0.5,
        },
        { code: 'M016', description: 'Cambio termostato', hours: 0.5 },
        { code: 'M017', description: 'Cambio bomba agua', hours: 2.0 },
        { code: 'M018', description: 'Cambio inyectores', hours: 2.5 },
        { code: 'M019', description: 'Cambio bomba combustible', hours: 1.5 },
        {
          code: 'M020',
          description: 'Limpieza cuerpo aceleración',
          hours: 0.8,
        },
        { code: 'M021', description: 'Ajuste carburador', hours: 1.0 },
        { code: 'M022', description: 'Cambio carburador', hours: 1.5 },
        { code: 'M023', description: 'Cambio turbocharger', hours: 3.0 },
        { code: 'M024', description: 'Cambio intercooler', hours: 1.0 },
        { code: 'M025', description: 'Cambio sensores motor', hours: 0.5 },
        { code: 'M026', description: 'Cambio bujías', hours: 0.3 },
        { code: 'M027', description: 'Cambio cables bujía', hours: 0.4 },
        { code: 'M028', description: 'Cambio bobina ignición', hours: 0.5 },
        { code: 'M029', description: 'Diagnóstico motor', hours: 1.0 },
        { code: 'M030', description: 'Escape reparacion general', hours: 2.0 },
      ],
    },
    {
      name: 'Transmision',
      items: [
        { code: 'T001', description: 'Cambio aceite transmisión', hours: 1.0 },
        { code: 'T002', description: 'Cambio filtro transmisión', hours: 1.2 },
        { code: 'T003', description: 'Ajuste embrague', hours: 1.5 },
        { code: 'T004', description: 'Cambio disco embrague', hours: 4.0 },
        { code: 'T005', description: 'Cambio platino embrague', hours: 4.0 },
        { code: 'T006', description: 'Cambio cojinete empuje', hours: 4.0 },
        { code: 'T007', description: 'Cambio cable clutch', hours: 1.0 },
        { code: 'T008', description: 'Cambio Aceite Diferencial', hours: 1.0 },
        { code: 'T009', description: 'Cambio corona piñón', hours: 6.0 },
        {
          code: 'T010',
          description: 'Cambio rodamientos diferencial',
          hours: 5.0,
        },
        { code: 'T011', description: 'Rectificación diferencial', hours: 8.0 },
        { code: 'T012', description: 'Cambio retenes transmisión', hours: 2.0 },
        { code: 'T013', description: 'Cambio synchronous', hours: 3.0 },
        { code: 'T014', description: 'Cambio cremallera cambio', hours: 2.5 },
        { code: 'T015', description: 'Cambio palancas cambio', hours: 1.0 },
        { code: 'T016', description: 'Ajuste juego change', hours: 0.8 },
        { code: 'T017', description: 'Diagnóstico transmisión', hours: 1.5 },
        { code: 'T018', description: 'Cambio convertidor torque', hours: 5.0 },
        { code: 'T019', description: 'Cambio cuerpo válvulas', hours: 3.0 },
        {
          code: 'T020',
          description: 'Rectificación caja cambios',
          hours: 10.0,
        },
      ],
    },
    {
      name: 'Frenos',
      items: [
        {
          code: 'F001',
          description: 'Cambio pastillas freno adelante',
          hours: 0.8,
        },
        {
          code: 'F002',
          description: 'Cambio pastillas freno atrás',
          hours: 0.8,
        },
        { code: 'F003', description: 'Cambio discos freno', hours: 1.2 },
        { code: 'F004', description: 'Rectificación discos freno', hours: 1.0 },
        { code: 'F005', description: 'Cambio bandas freno', hours: 1.5 },
        { code: 'F006', description: 'Cambio tambores freno', hours: 1.2 },
        { code: 'F007', description: 'Rectificación tambores', hours: 1.0 },
        { code: 'F008', description: 'Cambio cilindro ruedas', hours: 1.0 },
        { code: 'F009', description: 'Cambio cilindro maestro', hours: 2.0 },
        { code: 'F010', description: 'Cambio servo freno', hours: 1.5 },
        { code: 'F011', description: 'Cambio mangueras freno', hours: 0.5 },
        { code: 'F012', description: 'Cambio tubo freno', hours: 0.8 },
        { code: 'F013', description: 'Cambio líquido freno', hours: 0.5 },
        { code: 'F014', description: 'Purga sistema freno', hours: 0.5 },
        { code: 'F015', description: 'Ajuste freno estacionario', hours: 0.5 },
        { code: 'F016', description: 'Cambio zapata freno mano', hours: 1.0 },
        { code: 'F017', description: 'Cambio cable freno mano', hours: 1.0 },
        { code: 'F018', description: 'Cambio ABS sensor', hours: 0.5 },
        { code: 'F019', description: 'Diagnóstico sistema freno', hours: 1.0 },
        { code: 'F020', description: 'Inspección general frenos', hours: 0.5 },
      ],
    },
    {
      name: 'Suspension',
      items: [
        {
          code: 'S001',
          description: 'Cambio amortiguador adelante',
          hours: 0.8,
        },
        { code: 'S002', description: 'Cambio amortiguador atrás', hours: 0.8 },
        { code: 'S003', description: 'Cambio resorte suspensión', hours: 1.5 },
        { code: 'S004', description: 'Cambio tornillo presión', hours: 1.0 },
        { code: 'S005', description: 'Cambio bocín suspensión', hours: 0.8 },
        { code: 'S006', description: 'Cambio gemelo suspensión', hours: 1.0 },
        { code: 'S007', description: 'Cambio bieleta suspensión', hours: 0.5 },
        {
          code: 'S008',
          description: 'Cambio barra estabilizadora',
          hours: 1.0,
        },
        {
          code: 'S009',
          description: 'Cambio terminal estabilizadora',
          hours: 0.5,
        },
        { code: 'S010', description: 'Cambio rotula suspensión', hours: 1.0 },
        { code: 'S011', description: 'Cambio axial dirección', hours: 0.8 },
        { code: 'S012', description: 'Cambio manga eje', hours: 2.5 },
        { code: 'S013', description: 'Cambio rodamiento cubo', hours: 1.5 },
        { code: 'S014', description: 'Cambio retén cubo', hours: 1.2 },
        { code: 'S015', description: 'Cambio rulemán centro', hours: 1.5 },
        { code: 'S016', description: 'Cambio ballesta', hours: 2.0 },
        {
          code: 'S017',
          description: 'Cambio parachoques suspensión',
          hours: 1.0,
        },
        { code: 'S018', description: 'Engrase suspensión', hours: 0.5 },
        { code: 'S019', description: 'Inspección suspensión', hours: 0.5 },
        { code: 'S020', description: 'Alineación tren delantero', hours: 1.0 },
      ],
    },
    {
      name: 'Direccion',
      items: [
        {
          code: 'D001',
          description: 'Cambio líquido dirección hidráulica',
          hours: 0.8,
        },
        { code: 'D002', description: 'Cambio manguera dirección', hours: 1.0 },
        {
          code: 'D003',
          description: 'Cambio bomba dirección hidráulica',
          hours: 2.5,
        },
        {
          code: 'D004',
          description: 'Cambio cremallera dirección',
          hours: 3.0,
        },
        { code: 'D005', description: 'Reparación cremallera', hours: 4.0 },
        { code: 'D006', description: 'Cambio terminal dirección', hours: 0.5 },
        { code: 'D007', description: 'Cambio biela dirección', hours: 0.8 },
        { code: 'D008', description: 'Cambio barra dirección', hours: 0.8 },
        { code: 'D009', description: 'Cambio soporte dirección', hours: 1.5 },
        { code: 'D010', description: 'Cambio columna dirección', hours: 2.0 },
        { code: 'D011', description: 'Cambio volante', hours: 1.0 },
        { code: 'D012', description: 'Cambio cardan dirección', hours: 1.5 },
        { code: 'D013', description: 'Cambio caja dirección', hours: 3.0 },
        { code: 'D014', description: 'Ajuste juego dirección', hours: 0.5 },
        { code: 'D015', description: 'Inspección dirección', hours: 0.5 },
        { code: 'D016', description: 'Alineación dirección', hours: 1.0 },
        { code: 'D017', description: 'Diagnóstico dirección', hours: 1.0 },
        {
          code: 'D018',
          description: 'Cambio sensor posición dirección',
          hours: 0.5,
        },
      ],
    },
    {
      name: 'Electrico',
      items: [
        { code: 'E001', description: 'Cambio batería', hours: 0.3 },
        {
          code: 'E002',
          description: 'Limpieza terminales batería',
          hours: 0.2,
        },
        { code: 'E003', description: 'Cambio alternador', hours: 1.5 },
        { code: 'E004', description: 'Cambio motor arranque', hours: 1.5 },
        { code: 'E005', description: 'Cambio regulador voltaje', hours: 1.0 },
        { code: 'E006', description: 'Cambio bombillas', hours: 0.2 },
        { code: 'E007', description: 'Cambio faro', hours: 0.5 },
        { code: 'E008', description: 'Cambio piloto', hours: 0.3 },
        { code: 'E009', description: 'Cambio luz stop', hours: 0.3 },
        { code: 'E010', description: 'Cambio direccional', hours: 0.3 },
        { code: 'E011', description: 'Cambio switch luz', hours: 0.8 },
        {
          code: 'E012',
          description: 'Cambio switch limpiaparabrisas',
          hours: 0.8,
        },
        {
          code: 'E013',
          description: 'Cambio motor limpiaparabrisas',
          hours: 1.0,
        },
        {
          code: 'E014',
          description: 'Cambio bomba limpiaparabrisas',
          hours: 0.5,
        },
        { code: 'E015', description: 'Cambio bocina', hours: 0.3 },
        { code: 'E016', description: 'Cambio espejo eléctrico', hours: 0.8 },
        { code: 'E017', description: 'Cambio levanta vidrio', hours: 1.0 },
        {
          code: 'E018',
          description: 'Cambio switch levanta vidrio',
          hours: 0.8,
        },
        { code: 'E019', description: 'Cambio motorventilador', hours: 1.0 },
        {
          code: 'E020',
          description: 'Cambio resistor motorventilador',
          hours: 0.5,
        },
        { code: 'E021', description: 'Cambio sensor temperatura', hours: 0.5 },
        {
          code: 'E022',
          description: 'Cambio sensor nivel combustible',
          hours: 0.8,
        },
        { code: 'E023', description: 'Cambio velocímetro', hours: 1.0 },
        {
          code: 'E024',
          description: 'Cambio tablero instrumentos',
          hours: 1.5,
        },
        { code: 'E025', description: 'Cambio radio autoestereo', hours: 0.8 },
        { code: 'E026', description: 'Cambio altavoz', hours: 0.5 },
        {
          code: 'E027',
          description: 'Diagnóstico sistema eléctrico',
          hours: 1.5,
        },
        { code: 'E028', description: 'Reparación cableado', hours: 2.0 },
      ],
    },
    {
      name: 'Aire Acondicionado',
      items: [
        { code: 'A001', description: 'Carga gas refrigerante', hours: 0.8 },
        { code: 'A002', description: 'Vacío sistema A/A', hours: 1.5 },
        { code: 'A003', description: 'Cambio compresor A/A', hours: 3.0 },
        { code: 'A004', description: 'Cambio condensador A/A', hours: 1.5 },
        { code: 'A005', description: 'Cambio evaporador A/A', hours: 3.5 },
        {
          code: 'A006',
          description: 'Cambio filtro deshumedecedor',
          hours: 1.0,
        },
        { code: 'A007', description: 'Cambio manguera A/A', hours: 1.0 },
        { code: 'A008', description: 'Cambio válvula expansión', hours: 1.5 },
        {
          code: 'A009',
          description: 'Cambio sensor temperatura A/A',
          hours: 0.5,
        },
        { code: 'A010', description: 'Cambio motor blower', hours: 1.0 },
        { code: 'A011', description: 'Cambio switch A/A', hours: 0.5 },
        { code: 'A012', description: 'Diagnóstico A/A', hours: 1.0 },
        { code: 'A013', description: 'Limpieza sistema A/A', hours: 1.5 },
        { code: 'A014', description: 'Cambio correa A/A', hours: 0.5 },
      ],
    },
    {
      name: 'Embrague',
      items: [
        { code: 'B001', description: 'Ajuste pedal embrague', hours: 0.5 },
        { code: 'B002', description: 'Cambio disco embrague', hours: 4.0 },
        { code: 'B003', description: 'Cambio platino embrague', hours: 4.0 },
        { code: 'B004', description: 'Cambio cojinete apoyo', hours: 4.0 },
        { code: 'B005', description: 'Cambio cojinete piloto', hours: 4.0 },
        { code: 'B006', description: 'Cambio cable embrague', hours: 1.0 },
        { code: 'B007', description: 'Cambio bomba embrague', hours: 2.0 },
        { code: 'B008', description: 'Purga sistema embrague', hours: 0.5 },
        { code: 'B009', description: 'Cambio horquilla embrague', hours: 3.0 },
        { code: 'B010', description: 'Diagnóstico embrague', hours: 1.0 },
      ],
    },
    {
      name: 'Escape',
      items: [
        { code: 'X001', description: 'Cambio múltiple escape', hours: 1.5 },
        { code: 'X002', description: 'Cambio silenciador', hours: 1.0 },
        { code: 'X003', description: 'Cambio tubo escape', hours: 0.8 },
        { code: 'X004', description: 'Cambio catalizador', hours: 2.0 },
        { code: 'X005', description: 'Cambio sensor oxígeno', hours: 0.5 },
        { code: 'X006', description: 'Soldadura escape', hours: 1.5 },
        { code: 'X007', description: 'Cambio empaque escape', hours: 0.5 },
        { code: 'X008', description: 'Cambio soporte escape', hours: 0.5 },
        { code: 'X009', description: 'Rectificación múltiple', hours: 2.0 },
        { code: 'X010', description: 'Diagnóstico emisiones', hours: 1.0 },
      ],
    },
    {
      name: 'Carroceria',
      items: [
        { code: 'C001', description: 'Enderezado panels', hours: 3.0 },
        { code: 'C002', description: 'Soldadura cuerpos', hours: 2.5 },
        { code: 'C003', description: 'Cambio parachoque adelante', hours: 1.5 },
        { code: 'C004', description: 'Cambio parachoque atrás', hours: 1.5 },
        { code: 'C005', description: 'Cambio capo', hours: 2.0 },
        { code: 'C006', description: 'Cambio puertas', hours: 2.5 },
        { code: 'C007', description: 'Cambio guardabarros', hours: 1.5 },
        { code: 'C008', description: 'Cambio toldo', hours: 3.0 },
        { code: 'C009', description: 'Cambio vidrio parabrisas', hours: 1.5 },
        { code: 'C010', description: 'Cambio vidrio lateral', hours: 1.0 },
        { code: 'C011', description: 'Cambio cristal atrás', hours: 1.0 },
        { code: 'C012', description: 'Cambio parabrisas', hours: 1.5 },
        { code: 'C013', description: 'Cambio limpiaparabrisas', hours: 0.5 },
        {
          code: 'C014',
          description: 'Cambio brazo limpiaparabrisas',
          hours: 0.5,
        },
        { code: 'C015', description: 'Cambio tapa combustible', hours: 0.5 },
        { code: 'C016', description: 'Cambio espejo retrovisor', hours: 0.3 },
        { code: 'C017', description: 'Cambio cerradura puerta', hours: 0.8 },
        { code: 'C018', description: 'Cambio manija puerta', hours: 0.5 },
        { code: 'C019', description: 'Cambio molduras', hours: 0.5 },
        { code: 'C020', description: 'Pintura panel', hours: 4.0 },
        { code: 'C021', description: 'Pulido vehicular', hours: 2.0 },
        { code: 'C022', description: 'Cambio alfombra', hours: 1.5 },
        { code: 'C023', description: 'Cambio tapiz', hours: 3.0 },
        { code: 'C024', description: 'Cambio asiento', hours: 1.5 },
        { code: 'C025', description: 'Cambio cinturón seguridad', hours: 0.8 },
      ],
    },
    {
      name: 'Neumaticos',
      items: [
        { code: 'N001', description: 'Cambio neumático', hours: 0.3 },
        { code: 'N002', description: 'Rotación neumáticos', hours: 0.5 },
        { code: 'N003', description: 'Balanceo ruedas', hours: 0.4 },
        { code: 'N004', description: 'Alineación ruedas', hours: 1.0 },
        { code: 'N005', description: 'Reparación neumático', hours: 0.4 },
        { code: 'N006', description: 'Sellado cámara', hours: 0.3 },
        { code: 'N007', description: 'Cambio válvula', hours: 0.1 },
        { code: 'N008', description: 'Verificación presión', hours: 0.2 },
        { code: 'N009', description: 'Cambio rodada', hours: 1.0 },
        { code: 'N010', description: 'Cambio cubo rueda', hours: 1.5 },
      ],
    },
    {
      name: 'Lubricacion',
      items: [
        { code: 'L001', description: 'Engrase general', hours: 0.5 },
        { code: 'L002', description: 'Engrase cardanes', hours: 0.3 },
        { code: 'L003', description: 'Engrase rodamientos', hours: 0.8 },
        { code: 'L004', description: 'Engrase puntos lubricación', hours: 0.4 },
        { code: 'L005', description: 'Cambio lubricante', hours: 0.5 },
        {
          code: 'L006',
          description: 'Limpieza sistema lubricación',
          hours: 1.0,
        },
      ],
    },
    {
      name: 'Varios',
      items: [
        { code: 'V001', description: 'Diagnóstico general', hours: 1.5 },
        { code: 'V002', description: 'Prueba camino', hours: 0.5 },
        { code: 'V003', description: 'Inspección pre-entrega', hours: 1.0 },
        {
          code: 'V004',
          description: 'Cambio liquido limpiaparabrisas',
          hours: 0.2,
        },
        { code: 'V005', description: 'Limpieza inyectores', hours: 1.0 },
        { code: 'V006', description: 'Decarbonización motor', hours: 3.0 },
        { code: 'V007', description: 'Ajuste faros', hours: 0.3 },
        { code: 'V008', description: 'Inspección técnica', hours: 1.0 },
        {
          code: 'V009',
          description: 'Cambio aceite caja transferencia',
          hours: 1.0,
        },
        {
          code: 'V010',
          description: 'Cambio aceite árbol transmisión',
          hours: 0.8,
        },
        { code: 'V011', description: 'Cambio filtros habitáculo', hours: 0.3 },
        { code: 'V012', description: 'Limpieza radiador', hours: 0.8 },
        { code: 'V013', description: 'Inspección leakage', hours: 0.5 },
        { code: 'V014', description: 'Reparación fuga aceite', hours: 1.5 },
        {
          code: 'V015',
          description: 'Reparación fuga refrigerante',
          hours: 1.5,
        },
      ],
    },
  ];

  // Aplanar todas las categorías en un array y crear en batch (idempotente via skipDuplicates)
  const allItems = categories.flatMap(category =>
    category.items.map(item => ({
      temparioId: tempario.id,
      code: item.code,
      description: item.description,
      category: category.name,
      referenceHours: item.hours,
    }))
  );

  await prisma.temparioItem.createMany({
    data: allItems,
    skipDuplicates: true,
  });

  // Leer IDs resultantes para construir el mapa (necesario para procedimientos KB)
  const createdItems = await prisma.temparioItem.findMany({
    where: { temparioId: tempario.id },
    select: { id: true, code: true },
  });
  const temparioItemsMap: Record<string, string> = {};
  for (const item of createdItems) {
    temparioItemsMap[item.code] = item.id;
  }
  const totalItemsCount = createdItems.length;

  for (const category of categories) {
    console.log(`   ✓ ${category.name}: ${category.items.length} items`);
  }
  console.log(`\n   ✓ Total: ${totalItemsCount} TemparioItems`);

  console.log('\n=== Seed Tempario Automotriz COMPLETADO ===\n');

  return {
    tempario,
    temparioItemsMap,
    totalItemsCount,
  };
}
