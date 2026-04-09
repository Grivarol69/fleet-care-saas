import fs from 'fs';

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');

    if (filePath.includes('quick-seed.ts')) {
        content = content.replace(/id: (\d+)/g, "id: '$1'");
        content = content.replace(/brandId: (\d+)/g, "brandId: '$1'");
        content = content.replace(/lineId: (\d+)/g, "lineId: '$1'");
        content = content.replace(/typeId: (\d+)/g, "typeId: '$1'");
        content = content.replace(/categoryId: (\d+)/g, "categoryId: '$1'");
        content = content.replace(/templateId: (\d+)/g, "templateId: '$1'");
        content = content.replace(/packageId: (\d+)/g, "packageId: '$1'");
        content = content.replace(/mantItemId: (\d+)/g, "mantItemId: '$1'");
    }

    if (filePath.includes('test-circuit4-vehicles-documents.ts')) {
        content = content.replace(/where: { id: (\d+) },/g, "where: { id: '$1' },");
        content = content.replace(/where: { id: cleanup.([a-zA-Z]+)Id },/g, "where: { id: cleanup.$1Id },"); // This error might be about the cleanup type
        content = content.replace(/vehicleId\?: number;/g, "vehicleId?: string;");
        content = content.replace(/documentTypeId\?: number;/g, "documentTypeId?: string;");
        content = content.replace(/odometerId\?: number;/g, "odometerId?: string;");
    }

    fs.writeFileSync(filePath, content, 'utf-8');
}

fixFile('scripts/quick-seed.ts');
fixFile('scripts/test-circuit4-vehicles-documents.ts');
console.log('Fixed seeds and testing script ID integer literals');
