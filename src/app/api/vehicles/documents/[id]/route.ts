import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";
import { z } from 'zod';

// Schema for document update validation
const updateDocumentSchema = z.object({
  documentTypeId: z.number().int().positive().optional(),
  fileName: z.string().min(1).max(255).optional(),
  fileUrl: z.string().url().optional(),
  documentNumber: z.string().max(100).nullable().optional(),
  entity: z.string().max(100).nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'EXPIRING_SOON']).optional(),
}).strict();

// GET - Obtener Document específica por ID
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Validate id format (uuid)
    if (!id || typeof id !== 'string' || id.length < 20) {
      return NextResponse.json(
        { error: 'ID de documento inválido' },
        { status: 400 }
      );
    }

    const document = await prisma.document.findUnique({
      where: {
        id,
        tenantId: user.tenantId
      },
      include: {
        documentType: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("[DOCUMENT_GET]", error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH (update) a document by ID
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Validate id format
    if (!id || typeof id !== 'string' || id.length < 20) {
      return NextResponse.json(
        { error: 'ID de documento inválido' },
        { status: 400 }
      );
    }

    // Verify document exists and belongs to tenant
    const documentToUpdate = await prisma.document.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      }
    });

    if (!documentToUpdate) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Validate request body with Zod schema
    const validation = updateDocumentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Build update data with only validated fields
    const updateData: Record<string, unknown> = {};
    const validatedData = validation.data;

    if (validatedData.documentTypeId !== undefined) updateData.documentTypeId = validatedData.documentTypeId;
    if (validatedData.fileName !== undefined) updateData.fileName = validatedData.fileName;
    if (validatedData.fileUrl !== undefined) updateData.fileUrl = validatedData.fileUrl;
    if (validatedData.documentNumber !== undefined) updateData.documentNumber = validatedData.documentNumber;
    if (validatedData.entity !== undefined) updateData.entity = validatedData.entity;
    if (validatedData.expiryDate !== undefined) {
      updateData.expiryDate = validatedData.expiryDate ? new Date(validatedData.expiryDate) : null;
    }
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        documentType: true,
      },
    });

    return NextResponse.json(updatedDocument);

  } catch (error) {
    console.error("[DOCUMENT_PATCH]", error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE a document by ID
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Validate id format
    if (!id || typeof id !== 'string' || id.length < 20) {
      return NextResponse.json(
        { error: 'ID de documento inválido' },
        { status: 400 }
      );
    }

    // Verify document exists and belongs to tenant
    const documentToDelete = await prisma.document.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      }
    });

    if (!documentToDelete) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    await prisma.document.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Documento eliminado' });

  } catch (error) {
    console.error("[DOCUMENT_DELETE]", error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
