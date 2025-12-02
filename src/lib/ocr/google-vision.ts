import vision from '@google-cloud/vision';
import path from 'path';

// Inicializar cliente de Google Vision
const getVisionClient = () => {
  const keyFilePath = path.join(process.cwd(), 'credentials', 'google-vision-key.json');

  return new vision.ImageAnnotatorClient({
    keyFilename: keyFilePath,
  });
};

export interface OCRInvoiceData {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplier: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  confidence: number;
  rawText: string;
}

/**
 * Extrae texto de una imagen o PDF usando Google Vision API
 */
export async function extractTextFromImage(fileBuffer: Buffer): Promise<string> {
  const client = getVisionClient();

  const [result] = await client.documentTextDetection(fileBuffer);
  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) {
    throw new Error('No se pudo extraer texto de la imagen');
  }

  // El primer elemento contiene todo el texto detectado
  return detections[0]?.description || '';
}

/**
 * Extrae información estructurada de una factura
 */
export async function extractInvoiceData(fileBuffer: Buffer): Promise<OCRInvoiceData> {
  try {
    const rawText = await extractTextFromImage(fileBuffer);

    // Calcular confianza (básico)
    const confidence = rawText.length > 50 ? 0.85 : 0.5;

    return {
      invoiceNumber: extractInvoiceNumber(rawText),
      invoiceDate: extractDate(rawText),
      supplier: extractSupplier(rawText),
      items: extractItems(rawText),
      subtotal: extractAmount(rawText, ['subtotal', 'base', 'neto']),
      tax: extractAmount(rawText, ['iva', 'impuesto', 'tax']),
      total: extractAmount(rawText, ['total', 'valor total', 'a pagar']),
      confidence,
      rawText,
    };
  } catch (error) {
    console.error('[OCR Error]', error);
    throw new Error(`Error procesando factura: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extrae el número de factura
 */
function extractInvoiceNumber(text: string): string | null {
  // Patrones comunes en Colombia
  const patterns = [
    /(?:FACTURA.*?No\.?:?)\s*([A-Z]{2,4}\s*\d{4,})/i,
    /(TLM\s*\d{4,})/i, // Mercedes-Benz Taller
    /(ALM\s*\d{4,})/i, // Mercedes-Benz Almacén
    /([A-Z]{2,4}[-\s]\d{4,})/,
    /(FC[-\s]?\d{4,})/i,
    /(?:factura|fact|fac|invoice|n[uú]mero|no\.?)\s*[:.]?\s*([A-Z0-9\-\s]{3,20})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const number = match[1].trim().replace(/\s+/g, ' ');
      // Validar que tenga al menos un número
      if (/\d/.test(number)) {
        return number;
      }
    }
  }

  return null;
}

/**
 * Extrae la fecha de la factura
 */
function extractDate(text: string): string | null {
  // Mapa de meses en español
  const monthMap: { [key: string]: string } = {
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
    'jan': '01', 'apr': '04', 'aug': '08', 'dec': '12'
  };

  // Patrones de fecha
  const datePatterns = [
    // 05-Nov-2025
    /(\d{1,2})-([A-Za-z]{3})-(\d{4})/,
    // dd/mm/yyyy, dd-mm-yyyy
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // yyyy-mm-dd
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    // Con label
    /(?:fecha|date)[\s:]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Formato con mes texto (05-Nov-2025)
      if (match[2] && isNaN(Number(match[2]))) {
        const day = match[1].padStart(2, '0');
        const monthText = match[2].toLowerCase().substring(0, 3);
        const month = monthMap[monthText] || '01';
        const year = match[3];
        return `${year}-${month}-${day}`;
      }

      // Formato numérico
      const parts = [match[1], match[2], match[3]];

      // yyyy-mm-dd
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        // dd-mm-yyyy
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * Extrae el nombre del proveedor
 */
function extractSupplier(text: string): string | null {
  // Buscar líneas cerca del inicio (primeras 5 líneas)
  const lines = text.split('\n').slice(0, 10);

  // Buscar NIT (común en Colombia)
  const nitPattern = /NIT[\s:]*(\d{3,}[\-\s]?\d{1,})/i;
  const nitMatch = text.match(nitPattern);

  if (nitMatch) {
    // Buscar la línea anterior al NIT (suele ser el nombre)
    const nitIndex = text.indexOf(nitMatch[0]);
    const beforeNit = text.substring(0, nitIndex).split('\n');
    const possibleName = beforeNit[beforeNit.length - 1] || beforeNit[beforeNit.length - 2];

    if (possibleName && possibleName.length > 3 && possibleName.length < 50) {
      return possibleName.trim();
    }
  }

  // Fallback: primera línea con más de 10 caracteres
  for (const line of lines) {
    const cleaned = line.trim();
    if (cleaned.length > 10 && cleaned.length < 50 && !cleaned.match(/factura|invoice|fecha/i)) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Extrae items de la factura (tabla de productos/servicios)
 * Estrategia: buscar delimitadores de tabla (header y footer)
 */
function extractItems(text: string): Array<{
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}> {
  const items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }> = [];

  const lines = text.split('\n');

  // 1. Buscar inicio de tabla (headers comunes)
  const tableHeaderKeywords = [
    'descripci', 'item', 'producto', 'servicio', 'parte',
    'cant', 'precio', 'valor', 'total', 'ubicacion'
  ];

  let tableStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const matchCount = tableHeaderKeywords.filter(kw => line.includes(kw)).length;

    // Si la línea tiene 2+ keywords de tabla, es el header
    if (matchCount >= 2) {
      tableStartIndex = i + 1; // Empezar desde la siguiente línea
      break;
    }
  }

  // Si no encontramos header, no extraemos items
  if (tableStartIndex === -1) {
    return items;
  }

  // 2. Buscar fin de tabla (totales/footer)
  const tableFooterKeywords = [
    'subtotal', 'total', 'iva', 'impuesto', 'descuento',
    'base', 'neto', 'fletes', 'radicacion', 'resolucion'
  ];

  let tableEndIndex = lines.length;
  for (let i = tableStartIndex; i < lines.length; i++) {
    const line = lines[i].toLowerCase();

    // Si encuentra keyword de footer, termina la tabla
    if (tableFooterKeywords.some(kw => line.includes(kw))) {
      tableEndIndex = i;
      break;
    }
  }

  // 3. Extraer items solo entre el header y footer
  for (let i = tableStartIndex; i < tableEndIndex; i++) {
    const line = lines[i].trim();

    // Saltar líneas vacías o muy cortas
    if (line.length < 5) continue;

    // Patrón completo: descripción + cantidad + precio + total
    // Ej: "REFRIGERANTE ROJO G40 10121000 1.0000 19.00 0.00 51,370"
    const fullPattern = /^(.+?)\s+(\d[\d,\.]*)\s+(\d[\d,\.]+)\s+.*?(\d[\d,\.]+)$/;
    const fullMatch = line.match(fullPattern);

    if (fullMatch) {
      const description = fullMatch[1].trim();
      const quantityStr = fullMatch[2].replace(/[,\.]/g, '');
      const priceStr = fullMatch[3].replace(/[,\.]/g, '');
      const totalStr = fullMatch[4].replace(/[,\.]/g, '');

      const quantity = parseInt(quantityStr) || 1;
      const unitPrice = parseFloat(priceStr);
      const total = parseFloat(totalStr);

      // Validar que tiene sentido como item
      if (description.length > 3 && unitPrice > 100 && total > 100) {
        items.push({
          description,
          quantity,
          unitPrice,
          total,
        });
      }
    } else {
      // Patrón simple: descripción + monto final
      const simplePattern = /^(.+?)\s+(\d[\d,\.]+)$/;
      const simpleMatch = line.match(simplePattern);

      if (simpleMatch) {
        const description = simpleMatch[1].trim();
        const amountStr = simpleMatch[2].replace(/[,\.]/g, '');
        const amount = parseFloat(amountStr);

        // Validar que es un monto razonable y descripción tiene longitud suficiente
        if (description.length > 5 && amount > 1000 && amount < 100000000) {
          items.push({
            description,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          });
        }
      }
    }
  }

  return items;
}

/**
 * Extrae un monto buscando palabras clave
 * Formato colombiano: 1.366.239,00 o $753,583
 * Busca el ÚLTIMO match para evitar tomar totales parciales
 */
function extractAmount(text: string, keywords: string[]): number | null {
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
