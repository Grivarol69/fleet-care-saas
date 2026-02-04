import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

async function main() {
  console.log('🌱 Seeding users with different roles...\n');

  // Limpiar usuarios existentes
  console.log('🗑️  Limpiando usuarios existentes...');
  await prisma.user.deleteMany({});

  // Crear usuarios de prueba con cada rol
  const users = [
    {
      email: 'superadmin@fleetcare.com',
      role: UserRole.SUPER_ADMIN,
      description: 'Acceso total + tablas maestras',
    },
    {
      email: 'owner@empresa.com',
      role: UserRole.OWNER,
      description: 'Dueño empresa - acceso total excepto maestras',
    },
    {
      email: 'manager@empresa.com',
      role: UserRole.MANAGER,
      description: 'Gerente - gestión + costos, NO maestras',
    },
    {
      email: 'tecnico@empresa.com',
      role: UserRole.TECHNICIAN,
      description: 'Técnico - ejecuta OT, NO ve costos',
    },
    {
      email: 'conductor@empresa.com',
      role: UserRole.DRIVER,
      description: 'Conductor - solo odómetro',
    },
  ];

  for (const userData of users) {
    await prisma.user.create({
      data: {
        email: userData.email,
        role: userData.role,
        tenantId: TENANT_ID,
      },
    });

    console.log(`✅ ${userData.role.padEnd(15)} - ${userData.email.padEnd(30)} - ${userData.description}`);
  }

  console.log('\n✨ Seed completado!\n');
  console.log('📝 IMPORTANTE: Estos usuarios están en la tabla User de Prisma.');
  console.log('   Para hacer login necesitas crear las cuentas en Supabase Auth con estos mismos emails.\n');
  console.log('🔐 Pasos para probar:');
  console.log('   1. Ve a Supabase Auth Dashboard');
  console.log('   2. Crea usuarios con estos emails (o usa el auto-create de getCurrentUser)');
  console.log('   3. Haz login con cada email para probar los permisos\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
