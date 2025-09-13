import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed extendido...');

  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'mvp-default' },
    update: {},
    create: {
      id: 'mvp-default-tenant',
      name: 'Fleet Care MVP',
      slug: 'mvp-default',
      billingEmail: 'admin@fleetcare.com',
      subscriptionStatus: 'TRIAL',
    },
  });

  // TIPOS
  await prisma.vehicleType.createMany({
    data: [
      { tenantId: defaultTenant.id, name: 'Pickup' },
      { tenantId: defaultTenant.id, name: 'Automóvil' },
      { tenantId: defaultTenant.id, name: 'Camioneta' },
      { tenantId: defaultTenant.id, name: 'Van' },
    ],
    skipDuplicates: true,
  });

  // MARCAS
  const toyota = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Toyota' } },
    update: {},
    create: { tenantId: defaultTenant.id, name: 'Toyota' },
  });

  const chevrolet = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Chevrolet' } },
    update: {},
    create: { tenantId: defaultTenant.id, name: 'Chevrolet' },
  });

  const ford = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Ford' } },
    update: {},
    create: { tenantId: defaultTenant.id, name: 'Ford' },
  });

  const nissan = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Nissan' } },
    update: {},
    create: { tenantId: defaultTenant.id, name: 'Nissan' },
  });

  const audi = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Audi' } },
    update: {},
    create: { tenantId: defaultTenant.id, name: 'Audi' },
  });

  const volvo = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Volvo' } },
    update: {},
    create: { tenantId: defaultTenant.id, name: 'Volvo' },
  });

  const dongfeng = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Dongfeng' } },
    update: {},
    create: { tenantId: defaultTenant.id, name: 'Dongfeng' },
  });

  const renault = await prisma.vehicleBrand.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Renault' } },
    update: {},
    create: { tenantId: defaultTenant.id, name: 'Renault' },
  });

  // LÍNEAS TOYOTA
  const hilux = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: toyota.id,
        name: 'Hilux',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: toyota.id, name: 'Hilux' },
  });

  const corolla = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: toyota.id,
        name: 'Corolla',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: toyota.id, name: 'Corolla' },
  });

  const prado = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: toyota.id,
        name: 'Prado',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: toyota.id, name: 'Prado' },
  });

  // LÍNEAS CHEVROLET
  const dmax = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: chevrolet.id,
        name: 'D-Max',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      brandId: chevrolet.id,
      name: 'D-Max',
    },
  });

  const colorado = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: chevrolet.id,
        name: 'Colorado',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      brandId: chevrolet.id,
      name: 'Colorado',
    },
  });

  const cruze = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: chevrolet.id,
        name: 'Cruze',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      brandId: chevrolet.id,
      name: 'Cruze',
    },
  });

  const trax = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: chevrolet.id,
        name: 'Trax',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: chevrolet.id, name: 'Trax' },
  });

  // LÍNEAS FORD
  const ranger = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: ford.id,
        name: 'Ranger',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: ford.id, name: 'Ranger' },
  });

  const f150 = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: ford.id,
        name: 'F-150',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: ford.id, name: 'F-150' },
  });

  const focus = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: ford.id,
        name: 'Focus',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: ford.id, name: 'Focus' },
  });

  const explorer = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: ford.id,
        name: 'Explorer',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: ford.id, name: 'Explorer' },
  });

  // LÍNEAS NISSAN
  const frontier = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: nissan.id,
        name: 'Frontier',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      brandId: nissan.id,
      name: 'Frontier',
    },
  });

  const sentra = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: nissan.id,
        name: 'Sentra',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: nissan.id, name: 'Sentra' },
  });

  const xtrail = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: nissan.id,
        name: 'X-Trail',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: nissan.id, name: 'X-Trail' },
  });

  // LÍNEAS AUDI
  const quattro = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: audi.id,
        name: 'Quattro',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: audi.id, name: 'Quattro' },
  });

  // LÍNEAS VOLVO
  const c40 = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: volvo.id,
        name: 'C40',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: volvo.id, name: 'C40' },
  });

  const xc60 = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: volvo.id,
        name: 'XC60',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: volvo.id, name: 'XC60' },
  });

  // LÍNEAS DONGFENG
  const rich6 = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: dongfeng.id,
        name: 'Rich6',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: dongfeng.id, name: 'Rich6' },
  });

  // LÍNEAS RENAULT
  const oroch = await prisma.vehicleLine.upsert({
    where: {
      tenantId_brandId_name: {
        tenantId: defaultTenant.id,
        brandId: renault.id,
        name: 'Oroch',
      },
    },
    update: {},
    create: { tenantId: defaultTenant.id, brandId: renault.id, name: 'Oroch' },
  });

  console.log('✅ Marcas y líneas creadas');

  // CATEGORÍAS
  const motorCategory = await prisma.mantCategory.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Motor' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Motor',
      description: 'Mantenimiento del sistema motor',
    },
  });

  const frenosCategory = await prisma.mantCategory.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Frenos' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Frenos',
      description: 'Sistema de frenado',
    },
  });

  const filtrosCategory = await prisma.mantCategory.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Filtros' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Filtros',
      description: 'Filtros del vehículo',
    },
  });

  const suspensionCategory = await prisma.mantCategory.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'Suspensión' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Suspensión',
      description: 'Sistema de suspensión',
    },
  });

  const neumaticosCategory = await prisma.mantCategory.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'Neumáticos' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Neumáticos',
      description: 'Neumáticos y rines',
    },
  });

  const fluidosCategory = await prisma.mantCategory.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Fluidos' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Fluidos',
      description: 'Aceites y líquidos',
    },
  });

  console.log('✅ Categorías creadas');

  // ITEMS DE MANTENIMIENTO
  const aceiteItem = await prisma.mantItem.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Cambio de Aceite Motor',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Cambio de Aceite Motor',
      description: 'Cambio de aceite y filtro de aceite',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.5,
      categoryId: motorCategory.id,
    },
  });

  const bujias = await prisma.mantItem.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'Cambio de Bujías' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Cambio de Bujías',
      description: 'Reemplazo de bujías de encendido',
      mantType: 'PREVENTIVE',
      estimatedTime: 2.0,
      categoryId: motorCategory.id,
    },
  });

  const pastillasItem = await prisma.mantItem.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Cambio de Pastillas de Freno',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Cambio de Pastillas de Freno',
      description: 'Reemplazo de pastillas de freno',
      mantType: 'PREVENTIVE',
      estimatedTime: 2.5,
      categoryId: frenosCategory.id,
    },
  });

  const purgadoFreno = await prisma.mantItem.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'Purgado de Frenos' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Purgado de Frenos',
      description: 'Cambio de líquido de frenos',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.0,
      categoryId: frenosCategory.id,
    },
  });

  const filtroAireItem = await prisma.mantItem.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Cambio Filtro de Aire',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Cambio Filtro de Aire',
      description: 'Reemplazo del filtro de aire',
      mantType: 'PREVENTIVE',
      estimatedTime: 0.5,
      categoryId: filtrosCategory.id,
    },
  });

  const filtroCombustible = await prisma.mantItem.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Cambio Filtro de Combustible',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Cambio Filtro de Combustible',
      description: 'Reemplazo del filtro de combustible',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.0,
      categoryId: filtrosCategory.id,
    },
  });

  const amortiguadores = await prisma.mantItem.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Cambio de Amortiguadores',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Cambio de Amortiguadores',
      description: 'Reemplazo de amortiguadores',
      mantType: 'PREVENTIVE',
      estimatedTime: 4.0,
      categoryId: suspensionCategory.id,
    },
  });

  const alineacion = await prisma.mantItem.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Alineación y Balanceo',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Alineación y Balanceo',
      description: 'Alineación de dirección y balanceo',
      mantType: 'PREVENTIVE',
      estimatedTime: 2.0,
      categoryId: suspensionCategory.id,
    },
  });

  const rotacionNeumaticos = await prisma.mantItem.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Rotación de Neumáticos',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Rotación de Neumáticos',
      description: 'Rotación de neumáticos por desgaste',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.0,
      categoryId: neumaticosCategory.id,
    },
  });

  await prisma.mantItem.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Cambio de Neumáticos',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Cambio de Neumáticos',
      description: 'Reemplazo de neumáticos',
      mantType: 'PREVENTIVE',
      estimatedTime: 2.0,
      categoryId: neumaticosCategory.id,
    },
  });

  const refrigerante = await prisma.mantItem.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Cambio Líquido Refrigerante',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Cambio Líquido Refrigerante',
      description: 'Cambio del sistema de refrigeración',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.5,
      categoryId: fluidosCategory.id,
    },
  });

  console.log('✅ Items de mantenimiento creados');

  // TÉCNICOS
  const tecnico1 = await prisma.technician.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'Carlos Rodríguez' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Carlos Rodríguez',
      email: 'carlos@email.com',
      phone: '3001234567',
      specialty: 'Motor y Transmisión',
    },
  });

  const tecnico2 = await prisma.technician.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'María González' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'María González',
      email: 'maria@email.com',
      phone: '3007654321',
      specialty: 'Sistema Eléctrico',
    },
  });

  const tecnico3 = await prisma.technician.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'Luis Martínez' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Luis Martínez',
      email: 'luis@email.com',
      phone: '3009876543',
      specialty: 'Frenos y Suspensión',
    },
  });

  const tecnico4 = await prisma.technician.upsert({
    where: { tenantId_name: { tenantId: defaultTenant.id, name: 'Ana López' } },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Ana López',
      email: 'ana@email.com',
      phone: '3005432109',
      specialty: 'Carrocería y Pintura',
    },
  });

  console.log('✅ Técnicos creados');

  // PROVEEDORES
  const proveedor1 = await prisma.provider.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'Taller Central' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Taller Central',
      email: 'taller@central.com',
      phone: '6015551234',
      address: 'Calle 123 #45-67',
      specialty: 'Mantenimiento General',
    },
  });

  const proveedor2 = await prisma.provider.upsert({
    where: {
      tenantId_name: {
        tenantId: defaultTenant.id,
        name: 'Frenos Especialistas',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'Frenos Especialistas',
      email: 'frenos@esp.com',
      phone: '6015555678',
      address: 'Carrera 80 #12-34',
      specialty: 'Sistema de Frenos',
    },
  });

  console.log('✅ Proveedores creados');

  // OBTENER TIPOS
  const types = await prisma.vehicleType.findMany({
    where: { tenantId: defaultTenant.id },
  });
  const pickupType = types.find(t => t.name === 'Pickup')!;
  const autoType = types.find(t => t.name === 'Automóvil')!;
  const camionetaType = types.find(t => t.name === 'Camioneta')!;

  // VEHÍCULOS CON IMÁGENES REALES
  const vehicleData = [
    // PICKUPS
    {
      licensePlate: 'ABC-123',
      brand: toyota,
      line: hilux,
      type: pickupType,
      year: 2022,
      color: 'Blanco',
      mileage: 15000,
      photo: '/images/hilux.jpg',
    },
    {
      licensePlate: 'DEF-456',
      brand: chevrolet,
      line: dmax,
      type: pickupType,
      year: 2021,
      color: 'Gris',
      mileage: 25000,
      photo: '/images/chevrolet_dmax.jpg',
    },
    {
      licensePlate: 'GHI-789',
      brand: ford,
      line: ranger,
      type: pickupType,
      year: 2023,
      color: 'Azul',
      mileage: 8000,
      photo: '/images/ford_ranger.jpg',
    },
    {
      licensePlate: 'JKL-012',
      brand: nissan,
      line: frontier,
      type: pickupType,
      year: 2020,
      color: 'Rojo',
      mileage: 45000,
      photo: '/images/nissan_frontier_pagina_web.jpg',
    },
    {
      licensePlate: 'MNO-345',
      brand: chevrolet,
      line: colorado,
      type: pickupType,
      year: 2022,
      color: 'Negro',
      mileage: 18000,
      photo: '/images/chevrolet_colorado.jpg',
    },
    {
      licensePlate: 'PQR-678',
      brand: dongfeng,
      line: rich6,
      type: pickupType,
      year: 2023,
      color: 'Plata',
      mileage: 5000,
      photo: '/images/dongfeng_rich6.jpg',
    },
    {
      licensePlate: 'STU-901',
      brand: renault,
      line: oroch,
      type: pickupType,
      year: 2021,
      color: 'Blanco',
      mileage: 32000,
      photo: '/images/oroch.jpg',
    },
    {
      licensePlate: 'DAS-144',
      brand: ford,
      line: f150,
      type: pickupType,
      year: 2022,
      color: 'Azul',
      mileage: 19000,
      photo: '/images/DAS-144.jpg',
    },
    {
      licensePlate: 'DAS-157',
      brand: chevrolet,
      line: dmax,
      type: pickupType,
      year: 2021,
      color: 'Blanco',
      mileage: 41000,
      photo: '/images/DAS-157.jpg',
    },
    {
      licensePlate: 'DAR-974',
      brand: toyota,
      line: hilux,
      type: pickupType,
      year: 2020,
      color: 'Rojo',
      mileage: 52000,
      photo: '/images/DAR-974.jpg',
    },

    // AUTOMÓVILES
    {
      licensePlate: 'VWX-234',
      brand: audi,
      line: quattro,
      type: autoType,
      year: 2023,
      color: 'Negro',
      mileage: 12000,
      photo: '/images/audi_quattro.jpeg',
    },
    {
      licensePlate: 'YZA-567',
      brand: volvo,
      line: c40,
      type: autoType,
      year: 2024,
      color: 'Blanco',
      mileage: 3000,
      photo: '/images/volvo_c40_white.jpg',
    },
    {
      licensePlate: 'QRS-345',
      brand: toyota,
      line: corolla,
      type: autoType,
      year: 2023,
      color: 'Plata',
      mileage: 4000,
      photo: '/images/hilux.jpg',
    },
    {
      licensePlate: 'TUV-678',
      brand: chevrolet,
      line: cruze,
      type: autoType,
      year: 2022,
      color: 'Negro',
      mileage: 16000,
      photo: '/images/chevrolet_cyz.jpg',
    },
    {
      licensePlate: 'WXY-901',
      brand: ford,
      line: focus,
      type: autoType,
      year: 2021,
      color: 'Azul',
      mileage: 29000,
      photo: '/images/ford_ranger.jpg',
    },
    {
      licensePlate: 'ZAB-234',
      brand: nissan,
      line: sentra,
      type: autoType,
      year: 2023,
      color: 'Blanco',
      mileage: 6500,
      photo: '/images/nissan_frontier_pagina_web.jpg',
    },

    // CAMIONETAS
    {
      licensePlate: 'BCD-890',
      brand: toyota,
      line: prado,
      type: camionetaType,
      year: 2022,
      color: 'Gris Oscuro',
      mileage: 28000,
      photo: '/images/hilux.jpg',
    },
    {
      licensePlate: 'EFG-123',
      brand: chevrolet,
      line: trax,
      type: camionetaType,
      year: 2023,
      color: 'Rojo',
      mileage: 9000,
      photo: '/images/chevrolet_cyz.jpg',
    },
    {
      licensePlate: 'HIJ-456',
      brand: ford,
      line: explorer,
      type: camionetaType,
      year: 2021,
      color: 'Azul Marino',
      mileage: 35000,
      photo: '/images/ford_ranger_pagina_web.jpg',
    },
    {
      licensePlate: 'KLM-789',
      brand: nissan,
      line: xtrail,
      type: camionetaType,
      year: 2022,
      color: 'Blanco Perla',
      mileage: 22000,
      photo: '/images/nissan_frontier_pagina_web_1.jpg',
    },
    {
      licensePlate: 'DAS-141',
      brand: volvo,
      line: xc60,
      type: camionetaType,
      year: 2023,
      color: 'Negro',
      mileage: 11000,
      photo: '/images/DAS-141.jpg',
    },
  ];

  for (const vData of vehicleData) {
    await prisma.vehicle.upsert({
      where: {
        tenantId_licensePlate: {
          tenantId: defaultTenant.id,
          licensePlate: vData.licensePlate,
        },
      },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        licensePlate: vData.licensePlate,
        brandId: vData.brand.id,
        lineId: vData.line.id,
        typeId: vData.type.id,
        year: vData.year,
        color: vData.color,
        mileage: vData.mileage,
        photo: vData.photo,
        status: 'ACTIVE',
        situation: 'AVAILABLE',
      },
    });
  }

  console.log('✅ 21 Vehículos creados con imágenes');

  // CREAR PLANES DE MANTENIMIENTO
  const plans = [
    {
      brand: toyota,
      line: hilux,
      name: 'Plan Completo Toyota Hilux',
      description: 'Plan completo para Toyota Hilux',
      items: [
        { item: aceiteItem, triggerKm: 5000 },
        { item: bujias, triggerKm: 20000 },
        { item: pastillasItem, triggerKm: 25000 },
        { item: filtroAireItem, triggerKm: 10000 },
        { item: filtroCombustible, triggerKm: 15000 },
        { item: rotacionNeumaticos, triggerKm: 8000 },
        { item: purgadoFreno, triggerKm: 20000 },
        { item: alineacion, triggerKm: 15000 },
      ],
    },
    {
      brand: chevrolet,
      line: dmax,
      name: 'Plan Básico Chevrolet D-Max',
      description: 'Plan básico para Chevrolet D-Max',
      items: [
        { item: aceiteItem, triggerKm: 5000 },
        { item: pastillasItem, triggerKm: 30000 },
        { item: filtroAireItem, triggerKm: 15000 },
        { item: rotacionNeumaticos, triggerKm: 10000 },
        { item: purgadoFreno, triggerKm: 25000 },
      ],
    },
    {
      brand: ford,
      line: ranger,
      name: 'Plan Premium Ford Ranger',
      description: 'Plan premium para Ford Ranger',
      items: [
        { item: aceiteItem, triggerKm: 5000 },
        { item: bujias, triggerKm: 25000 },
        { item: pastillasItem, triggerKm: 20000 },
        { item: filtroAireItem, triggerKm: 12000 },
        { item: amortiguadores, triggerKm: 80000 },
        { item: rotacionNeumaticos, triggerKm: 8000 },
        { item: refrigerante, triggerKm: 60000 },
      ],
    },
    {
      brand: toyota,
      line: corolla,
      name: 'Plan Básico Toyota Corolla',
      description: 'Plan básico para Toyota Corolla',
      items: [
        { item: aceiteItem, triggerKm: 10000 },
        { item: pastillasItem, triggerKm: 30000 },
        { item: filtroAireItem, triggerKm: 20000 },
        { item: rotacionNeumaticos, triggerKm: 12000 },
      ],
    },
    {
      brand: nissan,
      line: frontier,
      name: 'Plan Completo Nissan Frontier',
      description: 'Plan completo para Nissan Frontier',
      items: [
        { item: aceiteItem, triggerKm: 5000 },
        { item: bujias, triggerKm: 22000 },
        { item: pastillasItem, triggerKm: 28000 },
        { item: filtroAireItem, triggerKm: 12000 },
        { item: filtroCombustible, triggerKm: 18000 },
        { item: rotacionNeumaticos, triggerKm: 9000 },
        { item: alineacion, triggerKm: 18000 },
      ],
    },
  ];

  const createdPlans = [];
  for (const planData of plans) {
    const plan = await prisma.mantPlan.upsert({
      where: {
        tenantId_vehicleBrandId_vehicleLineId_name: {
          tenantId: defaultTenant.id,
          vehicleBrandId: planData.brand.id,
          vehicleLineId: planData.line.id,
          name: planData.name,
        },
      },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        name: planData.name,
        description: planData.description,
        vehicleBrandId: planData.brand.id,
        vehicleLineId: planData.line.id,
      },
    });

    for (const taskData of planData.items) {
      await prisma.planTask.upsert({
        where: {
          planId_mantItemId: { planId: plan.id, mantItemId: taskData.item.id },
        },
        update: {},
        create: {
          planId: plan.id,
          mantItemId: taskData.item.id,
          triggerKm: taskData.triggerKm,
        },
      });
    }

    createdPlans.push(plan);
  }

  console.log('✅ Planes de mantenimiento creados');

  // ASIGNAR PLANES A VEHÍCULOS Y CREAR ITEMS
  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId: defaultTenant.id },
    include: { brand: true, line: true },
  });

  const technicians = [tecnico1, tecnico2, tecnico3, tecnico4];
  const providers = [proveedor1, proveedor2];

  for (const vehicle of vehicles) {
    // Encontrar plan compatible
    const compatiblePlan = createdPlans.find(
      plan =>
        plan.vehicleBrandId === vehicle.brandId &&
        plan.vehicleLineId === vehicle.lineId
    );

    if (compatiblePlan) {
      const vehiclePlan = await prisma.vehicleMantPlan.upsert({
        where: {
          vehicleId_mantPlanId: {
            vehicleId: vehicle.id,
            mantPlanId: compatiblePlan.id,
          },
        },
        update: {},
        create: {
          tenantId: defaultTenant.id,
          vehicleId: vehicle.id,
          mantPlanId: compatiblePlan.id,
          assignedAt: new Date(),
          lastKmCheck: vehicle.mileage,
        },
      });

      const planTasks = await prisma.planTask.findMany({
        where: { planId: compatiblePlan.id },
      });

      for (const task of planTasks) {
        const currentKm = vehicle.mileage;
        const triggerKm = task.triggerKm;
        const cycles = Math.floor(currentKm / triggerKm);

        // Crear items con diferentes estados
        for (let cycle = cycles; cycle <= cycles + 3; cycle++) {
          const executionMileage = (cycle + 1) * triggerKm;

          let status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' = 'PENDING';
          let startDate = null;
          let endDate = null;
          let technicianId = null;
          let providerId = null;
          let cost = null;

          if (executionMileage <= currentKm) {
            const random = Math.random();
            if (random < 0.7) {
              status = 'COMPLETED';
              startDate = new Date(
                Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
              );
              endDate = new Date(
                startDate.getTime() + Math.random() * 8 * 60 * 60 * 1000
              );
              cost = Math.floor(Math.random() * 400000 + 80000);
            } else if (random < 0.9) {
              status = 'IN_PROGRESS';
              startDate = new Date(
                Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
              );
            }

            if (Math.random() > 0.3 && technicians.length > 0) {
              technicianId =
                technicians[Math.floor(Math.random() * technicians.length)]
                  ?.id || null;
            }
            if (Math.random() > 0.5 && providers.length > 0) {
              providerId =
                providers[Math.floor(Math.random() * providers.length)]?.id ||
                null;
            }
          }

          try {
            await prisma.vehicleMantPlanItem.create({
              data: {
                vehicleMantPlanId: vehiclePlan.id,
                mantItemId: task.mantItemId,
                executionMileage:
                  executionMileage + Math.floor(Math.random() * 50), // Pequeña variación
                status,
                startDate,
                endDate,
                technicianId,
                providerId,
                cost,
              },
            });
          } catch (error) {
            // Ignorar duplicados
          }
        }
      }
    }
  }

  console.log('✅ Items de mantenimiento asignados a vehículos');

  console.log('🎉 Seed extendido completado exitosamente!');
  console.log('📊 Datos creados:');
  console.log('   - 21 vehículos con imágenes reales');
  console.log('   - 6 categorías de mantenimiento');
  console.log('   - 12 items de mantenimiento');
  console.log('   - 4 técnicos especializados');
  console.log('   - 2 proveedores');
  console.log('   - 5 planes de mantenimiento');
  console.log(
    '   - Cientos de items con diferentes estados (PENDING, IN_PROGRESS, COMPLETED)'
  );
  console.log('   - Asignaciones de técnicos y proveedores');
  console.log('   - Costos y fechas realistas');
}

main()
  .catch(e => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
