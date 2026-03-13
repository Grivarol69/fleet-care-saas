const fs = require('fs');

const files = [
    '/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/src/app/api/maintenance/work-orders/[id]/__tests__/route.test.ts',
    '/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/src/app/api/maintenance/work-orders/__tests__/e2e-flow.test.ts'
];

for (const f of files) {
    let text = fs.readFileSync(f, 'utf8');

    if (!text.includes('requireCurrentUser') || !text.includes('getCurrentUser, requireCurrentUser')) {
        text = text.replace(/import\s*\{\s*getCurrentUser\s*\}\s*from\s*['"]@\/lib\/auth['"];/, "import { getCurrentUser, requireCurrentUser } from '@/lib/auth';");
    }

    text = text.replace(/vi\.mocked\(getCurrentUser\)\.mockResolvedValue\(\{([\s\S]*?)\}\s+as\s+any\);/g, (match, p1) => {
        return `const __mockUser = {${p1}} as any;\n    vi.mocked(getCurrentUser).mockResolvedValue(__mockUser);\n    vi.mocked(requireCurrentUser).mockResolvedValue({ user: __mockUser, tenantPrisma: prisma } as any);`;
    });

    fs.writeFileSync(f, text, 'utf8');
    console.log(`Updated ${f}`);
}
