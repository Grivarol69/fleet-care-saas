const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    }
    return results;
}

const apiFiles = walk('/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/src/app/api');

let replacedCount = 0;

for (const file of apiFiles) {
    if (file.includes('/webhooks/')) continue;

    let text = fs.readFileSync(file, 'utf8');
    let originalText = text;

    // We need to fix ANY query that has `isGlobal: true` inside an OR array.
    // Pattern: OR: [{ isGlobal: true }, { }] or OR: [{ }, { isGlobal: true }]
    // and change tenantPrisma back to prisma for that specific call ONLY.

    // 1. Restore the `{ tenantId: user.tenantId }` or `{ tenantId: targetTenant }`
    // Actually, replace `{ }` inside the OR clause with `{ tenantId: user.tenantId }`
    text = text.replace(/OR:\s*\[\s*\{\s*isGlobal:\s*true\s*\}\s*,\s*\{\s*\}\s*\]/g, "OR: [{ isGlobal: true }, { tenantId: user.tenantId }]");
    text = text.replace(/OR:\s*\[\s*\{\s*\}\s*,\s*\{\s*tenantId:\s*null,\s*isGlobal:\s*true\s*\}\s*\]/g, "OR: [{ tenantId: user.tenantId }, { tenantId: null, isGlobal: true }]");
    text = text.replace(/OR:\s*\[\s*\{\s*\}\s*,\s*\{\s*isGlobal:\s*true\s*\}\s*\]/g, "OR: [{ tenantId: user.tenantId }, { isGlobal: true }]");

    // Also fix `{ isGlobal: true }, //` which might have been part of an array without OR on the same line,
    // like in `maintenance/mant-items/route.ts` line 18:
    // where: {
    //   OR: [
    //     { isGlobal: true },
    //     { tenantId: user.tenantId }
    //   ]
    // }
    // We'll just manually target the `tenantPrisma` calls that contain `isGlobal` in their block.

    // To handle `tenantPrisma.xxxx.find`, we can regex search for `await tenantPrisma\.([a-zA-Z0-9_]+)\.(findFirst|findMany|findUnique)\(\{`
    // and see if the block contains `isGlobal`. If so, replace `tenantPrisma` with `prisma`.
    // Wait, parsing blocks with regex is hard. Let's do it simply:
    // If the file contains `isGlobal: true` inside a tenantPrisma call, we must change that call to `prisma`.

    // Actually, we can just replace `tenantPrisma.` with `prisma.` if the line or preceding lines contain `tenantPrisma` and succeeding lines contain `isGlobal`.
    // Safer approach: Split by `await tenantPrisma.`
    const parts = text.split('await tenantPrisma.');
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            // Find the end of the Prisma call by counting braces or just looking ahead a bit
            // As a simple heuristic, if the next 300 characters contain `isGlobal: true`, it's likely part of this query.
            const snippet = parts[i].substring(0, 400);
            if (snippet.includes('isGlobal: true') && !snippet.includes('await tenantPrisma.')) {
                // Change `await tenantPrisma.` to `await prisma.`
                parts[i] = '^^^PRISMA_REPLACE^^^' + parts[i];
            }
        }
        text = parts.join('await tenantPrisma.').replace(/await tenantPrisma\.\^\^\^PRISMA_REPLACE\^\^\^/g, 'await prisma.');
    }

    // Ensure prisma is imported!
    if (text.includes('await prisma.') && !text.includes('import { prisma') && !text.includes('import prisma')) {
        text = "import { prisma } from '@/lib/prisma';\n" + text;
    }

    if (text !== originalText) {
        fs.writeFileSync(file, text, 'utf8');
        console.log(`Fixed global query in: ${file}`);
        replacedCount++;
    }
}

console.log(`Updated ${replacedCount} files.`);
