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
    let text = fs.readFileSync(file, 'utf8');
    let originalText = text;

    text = text.replace(/return new NextResponse\('Unauthorized',\s*\{\s*status:\s*401\s*\}\);/g,
        "return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });");

    if (text !== originalText) {
        fs.writeFileSync(file, text, 'utf8');
        console.log(`Fixed 401 JSON in: ${file}`);
        replacedCount++;
    }
}

console.log(`Updated ${replacedCount} files.`);
