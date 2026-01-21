const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'fleet-care-ocr';
const LOCATION = 'us';
const PROCESSOR_ID = '48db182377d204cb';

const client = new DocumentProcessorServiceClient({
  keyFilename: path.join(__dirname, 'credentials', 'google-vision-key.json')
});

// Parser de montos colombianos
// Formato Colombia: 1.366.239,00 (punto = miles, coma = decimal)
// Excepciones: 31,000 podría ser 31000 (si solo tiene 3 dígitos después de coma)
function parseAmount(text) {
  let amountStr = text.replace(/[$\s]/g, '');

  // Si tiene coma
  if (amountStr.includes(',')) {
    const parts = amountStr.split(',');
    const decimals = parts[1] || '';

    // Si la parte decimal tiene exactamente 2 dígitos → es decimal
    // Ej: "1.366.239,00" → decimal
    if (decimals.length === 2) {
      amountStr = amountStr.replace(/\./g, '').replace(',', '.');
    }
    // Si tiene 3+ dígitos después de coma → la coma es separador de miles
    // Ej: "31,000" → 31000 (treinta y un mil)
    else {
      amountStr = amountStr.replace(/,/g, '');
    }
  }
  // Solo puntos (sin comas)
  else if (amountStr.includes('.')) {
    const parts = amountStr.split('.');
    const lastPart = parts[parts.length - 1];

    // Último grupo de 2 dígitos = decimal
    if (lastPart && lastPart.length === 2) {
      amountStr = parts.slice(0, -1).join('') + '.' + lastPart;
    } else {
      // Son separadores de miles
      amountStr = amountStr.replace(/\./g, '');
    }
  }

  const amount = parseFloat(amountStr);
  return !isNaN(amount) && amount > 0 ? amount : 0;
}

