const fs = require('fs');
const files = [
    'src/app/api/vehicles/types/route.ts',
    'src/app/api/vehicles/brands/route.ts',
    'src/app/api/vehicles/lines/route.ts',
    'src/app/api/maintenance/mant-items/route.ts',
    'src/app/api/maintenance/mant-template/route.ts',
    'src/app/api/maintenance/mant-categories/route.ts',
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\{\s*\}\s*,\s*\/\/\s*([^\n]*tenant[^\n]*)/g, "{ tenantId: user.tenantId }, // $1");
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
}
