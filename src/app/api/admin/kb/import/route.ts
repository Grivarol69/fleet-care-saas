import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { anthropic } from "@/lib/ai/anthropic";
import { AIKBProposalSchema } from "@/lib/validations/kb-ai";

// Vercel Serverless maximum duration config for Pro/Hobby
// In a true environment, processing a large PDF by Claude could take +30s.
export const maxDuration = 60; // Max allowed for Vercel Hobby is 10s, Pro is 300s. We set 60s as a hopeful middle ground if Pro is active.

export async function POST(req: NextRequest) {
    try {
        // 1. Verify User Role -> SUPER_ADMIN
        const authRecord = await requireCurrentUser();
        if (!authRecord?.user || authRecord.user.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden: SUPER_ADMIN role required." }, { status: 403 });
        }

        // 2. Parse FormData
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // In a full implementation, PDF would need to be passed as base64 to Claude Vision
        // Current Anthropic SDK API expects image/jpeg, image/png, image/webp, image/gif formats for Vision messages
        // If the file is a PDF, it might require pre-processing or using the new 'document' block if supported by the library.
        const fileBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(fileBuffer).toString("base64");

        // Simplification for images first (PDF support via Claude requires the specific beta headers or API structure)
        // We assume the frontend might send images of the manual or the PDF.
        const mediaType = file.type === "application/pdf" ? "application/pdf" :
            (file.type.startsWith("image/") ? file.type : "image/jpeg");

        // 3. Call Anthropic Claude API using tools to enforce JSON output matching our schema
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4096,
            temperature: 0,
            system: `Eres un asistente experto en ingeniería mecánica automotriz especializado en manuales de servicio.
Tu objetivo es extraer planes de mantenimiento preventivo estructurados a partir de los documentos provistos.
Usa la herramienta proporcionada para estructurar la respuesta JSON.`,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Por favor, extrae el plan de mantenimiento preventivo y los repuestos requeridos (con números de parte OEM si aplican) de este documento/manual."
                        },
                        {
                            type: mediaType.startsWith("image") ? "image" : "document" as any,
                            source: {
                                type: "base64",
                                media_type: mediaType as any,
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
            tools: [
                {
                    name: "output_maintenance_plan",
                    description: "Genera el plan de mantenimiento estructurado extraído del manual.",
                    input_schema: {
                        type: "object",
                        properties: {
                            vehicleInfo: {
                                type: "object",
                                properties: {
                                    brand: { type: "string" },
                                    model: { type: "string" },
                                    engine: { type: "string" },
                                    years: { type: "string" }
                                },
                                required: ["brand", "model"]
                            },
                            maintenanceItems: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        type: { type: "string", enum: ["PREVENTIVE", "CORRECTIVE", "PREDICTIVE", "EMERGENCY"] },
                                        intervalKm: { type: ["number", "null"] },
                                        intervalMonths: { type: ["number", "null"] },
                                        partsRequired: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: { type: "string" },
                                                    partNumber: { type: "string" },
                                                    quantity: { type: "number" }
                                                },
                                                required: ["name", "quantity"]
                                            }
                                        }
                                    },
                                    required: ["name", "type"]
                                }
                            }
                        },
                        required: ["vehicleInfo", "maintenanceItems"]
                    }
                }
            ],
            tool_choice: { type: "tool", name: "output_maintenance_plan" }
        });

        // Extract the tool use result
        const toolCall = response.content.find(block => block.type === "tool_use");
        if (!toolCall || toolCall.type !== "tool_use") {
            return NextResponse.json({ error: "Claude AI did not return a structured plan." }, { status: 500 });
        }

        // 4. Validate output with our strict backend Zod Schema
        const extractedData = toolCall.input;
        const validationResult = AIKBProposalSchema.safeParse(extractedData);

        if (!validationResult.success) {
            console.error("AI Validation Error:", validationResult.error);
            return NextResponse.json({
                error: "AI output did not match correct schema.",
                details: validationResult.error.errors
            }, { status: 400 });
        }

        // 5. Return the verified JSON payload back to the frontend for the Admin to review
        return NextResponse.json({ data: validationResult.data });

    } catch (error) {
        console.error("Error in AI Import Route:", error);
        return NextResponse.json({ error: "Internal Server Error while process AI vision." }, { status: 500 });
    }
}
