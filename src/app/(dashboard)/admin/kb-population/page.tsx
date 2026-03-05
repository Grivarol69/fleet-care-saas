"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Loader2, Bot, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIKBProposal } from "@/lib/validations/kb-ai";
import { ReviewTable } from "./ReviewTable";

export default function KBPopulationPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [proposal, setProposal] = useState<AIKBProposal | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const processAPI = async () => {
        if (!file) {
            toast.error("Seleccione un archivo primero");
            return;
        }

        setIsProcessing(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // Requerimos aumentar el timeout en Next.js App Router para esto a traves del backend maxDuration
            const res = await fetch("/api/admin/kb/import", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Failed to process file. It may be too large or the AI encountered an error.");
            }

            const json = await res.json();
            setProposal(json.data);
            toast.success("Análisis IA completado exitosamente");
        } catch (err) {
            console.error(err);
            toast.error("No se pudo procesar el manual. Revisa la consola para más detalles.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async (reviewedData: AIKBProposal) => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/kb/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reviewedData),
            });

            if (!res.ok) {
                throw new Error("Error saving global KB data.");
            }

            toast.success("Catálogo global de partes y mantenimientos actualizado exitosamente.");
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (err) {
            console.error(err);
            toast.error("Ocurrió un error al guardar en la base de datos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Knowledge Base Population</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {!proposal ? (
                    <Card className="col-span-1 border-dashed bg-muted/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-primary" />
                                Cargar Manual
                            </CardTitle>
                            <CardDescription>Sube un manual PDF o JPG para extraer mantenimientos OEM automáticamente.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                                <UploadCloud className="h-10 w-10 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground text-center">
                                PDF o Imagen (Máx. 10MB)
                            </p>

                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                accept="application/pdf,image/jpeg,image/png"
                                onChange={handleFileChange}
                            />
                            <Button asChild variant={file ? "secondary" : "default"}>
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    {file ? file.name : "Seleccionar Archivo"}
                                </label>
                            </Button>

                            {file && (
                                <Button
                                    className="w-full mt-2"
                                    onClick={processAPI}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analizando con Claude Vision...
                                        </>
                                    ) : (
                                        "Escanear y Extraer Data"
                                    )}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="col-span-full">
                        <Card>
                            <CardHeader className="bg-primary/5 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-primary" />
                                            Resultados Extraídos: {proposal.vehicleInfo.brand} {proposal.vehicleInfo.model}
                                        </CardTitle>
                                        <CardDescription>
                                            Verifica las operaciones y repuestos identificados antes de publicarlo de forma Global.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ReviewTable
                                    initialData={proposal}
                                    onSave={handleSave}
                                    isSaving={isSaving}
                                    onCancel={() => setProposal(null)}
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
