import fs from 'fs';
import path from 'path';

const ID_FIELDS = [
    'id', 'brandId', 'lineId', 'typeId', 'categoryId', 'mantItemId',
    'vehicleBrandId', 'vehicleLineId', 'vehicleTypeId', 'packageId',
    'templateId', 'vehicleId', 'programId', 'documentTypeId'
];

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
let changedCount = 0;

for (const file of allFiles) {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        let content = fs.readFileSync(file, 'utf-8');
        let original = content;

        // Fix Zod schemas: fieldId: z.number()... -> fieldId: z.string().min(1)
        for (const field of ID_FIELDS) {
            // Look for field: z.number() or field: z.number({ ... })
            const regZodNumber = new RegExp(`(${field}):\\s*z\\.number\\((?:\\{(?:[^}]*)\\})?\\)(?:\\.min\\([^)]+\\))?(?:\\.positive\\([^)]*\\))?(?:\\.optional\\(\\))?(?:\\.nullable\\(\\))?`, 'g');
            content = content.replace(regZodNumber, (match, p1) => {
                let replacement = `${p1}: z.string().min(1, 'Requerido')`;
                if (match.includes('.optional()')) replacement += '.optional()';
                if (match.includes('.nullable()')) replacement += '.nullable()';
                return replacement;
            });

            const regZodNumber2 = new RegExp(`(${field}):\\s*z\\.coerce\\.number\\((?:\\{(?:[^}]*)\\})?\\)(?:\\.min\\([^)]+\\))?(?:\\.positive\\([^)]*\\))?(?:\\.optional\\(\\))?(?:\\.nullable\\(\\))?`, 'g');
            content = content.replace(regZodNumber2, (match, p1) => {
                let replacement = `${p1}: z.string().min(1, 'Requerido')`;
                if (match.includes('.optional()')) replacement += '.optional()';
                if (match.includes('.nullable()')) replacement += '.nullable()';
                return replacement;
            });
        }

        // Fix parseInt React Hook Form Select:
        // onChange={val => field.onChange(parseInt(val, 10))} -> onValueChange={field.onChange}
        content = content.replace(/onValueChange=\{val => field\.onChange\(parseInt\(val, 10\)\)\}/g, 'onValueChange={field.onChange}');
        content = content.replace(/onValueChange=\{\(val\) => field\.onChange\(parseInt\(val, 10\)\)\}/g, 'onValueChange={field.onChange}');
        content = content.replace(/onChange=\{val => field\.onChange\(parseInt\(val, 10\)\)\}/g, 'onChange={field.onChange}');

        if (content !== original) {
            fs.writeFileSync(file, content);
            changedCount++;
            console.log(`Updated zod/parseInt in: ${file}`);
        }
    }
}

console.log(`Done. Updated ${changedCount} files.`);
