import { PrismaClient } from '@prisma/client';

// Items por grupo operativo
const ITEMS_LIVIANO = [
  {
    category: 'lights',
    label: 'Luces (delanteras, traseras, emergencia)',
    order: 1,
  },
  { category: 'brakes', label: 'Frenos (pedal y freno de mano)', order: 2 },
  {
    category: 'tires',
    label: 'Neumáticos (presión y desgaste visible)',
    order: 3,
  },
  {
    category: 'leaks',
    label: 'Fugas (aceite, combustible, líquido de frenos)',
    order: 4,
  },
  { category: 'seatbelt', label: 'Cinturón de seguridad', order: 5 },
  {
    category: 'extinguisher',
    label: 'Extintor (cargado y accesible)',
    order: 6,
  },
  {
    category: 'documents',
    label: 'Documentos (SOAT, licencia de tránsito)',
    order: 7,
  },
  { category: 'wipers', label: 'Limpiaparabrisas y visibilidad', order: 8 },
];

const ITEMS_PASAJEROS_MEDIANO = [
  ...ITEMS_LIVIANO,
  {
    category: 'emergency_exits',
    label: 'Salidas de emergencia (apertura y señalización)',
    order: 9,
  },
  {
    category: 'passenger_extinguisher',
    label: 'Extintor accesible a pasajeros',
    order: 10,
  },
  {
    category: 'interior_lights',
    label: 'Luces interiores de emergencia',
    order: 11,
  },
];

const ITEMS_BUS = [
  ...ITEMS_PASAJEROS_MEDIANO,
  {
    category: 'passenger_belts',
    label: 'Cinturones de pasajeros (muestreo)',
    order: 12,
  },
  { category: 'first_aid', label: 'Botiquín de primeros auxilios', order: 13 },
];

const ITEMS_CAMION_MEDIANO = [
  ...ITEMS_LIVIANO,
  {
    category: 'air_brakes',
    label: 'Frenos de aire (presión del sistema)',
    order: 9,
  },
  {
    category: 'lateral_lights',
    label: 'Luces de posición laterales',
    order: 10,
  },
  {
    category: 'mirrors',
    label: 'Espejos retrovisores laterales ajustados',
    order: 11,
  },
  {
    category: 'cargo',
    label: 'Carga asegurada (amarres y señalización)',
    order: 12,
  },
  { category: 'triangles', label: 'Triángulos de señalización', order: 13 },
  { category: 'first_aid', label: 'Botiquín de primeros auxilios', order: 14 },
];

const ITEMS_CAMION_PESADO = [
  ...ITEMS_CAMION_MEDIANO,
  {
    category: 'differential',
    label: 'Diferencial y transmisión (fugas visibles)',
    order: 15,
  },
  {
    category: 'coolant',
    label: 'Nivel de refrigerante y temperatura',
    order: 16,
  },
];

const ITEMS_VOLQUETA = [
  ...ITEMS_CAMION_PESADO,
  {
    category: 'hydraulic',
    label: 'Sistema hidráulico de tolva (fugas, presión)',
    order: 17,
  },
  {
    category: 'body_lock',
    label: 'Seguro de tolva activo en posición transporte',
    order: 18,
  },
];

const ITEMS_TRACTOCAMION = [
  ...ITEMS_CAMION_PESADO,
  {
    category: 'fifth_wheel',
    label: 'Quinta rueda / acople (cierre y seguros)',
    order: 17,
  },
  {
    category: 'air_lines',
    label: 'Líneas de aire del semirremolque (conexiones)',
    order: 18,
  },
];

const ITEMS_SEMIRREMOLQUE = [
  {
    category: 'tires',
    label: 'Neumáticos (presión y desgaste en todos los ejes)',
    order: 1,
  },
  { category: 'lights', label: 'Luces de posición, freno y giro', order: 2 },
  {
    category: 'coupling',
    label: 'Sistema de acople al tractocamión',
    order: 3,
  },
  {
    category: 'cargo',
    label: 'Carga asegurada (amarres, lonas, precintos)',
    order: 4,
  },
  {
    category: 'brakes',
    label: 'Frenos de aire (conexión y presión)',
    order: 5,
  },
  {
    category: 'landing_gear',
    label: 'Patas de apoyo (posición transporte)',
    order: 6,
  },
  {
    category: 'documents',
    label: 'Documentos del remolque (tarjeta de tránsito)',
    order: 7,
  },
];

const ITEMS_MOTOCICLETA = [
  {
    category: 'lights',
    label: 'Luces (delantera, trasera e indicadores)',
    order: 1,
  },
  { category: 'brakes', label: 'Frenos (delantero y trasero)', order: 2 },
  { category: 'tires', label: 'Neumáticos (presión y desgaste)', order: 3 },
  {
    category: 'chain',
    label: 'Cadena / correa (tensión y lubricación)',
    order: 4,
  },
  { category: 'helmet', label: 'Casco disponible y en buen estado', order: 5 },
  {
    category: 'documents',
    label: 'Documentos (SOAT, licencia de tránsito)',
    order: 6,
  },
  { category: 'mirrors', label: 'Espejos retrovisores', order: 7 },
];

