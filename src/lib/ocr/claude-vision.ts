import Anthropic from '@anthropic-ai/sdk';

export interface InvoiceOCRItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceOCRResult {
  invoiceNumber?: string;
  invoiceDate?: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  supplierName?: string;
  supplierNit?: string;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  items?: InvoiceOCRItem[];
  confidence: number; // 0-100
}

export interface DocumentOCRResult {
  documentNumber?: string;
  entity?: string;
  issueDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  documentType?: string;
  vehiclePlate?: string;
  confidence: number; // 0-100
}

async function fetchFileAsBase64(
  url: string
): Promise<{ data: string; mediaType: string }> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const data = Buffer.from(buffer).toString('base64');
  const contentType = response.headers.get('content-type') ?? 'application/pdf';

  let mediaType: string;
  if (contentType.includes('pdf')) {
    mediaType = 'application/pdf';
  } else if (contentType.includes('png')) {
    mediaType = 'image/png';
  } else if (contentType.includes('webp')) {
    mediaType = 'image/webp';
  } else {
    mediaType = 'image/jpeg';
  }

  return { data, mediaType };
}

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[OCR] ANTHROPIC_API_KEY not set — OCR skipped');
    return null;
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function buildContentBlock(
  data: string,
  mediaType: string
): Anthropic.MessageParam['content'] {
  if (mediaType === 'application/pdf') {
    return [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data,
        },
      },
    ];
  }
  return [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
        data,
      },
    },
  ];
}

export async function extractInvoiceData(
  fileUrl: string
): Promise<InvoiceOCRResult> {
  try {
    const client = getClient();
    if (!client) return { confidence: 0 };

    const { data, mediaType } = await fetchFileAsBase64(fileUrl);
    const fileContent = buildContentBlock(data, mediaType);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            ...(fileContent as Anthropic.ContentBlockParam[]),
            {
              type: 'text',
              text: `Analiza esta factura y extrae la información en formato JSON con esta estructura exacta. Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown:
{
  "invoiceNumber": "número de factura o null",
  "invoiceDate": "fecha de emisión en formato YYYY-MM-DD o null",
  "dueDate": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "supplierName": "nombre del proveedor o empresa emisora o null",
  "supplierNit": "NIT o RUT del proveedor o null",
  "subtotal": número sin IVA o null,
  "taxAmount": monto del IVA o null,
  "total": monto total a pagar o null,
  "items": [
    {
      "description": "descripción del ítem",
      "quantity": número,
      "unitPrice": precio unitario como número,
      "total": total del ítem como número
    }
  ],
  "confidence": número del 0 al 100 indicando confianza en la extracción
}`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content[0];
    const text = textBlock?.type === 'text' ? textBlock.text : '{}';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleaned) as InvoiceOCRResult;

    return { ...result, confidence: result.confidence ?? 60 };
  } catch (error) {
    console.error('[OCR_INVOICE] Error:', error);
    return { confidence: 0 };
  }
}

export async function extractDocumentData(
  fileUrl: string
): Promise<DocumentOCRResult> {
  try {
    const client = getClient();
    if (!client) return { confidence: 0 };

    const { data, mediaType } = await fetchFileAsBase64(fileUrl);
    const fileContent = buildContentBlock(data, mediaType);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: [
            ...(fileContent as Anthropic.ContentBlockParam[]),
            {
              type: 'text',
              text: `Analiza este documento de vehículo (puede ser SOAT, Tecnomecánica, seguro, licencia de tránsito, etc.) y extrae la información. Responde SOLO con JSON válido, sin texto adicional ni bloques de código markdown:
{
  "documentNumber": "número o código del documento o null",
  "entity": "nombre de la entidad emisora (aseguradora, CDA, Secretaría de Tránsito, etc.) o null",
  "issueDate": "fecha de expedición en formato YYYY-MM-DD o null",
  "expiryDate": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "documentType": "tipo detectado: SOAT, TECNOMECANICA, SEGURO, LICENCIA_TRANSITO u otro o null",
  "vehiclePlate": "placa del vehículo si está visible o null",
  "confidence": número del 0 al 100
}`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content[0];
    const text = textBlock?.type === 'text' ? textBlock.text : '{}';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleaned) as DocumentOCRResult;

    return { ...result, confidence: result.confidence ?? 60 };
  } catch (error) {
    console.error('[OCR_DOCUMENT] Error:', error);
    return { confidence: 0 };
  }
}