async function testDocumentAI(filePath) {
  console.log('\n📄 PROCESANDO CON DOCUMENT AI:', path.basename(filePath));
  console.log('='.repeat(70));

  try {
    const imageBuffer = fs.readFileSync(filePath);
    const name = `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`;

    const [result] = await client.processDocument({
      name,
      rawDocument: {
        content: imageBuffer,
        mimeType: 'image/png',
      },
    });

    const { document } = result;

    if (!document) {
      console.log('❌ No se pudo procesar el documento');
      return;
    }

    console.log('\n✅ DOCUMENTO PROCESADO\n');

    // Texto completo
    console.log('📝 TEXTO COMPLETO:');
    console.log('-'.repeat(70));
    console.log(document.text?.substring(0, 500) || 'Sin texto');
    console.log('...\n');

    // Entidades
    const entities = document.entities || [];
    console.log(`🔍 ENTIDADES DETECTADAS: ${entities.length}\n`);

    let invoiceNumber = null;
    let invoiceDate = null;
    let supplier = null;
    let subtotal = null;
    let tax = null;
    let total = null;
    const items = [];

    for (const entity of entities) {
      const type = entity.type || '';
      const mentionText = entity.mentionText || '';
      const confidence = (entity.confidence || 0).toFixed(2);

      console.log(`📌 ${type}`);
      console.log(`   Texto: "${mentionText}"`);
      console.log(`   Confianza: ${confidence}`);

      if (entity.normalizedValue?.moneyValue) {
        const money = entity.normalizedValue.moneyValue;
        console.log(`   Valor: ${money.units || 0} ${money.currencyCode || 'COP'}`);
      }

      if (entity.normalizedValue?.dateValue) {
        const date = entity.normalizedValue.dateValue;
        console.log(`   Fecha: ${date.year}-${date.month}-${date.day}`);
      }

      console.log('');

      // Guardar campos principales
      switch (type) {
        case 'invoice_id':
        case 'invoice_number':
          invoiceNumber = mentionText;
          break;
        case 'invoice_date':
          if (entity.normalizedValue?.dateValue) {
            const d = entity.normalizedValue.dateValue;
            invoiceDate = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
          }
          break;
        case 'supplier_name':
          supplier = mentionText;
          break;
        case 'net_amount':
          if (entity.normalizedValue?.moneyValue) {
            subtotal = parseFloat(entity.normalizedValue.moneyValue.units || '0');
          }
          break;
        case 'total_tax_amount':
          if (entity.normalizedValue?.moneyValue) {
            tax = parseFloat(entity.normalizedValue.moneyValue.units || '0');
          }
          break;
        case 'total_amount':
          if (entity.normalizedValue?.moneyValue) {
            total = parseFloat(entity.normalizedValue.moneyValue.units || '0');
          }
          break;
        case 'line_item':
          const properties = entity.properties || [];
          console.log(`   🔸 Properties: ${properties.length}`);

          let itemDesc = '';
          let itemQty = 0;
          let itemPrice = 0;
          let itemTotal = 0;

          for (const prop of properties) {
            const propType = prop.type || '';
            const propText = prop.mentionText || '';
            console.log(`      - ${propType}: "${propText}"`);

            if (propType.includes('description')) itemDesc = propText;
            if (propType.includes('product_code') && !itemDesc) itemDesc = propText;
            if (propType.includes('quantity')) {
              itemQty = parseFloat(propText.replace(/[^\d.-]/g, '')) || 0;
            }
            if (propType.includes('unit_price')) {
              if (prop.normalizedValue?.moneyValue) {
                itemPrice = parseFloat(prop.normalizedValue.moneyValue.units || '0');
              } else {
                itemPrice = parseAmount(propText);
              }
            }
            if (propType.includes('amount')) {
              if (prop.normalizedValue?.moneyValue) {
                itemTotal = parseFloat(prop.normalizedValue.moneyValue.units || '0');
              } else {
                itemTotal = parseAmount(propText);
              }
            }
          }

          // Validar cantidad razonable (filtrar "00", "000")
          if (itemQty < 0.001 || itemQty > 100000) {
            console.log(`      ⚠️ Item descartado (cantidad inválida: ${itemQty})`);
            break;
          }

          // Calcular precios faltantes
          if (itemTotal === 0 && itemPrice > 0) {
            itemTotal = itemQty * itemPrice;
          }
          if (itemPrice === 0 && itemTotal > 0 && itemQty > 0) {
            itemPrice = itemTotal / itemQty;
          }

          // Solo guardar si tiene descripción y precio válido
          if (itemDesc.length > 2 && (itemPrice > 0 || itemTotal > 0)) {
            items.push({
              description: itemDesc,
              quantity: itemQty,
              unitPrice: itemPrice,
              total: itemTotal
            });
          } else {
            console.log(`      ⚠️ Item descartado (sin descripción o precio)`);
          }
          break;
      }
    }

    // Resumen
    console.log('='.repeat(70));
    console.log('📊 RESUMEN EXTRAÍDO:\n');
    console.log(`Número Factura: ${invoiceNumber || 'No detectado'}`);
    console.log(`Fecha: ${invoiceDate || 'No detectada'}`);
    console.log(`Proveedor: ${supplier || 'No detectado'}`);
    console.log(`Subtotal: $${subtotal?.toLocaleString('es-CO') || 'No detectado'}`);
    console.log(`IVA: $${tax?.toLocaleString('es-CO') || 'No detectado'}`);
    console.log(`TOTAL: $${total?.toLocaleString('es-CO') || 'No detectado'}`);
    console.log(`\nItems detectados: ${items.length}`);

    if (items.length > 0) {
      console.log('\n🛒 LINE ITEMS:');
      console.log('-'.repeat(70));
      items.forEach((item, i) => {
        console.log(`${i + 1}. ${item.description}`);
        console.log(`   Cantidad: ${item.quantity}`);
        console.log(`   Precio Unit: $${item.unitPrice.toLocaleString('es-CO')}`);
        console.log(`   Total: $${item.total.toLocaleString('es-CO')}`);
        console.log('');
      });
    }

    console.log('='.repeat(70));
    console.log(`✅ Confianza promedio: ${(entities.reduce((sum, e) => sum + (e.confidence || 0), 0) / entities.length).toFixed(2)}`);

  } catch (error) {
    console.log('❌ ERROR:', error.message);
    if (error.code) console.log('   Código:', error.code);
  }
}

(async () => {
  await testDocumentAI('/home/grivarol69/Imágenes/Capturas de pantalla/Captura desde 2025-11-20 17-52-00.png');
  await testDocumentAI('/home/grivarol69/Imágenes/Capturas de pantalla/Captura desde 2025-11-20 17-52-29.png');
})();
