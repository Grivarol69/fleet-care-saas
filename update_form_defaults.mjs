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

        // Fix defaultValues: fieldId: 0 -> fieldId: ''
        for (const field of ID_FIELDS) {
            const reg0 = new RegExp(`(${field}:\\s*)0([,\\n])`, 'g');
            content = content.replace(reg0, `$1''$2`);

            const regNull = new RegExp(`(${field}:\\s*)null([,\\n])`, 'g');
            // If the field is an ID, and we are assigning default string values, well if it's optional it might be '' or null.
            // Usually default 0 was replaced by '' in string inputs. Let's keep null as null, unless it was 0!
        }

        // Fix React Hook Form Select:
        // onChange={value => field.onChange(Number(value))} -> onValueChange={field.onChange}
        // actually it's usually onValueChange={...}
        content = content.replace(/onValueChange=\{value => field\.onChange\(Number\(value\)\)\}/g, 'onValueChange={field.onChange}');
        content = content.replace(/onValueChange=\{\(value\) => field\.onChange\(Number\(value\)\)\}/g, 'onValueChange={field.onChange}');
        content = content.replace(/onChange=\{e => field\.onChange\(Number\(e\.target\.value\)\)\}/g, 'onChange={e => field.onChange(e.target.value)}');
        content = content.replace(/onChange=\{\(e\) => field\.onChange\(Number\(e\.target\.value\)\)\}/g, 'onChange={e => field.onChange(e.target.value)}');

        // Fix value check: value={field.value > 0 ? field.value.toString() : ''}
        content = content.replace(/value=\{field\.value > 0 \? field\.value\.toString\(\) : ''\}/g, "value={field.value || ''}");

        // Fix value={field.value ? field.value.toString() : ''} if value is already string
        // content = content.replace(/value=\{field\.value \? field\.value\.toString\(\) : ''\}/g, "value={field.value || ''}");

        // Fix value={field.value?.toString() || ''} is generally fine but we can leave it.

        if (content !== original) {
            fs.writeFileSync(file, content);
            changedCount++;
            console.log(`Updated form defaults in: ${file}`);
        }
    }
}

console.log(`Done. Updated ${changedCount} files.`);
