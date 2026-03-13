const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') && !fullPath.includes('__tests__')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let altered = false;

    if (content.includes('getCurrentUser') && content.includes('prisma')) {

        // 1. Imports
        if (content.includes('import { getCurrentUser } from \'@/lib/auth\'') || content.includes("import { getCurrentUser } from '@/lib/auth';")) {
            content = content.replace(/import { getCurrentUser } from ['"]@\/lib\/auth['"];?/g, "import { requireCurrentUser } from '@/lib/auth';");
            content = content.replace(/import { prisma } from ['"]@\/lib\/prisma['"];?\r?\n?/g, "");
            altered = true;
        }

        // 2. getCurrentUser calls + authorization check
        // We want to replace:
        // const user = await getCurrentUser();
        // if (!user) { return NextResponse.json(...) }
        // OR just const user = await getCurrentUser();
        // WITH: const { user, tenantPrisma } = await requireCurrentUser();
        const regex1 = /const\s+user\s*=\s*await\s+getCurrentUser\(\);?[\s\S]*?if\s*\(!user\)\s*{\s*return\s+(?:Next)?Response\.json\(\{\s*error[^}]+\}\s*,\s*\{\s*status:\s*401\s*\}\);\s*}/g;
        if (content.match(regex1)) {
            content = content.replace(regex1, "const { user, tenantPrisma } = await requireCurrentUser();");
            altered = true;
        } else {
            const regex2 = /const\s+user\s*=\s*await\s+getCurrentUser\(\);?/g;
            if (content.match(regex2)) {
                content = content.replace(regex2, "const { user, tenantPrisma } = await requireCurrentUser();");
                altered = true;
            }
        }

        // 3. Prisma calls => tenantPrisma
        const prismaCount = (content.match(/prisma\./g) || []).length;
        if (prismaCount > 0) {
            content = content.replace(/(?<!tenant)prisma\./g, 'tenantPrisma.');
            altered = true;
        }

        // 4. Remove explicit explicit tenantId injects
        content = content.replace(/tenantId:\s*user\.tenantId,?\s*/g, '');

        if (altered) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated:', filePath);
        }
    }
}

const apiDir = path.join(__dirname, 'src', 'app', 'api');
processDirectory(apiDir);

const actionsDir = path.join(__dirname, 'src', 'actions');
processDirectory(actionsDir);

// Re-run prettier or we can let type-check catch formatting later
