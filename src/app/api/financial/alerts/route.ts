
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AlertStatus } from "@prisma/client";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const searchParams = new URL(req.url).searchParams;
        const status = searchParams.get("status") as AlertStatus | null;

        const where: any = {
            tenantId: user.tenantId,
            // Default to showing only PENDING/ACKNOWLEDGED if not specified, 
            // or maybe just fetching all and letting frontend filter.
            // Let's fetch PENDING by default if no param.
            status: status ? status : { in: ['PENDING', 'ACKNOWLEDGED'] }
        };

        const alerts = await prisma.financialAlert.findMany({
            where,
            orderBy: [
                { severity: 'desc' }, // High severity first
                { createdAt: 'desc' }
            ],
            include: {
                workOrder: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                masterPart: {
                    select: {
                        code: true,
                        description: true
                    }
                }
            },
            take: 20 // Limit to recent 20
        });

        return NextResponse.json(alerts);
    } catch (error) {
        console.error("[FINANCIAL_ALERTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
