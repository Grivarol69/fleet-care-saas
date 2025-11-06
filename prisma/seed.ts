import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  console.log('💡 Note: Run "pnpm prisma migrate reset --force" before seeding to ensure clean state\n');

  // ========================================
  // 1. TENANT & USER
  // ========================================
  console.log('Creating tenant and user...');

  const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'MVP Default Tenant',
      slug: 'mvp-default-tenant',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'admin@mvp.com',
    },
  });

  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: TENANT_ID,
        email: 'admin@mvp.com',
      },
    },
    update: {},
    create: {
      tenantId: TENANT_ID,
      email: 'admin@mvp.com',
      firstName: 'Admin',
      lastName: 'MVP',
      role: 'OWNER', // OWNER = dueño empresa cliente con acceso total
      isActive: true,
    },
  });

  console.log('✓ Tenant and user created');

  // ========================================
  // 2. PROVIDERS, TECHNICIANS, DRIVERS
  // ========================================
  console.log('Creating providers, technicians, drivers...');

  // PROVIDERS (talleres y proveedores de repuestos)
  const provider1 = await prisma.provider.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Taller Automotriz El Rayo',
      email: 'contacto@tallerelrayo.com',
      phone: '+57 310 234 5678',
      address: 'Calle 45 #23-15, Bogotá',
      specialty: 'REPUESTOS',
      status: 'ACTIVE',
    },
  });

  const provider2 = await prisma.provider.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Repuestos Toyota Oficial',
      email: 'ventas@repuestostoyota.com',
      phone: '+57 320 456 7890',
      address: 'Av. Boyacá #123-45, Bogotá',
      specialty: 'REPUESTOS',
      status: 'ACTIVE',
    },
  });

  const provider3 = await prisma.provider.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Lubricentro Express',
      email: 'info@lubricentroexpress.com',
      phone: '+57 315 678 9012',
      address: 'Carrera 68 #45-23, Bogotá',
      specialty: 'LUBRICANTES',
      status: 'ACTIVE',
    },
  });

  console.log('✓ Created 3 providers');

  // TECHNICIANS (mecánicos)
  const technician1 = await prisma.technician.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Pedro Martínez',
      email: 'pedro.martinez@empresa.com',
      phone: '+57 311 234 5678',
      specialty: 'MOTOR',
      status: 'ACTIVE',
    },
  });

  const technician2 = await prisma.technician.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Luis Rodríguez',
      email: 'luis.rodriguez@empresa.com',
      phone: '+57 312 345 6789',
      specialty: 'ELECTRICO',
      status: 'ACTIVE',
    },
  });

  const technician3 = await prisma.technician.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Andrés López',
      email: 'andres.lopez@tallerelrayo.com',
      phone: '+57 313 456 7890',
      specialty: 'TRANSMISION',
      status: 'ACTIVE',
    },
  });

  console.log('✓ Created 3 technicians');

  // DRIVERS (conductores de la flota)
  const driver1 = await prisma.driver.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Juan Pérez',
      email: 'juan.perez@empresa.com',
      phone: '+57 314 567 8901',
      licenseNumber: 'C1-12345678',
      licenseExpiry: new Date('2026-12-31'),
      status: 'ACTIVE',
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Ana García',
      email: 'ana.garcia@empresa.com',
      phone: '+57 315 678 9012',
      licenseNumber: 'C1-23456789',
      licenseExpiry: new Date('2027-06-30'),
      status: 'ACTIVE',
    },
  });

  const driver3 = await prisma.driver.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Carlos Hernández',
      email: 'carlos.hernandez@empresa.com',
      phone: '+57 316 789 0123',
      licenseNumber: 'C2-34567890',
      licenseExpiry: new Date('2025-09-15'),
      status: 'ACTIVE',
    },
  });

  const driver4 = await prisma.driver.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Sofía Díaz',
      email: 'sofia.diaz@empresa.com',
      phone: '+57 317 890 1234',
      licenseNumber: 'C1-45678901',
      licenseExpiry: new Date('2028-03-20'),
      status: 'ACTIVE',
    },
  });

  console.log('✓ Created 4 drivers');

  // ========================================
  // 3. VEHICLE BRANDS, LINES, TYPES
  // ========================================
  console.log('Creating vehicle brands, lines, types...');

  const toyota = await prisma.vehicleBrand.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Toyota',
    },
  });

  const ford = await prisma.vehicleBrand.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Ford',
    },
  });

  const chevrolet = await prisma.vehicleBrand.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Chevrolet',
    },
  });

  const hilux = await prisma.vehicleLine.create({
    data: {
      tenantId: TENANT_ID,
      brandId: toyota.id,
      name: 'Hilux',
    },
  });

  const ranger = await prisma.vehicleLine.create({
    data: {
      tenantId: TENANT_ID,
      brandId: ford.id,
      name: 'Ranger',
    },
  });

  const npr = await prisma.vehicleLine.create({
    data: {
      tenantId: TENANT_ID,
      brandId: chevrolet.id,
      name: 'NPR',
    },
  });

  const pickupType = await prisma.vehicleType.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Pick-up',
    },
  });

  const truckType = await prisma.vehicleType.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Camión',
    },
  });

  console.log('✓ Brands, lines, types created');

  // ========================================
  // 3. MAINTENANCE CATEGORIES & ITEMS
  // ========================================
  console.log('Creating maintenance categories and items...');

  const motorCat = await prisma.mantCategory.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Motor',
      description: 'Mantenimiento del motor y lubricación',
    },
  });

  const filtrosCat = await prisma.mantCategory.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Filtros',
      description: 'Filtros de motor, aire, combustible, cabina',
    },
  });

  const frenosCat = await prisma.mantCategory.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Frenos',
      description: 'Sistema de frenos',
    },
  });

  const neumaticoCat = await prisma.mantCategory.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Neumáticos',
      description: 'Neumáticos y alineación',
    },
  });

  const suspensionCat = await prisma.mantCategory.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Suspensión',
      description: 'Sistema de suspensión y amortiguación',
    },
  });

  const transmisionCat = await prisma.mantCategory.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Transmisión',
      description: 'Transmisión y diferencial',
    },
  });

  // Items de mantenimiento basados en programas reales
  // NOTA: estimatedTime y estimatedCost ahora están en PackageItem, no en MantItem
  const itemsData = [
    // MOTOR
    { name: 'Cambio aceite motor', description: 'Cambio de aceite de motor y verificación de nivel', mantType: 'PREVENTIVE' as const, categoryId: motorCat.id },
    { name: 'Revisión nivel refrigerante', description: 'Verificar nivel y estado del refrigerante', mantType: 'PREVENTIVE' as const, categoryId: motorCat.id },

    // FILTROS
    { name: 'Cambio filtro aceite', description: 'Reemplazo filtro de aceite', mantType: 'PREVENTIVE' as const, categoryId: filtrosCat.id },
    { name: 'Cambio filtro aire', description: 'Reemplazo filtro de aire motor', mantType: 'PREVENTIVE' as const, categoryId: filtrosCat.id },
    { name: 'Cambio filtro combustible', description: 'Reemplazo filtro de combustible', mantType: 'PREVENTIVE' as const, categoryId: filtrosCat.id },
    { name: 'Cambio filtro cabina', description: 'Reemplazo filtro de aire acondicionado', mantType: 'PREVENTIVE' as const, categoryId: filtrosCat.id },

    // FRENOS
    { name: 'Inspección pastillas freno', description: 'Verificar estado de pastillas de freno', mantType: 'PREVENTIVE' as const, categoryId: frenosCat.id },
    { name: 'Cambio pastillas freno', description: 'Reemplazo pastillas de freno delanteras', mantType: 'PREVENTIVE' as const, categoryId: frenosCat.id },
    { name: 'Revisión líquido frenos', description: 'Verificar nivel y estado líquido de frenos', mantType: 'PREVENTIVE' as const, categoryId: frenosCat.id },

    // NEUMÁTICOS
    { name: 'Rotación neumáticos', description: 'Rotación de neumáticos según patrón', mantType: 'PREVENTIVE' as const, categoryId: neumaticoCat.id },
    { name: 'Alineación y balanceo', description: 'Alineación y balanceo de neumáticos', mantType: 'PREVENTIVE' as const, categoryId: neumaticoCat.id },
    { name: 'Revisión presión neumáticos', description: 'Verificar y ajustar presión de neumáticos', mantType: 'PREVENTIVE' as const, categoryId: neumaticoCat.id },

    // SUSPENSIÓN
    { name: 'Inspección amortiguadores', description: 'Verificar estado de amortiguadores', mantType: 'PREVENTIVE' as const, categoryId: suspensionCat.id },
    { name: 'Revisión terminales dirección', description: 'Verificar terminales y rótulas de dirección', mantType: 'PREVENTIVE' as const, categoryId: suspensionCat.id },

    // TRANSMISIÓN
    { name: 'Cambio aceite transmisión', description: 'Cambio de aceite de caja de transmisión', mantType: 'PREVENTIVE' as const, categoryId: transmisionCat.id },
    { name: 'Cambio aceite diferencial', description: 'Cambio de aceite del diferencial', mantType: 'PREVENTIVE' as const, categoryId: transmisionCat.id },
  ];

  const items = [];
  for (const itemData of itemsData) {
    const item = await prisma.mantItem.create({
      data: {
        tenantId: TENANT_ID,
        ...itemData,
      },
    });
    items.push(item);
  }

  console.log(`✓ Created ${items.length} maintenance items`);

  // ========================================
  // 4. MAINTENANCE TEMPLATES
  // ========================================
  console.log('Creating maintenance templates...');

  // TEMPLATE TOYOTA HILUX
  const hiluxTemplate = await prisma.maintenanceTemplate.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Toyota Hilux Estándar',
      description: 'Programa de mantenimiento preventivo Toyota Hilux basado en especificaciones oficiales',
      vehicleBrandId: toyota.id,
      vehicleLineId: hilux.id,
      version: '1.0',
      isDefault: true,
    },
  });

  // Helper to create package items sequentially
  // NOTA: estimatedCost va en VehicleProgramItem (específico por tenant/país)
  // estimatedTime va en PackageItem (universal por tipo de máquina)
  async function createPackageItems(packageId: number, packageItems: Array<{
    mantItemId: number;
    triggerKm: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    order: number;
    estimatedTime?: number;
  }>) {
    for (const item of packageItems) {
      await prisma.packageItem.create({
        data: {
          packageId,
          mantItemId: item.mantItemId,
          triggerKm: item.triggerKm,
          priority: item.priority,
          order: item.order,
          estimatedTime: item.estimatedTime || null,
          status: 'ACTIVE',
        },
      });
    }
  }

  // Paquete 5,000 km - Hilux
  const hilux5k = await prisma.maintenancePackage.create({
    data: {
      templateId: hiluxTemplate.id,
      name: 'Mantenimiento 5,000 km',
      triggerKm: 5000,
      description: 'Primer servicio básico',
      estimatedCost: 85000,
      estimatedTime: 1.0,
      priority: 'MEDIUM',
    },
  });

  await createPackageItems(hilux5k.id, [
    { mantItemId: items[0]!.id, triggerKm: 5000, priority: 'HIGH', order: 1, estimatedTime: 0.5 },
    { mantItemId: items[2]!.id, triggerKm: 5000, priority: 'HIGH', order: 2, estimatedTime: 0.3 },
    { mantItemId: items[1]!.id, triggerKm: 5000, priority: 'MEDIUM', order: 3, estimatedTime: 0.2 },
    { mantItemId: items[11]!.id, triggerKm: 5000, priority: 'LOW', order: 4, estimatedTime: 0.2 },
  ]);

  // Paquete 10,000 km - Hilux
  const hilux10k = await prisma.maintenancePackage.create({
    data: {
      templateId: hiluxTemplate.id,
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      description: 'Servicio regular con inspecciones',
      estimatedCost: 150000,
      estimatedTime: 1.5,
      priority: 'MEDIUM',
    },
  });

  await createPackageItems(hilux10k.id, [
    { mantItemId: items[0]!.id, triggerKm: 10000, priority: 'HIGH', order: 1, estimatedTime: 0.5 },
    { mantItemId: items[2]!.id, triggerKm: 10000, priority: 'HIGH', order: 2, estimatedTime: 0.3 },
    { mantItemId: items[6]!.id, triggerKm: 10000, priority: 'MEDIUM', order: 3, estimatedTime: 0.5 },
    { mantItemId: items[8]!.id, triggerKm: 10000, priority: 'MEDIUM', order: 4, estimatedTime: 0.2 },
    { mantItemId: items[10]!.id, triggerKm: 10000, priority: 'MEDIUM', order: 5, estimatedTime: 1.0 },
  ]);

  // Paquete 15,000 km - Hilux
  const hilux15k = await prisma.maintenancePackage.create({
    data: {
      templateId: hiluxTemplate.id,
      name: 'Mantenimiento 15,000 km',
      triggerKm: 15000,
      description: 'Servicio intermedio',
      estimatedCost: 95000,
      estimatedTime: 1.2,
      priority: 'MEDIUM',
    },
  });

  await createPackageItems(hilux15k.id, [
    { mantItemId: items[0]!.id, triggerKm: 15000, priority: 'HIGH', order: 1, estimatedTime: 0.5 },
    { mantItemId: items[2]!.id, triggerKm: 15000, priority: 'HIGH', order: 2, estimatedTime: 0.3 },
    { mantItemId: items[9]!.id, triggerKm: 15000, priority: 'MEDIUM', order: 3, estimatedTime: 0.5 },
  ]);

  // Paquete 30,000 km - Hilux (COMPLETO)
  const hilux30k = await prisma.maintenancePackage.create({
    data: {
      templateId: hiluxTemplate.id,
      name: 'Mantenimiento 30,000 km',
      triggerKm: 30000,
      description: 'Servicio mayor con filtros y revisiones completas',
      estimatedCost: 280000,
      estimatedTime: 2.5,
      priority: 'HIGH',
    },
  });

  await createPackageItems(hilux30k.id, [
    { mantItemId: items[0]!.id, triggerKm: 30000, priority: 'HIGH', order: 1, estimatedTime: 0.5 },
    { mantItemId: items[2]!.id, triggerKm: 30000, priority: 'HIGH', order: 2, estimatedTime: 0.3 },
    { mantItemId: items[3]!.id, triggerKm: 30000, priority: 'HIGH', order: 3, estimatedTime: 0.3 },
    { mantItemId: items[5]!.id, triggerKm: 30000, priority: 'MEDIUM', order: 4, estimatedTime: 0.2 },
    { mantItemId: items[4]!.id, triggerKm: 30000, priority: 'HIGH', order: 5, estimatedTime: 0.4 },
    { mantItemId: items[6]!.id, triggerKm: 30000, priority: 'MEDIUM', order: 6, estimatedTime: 0.5 },
    { mantItemId: items[10]!.id, triggerKm: 30000, priority: 'MEDIUM', order: 7, estimatedTime: 1.0 },
    { mantItemId: items[12]!.id, triggerKm: 30000, priority: 'MEDIUM', order: 8, estimatedTime: 0.5 },
    { mantItemId: items[13]!.id, triggerKm: 30000, priority: 'MEDIUM', order: 9, estimatedTime: 0.5 },
  ]);

  // Paquete 50,000 km - Hilux
  const hilux50k = await prisma.maintenancePackage.create({
    data: {
      templateId: hiluxTemplate.id,
      name: 'Mantenimiento 50,000 km',
      triggerKm: 50000,
      description: 'Servicio mayor con transmisión',
      estimatedCost: 450000,
      estimatedTime: 3.5,
      priority: 'HIGH',
    },
  });

  await createPackageItems(hilux50k.id, [
    { mantItemId: items[0]!.id, triggerKm: 50000, priority: 'HIGH', order: 1, estimatedTime: 0.5 },
    { mantItemId: items[2]!.id, triggerKm: 50000, priority: 'HIGH', order: 2, estimatedTime: 0.3 },
    { mantItemId: items[3]!.id, triggerKm: 50000, priority: 'HIGH', order: 3, estimatedTime: 0.3 },
    { mantItemId: items[4]!.id, triggerKm: 50000, priority: 'HIGH', order: 4, estimatedTime: 0.4 },
    { mantItemId: items[7]!.id, triggerKm: 50000, priority: 'HIGH', order: 5, estimatedTime: 1.5 },
    { mantItemId: items[14]!.id, triggerKm: 50000, priority: 'HIGH', order: 6, estimatedTime: 1.0 },
    { mantItemId: items[15]!.id, triggerKm: 50000, priority: 'HIGH', order: 7, estimatedTime: 0.8 },
  ]);

  console.log('✓ Toyota Hilux template created with 5 packages');

  // TEMPLATE FORD RANGER
  const rangerTemplate = await prisma.maintenanceTemplate.create({
    data: {
      tenantId: TENANT_ID,
      name: 'Ford Ranger 3.2L Diesel',
      description: 'Programa de mantenimiento preventivo Ford Ranger basado en especificaciones oficiales',
      vehicleBrandId: ford.id,
      vehicleLineId: ranger.id,
      version: '1.0',
      isDefault: true,
    },
  });

  // Paquete 10,000 km - Ranger
  const ranger10k = await prisma.maintenancePackage.create({
    data: {
      templateId: rangerTemplate.id,
      name: 'Mantenimiento 10,000 km',
      triggerKm: 10000,
      description: 'Servicio básico anual',
      estimatedCost: 160000,
      estimatedTime: 1.5,
      priority: 'MEDIUM',
    },
  });

  await createPackageItems(ranger10k.id, [
    { mantItemId: items[0]!.id, triggerKm: 10000, priority: 'HIGH', order: 1, estimatedTime: 0.5 },
    { mantItemId: items[2]!.id, triggerKm: 10000, priority: 'HIGH', order: 2, estimatedTime: 0.3 },
    { mantItemId: items[6]!.id, triggerKm: 10000, priority: 'MEDIUM', order: 3, estimatedTime: 0.5 },
  ]);

  // Paquete 20,000 km - Ranger
  const ranger20k = await prisma.maintenancePackage.create({
    data: {
      templateId: rangerTemplate.id,
      name: 'Mantenimiento 20,000 km',
      triggerKm: 20000,
      description: 'Servicio con filtro cabina',
      estimatedCost: 190000,
      estimatedTime: 1.8,
      priority: 'MEDIUM',
    },
  });

  await createPackageItems(ranger20k.id, [
    { mantItemId: items[0]!.id, triggerKm: 20000, priority: 'HIGH', order: 1, estimatedTime: 0.5 },
    { mantItemId: items[2]!.id, triggerKm: 20000, priority: 'HIGH', order: 2, estimatedTime: 0.3 },
    { mantItemId: items[5]!.id, triggerKm: 20000, priority: 'MEDIUM', order: 3, estimatedTime: 0.2 },
  ]);

  // Paquete 30,000 km - Ranger
  const ranger30k = await prisma.maintenancePackage.create({
    data: {
      templateId: rangerTemplate.id,
      name: 'Mantenimiento 30,000 km',
      triggerKm: 30000,
      description: 'Servicio completo con filtros',
      estimatedCost: 320000,
      estimatedTime: 2.5,
      priority: 'HIGH',
    },
  });

  await createPackageItems(ranger30k.id, [
    { mantItemId: items[0]!.id, triggerKm: 30000, priority: 'HIGH', order: 1, estimatedTime: 0.5 },
    { mantItemId: items[2]!.id, triggerKm: 30000, priority: 'HIGH', order: 2, estimatedTime: 0.3 },
    { mantItemId: items[3]!.id, triggerKm: 30000, priority: 'HIGH', order: 3, estimatedTime: 0.3 },
    { mantItemId: items[4]!.id, triggerKm: 30000, priority: 'HIGH', order: 4, estimatedTime: 0.4 },
  ]);

  console.log('✓ Ford Ranger template created with 3 packages');

  // ========================================
  // 5. VEHICLES (10 con diferentes km)
  // ========================================
  console.log('Creating vehicles...');

  const vehicleData = [
    { licensePlate: 'ABC-123', brandId: toyota.id, lineId: hilux.id, typeId: pickupType.id, year: 2022, color: 'Blanco', mileage: 29800 },
    { licensePlate: 'DEF-456', brandId: toyota.id, lineId: hilux.id, typeId: pickupType.id, year: 2021, color: 'Gris', mileage: 14200 },
    { licensePlate: 'GHI-789', brandId: ford.id, lineId: ranger.id, typeId: pickupType.id, year: 2023, color: 'Rojo', mileage: 19500 },
    { licensePlate: 'JKL-012', brandId: toyota.id, lineId: hilux.id, typeId: pickupType.id, year: 2022, color: 'Negro', mileage: 5200 },
    { licensePlate: 'MNO-345', brandId: ford.id, lineId: ranger.id, typeId: pickupType.id, year: 2020, color: 'Azul', mileage: 31000 },
    { licensePlate: 'PQR-678', brandId: toyota.id, lineId: hilux.id, typeId: pickupType.id, year: 2021, color: 'Plateado', mileage: 48500 },
    { licensePlate: 'STU-901', brandId: ford.id, lineId: ranger.id, typeId: pickupType.id, year: 2024, color: 'Blanco', mileage: 2500 },
    { licensePlate: 'VWX-234', brandId: toyota.id, lineId: hilux.id, typeId: pickupType.id, year: 2019, color: 'Verde', mileage: 75000 },
    { licensePlate: 'YZA-567', brandId: chevrolet.id, lineId: npr.id, typeId: truckType.id, year: 2022, color: 'Blanco', mileage: 25000 },
    { licensePlate: 'BCD-890', brandId: toyota.id, lineId: hilux.id, typeId: pickupType.id, year: 2023, color: 'Rojo', mileage: 28500 },
  ];

  type VehicleType = Awaited<ReturnType<typeof prisma.vehicle.create>>;
  const vehicles: VehicleType[] = [];
  for (const vData of vehicleData) {
    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId: TENANT_ID,
        ...vData,
        lastKilometers: vData.mileage,
        status: 'ACTIVE',
        situation: 'AVAILABLE',
      },
    });
    vehicles.push(vehicle);
  }

  console.log(`✓ Created ${vehicles.length} vehicles`);

  // ========================================
  // 6. ASSIGN PROGRAMS TO VEHICLES
  // ========================================
  console.log('Assigning maintenance programs to vehicles...');

  // Helper function to assign program
  async function assignProgramToVehicle(
    vehicle: typeof vehicles[0],
    template: typeof hiluxTemplate | typeof rangerTemplate
  ) {
    // 1. Create VehicleMantProgram
    const program = await prisma.vehicleMantProgram.create({
      data: {
        tenantId: TENANT_ID,
        vehicleId: vehicle.id,
        name: `Programa ${vehicle.licensePlate}`,
        description: `Programa de mantenimiento para ${vehicle.licensePlate}`,
        generatedFrom: `Template: ${template.name} v${template.version}`,
        generatedAt: new Date(),
        generatedBy: user.id,
        assignmentKm: vehicle.mileage,
        isActive: true,
      },
    });

    // 2. Get all packages from template with their items
    const templatePackages = await prisma.maintenancePackage.findMany({
      where: { templateId: template.id },
      include: {
        packageItems: {
          include: {
            mantItem: true,
          },
        },
      },
      orderBy: { triggerKm: 'asc' },
    });

    // 3. For each package, create VehicleProgramPackage and items
    for (const templatePackage of templatePackages) {
      const vehiclePackage = await prisma.vehicleProgramPackage.create({
        data: {
          tenantId: TENANT_ID,
          programId: program.id,
          name: templatePackage.name,
          description: templatePackage.description,
          triggerKm: templatePackage.triggerKm,
          packageType: templatePackage.packageType,
          priority: templatePackage.priority,
          estimatedCost: templatePackage.estimatedCost,
          estimatedTime: templatePackage.estimatedTime,
        },
      });

      // NOTA: VehicleProgramItems se crearán desde la aplicación
      // cuando se asigne el template al vehículo
    }

    return program;
  }

  // NOTA: No asignamos programas automáticamente en el seed
  // Los programas se asignarán manualmente desde la aplicación para probar el flujo

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - 1 Tenant & 1 User (admin@mvp.com)`);
  console.log(`  - 3 Providers, 3 Technicians, 4 Drivers`);
  console.log(`  - 3 Brands (Toyota, Ford, Chevrolet)`);
  console.log(`  - 3 Lines (Hilux, Ranger, NPR)`);
  console.log(`  - 2 Types (Pick-up, Camión)`);
  console.log(`  - 6 MantCategories, ${items.length} MantItems`);
  console.log(`  - 2 Templates disponibles:`);
  console.log(`    • Toyota Hilux: 5 paquetes (5k, 10k, 15k, 30k, 50k km)`);
  console.log(`    • Ford Ranger: 3 paquetes (10k, 20k, 30k km)`);
  console.log(`  - ${vehicles.length} Vehicles (SIN programas asignados)`);
  console.log('\n💡 Next steps:');
  console.log('  1. Run dev server: npm run dev');
  console.log('  2. Login: admin@mvp.com');
  console.log('  3. Asignar template a vehículo Toyota Hilux desde la UI');
  console.log('  4. Registrar odómetro para generar alertas de mantenimiento');
  console.log('  5. Probar flujo: Alert → WorkOrder → Invoice');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