const ITEMS_MAQUINARIA = [
  { category: 'lights', label: 'Luces de operación y seguridad', order: 1 },
  {
    category: 'hydraulic',
    label: 'Sistema hidráulico (fugas y presión)',
    order: 2,
  },
  { category: 'rops', label: 'Estructura ROPS/FOPS (integridad)', order: 3 },
  {
    category: 'reverse_alarm',
    label: 'Alarma de retroceso funcional',
    order: 4,
  },
  {
    category: 'controls',
    label: 'Controles de operación (palancas y pedales)',
    order: 5,
  },
  {
    category: 'extinguisher',
    label: 'Extintor (cargado y accesible)',
    order: 6,
  },
  {
    category: 'fluid_levels',
    label: 'Niveles de fluidos (aceite, hidráulico, refrigerante)',
    order: 7,
  },
  {
    category: 'tires_tracks',
    label: 'Neumáticos / orugas (estado general)',
    order: 8,
  },
];

const ITEMS_EMERGENCIA = [
  ...ITEMS_LIVIANO,
  { category: 'siren', label: 'Sirena y luces de emergencia', order: 9 },
  { category: 'first_aid', label: 'Botiquín y equipamiento médico', order: 10 },
  { category: 'communication', label: 'Radio de comunicación', order: 11 },
];

// Mapa: nombre del VehicleType → { templateName, items }
const TEMPLATE_MAP: Record<
  string,
  { templateName: string; items: typeof ITEMS_LIVIANO }
> = {
  Automóvil: {
    templateName: 'Pre-operacional Automóvil',
    items: ITEMS_LIVIANO,
  },
  Camioneta: {
    templateName: 'Pre-operacional Camioneta / Pickup',
    items: ITEMS_LIVIANO,
  },
  Campero: {
    templateName: 'Pre-operacional Campero / SUV',
    items: ITEMS_LIVIANO,
  },
  Furgón: { templateName: 'Pre-operacional Furgón', items: ITEMS_LIVIANO },
  Microbús: {
    templateName: 'Pre-operacional Microbús',
    items: ITEMS_PASAJEROS_MEDIANO,
  },
  Buseta: {
    templateName: 'Pre-operacional Buseta',
    items: ITEMS_PASAJEROS_MEDIANO,
  },
  Bus: { templateName: 'Pre-operacional Bus', items: ITEMS_BUS },
  'Camión Mediano': {
    templateName: 'Pre-operacional Camión Mediano',
    items: ITEMS_CAMION_MEDIANO,
  },
  'Camión Pesado': {
    templateName: 'Pre-operacional Camión Pesado',
    items: ITEMS_CAMION_PESADO,
  },
  Volqueta: { templateName: 'Pre-operacional Volqueta', items: ITEMS_VOLQUETA },
  Tractocamión: {
    templateName: 'Pre-operacional Tractocamión',
    items: ITEMS_TRACTOCAMION,
  },
  Semirremolque: {
    templateName: 'Pre-operacional Semirremolque',
    items: ITEMS_SEMIRREMOLQUE,
  },
  Motocicleta: {
    templateName: 'Pre-operacional Motocicleta',
    items: ITEMS_MOTOCICLETA,
  },
  Cuatrimoto: {
    templateName: 'Pre-operacional Cuatrimoto',
    items: ITEMS_MOTOCICLETA,
  },
  'Maquinaria Agrícola': {
    templateName: 'Pre-operacional Maquinaria Agrícola',
    items: ITEMS_MAQUINARIA,
  },
  'Maquinaria Industrial': {
    templateName: 'Pre-operacional Maquinaria Industrial',
    items: ITEMS_MAQUINARIA,
  },
  'Vehículo de Emergencia': {
    templateName: 'Pre-operacional Vehículo de Emergencia',
    items: ITEMS_EMERGENCIA,
  },
};

const GLOBAL_VEHICLE_TYPES = Object.keys(TEMPLATE_MAP);

export async function seedChecklistTemplates(
  prisma: PrismaClient
): Promise<void> {
  console.log(
    '\n   [HSEQ] Seeding VehicleTypes globales y ChecklistTemplates...'
  );

  for (const typeName of GLOBAL_VEHICLE_TYPES) {
    // findOrCreate VehicleType global (null no soportado en upsert unique compuesto)
    let vehicleType = await prisma.vehicleType.findFirst({
      where: { name: typeName, tenantId: null, isGlobal: true },
    });
    if (!vehicleType) {
      vehicleType = await prisma.vehicleType.create({
        data: { name: typeName, isGlobal: true, tenantId: null },
      });
    }

    const config = TEMPLATE_MAP[typeName];

    // Buscar si ya existe un template global para este vehicleType
    const existing = await prisma.checklistTemplate.findFirst({
      where: { vehicleTypeId: vehicleType.id, isGlobal: true, tenantId: null },
    });

    if (existing) {
      console.log(
        `   [HSEQ]   ↳ Template ya existe para ${typeName}, omitiendo.`
      );
      continue;
    }

    await prisma.checklistTemplate.create({
      data: {
        tenantId: null,
        isGlobal: true,
        name: config.templateName,
        vehicleTypeId: vehicleType.id,
        countryCode: 'CO',
        isActive: true,
        items: {
          create: config.items.map(item => ({
            category: item.category,
            label: item.label,
            isRequired: true,
            order: item.order,
          })),
        },
      },
    });

    console.log(
      `   [HSEQ]   ✓ ${config.templateName} (${config.items.length} ítems)`
    );
  }

  console.log('   [HSEQ] ChecklistTemplates globales completados.\n');
}
