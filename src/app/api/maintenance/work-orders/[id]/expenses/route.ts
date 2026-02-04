
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FinancialWatchdogService } from "@/lib/services/FinancialWatchdogService";
import { z } from "zod";

// Schema validation for Expense
const expenseSchema = z.object({
    description: z.string().min(1),
    expenseType: z.enum(["PARTS", "LABOR", "TRANSPORT", "TOOLS", "MATERIALS", "SERVICE", "OTHER"]),
    amount: z.number().positive(),
    vendor: z.string().optional(),
    providerId: z.number().optional(),
    masterPartId: z.string().optional(), // If linked to a catalog part
    invoiceNumber: z.string().optional(),
});

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const json = await req.json();
        const body = expenseSchema.parse(json);
        const workOrderId = parseInt(params.id);

        // 1. Create the Expense
        const expense = await prisma.workOrderExpense.create({
            data: {
                workOrderId,
                description: body.description,
                expenseType: body.expenseType,
                amount: body.amount,
                vendor: body.vendor ?? null,
                providerId: body.providerId ?? null,
                invoiceNumber: body.invoiceNumber ?? null,
                recordedBy: user.id,
                status: "PENDING"
            }
        });

        // 2. Trigger Watchdog Checks
        // A. Price Deviation (Only if linked to a MasterPart - passed via body or inferred)
        if (body.masterPartId) {
            await FinancialWatchdogService.checkPriceDeviation(
                user.tenantId,
                body.masterPartId,
                body.amount, // Note: Logic might need unitPrice vs total. Assuming amount = total for simplicity here, or we need qty.
                undefined,
                workOrderId,
                body.description
            );
        }

        // B. Budget Overrun (Always check)
        await FinancialWatchdogService.checkBudgetOverrun(
            user.tenantId,
            workOrderId,
            body.amount
        );

        return NextResponse.json(expense);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 });
        }
        console.error("[WORK_ORDER_EXPENSE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const workOrderId = parseInt(params.id);

        const expenses = await prisma.workOrderExpense.findMany({
            where: { workOrderId },
            include: {
                provider: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(expenses);
    } catch (error) {
        console.error("[WORK_ORDER_EXPENSE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
