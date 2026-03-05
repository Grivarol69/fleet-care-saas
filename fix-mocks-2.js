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
        } else if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) {
            results.push(filePath);
        }
    }
    return results;
}

const testFiles = walk('/home/guille-rivar/Escritorio/Desarrollo Web/fleet-care-saas/src/app/api');

let replacedCount = 0;

for (const file of testFiles) {
    const text = fs.readFileSync(file, 'utf8');

    // Match the importOriginal mock block
    const pattern = /vi\.mock\('@\/lib\/auth',\s*async\s*\(importOriginal\)\s*=>\s*\{\s*const actual\s*=\s*await\s*importOriginal[^\n]+\n\s*return\s*\{\s*\.\.\.actual,\s*getCurrentUser:\s*vi\.fn\(\),\s*isSuperAdmin:\s*vi\.fn\(\)\.mockResolvedValue\(false\),\s*\};\s*\}\);/sm;

    if (pattern.test(text)) {
        const newText = text.replace(
            pattern,
            `vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  requireCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));`
        );

        if (newText !== text) {
            fs.writeFileSync(file, newText, 'utf8');
            console.log(`Reverted mock in: ${file}`);
            replacedCount++;
        }
    } else {
        // Also try matching the older format just in case it wasn't replaced, and update it
        const oldPattern = /vi\.mock\('@\/lib\/auth',\s*\(\)\s*=>\s*\({\s*getCurrentUser:\s*vi\.fn\(\),\s*(isSuperAdmin:\s*vi\.fn\(\)\.mockResolvedValue\(false\),)?\s*}\)\);/sm;
        if (oldPattern.test(text)) {
            const newText = text.replace(
                oldPattern,
                `vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  requireCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));`
            );
            if (newText !== text) {
                fs.writeFileSync(file, newText, 'utf8');
                console.log(`Updated legacy mock in: ${file}`);
                replacedCount++;
            }
        }
    }
}

console.log(`Updated ${replacedCount} files.`);
