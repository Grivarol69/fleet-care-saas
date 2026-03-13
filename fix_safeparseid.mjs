import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directoryPath = path.join(__dirname, 'src/app/api');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Remove import
    content = content.replace(/import\s*{\s*safeParseId\s*}\s*from\s*['"]@\/lib\/validation['"];?\n?/g, '');

    // Replace const parsed = safeParseId(id); with const parsed = id;
    // It could be assigned to variable named different things: 
    // const workOrderId = safeParseId(id);
    // const mantItemId = safeParseId(mantItemIdParam);
    // Using a regex:
    content = content.replace(/safeParseId\(([^)]+)\)/g, '$1');

    // Some validations might have been: if (id === null) because safeParseId returned null. We might want to change it to if (!id)
    content = content.replace(/=== null/g, '=== null'); // Not safe to do blindly, but mostly we replaced: if (workOrderId === null) -> if (!workOrderId)
    // Actually, replacing `if (id === null)` to `if (!id)` strictly for the assigned variable:
    // e.g. const workOrderId = id; if (workOrderId === null)
    // Let's use regex for `if (VAR === null)` -> `if (!VAR)` where VAR is some id
    content = content.replace(/if\s*\(\s*([a-zA-Z0-9_]+Id)\s*===\s*null\s*\)/g, 'if (!$1)');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function traverseDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            processFile(fullPath);
        }
    }
}

traverseDirectory(directoryPath);
console.log('Done.');
