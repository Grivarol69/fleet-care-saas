import {
  PrismaClient,
  MantType,
  WorkOrderStatus,
  Priority,
  VehicleStatus,
  VehicleSituation,
  InvoiceStatus,
  ItemType,
} from '@prisma/client';

const prisma = new PrismaClient();

// Configuration — override with SEED_USER_EMAIL env var
const USER_EMAIL =
  process.env['SEED_USER_EMAIL'] ?? 'grivarol69driver@gmail.com';

async function main() {
  console.log('🌱 Starting Financial Dashboard Seed...');

  // 1. Get User & Active Tenant
  // Prefer 'Transportes Demo SAS' for this user
  let user = await prisma.user.findFirst({
    where: {
      email: USER_EMAIL,
      tenant: {
        name: 'Transportes Demo SAS',
      },
    },
    include: { tenant: true },
  });

  if (!user) {
    console.log(
      `⚠️ User ${USER_EMAIL} not found in 'Transportes Demo SAS'. Trying any tenant...`
    );
    user = await prisma.user.findFirst({
      where: { email: USER_EMAIL },
      include: { tenant: true },
    });
  }

  if (!user) {
    throw new Error(
      '❌ No user found to seed data for. Please create a user first.'
    );
  }

  const tenant = user.tenant;
  console.log(`✅ Using Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`✅ Using User: ${user.email}`);

  // 2. Create Maintenance Categories
  const categoriesData = [
    { name: 'MOTOR', description: 'Reparaciones de motor' },
    { name: 'FRENOS', description: 'Sistema de frenado' },
    { name: 'LUBRICANTES', description: 'Aceites y grasas' },
    { name: 'LLANTAS', description: 'Neumáticos y alineación' },
    { name: 'SUSPENSION', description: 'Amortiguadores y dirección' },
    { name: 'ELECTRICO', description: 'Baterías y sistema eléctrico' },
    { name: 'OTROS', description: 'Varios' },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const category = await prisma.mantCategory.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: cat.name } },
      update: {},
      create: { ...cat, tenantId: tenant.id },
    });
    categories.push(category);
  }
  console.log(`✅ ${categories.length} Categories ensured`);

  // 3. Create MantItems for Categories
  const mantItemsData = [
    {
      name: 'Cambio de Aceite 15W40',
      category: 'LUBRICANTES',
      cost: 150000,
      type: 'PREVENTIVE',
    },
    {
      name: 'Pastillas de Freno Delanteras',
      category: 'FRENOS',
      cost: 280000,
      type: 'CORRECTIVE',
    },
    {
      name: 'Batería 1200 Amperios',
      category: 'ELECTRICO',
      cost: 650000,
      type: 'CORRECTIVE',
    },
    {
      name: 'Llanta 295/80R22.5',
      category: 'LLANTAS',
      cost: 1200000,
      type: 'PREVENTIVE',
    },
    {
      name: 'Kit de Motor',
      category: 'MOTOR',
      cost: 4500000,
      type: 'CORRECTIVE',
    },
    {
      name: 'Filtro de Aire',
      category: 'MOTOR',
      cost: 85000,
      type: 'PREVENTIVE',
    },
    {
      name: 'Amortiguador Trasero',
      category: 'SUSPENSION',
      cost: 320000,
      type: 'CORRECTIVE',
    },
  ];

  // Map to store costs because MantItem doesn't have cost field anymore
  const itemCosts = new Map<number, number>();

  const mantItems = [];
  for (const item of mantItemsData) {
    const category = categories.find(c => c.name === item.category)!;
    const mantItem = await prisma.mantItem.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: item.name } },
      update: {},
      create: {
        name: item.name,
        categoryId: category.id,
        tenantId: tenant.id,
        mantType: item.type as MantType,
        type: ItemType.PART,
      },
      include: { category: true },
    });
    mantItems.push(mantItem);
    itemCosts.set(mantItem.id, item.cost);
  }
  console.log(`✅ ${mantItems.length} MantItems ensured`);

  // 4. Create Vehicles
  let brand = await prisma.vehicleBrand.findFirst({
    where: { name: 'Toyota' },
  });
  if (!brand)
    brand = await prisma.vehicleBrand.create({
      data: { name: 'Toyota', isGlobal: true },
    });

  let line = await prisma.vehicleLine.findFirst({
    where: { name: 'Hilux', brandId: brand.id },
  });
  if (!line)
    line = await prisma.vehicleLine.create({
      data: { name: 'Hilux', brandId: brand.id },
    });

  let type = await prisma.vehicleType.findFirst({ where: { name: 'Pickup' } });
  if (!type)
    type = await prisma.vehicleType.create({
      data: { name: 'Pickup', isGlobal: true },
    });

  const vehiclesData = [
    { plate: 'FIN-001', year: 2022 },
    { plate: 'FIN-002', year: 2020 },
    { plate: 'FIN-003', year: 2021 },
    { plate: 'FIN-004', year: 2023 },
    { plate: 'FIN-005', year: 2019 },
  ];

  const vehicles = [];
  for (const v of vehiclesData) {
    const vehicle = await prisma.vehicle.upsert({
      where: {
        tenantId_licensePlate: { tenantId: tenant.id, licensePlate: v.plate },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        licensePlate: v.plate,
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: v.year,
        color: 'Blanco',
        status: VehicleStatus.ACTIVE,
        situation: VehicleSituation.AVAILABLE,
      },
    });
    vehicles.push(vehicle);
  }
  console.log(`✅ ${vehicles.length} Vehicles ensured`);

  // 5. Create Providers
  let provider = await prisma.provider.findFirst({
    where: { tenantId: tenant.id, name: 'Taller Demo Financiero' },
  });
  if (!provider) {
    provider = await prisma.provider.create({
      data: {
        tenantId: tenant.id,
        name: 'Taller Demo Financiero',
        email: 'taller@demo.com',
      },
    });
  }

  // 6. Generate Financial Data (WorkOrders + Invoices)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const periods = [
    {
      name: 'Current Month',
      month: currentMonth,
      year: currentYear,
      woCount: 8,
    },
    {
      name: 'Previous Month',
      month: currentMonth - 1,
      year: currentYear,
      woCount: 6,
    },
  ];

  for (const period of periods) {
    let year = period.year;
    let month = period.month;
    if (month < 0) {
      month = 11;
      year = year - 1;
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    for (let i = 0; i < period.woCount; i++) {
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      const mantItemIndex = Math.floor(Math.random() * mantItems.length);
      const mantItem = mantItems[mantItemIndex];
      const itemCost = itemCosts.get(mantItem.id) || 100000;

      const mantType = mantItem.mantType;

      const wo = await prisma.workOrder.create({
        data: {
          tenantId: tenant.id,
          vehicleId: vehicle.id,
          title: `${mantType} - ${vehicle.licensePlate} - ${Math.floor(Math.random() * 1000)}`,
          mantType: mantType,
          priority: Priority.MEDIUM,
          status: WorkOrderStatus.COMPLETED,
          workType: 'EXTERNAL',
          providerId: provider.id,
          creationMileage: vehicle.mileage || 10000,
          requestedBy: user.id,
          startDate: startDate,
          endDate: endDate,
        },
      });

      const woItem = await prisma.workOrderItem.create({
        data: {
          workOrderId: wo.id,
          mantItemId: mantItem.id,
          description: mantItem.name,
          supplier: provider.name,
          unitPrice: itemCost,
          quantity: 1,
          totalCost: itemCost,
          purchasedBy: user.id,
          status: WorkOrderStatus.COMPLETED,
        },
      });

      const invoiceAmount = Number(itemCost) * 1.19;
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          supplierId: provider.id,
          workOrderId: wo.id,
          invoiceNumber: `INV-${month + 1}-${i + 100}`,
          invoiceDate: new Date(
            startDate.getTime() +
              Math.random() * (endDate.getTime() - startDate.getTime())
          ),
          subtotal: itemCost,
          taxAmount: Number(itemCost) * 0.19,
          totalAmount: invoiceAmount,
          status: InvoiceStatus.PAID,
          registeredBy: user.id,
          approvedBy: user.id,
          approvedAt: new Date(),
        },
      });

      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          workOrderItemId: woItem.id,
          description: woItem.description,
          quantity: 1,
          unitPrice: itemCost,
          subtotal: itemCost,
          taxAmount: Number(itemCost) * 0.19,
          total: invoiceAmount,
          taxRate: 19,
        },
      });

      console.log(
        `Created Flow: WO ${wo.id} -> Invoice ${invoice.id} ($${invoiceAmount}) [${period.name}]`
      );
    }
  }

  // Create some PENDING invoices for the KPI
  await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      supplierId: provider.id,
      invoiceNumber: `PEND-001`,
      invoiceDate: new Date(),
      subtotal: 500000,
      taxAmount: 95000,
      totalAmount: 595000,
      status: InvoiceStatus.PENDING,
      registeredBy: user.id,
      notes: 'Factura pendiente de aprobación',
    },
  });

  console.log('🏁 Financial Dashboard Seed Completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
