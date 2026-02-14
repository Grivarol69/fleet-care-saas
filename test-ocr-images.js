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

    const text = result.textAnnotations[0]?.description || '';

    if (!text) {
      console.log('❌ No se extrajo texto');
      console.log('⚠️  Error:', result.error);
      return;
    }

    console.log('✅ OCR EXITOSO - Caracteres extraídos:', text.length);
    console.log('\n📋 ÚLTIMOS 600 CARACTERES (donde están los totales):');
    console.log('-'.repeat(70));
    console.log(text.substring(text.length - 600));
    console.log('-'.repeat(70));

    // Buscar datos clave
    const invoiceMatch = text.match(
      /(?:FACTURA.*?No\.?.*?:?)\s*([A-Z]{2,4}\s*\d{4,})/i
    );
    const dateMatch = text.match(/\d{2}-[A-Za-z]{3}-\d{4}/);
    const lines = text.split('\n');
    const totalLine = lines.find(
      l => l.includes('TOTAL') && /\$?\d+[,.]?\d+/.test(l)
    );

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
  }
}

(async () => {
  await testOCR(
    '/home/grivarol69/Imágenes/Capturas de pantalla/Captura desde 2025-11-20 17-52-00.png'
  );
  console.log('\n' + '='.repeat(70) + '\n');
  await testOCR(
    '/home/grivarol69/Imágenes/Capturas de pantalla/Captura desde 2025-11-20 17-52-29.png'
  );
})();
