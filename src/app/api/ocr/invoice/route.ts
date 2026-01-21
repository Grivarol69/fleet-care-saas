import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { extractInvoiceData } from '@/lib/ocr/google-vision';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener archivo del FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no soportado. Use JPG, PNG o PDF' },
        { status: 400 }
      );
    }

    // Validar tamaño (máx 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande. Máximo 10MB' },
        { status: 400 }
      );
    }

    // Convertir archivo a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extraer datos de la factura con OCR
    const invoiceData = await extractInvoiceData(buffer);

    // Log para debugging
    console.log('[OCR Success]', {
      invoiceNumber: invoiceData.invoiceNumber,
      itemsFound: invoiceData.items.length,
      confidence: invoiceData.confidence,
    });

    return NextResponse.json({
      success: true,
      data: invoiceData,
    });
  } catch (error: unknown) {
    console.error('[OCR Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error procesando la factura',
      },
      { status: 500 }
    );
  }
}
