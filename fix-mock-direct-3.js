const fs = require('fs');

const files = [
    '/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/src/app/api/maintenance/work-orders/[id]/__tests__/route.test.ts',
    '/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/src/app/api/maintenance/work-orders/__tests__/e2e-flow.test.ts',
    '/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/src/app/api/maintenance/work-orders/__tests__/work-order-api.test.ts'
];

for (const f of files) {
    let text = fs.readFileSync(f, 'utf8');

    // Fix the import error: removing getTenantPrisma from prisma import and adding the proper import
    text = text.replace(/import\s*\{\s*prisma\s*,\s*getTenantPrisma\s*\}\s*from\s*['"]@\/lib\/prisma['"];/g,
        "import { prisma } from '@/lib/prisma';\nimport { getTenantPrisma } from '@/lib/tenant-prisma';");

    // If it was already just { prisma }, maybe getTenantPrisma is missing entirely
    if (!text.includes('@/lib/tenant-prisma')) {
        text = text.replace(/import\s*\{\s*prisma\s*\}\s*from\s*['"]@\/lib\/prisma['"];/g,
            "import { prisma } from '@/lib/prisma';\nimport { getTenantPrisma } from '@/lib/tenant-prisma';");
    }

    fs.writeFileSync(f, text, 'utf8');
    console.log(`Updated ${f}`);
}
