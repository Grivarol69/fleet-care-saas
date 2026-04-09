const fs = require('fs');

const files = [
    '/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/src/app/api/maintenance/work-orders/[id]/__tests__/route.test.ts',
    '/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/src/app/api/maintenance/work-orders/__tests__/e2e-flow.test.ts'
];

for (const f of files) {
    let text = fs.readFileSync(f, 'utf8');

    if (!text.includes('getTenantPrisma')) {
        text = text.replace(/import\s*\{\s*prisma\s*\}\s*from\s*['"]@\/lib\/prisma['"];/, "import { prisma, getTenantPrisma } from '@/lib/prisma';");
    }

    text = text.replace(/tenantPrisma:\s*prisma\s*\}/g, "tenantPrisma: getTenantPrisma(__mockUser.tenantId) }");

    fs.writeFileSync(f, text, 'utf8');
    console.log(`Updated ${f}`);
}
