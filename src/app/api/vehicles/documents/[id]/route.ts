import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP

// PATCH (update) a document by ID
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const documentToUpdate = await prisma.document.findFirst({
            where: {
                id: params.id,
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
                id: params.id,
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
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const documentToDelete = await prisma.document.findFirst({
            where: {
                id: params.id,
                tenantId: TENANT_ID,
            }
        });

        if (!documentToDelete) {
            return new NextResponse("Document not found", { status: 404 });
        }

        await prisma.document.delete({
            where: {
                id: params.id,
            }
        });

        return new NextResponse("Document deleted", { status: 200 });

    } catch (error) {
        console.error("[DOCUMENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
