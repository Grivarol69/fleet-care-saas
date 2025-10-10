import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

// GET - Obtener Document específica por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const document = await prisma.document.findUnique({
            where: {
                id,
                tenantId: TENANT_ID
            }
        });

        if (!document) {
            return new NextResponse("Document not found", { status: 404 });
        }

        return NextResponse.json(document);
    } catch (error) {
        console.error("[DOCUMENT_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PATCH (update) a document by ID
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const documentToUpdate = await prisma.document.findFirst({
            where: {
                id,
                tenantId: TENANT_ID,
            }
        });

        if (!documentToUpdate) {
            return new NextResponse("Document not found", { status: 404 });
        }

        const body = await req.json();
        const { expiryDate, ...otherData } = body;

        const updatedDocument = await prisma.document.update({
            where: {
                id,
            },
            data: {
                ...otherData,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
            }
        });

        return NextResponse.json(updatedDocument);

    } catch (error) {
        console.error("[DOCUMENT_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE a document by ID
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const documentToDelete = await prisma.document.findFirst({
            where: {
                id,
                tenantId: TENANT_ID,
            }
        });

        if (!documentToDelete) {
            return new NextResponse("Document not found", { status: 404 });
        }

        await prisma.document.delete({
            where: {
                id,
            }
        });

        return new NextResponse("Document deleted", { status: 200 });

    } catch (error) {
        console.error("[DOCUMENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
