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

    // Match the old mock pattern:
    // vi.mock('@/lib/auth', () => ({
    //   getCurrentUser: vi.fn(),
    //   isSuperAdmin: vi.fn().mockResolvedValue(false),
    // }));

    if (text.includes("vi.mock('@/lib/auth', () => ({")) {
        const newText = text.replace(
            /vi\.mock\('@\/lib\/auth',\s*\(\)\s*=>\s*\({\s*getCurrentUser:\s*vi\.fn\(\),\s*(isSuperAdmin:\s*vi\.fn\(\)\.mockResolvedValue\(false\),)?\s*}\)\);/s,
            `vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    isSuperAdmin: vi.fn().mockResolvedValue(false),
  };
});`
        );

        if (newText !== text) {
            fs.writeFileSync(file, newText, 'utf8');
            console.log(`Updated mock in: ${file}`);
            replacedCount++;
        }
    }
}

console.log(`Updated ${replacedCount} files.`);
