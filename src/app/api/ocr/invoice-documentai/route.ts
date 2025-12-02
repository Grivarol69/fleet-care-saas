import { NextRequest, NextResponse } from 'next/server';
import { extractInvoiceDataWithDocumentAI } from '@/lib/ocr/document-ai';
import { getCurrentUser } from '@/lib/auth';

export const maxDuration = 30; // Document AI puede tardar más que Vision

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener archivo
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no soportado. Use PNG, JPG o PDF' },
        { status: 400 }
      );
    }

    // Convertir a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Procesar con Document AI
    console.log('[Document AI] Procesando factura...', {
      fileName: file.name,
      fileType: file.type,
      fileSize: buffer.length,
    });

    const invoiceData = await extractInvoiceDataWithDocumentAI(buffer, file.type);

    console.log('[Document AI] Factura procesada:', {
      invoiceNumber: invoiceData.invoiceNumber,
      itemsCount: invoiceData.items.length,
      confidence: invoiceData.confidence,
    });

    return NextResponse.json({
      success: true,
      data: invoiceData,
    });
  } catch (error) {
    console.error('[Document AI API Error]', error);

    return NextResponse.json(
      {
        error: 'Error procesando factura',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
