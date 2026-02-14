const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, 'credentials', 'google-vision-key.json'),
});

async function showFullText(filePath) {
  console.log('\n📄 TEXTO COMPLETO:', path.basename(filePath));
  console.log('='.repeat(70));

  try {
    const imageBuffer = fs.readFileSync(filePath);
    const [result] = await client.documentTextDetection(imageBuffer);
    const text = result.textAnnotations[0]?.description || '';

    if (!text) {
      console.log('❌ No se extrajo texto');
      return;
    }

    console.log(text);
    console.log('\n' + '='.repeat(70));
    console.log(`Total caracteres: ${text.length}`);
    console.log(`Total líneas: ${text.split('\n').length}`);
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

(async () => {
  await showFullText(
    '/home/grivarol69/Imágenes/Capturas de pantalla/Captura desde 2025-11-20 17-52-00.png'
  );
})();
