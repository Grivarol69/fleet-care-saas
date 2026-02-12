import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Devolver solo la información necesaria del usuario
        return NextResponse.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.tenantId,
            isSuperAdmin: user.isSuperAdmin,
        });
    } catch (error) {
        console.error("[AUTH_ME]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
