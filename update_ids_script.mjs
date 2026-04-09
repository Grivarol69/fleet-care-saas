import fs from 'fs';
import path from 'path';

const ID_FIELDS = [
    'id', 'brandId', 'lineId', 'typeId', 'categoryId', 'mantItemId',
    'vehicleBrandId', 'vehicleLineId', 'vehicleTypeId', 'packageId',
    'templateId', 'vehicleId', 'programId', 'documentTypeId'
];

function regexForField(field, isZod) {
    if (isZod) {
        return new RegExp(`(${field}:\\s*z\\.)number\\(\\)([^,\\n]*)`, 'g');
    } else {
        // Matches: field: number | field: number | null | field?: number
        return new RegExp(`(${field}\\??:\\s*)number`, 'g');
    }
}

function walkSync(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const stat = fs.statSync(path.join(dir, file));
        if (stat.isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist);
        } else {
            filelist.push(path.join(dir, file));
        }
    }
    return filelist;
}

const allFiles = walkSync('src/app/dashboard');
let changedTypes = 0;
let changedForms = 0;

for (const file of allFiles) {
    if (file.endsWith('.types.ts') || file.endsWith('.tsx') || file.endsWith('.ts')) {
        let content = fs.readFileSync(file, 'utf-8');
        let original = content;

        for (const field of ID_FIELDS) {
            content = content.replace(regexForField(field, false), `$1string`);
            // For Zod schema files (.form.ts usually, but sometimes inside .ts)
            content = content.replace(regexForField(field, true), `$1string().min(1)$2`);
        }

        if (content !== original) {
            fs.writeFileSync(file, content);

            if (file.endsWith('.form.ts')) changedForms++;
            else changedTypes++;

            console.log(`Updated: ${file}`);
        }
    }
}

console.log(`Done. Updated ${changedTypes} non-form files and ${changedForms} form files.`);
