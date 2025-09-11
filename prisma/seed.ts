import { PrismaClient, MantType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed completo de la base de datos...');

  // 1. TENANT POR DEFECTO
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

  console.log('✅ Tenant por defecto creado:', defaultTenant.name);

  // 2. TIPOS DE VEHÍCULOS
  const vehicleTypes = [
    { name: 'Camión' },
    { name: 'Camioneta' },
    { name: 'Automóvil' },
    { name: 'Motocicleta' },
    { name: 'Maquinaria Pesada' },
    { name: 'Van' },
    { name: 'Pickup' },
  ];

  await prisma.vehicleType.createMany({
    data: vehicleTypes.map(type => ({
      tenantId: defaultTenant.id,
      name: type.name,
    })),
    skipDuplicates: true,
  });

  console.log('✅ Tipos de vehículos creados');

  // 3. MARCAS Y LÍNEAS DE VEHÍCULOS
  const brandsAndLines = [
    {
      name: 'Toyota',
      lines: ['Hilux', 'Corolla', 'Camry', 'Prado', 'Land Cruiser', 'Prius'],
    },
    {
      name: 'Chevrolet',
      lines: ['D-Max', 'Colorado', 'Cruze', 'Spark', 'Trax', 'Tracker'],
    },
    {
      name: 'Ford',
      lines: ['Ranger', 'F-150', 'Focus', 'Fiesta', 'Explorer', 'Mustang'],
    },
    {
      name: 'Nissan',
      lines: ['Frontier', 'Sentra', 'Altima', 'X-Trail', 'Pathfinder', 'Versa'],
    },
    {
      name: 'Mazda',
      lines: ['BT-50', 'Mazda3', 'Mazda6', 'CX-5', 'CX-9', 'MX-5'],
    },
    {
      name: 'Audi',
      lines: ['Quattro', 'A3', 'A4', 'A6', 'Q5', 'Q7'],
    },
    {
      name: 'Volvo',
      lines: ['C40', 'XC40', 'XC60', 'XC90', 'S60', 'V60'],
    },
    {
      name: 'Dongfeng',
      lines: ['Rich6', 'T5', 'T7', 'AX7', 'DFM'],
    },
    {
      name: 'Renault',
      lines: ['Oroch', 'Duster', 'Sandero', 'Logan', 'Captur'],
    },
  ];

  for (const brandData of brandsAndLines) {
    const brand = await prisma.vehicleBrand.upsert({
      where: {
        tenantId_name: { tenantId: defaultTenant.id, name: brandData.name },
      },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        name: brandData.name,
      },
    });

    for (const lineName of brandData.lines) {
      await prisma.vehicleLine.upsert({
        where: {
          tenantId_brandId_name: {
            tenantId: defaultTenant.id,
            brandId: brand.id,
            name: lineName,
          },
        },
        update: {},
        create: {
          tenantId: defaultTenant.id,
          brandId: brand.id,
          name: lineName,
        },
      });
    }
  }

  console.log('✅ Marcas y líneas de vehículos creadas');

  // 4. CATEGORÍAS DE MANTENIMIENTO
  const mantCategories = [
    { name: 'Motor', description: 'Mantenimiento del sistema motor' },
    { name: 'Frenos', description: 'Sistema de frenado' },
    {
      name: 'Suspensión',
      description: 'Sistema de suspensión y amortiguadores',
    },
    { name: 'Transmisión', description: 'Caja de cambios y transmisión' },
    { name: 'Eléctrico', description: 'Sistema eléctrico y electrónico' },
    { name: 'Neumáticos', description: 'Neumáticos y rines' },
    { name: 'Filtros', description: 'Filtros de aire, aceite y combustible' },
    { name: 'Fluidos', description: 'Aceites y líquidos' },
    { name: 'Correas', description: 'Correas y cadenas' },
    { name: 'Carrocería', description: 'Mantenimiento de carrocería' },
  ];

  for (const category of mantCategories) {
    await prisma.mantCategory.upsert({
      where: {
        tenantId_name: { tenantId: defaultTenant.id, name: category.name },
      },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        name: category.name,
        description: category.description,
      },
    });
  }

  console.log('✅ Categorías de mantenimiento creadas');

  // 5. ITEMS DE MANTENIMIENTO
  const categories = await prisma.mantCategory.findMany({
    where: { tenantId: defaultTenant.id },
  });

  const categoryMap = Object.fromEntries(categories.map(c => [c.name, c.id]));

  const mantItemsData = [
    // Motor
    {
      name: 'Cambio de Aceite Motor',
      description: 'Cambio de aceite y filtro de aceite',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.5,
      category: 'Motor',
    },
    {
      name: 'Cambio de Bujías',
      description: 'Reemplazo de bujías de encendido',
      mantType: 'PREVENTIVE',
      estimatedTime: 2.0,
      category: 'Motor',
    },
    {
      name: 'Ajuste de Motor',
      description: 'Ajuste general del motor',
      mantType: 'PREVENTIVE',
      estimatedTime: 3.0,
      category: 'Motor',
    },
    {
      name: 'Reparación de Motor',
      description: 'Reparación mayor de motor',
      mantType: 'CORRECTIVE',
      estimatedTime: 16.0,
      category: 'Motor',
    },

    // Frenos
    {
      name: 'Cambio de Pastillas de Freno',
      description: 'Reemplazo de pastillas de freno delanteras',
      mantType: 'PREVENTIVE',
      estimatedTime: 2.5,
      category: 'Frenos',
    },
    {
      name: 'Cambio de Discos de Freno',
      description: 'Reemplazo de discos de freno',
      mantType: 'PREVENTIVE',
      estimatedTime: 3.0,
      category: 'Frenos',
    },
    {
      name: 'Purgado de Frenos',
      description: 'Cambio de líquido de frenos',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.0,
      category: 'Frenos',
    },
    {
      name: 'Ajuste de Frenos',
      description: 'Calibración del sistema de frenos',
      mantType: 'PREDICTIVE',
      estimatedTime: 1.5,
      category: 'Frenos',
    },

    // Suspensión
    {
      name: 'Cambio de Amortiguadores',
      description: 'Reemplazo de amortiguadores delanteros',
      mantType: 'PREVENTIVE',
      estimatedTime: 4.0,
      category: 'Suspensión',
    },
    {
      name: 'Cambio de Resortes',
      description: 'Reemplazo de resortes de suspensión',
      mantType: 'CORRECTIVE',
      estimatedTime: 5.0,
      category: 'Suspensión',
    },
    {
      name: 'Alineación y Balanceo',
      description: 'Alineación de dirección y balanceo',
      mantType: 'PREVENTIVE',
      estimatedTime: 2.0,
      category: 'Suspensión',
    },

    // Transmisión
    {
      name: 'Cambio de Aceite Transmisión',
      description: 'Cambio de aceite de caja de cambios',
      mantType: 'PREVENTIVE',
      estimatedTime: 2.0,
      category: 'Transmisión',
    },
    {
      name: 'Ajuste de Embrague',
      description: 'Calibración del embrague',
      mantType: 'PREDICTIVE',
      estimatedTime: 1.5,
      category: 'Transmisión',
    },
    {
      name: 'Cambio de Embrague',
      description: 'Reemplazo completo del embrague',
      mantType: 'CORRECTIVE',
      estimatedTime: 8.0,
      category: 'Transmisión',
    },

    // Eléctrico
    {
      name: 'Revisión Sistema Eléctrico',
      description: 'Diagnóstico completo del sistema eléctrico',
      mantType: 'PREDICTIVE',
      estimatedTime: 2.5,
      category: 'Eléctrico',
    },
    {
      name: 'Cambio de Batería',
      description: 'Reemplazo de batería',
      mantType: 'CORRECTIVE',
      estimatedTime: 1.0,
      category: 'Eléctrico',
    },
    {
      name: 'Cambio de Alternador',
      description: 'Reemplazo del alternador',
      mantType: 'CORRECTIVE',
      estimatedTime: 4.0,
      category: 'Eléctrico',
    },

    // Neumáticos
    {
      name: 'Rotación de Neumáticos',
      description: 'Rotación de neumáticos por desgaste',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.0,
      category: 'Neumáticos',
    },
    {
      name: 'Cambio de Neumáticos',
      description: 'Reemplazo de neumáticos',
      mantType: 'PREVENTIVE',
      estimatedTime: 2.0,
      category: 'Neumáticos',
    },
    {
      name: 'Reparación de Pinchadura',
      description: 'Reparación de neumático pinchado',
      mantType: 'EMERGENCY',
      estimatedTime: 0.5,
      category: 'Neumáticos',
    },

    // Filtros
    {
      name: 'Cambio Filtro de Aire',
      description: 'Reemplazo del filtro de aire',
      mantType: 'PREVENTIVE',
      estimatedTime: 0.5,
      category: 'Filtros',
    },
    {
      name: 'Cambio Filtro de Combustible',
      description: 'Reemplazo del filtro de combustible',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.0,
      category: 'Filtros',
    },
    {
      name: 'Cambio Filtro de Aceite',
      description: 'Reemplazo del filtro de aceite',
      mantType: 'PREVENTIVE',
      estimatedTime: 0.5,
      category: 'Filtros',
    },

    // Fluidos
    {
      name: 'Cambio Líquido Refrigerante',
      description: 'Cambio del sistema de refrigeración',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.5,
      category: 'Fluidos',
    },
    {
      name: 'Cambio Líquido Dirección',
      description: 'Cambio de líquido de dirección asistida',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.0,
      category: 'Fluidos',
    },
    {
      name: 'Cambio Líquido Limpiaparabrisas',
      description: 'Recarga de líquido limpiaparabrisas',
      mantType: 'PREVENTIVE',
      estimatedTime: 0.25,
      category: 'Fluidos',
    },

    // Correas
    {
      name: 'Cambio Correa Distribución',
      description: 'Reemplazo de correa de distribución',
      mantType: 'PREVENTIVE',
      estimatedTime: 6.0,
      category: 'Correas',
    },
    {
      name: 'Cambio Correa Alternador',
      description: 'Reemplazo de correa del alternador',
      mantType: 'PREVENTIVE',
      estimatedTime: 1.5,
      category: 'Correas',
    },
    {
      name: 'Ajuste de Correas',
      description: 'Tensado de correas del motor',
      mantType: 'PREDICTIVE',
      estimatedTime: 1.0,
      category: 'Correas',
    },

    // Carrocería
    {
      name: 'Lavado y Encerado',
      description: 'Lavado completo y encerado del vehículo',
      mantType: 'PREVENTIVE',
      estimatedTime: 3.0,
      category: 'Carrocería',
    },
    {
      name: 'Reparación de Rayones',
      description: 'Reparación de rayones menores',
      mantType: 'CORRECTIVE',
      estimatedTime: 2.0,
      category: 'Carrocería',
    },
    {
      name: 'Pintura Completa',
      description: 'Pintura completa del vehículo',
      mantType: 'CORRECTIVE',
      estimatedTime: 24.0,
      category: 'Carrocería',
    },
  ];

  for (const item of mantItemsData) {
    const categoryId = categoryMap[item.category];
    if (categoryId) {
      await prisma.mantItem.upsert({
        where: {
          tenantId_name: { tenantId: defaultTenant.id, name: item.name },
        },
        update: {},
        create: {
          tenantId: defaultTenant.id,
          name: item.name,
          description: item.description,
          mantType: item.mantType as MantType,
          estimatedTime: item.estimatedTime,
          categoryId,
        },
      });
    }
  }

  console.log('✅ Items de mantenimiento creados');

  // 6. TÉCNICOS Y PROVEEDORES
  const technicians = [
    {
      name: 'Carlos Rodríguez',
      email: 'carlos@email.com',
      phone: '3001234567',
      specialty: 'Motor y Transmisión',
    },
    {
      name: 'María González',
      email: 'maria@email.com',
      phone: '3007654321',
      specialty: 'Sistema Eléctrico',
    },
    {
      name: 'Luis Martínez',
      email: 'luis@email.com',
      phone: '3009876543',
      specialty: 'Frenos y Suspensión',
    },
    {
      name: 'Ana López',
      email: 'ana@email.com',
      phone: '3005432109',
      specialty: 'Carrocería y Pintura',
    },
    {
      name: 'José Pérez',
      email: 'jose@email.com',
      phone: '3002468135',
      specialty: 'Mantenimiento General',
    },
  ];

  for (const tech of technicians) {
    await prisma.technician.upsert({
      where: { tenantId_name: { tenantId: defaultTenant.id, name: tech.name } },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        name: tech.name,
        email: tech.email,
        phone: tech.phone,
        specialty: tech.specialty,
      },
    });
  }

  const providers = [
    {
      name: 'Taller Central',
      email: 'taller@central.com',
      phone: '6015551234',
      address: 'Calle 123 #45-67',
      specialty: 'Mantenimiento General',
    },
    {
      name: 'Frenos Especialistas',
      email: 'frenos@esp.com',
      phone: '6015555678',
      address: 'Carrera 80 #12-34',
      specialty: 'Sistema de Frenos',
    },
    {
      name: 'Electro Auto',
      email: 'electro@auto.com',
      phone: '6015559876',
      address: 'Avenida 68 #45-12',
      specialty: 'Sistema Eléctrico',
    },
    {
      name: 'Pintura Express',
      email: 'pintura@express.com',
      phone: '6015554321',
      address: 'Calle 85 #23-45',
      specialty: 'Pintura y Carrocería',
    },
    {
      name: 'Motor Tech',
      email: 'motor@tech.com',
      phone: '6015558765',
      address: 'Carrera 15 #78-90',
      specialty: 'Motor y Transmisión',
    },
  ];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: {
        tenantId_name: { tenantId: defaultTenant.id, name: provider.name },
      },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
        address: provider.address,
        specialty: provider.specialty,
      },
    });
  }

  console.log('✅ Técnicos y proveedores creados');

  // 7. OBTENER DATOS PARA VEHÍCULOS
  const types = await prisma.vehicleType.findMany({
    where: { tenantId: defaultTenant.id },
  });
  const brands = await prisma.vehicleBrand.findMany({
    where: { tenantId: defaultTenant.id },
    include: { lines: true },
  });

  const typeMap = Object.fromEntries(types.map(t => [t.name, t.id]));

  // 8. VEHÍCULOS CON IMÁGENES
  const vehiclesData = [
    {
      licensePlate: 'ABC-123',
      brand: 'Toyota',
      line: 'Hilux',
      type: 'Pickup',
      year: 2022,
      color: 'Blanco',
      mileage: 15000,
      photo: '/images/hilux.jpg',
    },
    {
      licensePlate: 'DEF-456',
      brand: 'Chevrolet',
      line: 'D-Max',
      type: 'Pickup',
      year: 2021,
      color: 'Gris',
      mileage: 25000,
      photo: '/images/chevrolet_dmax.jpg',
    },
    {
      licensePlate: 'GHI-789',
      brand: 'Ford',
      line: 'Ranger',
      type: 'Pickup',
      year: 2023,
      color: 'Azul',
      mileage: 8000,
      photo: '/images/ford_ranger.jpg',
    },
    {
      licensePlate: 'JKL-012',
      brand: 'Nissan',
      line: 'Frontier',
      type: 'Pickup',
      year: 2020,
      color: 'Rojo',
      mileage: 45000,
      photo: '/images/nissan_frontier_pagina_web.jpg',
    },
    {
      licensePlate: 'MNO-345',
      brand: 'Chevrolet',
      line: 'Colorado',
      type: 'Pickup',
      year: 2022,
      color: 'Negro',
      mileage: 18000,
      photo: '/images/chevrolet_colorado.jpg',
    },
    {
      licensePlate: 'PQR-678',
      brand: 'Dongfeng',
      line: 'Rich6',
      type: 'Pickup',
      year: 2023,
      color: 'Plata',
      mileage: 5000,
      photo: '/images/dongfeng_rich6.jpg',
    },
    {
      licensePlate: 'STU-901',
      brand: 'Renault',
      line: 'Oroch',
      type: 'Pickup',
      year: 2021,
      color: 'Blanco',
      mileage: 32000,
      photo: '/images/oroch.jpg',
    },
    {
      licensePlate: 'VWX-234',
      brand: 'Audi',
      line: 'Quattro',
      type: 'Automóvil',
      year: 2023,
      color: 'Negro',
      mileage: 12000,
      photo: '/images/audi_quattro.jpeg',
    },
    {
      licensePlate: 'YZA-567',
      brand: 'Volvo',
      line: 'C40',
      type: 'Automóvil',
      year: 2024,
      color: 'Blanco',
      mileage: 3000,
      photo: '/images/volvo_c40_white.jpg',
    },
    {
      licensePlate: 'BCD-890',
      brand: 'Toyota',
      line: 'Prado',
      type: 'Camioneta',
      year: 2022,
      color: 'Gris Oscuro',
      mileage: 28000,
      photo: '/images/hilux.jpg',
    },
    {
      licensePlate: 'EFG-123',
      brand: 'Chevrolet',
      line: 'Trax',
      type: 'Camioneta',
      year: 2023,
      color: 'Rojo',
      mileage: 9000,
      photo: '/images/chevrolet_cyz.jpg',
    },
    {
      licensePlate: 'HIJ-456',
      brand: 'Ford',
      line: 'Explorer',
      type: 'Camioneta',
      year: 2021,
      color: 'Azul Marino',
      mileage: 35000,
      photo: '/images/ford_ranger_pagina_web.jpg',
    },
    {
      licensePlate: 'KLM-789',
      brand: 'Nissan',
      line: 'X-Trail',
      type: 'Camioneta',
      year: 2022,
      color: 'Blanco Perla',
      mileage: 22000,
      photo: '/images/nissan_frontier_pagina_web_1.jpg',
    },
    {
      licensePlate: 'NOP-012',
      brand: 'Mazda',
      line: 'CX-5',
      type: 'Camioneta',
      year: 2023,
      color: 'Gris Metálico',
      mileage: 7000,
      photo: '/images/hilux.jpg',
    },
    {
      licensePlate: 'DAS-141',
      brand: 'Volvo',
      line: 'XC60',
      type: 'Camioneta',
      year: 2023,
      color: 'Negro',
      mileage: 11000,
      photo: '/images/DAS-141.jpg',
    },
    {
      licensePlate: 'DAS-144',
      brand: 'Ford',
      line: 'F-150',
      type: 'Pickup',
      year: 2022,
      color: 'Azul',
      mileage: 19000,
      photo: '/images/DAS-144.jpg',
    },
    {
      licensePlate: 'DAS-157',
      brand: 'Chevrolet',
      line: 'D-Max',
      type: 'Pickup',
      year: 2021,
      color: 'Blanco',
      mileage: 41000,
      photo: '/images/DAS-157.jpg',
    },
    {
      licensePlate: 'DAR-974',
      brand: 'Toyota',
      line: 'Hilux',
      type: 'Pickup',
      year: 2020,
      color: 'Rojo',
      mileage: 52000,
      photo: '/images/DAR-974.jpg',
    },
    {
      licensePlate: 'QRS-345',
      brand: 'Toyota',
      line: 'Corolla',
      type: 'Automóvil',
      year: 2023,
      color: 'Plata',
      mileage: 4000,
      photo: '/images/hilux.jpg',
    },
    {
      licensePlate: 'TUV-678',
      brand: 'Chevrolet',
      line: 'Cruze',
      type: 'Automóvil',
      year: 2022,
      color: 'Negro',
      mileage: 16000,
      photo: '/images/chevrolet_cyz.jpg',
    },
    {
      licensePlate: 'WXY-901',
      brand: 'Ford',
      line: 'Focus',
      type: 'Automóvil',
      year: 2021,
      color: 'Azul',
      mileage: 29000,
      photo: '/images/ford_ranger.jpg',
    },
    {
      licensePlate: 'ZAB-234',
      brand: 'Nissan',
      line: 'Sentra',
      type: 'Automóvil',
      year: 2023,
      color: 'Blanco',
      mileage: 6500,
      photo: '/images/nissan_frontier_pagina_web.jpg',
    },
    {
      licensePlate: 'CDE-567',
      brand: 'Mazda',
      line: 'Mazda3',
      type: 'Automóvil',
      year: 2022,
      color: 'Gris',
      mileage: 21000,
      photo: '/images/hilux.jpg',
    },
    {
      licensePlate: 'FGH-890',
      brand: 'Toyota',
      line: 'Camry',
      type: 'Automóvil',
      year: 2021,
      color: 'Negro',
      mileage: 38000,
      photo: '/images/hilux.jpg',
    },
    {
      licensePlate: 'IJK-123',
      brand: 'Chevrolet',
      line: 'Spark',
      type: 'Automóvil',
      year: 2023,
      color: 'Rojo',
      mileage: 2000,
      photo: '/images/chevrolet_cyz.jpg',
    },
  ];

  for (const vehicleData of vehiclesData) {
    const brand = brands.find(b => b.name === vehicleData.brand);
    const line = brand?.lines.find(l => l.name === vehicleData.line);
    const typeId = typeMap[vehicleData.type];

    if (brand && line && typeId) {
      await prisma.vehicle.upsert({
        where: {
          tenantId_licensePlate: {
            tenantId: defaultTenant.id,
            licensePlate: vehicleData.licensePlate,
          },
        },
        update: {},
        create: {
          tenantId: defaultTenant.id,
          licensePlate: vehicleData.licensePlate,
          brandId: brand.id,
          lineId: line.id,
          typeId,
          year: vehicleData.year,
          color: vehicleData.color,
          mileage: vehicleData.mileage,
          photo: vehicleData.photo,
          status: 'ACTIVE',
          situation: 'AVAILABLE',
        },
      });
    }
  }

  console.log('✅ Vehículos creados con imágenes');

  // 9. PLANES DE MANTENIMIENTO
  const mantItems = await prisma.mantItem.findMany({
    where: { tenantId: defaultTenant.id },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId: defaultTenant.id },
    include: { brand: true, line: true },
  });

  // Crear planes específicos por marca/línea
  const planTemplates = [
    {
      name: 'Plan Básico Pickup',
      description: 'Plan de mantenimiento básico para vehículos pickup',
      items: [
        { name: 'Cambio de Aceite Motor', triggerKm: 5000 },
        { name: 'Cambio Filtro de Aire', triggerKm: 15000 },
        { name: 'Cambio Filtro de Combustible', triggerKm: 20000 },
        { name: 'Rotación de Neumáticos', triggerKm: 10000 },
        { name: 'Revisión Sistema Eléctrico', triggerKm: 25000 },
        { name: 'Purgado de Frenos', triggerKm: 30000 },
      ],
    },
    {
      name: 'Plan Completo Pickup',
      description: 'Plan de mantenimiento completo para vehículos pickup',
      items: [
        { name: 'Cambio de Aceite Motor', triggerKm: 5000 },
        { name: 'Cambio Filtro de Aire', triggerKm: 10000 },
        { name: 'Cambio Filtro de Combustible', triggerKm: 15000 },
        { name: 'Cambio de Bujías', triggerKm: 20000 },
        { name: 'Rotación de Neumáticos', triggerKm: 8000 },
        { name: 'Cambio de Pastillas de Freno', triggerKm: 25000 },
        { name: 'Purgado de Frenos', triggerKm: 20000 },
        { name: 'Alineación y Balanceo', triggerKm: 15000 },
        { name: 'Cambio de Aceite Transmisión', triggerKm: 40000 },
        { name: 'Cambio Líquido Refrigerante', triggerKm: 60000 },
        { name: 'Cambio Correa Alternador', triggerKm: 80000 },
      ],
    },
    {
      name: 'Plan Básico Automóvil',
      description: 'Plan de mantenimiento básico para automóviles',
      items: [
        { name: 'Cambio de Aceite Motor', triggerKm: 10000 },
        { name: 'Cambio Filtro de Aire', triggerKm: 20000 },
        { name: 'Rotación de Neumáticos', triggerKm: 12000 },
        { name: 'Revisión Sistema Eléctrico', triggerKm: 30000 },
      ],
    },
    {
      name: 'Plan Premium Automóvil',
      description: 'Plan de mantenimiento premium para automóviles',
      items: [
        { name: 'Cambio de Aceite Motor', triggerKm: 8000 },
        { name: 'Cambio Filtro de Aire', triggerKm: 15000 },
        { name: 'Cambio de Bujías', triggerKm: 25000 },
        { name: 'Rotación de Neumáticos', triggerKm: 10000 },
        { name: 'Cambio de Pastillas de Freno', triggerKm: 30000 },
        { name: 'Purgado de Frenos', triggerKm: 25000 },
        { name: 'Alineación y Balanceo', triggerKm: 20000 },
        { name: 'Cambio Líquido Refrigerante', triggerKm: 50000 },
        { name: 'Lavado y Encerado', triggerKm: 5000 },
      ],
    },
  ];

  // Crear planes para diferentes combinaciones de marca/línea
  const brandLineCominations = [
    { brandName: 'Toyota', lineName: 'Hilux' },
    { brandName: 'Chevrolet', lineName: 'D-Max' },
    { brandName: 'Ford', lineName: 'Ranger' },
    { brandName: 'Nissan', lineName: 'Frontier' },
    { brandName: 'Toyota', lineName: 'Corolla' },
    { brandName: 'Chevrolet', lineName: 'Cruze' },
    { brandName: 'Ford', lineName: 'Focus' },
    { brandName: 'Audi', lineName: 'Quattro' },
    { brandName: 'Volvo', lineName: 'C40' },
  ];

  for (const combo of brandLineCominations) {
    const brand = brands.find(b => b.name === combo.brandName);
    const line = brand?.lines.find(l => l.name === combo.lineName);

    if (brand && line) {
      // Decidir qué tipo de plan usar basado en el tipo de vehículo
      const isPickup = ['Hilux', 'D-Max', 'Ranger', 'Frontier'].includes(
        combo.lineName
      );
      const template = isPickup
        ? Math.random() > 0.5
          ? planTemplates[0]
          : planTemplates[1]
        : Math.random() > 0.5
          ? planTemplates[2]
          : planTemplates[3];

      if (template) {
        const planName = `${template.name} ${combo.brandName} ${combo.lineName}`;

        const mantPlan = await prisma.mantPlan.upsert({
          where: {
            tenantId_vehicleBrandId_vehicleLineId_name: {
              tenantId: defaultTenant.id,
              vehicleBrandId: brand.id,
              vehicleLineId: line.id,
              name: planName,
            },
          },
          update: {},
          create: {
            tenantId: defaultTenant.id,
            name: planName,
            description: `${template.description} específico para ${combo.brandName} ${combo.lineName}`,
            vehicleBrandId: brand.id,
            vehicleLineId: line.id,
          },
        });

        // Agregar tareas al plan
        for (const itemData of template.items) {
          const mantItem = mantItems.find(mi => mi.name === itemData.name);
          if (mantItem) {
            await prisma.planTask.upsert({
              where: {
                planId_mantItemId: {
                  planId: mantPlan.id,
                  mantItemId: mantItem.id,
                },
              },
              update: {},
              create: {
                planId: mantPlan.id,
                mantItemId: mantItem.id,
                triggerKm: itemData.triggerKm,
              },
            });
          }
        }
      }
    }
  }

  console.log('✅ Planes de mantenimiento creados');

  // 10. ASIGNAR PLANES A VEHÍCULOS Y CREAR ITEMS DE MANTENIMIENTO
  const mantPlans = await prisma.mantPlan.findMany({
    where: { tenantId: defaultTenant.id },
    include: { planTasks: { include: { mantItem: true } } },
  });

  const techniciansArray = await prisma.technician.findMany({
    where: { tenantId: defaultTenant.id },
  });

  const providersArray = await prisma.provider.findMany({
    where: { tenantId: defaultTenant.id },
  });

  for (const vehicle of vehicles) {
    // Encontrar un plan compatible con la marca y línea del vehículo
    const compatiblePlan = mantPlans.find(
      plan =>
        plan.vehicleBrandId === vehicle.brandId &&
        plan.vehicleLineId === vehicle.lineId
    );

    if (compatiblePlan) {
      // Crear asignación del plan al vehículo
      const vehicleMantPlan = await prisma.vehicleMantPlan.upsert({
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

      // Crear items de mantenimiento basados en el kilometraje actual
      for (const planTask of compatiblePlan.planTasks) {
        const currentKm = vehicle.mileage;
        const triggerKm = planTask.triggerKm;

        // Calcular cuántos ciclos de mantenimiento han pasado
        const cycles = Math.floor(currentKm / triggerKm);

        // Crear items para los próximos mantenimientos
        for (let cycle = cycles; cycle <= cycles + 3; cycle++) {
          const executionMileage = (cycle + 1) * triggerKm;

          // Determinar el estado basado en el kilometraje
          let status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' = 'PENDING';
          let startDate: Date | undefined;
          let endDate: Date | undefined;
          let technicianId: number | undefined;
          let providerId: number | undefined;
          let cost: number | null = null;

          if (executionMileage <= currentKm) {
            // Mantenimiento que ya debería haberse hecho
            const randomStatus = Math.random();
            if (randomStatus < 0.7) {
              status = 'COMPLETED';
              startDate = new Date(
                Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
              ); // Hasta 30 días atrás
              endDate = new Date(
                startDate.getTime() + Math.random() * 8 * 60 * 60 * 1000
              ); // Hasta 8 horas después
              cost = Math.random() * 500000 + 50000; // Entre 50,000 y 550,000 COP
            } else if (randomStatus < 0.9) {
              status = 'IN_PROGRESS';
              startDate = new Date(
                Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
              ); // Hasta 7 días atrás
            }

            // Asignar técnico y proveedor aleatoriamente
            if (Math.random() > 0.3 && techniciansArray.length > 0) {
              technicianId =
                techniciansArray[
                  Math.floor(Math.random() * techniciansArray.length)
                ]?.id;
            }
            if (Math.random() > 0.3 && providersArray.length > 0) {
              providerId =
                providersArray[
                  Math.floor(Math.random() * providersArray.length)
                ]?.id;
            }
          }

          try {
            await prisma.vehicleMantPlanItem.upsert({
              where: {
                vehicleMantPlanId_mantItemId: {
                  vehicleMantPlanId: vehicleMantPlan.id,
                  mantItemId: planTask.mantItemId,
                },
              },
              update: {},
              create: {
                vehicleMantPlanId: vehicleMantPlan.id,
                mantItemId: planTask.mantItemId,
                executionMileage,
                status,
                startDate: startDate || null,
                endDate: endDate || null,
                technicianId: technicianId || null,
                providerId: providerId || null,
                cost,
              },
            });
          } catch (error) {
            // Si hay conflicto de unique constraint, crear con un execution mileage ligeramente diferente
            await prisma.vehicleMantPlanItem.create({
              data: {
                vehicleMantPlanId: vehicleMantPlan.id,
                mantItemId: planTask.mantItemId,
                executionMileage:
                  executionMileage + Math.floor(Math.random() * 100),
                status,
                startDate: startDate || null,
                endDate: endDate || null,
                technicianId: technicianId || null,
                providerId: providerId || null,
                cost,
              },
            });
          }
        }
      }
    }
  }

  console.log(
    '✅ Planes asignados a vehículos e items de mantenimiento creados'
  );

  console.log('🎉 Seed completo finalizado exitosamente!');
  console.log(`📊 Datos creados:`);
  console.log(`   - ${vehiclesData.length} vehículos con imágenes`);
  console.log(`   - ${mantCategories.length} categorías de mantenimiento`);
  console.log(`   - ${mantItems.length} items de mantenimiento`);
  console.log(`   - ${technicians.length} técnicos`);
  console.log(`   - ${providers.length} proveedores`);
  console.log(`   - ${brandLineCominations.length} planes de mantenimiento`);
  console.log(`   - Items de mantenimiento asignados con diferentes estados`);
}

main()
  .catch(e => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
