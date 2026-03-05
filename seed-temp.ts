import { seedTenantData } from "@/actions/seed-tenant";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const t = await prisma.tenant.findFirst({ 
    where: { 
      OR: [
        {name: "Empresa (Auto-creada)"}, 
        {slug: "org_3ajwruingiipibrf7metdwu2vk9"}
      ] 
    } 
  });
  
  if (t) {
    console.log("Seeding for", t.id);
    await seedTenantData(t.id, "CO");
    await prisma.tenant.update({ where: { id: t.id }, data: { name: "Fores Car" } });
    console.log("Tenant name corrected and seeded!");
  } else {
    console.log("Tenant not found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
