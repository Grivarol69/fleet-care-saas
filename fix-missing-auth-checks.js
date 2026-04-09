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

    const lines = text.split('\n');
    const newLines = [];

    for (let i = 0; i < lines.length; i++) {
        newLines.push(lines[i]);

        // Check if line contains requireCurrentUser
        if (lines[i].includes('await requireCurrentUser()')) {
            // Check next 5 lines for `if (!user)`
            let hasCheck = false;
            for (let j = 1; j <= 5 && i + j < lines.length; j++) {
                if (lines[i + j].replace(/\s/g, '').includes('if(!user)')) {
                    hasCheck = true;
                    break;
                }
            }

            if (!hasCheck) {
                // get indentation of current line
                const match = lines[i].match(/^(\s*)/);
                const indent = match ? match[1] : '';
                newLines.push(`${indent}if (!user) {`);
                newLines.push(`${indent}  return new NextResponse('Unauthorized', { status: 401 });`);
                newLines.push(`${indent}}`);
            }
        }
    }

    text = newLines.join('\n');

    if (text !== originalText) {
        if (!text.includes('NextResponse')) {
            text = "import { NextResponse } from 'next/server';\n" + text;
        }
        fs.writeFileSync(file, text, 'utf8');
        console.log(`Added auth check to: ${file}`);
        replacedCount++;
    }
}

console.log(`Updated ${replacedCount} files.`);
