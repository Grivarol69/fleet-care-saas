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
    if (file.includes('/webhooks/')) continue; // skip webhooks, they need the global prisma and use complete compound unique keys

    const text = fs.readFileSync(file, 'utf8');

    // We want to replace:
    // findUnique({
    //   where: {
    //     tenantId_name: {
    //       name: name.trim(),
    //     },
    //   },
    // })
    // With:
    // findFirst({
    //   where: {
    //     name: name.trim(),
    //   },
    // })

    // Note: we can also replace `findUniqueOrThrow` with `findFirstOrThrow` just in case, but here we just replace `findUnique` and `upsert`... wait, `upsert` requires a unique `where`. If we have `upsert`, we CANNOT use `findFirst`! 
    // Let's check if any of these API routes use `upsert` with a broken compound index.
    // The grep output only showed:
    // webhooks/clerk/route.ts: upsert
    // vehicles/documents/route.ts (x2)
    // vehicles/vehicles/[id]/route.ts
    // people/technicians/route.ts
    // inventory/purchases/route.ts
    // people/providers/route.ts
    // people/drivers/route.ts
    // invoices/route.ts

    // We will ONLY regex on findUnique
    const pattern = /findUnique\(\s*\{\s*where:\s*\{\s*tenantId_[a-zA-Z0-9_]+:\s*\{([^}]+)\}\s*,?\s*\}\s*,?/gs;

    if (pattern.test(text)) {
        const newText = text.replace(
            pattern,
            (match, innerContent) => {
                // match contains the whole matched string
                return `findFirst({\n      where: {${innerContent}},`;
            }
        );

        if (newText !== text) {
            fs.writeFileSync(file, newText, 'utf8');
            console.log(`Unnested compound unique in: ${file}`);
            replacedCount++;
        }
    }
}

console.log(`Updated ${replacedCount} files.`);
