const fs = require('fs');
const path = require('path');

// Importar la función usando require (para módulos TypeScript necesitamos compilar primero)
// Por ahora vamos a simular directamente

const vision = require('@google-cloud/vision');

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, 'credentials', 'google-vision-key.json')
});

async function extractInvoiceData(imageBuffer) {
  const [result] = await client.documentTextDetection(imageBuffer);
  const rawText = result.textAnnotations[0]?.description || '';

  if (!rawText) {
    throw new Error('No se pudo extraer texto de la imagen');
  }

  return {
    invoiceNumber: extractInvoiceNumber(rawText),
    invoiceDate: extractDate(rawText),
    supplier: extractSupplier(rawText),
    total: extractAmount(rawText, ['total', 'valor total']),
    subtotal: extractAmount(rawText, ['subtotal', 'base']),
    tax: extractAmount(rawText, ['iva']),
    rawText: rawText.substring(0, 500)
  };
}

function extractInvoiceNumber(text) {
  const patterns = [
    /(?:FACTURA.*?No\.?:?)\s*([A-Z]{2,4}\s*\d{4,})/i,
    /(TLM\s*\d{4,})/i,
    /(ALM\s*\d{4,})/i,
    /([A-Z]{2,4}[-\s]\d{4,})/,
    /(FC[-\s]?\d{4,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const number = match[1].trim().replace(/\s+/g, ' ');
      if (/\d/.test(number)) {
        return number;
      }
    }
  }

  return null;
}

function extractDate(text) {
  const monthMap = {
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
    'jan': '01', 'apr': '04', 'aug': '08', 'dec': '12'
  };

  // Patrones
  const patterns = [
    /(\d{1,2})-([A-Za-z]{3})-(\d{4})/,  // 05-Nov-2025
    /(\d{1,2})-(\d{1,2})-(\d{4})/,      // 31-07-2025
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,    // 31/07/2025
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const [_, day, monthOrName, year] = match;

      // Si es nombre de mes
      if (isNaN(monthOrName)) {
        const monthKey = monthOrName.toLowerCase().substring(0, 3);
        const month = monthMap[monthKey];
        if (month) {
          return `${year}-${month}-${day.padStart(2, '0')}`;
        }
      } else {
        // Es número de mes
        return `${year}-${monthOrName.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }

  return null;
}

function extractSupplier(text) {
  const lines = text.split('\n');

  // Buscar línea con "Mercedes-Benz" o "Autoniza"
  for (const line of lines) {
    if (/autoniza/i.test(line)) {
      return 'Autoniza S.A.';
    }
    if (/mercedes/i.test(line) && line.length < 50) {
      return 'Mercedes-Benz Colombia';
    }
  }

  return null;
}

function extractAmount(text, keywords) {
  for (const keyword of keywords) {
    // Buscar TODOS los matches con global flag
    const pattern = new RegExp(`${keyword}[\\s:]*\\$?\\s*([\\d,\\.]+)`, 'gi');
    const matches = Array.from(text.matchAll(pattern));

    if (matches.length > 0) {
      // Tomar el ÚLTIMO match (usualmente el total final)
      const lastMatch = matches[matches.length - 1];
      let amountStr = lastMatch[1];

      // Formato colombiano: puntos = miles, coma = decimal
      // Ej: 1.366.239,00 o 753,583

      // Si tiene coma, es separador decimal
      if (amountStr.includes(',')) {
        // Remover puntos (miles) y reemplazar coma por punto (decimal)
        amountStr = amountStr.replace(/\./g, '').replace(',', '.');
      } else if (amountStr.includes('.')) {
        // Solo puntos, pueden ser miles o decimal
        const parts = amountStr.split('.');
        if (parts[parts.length - 1].length === 2) {
          // Último grupo de 2 dígitos = decimal
          amountStr = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
        } else {
          // Son separadores de miles
          amountStr = amountStr.replace(/\./g, '');
        }
      }

      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return null;
}

async function testOCR(filePath) {
  console.log('\n📄 PROBANDO OCR:', path.basename(filePath));
  console.log('='.repeat(70));

  try {
    const imageBuffer = fs.readFileSync(filePath);
    const data = await extractInvoiceData(imageBuffer);

    console.log('✅ EXTRACCIÓN EXITOSA\n');
    console.log('📋 DATOS EXTRAÍDOS:');
    console.log('  📄 Número Factura:', data.invoiceNumber || '❌ No detectado');
    console.log('  📅 Fecha:', data.invoiceDate || '❌ No detectada');
    console.log('  🏢 Proveedor:', data.supplier || '❌ No detectado');
    console.log('  💰 Subtotal:', data.subtotal ? `$${data.subtotal.toLocaleString('es-CO')}` : '❌ No detectado');
    console.log('  💵 IVA:', data.tax ? `$${data.tax.toLocaleString('es-CO')}` : '❌ No detectado');
    console.log('  💰 TOTAL:', data.total ? `$${data.total.toLocaleString('es-CO')}` : '❌ No detectado');

    console.log('\n📝 Muestra del texto:');
    console.log(data.rawText);

  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

(async () => {
  await testOCR('/home/grivarol69/Imágenes/Capturas de pantalla/Captura desde 2025-11-20 17-52-00.png');
  console.log('\n' + '='.repeat(70) + '\n');
  await testOCR('/home/grivarol69/Imágenes/Capturas de pantalla/Captura desde 2025-11-20 17-52-29.png');
})();
