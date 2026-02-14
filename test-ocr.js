const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, 'credentials', 'google-vision-key.json'),
});

async function testOCR(filePath) {
  console.log('\n📄 PROBANDO OCR:', path.basename(filePath));
  console.log('='.repeat(70));

  try {
    const imageBuffer = fs.readFileSync(filePath);
    const [result] = await client.documentTextDetection(imageBuffer);

    console.log(
      '📊 Respuesta completa:',
      JSON.stringify(result, null, 2).substring(0, 500)
    );
    console.log(
      '📊 TextAnnotations length:',
      result.textAnnotations?.length || 0
    );

    const text = result.textAnnotations[0]?.description || '';

    if (!text) {
      console.log('❌ No se extrajo texto');
      console.log('⚠️  Resultado:', result);
      return;
    }

    console.log('✅ OCR EXITOSO - Caracteres extraídos:', text.length);
    console.log('\n📋 PRIMERAS 600 CARACTERES:');
    console.log('-'.repeat(70));
    console.log(text.substring(0, 600));
    console.log('-'.repeat(70));

    // Buscar datos clave
    const invoiceMatch = text.match(
      /(?:FACTURA.*?No\.?:?)\s*([A-Z]{2,4}\s*\d{4,})/i
    );
    const dateMatch = text.match(/\d{2}-[A-Za-z]{3}-\d{4}/);
    const lines = text.split('\n');
    const totalLine = lines.find(l => l.includes('TOTAL') && l.includes('$'));

    console.log('\n🔍 DATOS DETECTADOS:');
    console.log(
      '  📄 Número Factura:',
      invoiceMatch ? invoiceMatch[1].trim() : '❌ No detectado'
    );
    console.log('  📅 Fecha:', dateMatch ? dateMatch[0] : '❌ No detectada');
    console.log(
      '  💰 Total:',
      totalLine ? totalLine.trim() : '❌ No detectado'
    );

    return text;
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log(
        '\n⏳ La facturación aún no se propagó. Espera 2-3 minutos más.'
      );
    }
  }
}

(async () => {
  await testOCR('public/Factura de compra 1.pdf');
  console.log('\n' + '='.repeat(70) + '\n');
  await testOCR('public/Factura de Compra 2.pdf');
})();
