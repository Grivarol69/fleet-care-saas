import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import path from 'path';

// Configuración del procesador
const PROJECT_ID = 'fleet-care-ocr';
const LOCATION = 'us';
const PROCESSOR_ID = '48db182377d204cb';

// Cliente de Document AI
const getDocumentAIClient = () => {
  const keyFilePath = path.join(process.cwd(), 'credentials', 'google-vision-key.json');

  return new DocumentProcessorServiceClient({
    keyFilename: keyFilePath,
  });
};

export interface DocumentAIInvoiceData {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplier: string | null;
  supplierAddress: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  confidence: number;
  rawText: string;
}

/**
 * Extrae información estructurada de una factura usando Document AI
 */
export async function extractInvoiceDataWithDocumentAI(
  fileBuffer: Buffer,
  mimeType: string = 'image/png'
): Promise<DocumentAIInvoiceData> {
  try {
    const client = getDocumentAIClient();

    // Nombre completo del procesador
    const name = `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`;

    // Procesar documento
    const [result] = await client.processDocument({
      name,
      rawDocument: {
        content: fileBuffer,
        mimeType,
      },
    });

    const { document } = result;

    if (!document) {
      throw new Error('No se pudo procesar el documento');
    }

    // Extraer texto completo
    const rawText = document.text || '';

    // Extraer entidades detectadas
    const entities = document.entities || [];

    // Mapeo de entidades
    let invoiceNumber: string | null = null;
    let invoiceDate: string | null = null;
    let supplier: string | null = null;
    let supplierAddress: string | null = null;
    let subtotal: number | null = null;
    let tax: number | null = null;
    let total: number | null = null;
    let currency: string | null = null;
    const items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    // Procesar entidades principales
    for (const entity of entities) {
      const type = entity.type || '';
      const mentionText = entity.mentionText || '';
      const normalizedValue = entity.normalizedValue;

      switch (type) {
        case 'invoice_id':
        case 'invoice_number':
          invoiceNumber = mentionText;
          break;

        case 'invoice_date':
          // Preferir normalizedValue si existe (formato ISO)
          if (normalizedValue?.dateValue) {
            const dateValue = normalizedValue.dateValue;
            invoiceDate = `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
          } else {
            invoiceDate = mentionText;
          }
          break;

        case 'supplier_name':
        case 'receiver_name':
          supplier = mentionText;
          break;

        case 'supplier_address':
        case 'receiver_address':
          supplierAddress = mentionText;
          break;

        case 'net_amount':
        case 'total_amount':
          if (normalizedValue?.moneyValue) {
            const amount = parseFloat(normalizedValue.moneyValue.units || '0');
            const nanos = parseFloat(normalizedValue.moneyValue.nanos || '0') / 1e9;
            subtotal = amount + nanos;
            currency = normalizedValue.moneyValue.currencyCode || 'COP';
          } else {
            subtotal = parseAmount(mentionText);
          }
          break;

        case 'total_tax_amount':
          if (normalizedValue?.moneyValue) {
            const amount = parseFloat(normalizedValue.moneyValue.units || '0');
            const nanos = parseFloat(normalizedValue.moneyValue.nanos || '0') / 1e9;
            tax = amount + nanos;
          } else {
            tax = parseAmount(mentionText);
          }
          break;

        case 'total_amount':
          if (normalizedValue?.moneyValue) {
            const amount = parseFloat(normalizedValue.moneyValue.units || '0');
            const nanos = parseFloat(normalizedValue.moneyValue.nanos || '0') / 1e9;
            total = amount + nanos;
          } else {
            total = parseAmount(mentionText);
          }
          break;

        case 'line_item':
          // Los line_item tienen propiedades anidadas
          const itemData = extractLineItem(entity);
          if (itemData) {
            items.push(itemData);
          }
          break;
      }
    }

    // Calcular confianza promedio
    const confidence = document.entities && document.entities.length > 0
      ? document.entities.reduce((sum, e) => sum + (e.confidence || 0), 0) / document.entities.length
      : 0;

    return {
      invoiceNumber,
      invoiceDate,
      supplier,
      supplierAddress,
      items,
      subtotal,
      tax,
      total,
      currency: currency || 'COP',
      confidence,
      rawText,
    };
  } catch (error) {
    console.error('[Document AI Error]', error);
    throw new Error(
      `Error procesando factura con Document AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extrae información de un line_item
 */
function extractLineItem(entity: unknown): {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
} | null {
  let description = '';
  let productCode = '';
  let quantity = 1;
  let unitPrice = 0;
  let total = 0;

  // Buscar propiedades del line_item
  const properties = entity.properties || [];

  for (const prop of properties) {
    const type = prop.type || '';
    const mentionText = prop.mentionText || '';
    const normalizedValue = prop.normalizedValue;

    switch (type) {
      case 'line_item/description':
        description = mentionText;
        break;

      case 'line_item/product_code':
        productCode = mentionText;
        break;

      case 'line_item/quantity':
        const qtyStr = mentionText.replace(/[^\d.-]/g, '');
        quantity = parseFloat(qtyStr) || 1;
        break;

      case 'line_item/unit_price':
        if (normalizedValue?.moneyValue) {
          const amount = parseFloat(normalizedValue.moneyValue.units || '0');
          const nanos = parseFloat(normalizedValue.moneyValue.nanos || '0') / 1e9;
          unitPrice = amount + nanos;
        } else {
          unitPrice = parseAmount(mentionText);
        }
        break;

      case 'line_item/amount':
        if (normalizedValue?.moneyValue) {
          const amount = parseFloat(normalizedValue.moneyValue.units || '0');
          const nanos = parseFloat(normalizedValue.moneyValue.nanos || '0') / 1e9;
          total = amount + nanos;
        } else {
          total = parseAmount(mentionText);
        }
        break;
    }
  }

  // Usar product_code como descripción si no hay descripción
  if (!description && productCode) {
    description = productCode;
  }

  // Validar cantidad razonable (filtrar "00", "000", etc.)
  if (quantity < 0.001 || quantity > 100000) {
    return null;
  }

  // Validar que tenga descripción O al menos precio/total válidos
  if (description.length > 2 && (unitPrice > 0 || total > 0)) {
    // Si falta el total, calcularlo
    if (total === 0 && unitPrice > 0) {
      total = quantity * unitPrice;
    }
    // Si falta el unitPrice, calcularlo
    if (unitPrice === 0 && total > 0 && quantity > 0) {
      unitPrice = total / quantity;
    }

    return {
      description,
      quantity,
      unitPrice,
      total,
    };
  }

  return null;
}

/**
 * Parsear montos en formato colombiano
 * Formato: 1.366.239,00 o $753,583
 */
function parseAmount(text: string): number {
  // Remover símbolos de moneda y espacios
  let amountStr = text.replace(/[$\s]/g, '');

  // Si tiene coma, es separador decimal
  if (amountStr.includes(',')) {
    // Remover puntos (miles) y reemplazar coma por punto (decimal)
    amountStr = amountStr.replace(/\./g, '').replace(',', '.');
  } else if (amountStr.includes('.')) {
    // Solo puntos, pueden ser miles o decimal
    const parts = amountStr.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length === 2) {
      // Último grupo de 2 dígitos = decimal
      amountStr = parts.slice(0, -1).join('') + '.' + lastPart;
    } else {
      // Son separadores de miles
      amountStr = amountStr.replace(/\./g, '');
    }
  }

  const amount = parseFloat(amountStr);
  return !isNaN(amount) && amount > 0 ? amount : 0;
}
