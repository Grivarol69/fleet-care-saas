import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ocrService } from '@/lib/services/ai/ocr.service';
import { z } from 'zod';

const ocrRequestSchema = z.object({
  image: z.string().min(1, 'Imagen requerida'),
  options: z.object({
    enhance: z.boolean().default(true),
    detectRotation: z.boolean().default(true),
    multipleReceipts: z.boolean().default(false),
    language: z.enum(['es', 'en']).default('es'),
    domain: z.enum(['automotive', 'general']).default('automotive'),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = ocrRequestSchema.parse(body);

    // Verificar que la imagen esté en formato base64 válido
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif);base64,/;
    if (!base64Regex.test(validatedData.image)) {
      return NextResponse.json(
        { error: 'Formato de imagen inválido. Debe ser base64 con prefijo data:image/' },
        { status: 400 }
      );
    }

    // Extraer solo la parte base64 (sin el prefijo data:image/...)
    const base64Data = validatedData.image.split(',')[1];

    // Verificar tamaño de imagen (máximo 10MB)
    const imageSizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    if (imageSizeBytes > maxSizeBytes) {
      return NextResponse.json(
        { error: 'Imagen muy grande. Máximo 10MB permitido' },
        { status: 400 }
      );
    }

    // Procesar imagen con OCR
    const result = await ocrService.analyzeReceipt(
      base64Data,
      validatedData.options
    );

    // Log para auditoría (opcional)
    console.log(`OCR processed for user ${session.user.id}, confidence: ${result.confidence}`);

    return NextResponse.json({
      success: true,
      result,
      metadata: {
        processingTime: result.processingTime,
        confidence: result.confidence,
        qualityScore: result.qualityScore,
        serviceConfigured: ocrService.isReady(),
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('OCR processing error:', error);
    return NextResponse.json(
      {
        error: 'Error procesando imagen',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Retornar estado de configuración del servicio OCR
    const configStatus = ocrService.getConfigurationStatus();

    return NextResponse.json({
      status: 'active',
      configuration: configStatus,
      capabilities: {
        supportedFormats: ['jpeg', 'jpg', 'png'],
        maxFileSize: '10MB',
        languages: ['es', 'en'],
        domains: ['automotive', 'general'],
      },
      limits: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
      },
    });

  } catch (error) {
    console.error('OCR status error:', error);
    return NextResponse.json(
      { error: 'Error obteniendo estado del servicio' },
      { status: 500 }
    );
  }
}