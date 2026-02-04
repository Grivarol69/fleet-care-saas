
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Globe } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";

type Template = {
    id: number;
    name: string;
    description: string;
    version: string;
    brand: { name: string };
    line: { name: string };
    packages: { id: number }[];
};

export function GlobalTemplatesLibrary() {
    const { toast } = useToast();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [installingId, setInstallingId] = useState<number | null>(null);

    useEffect(() => {
        fetchGlobalTemplates();
    }, []);

    const fetchGlobalTemplates = async () => {
        try {
            // Need an endpoint for this. Assuming we can reuse generic GET with ?global=true or create new.
            // Let's assume we use /api/maintenance/mant-template with query param or just filtered on client if generic API supports it.
            // Or better, a dedicated endpoint /api/maintenance/mant-template/global
            // For now, I'll simulate or assume generic route handles it.
            // Actually, I'll create a quick route if needed, but likely the existing one filters by tenant. I need a way to get Globals.
            // Let's assume I create /api/maintenance/mant-template/global 
            const res = await axios.get("/api/maintenance/mant-template/global");
            setTemplates(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async (templateId: number) => {
        try {
            setInstallingId(templateId);
            await axios.post("/api/maintenance/mant-template/clone", { templateId });
            toast({
                title: "Plantilla Instalada",
                description: "Se ha copiado la plantilla a tu biblioteca local.",
            });
            // Optional: Redirect or refresh
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo instalar la plantilla.",
                variant: "destructive"
            });
        } finally {
            setInstallingId(null);
        }
    };

    if (loading) return <div>Cargando biblioteca global...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
                <Card key={template.id} className="border-blue-100 bg-blue-50/30">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-500" />
                                {template.name}
                            </CardTitle>
                            <Badge variant="secondary">v{template.version}</Badge>
                        </div>
                        <CardDescription>
                            {template.brand.name} {template.line.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.description || "Plantilla estándar certificada por el fabricante."}
                        </p>
                        <div className="mt-4 text-xs font-medium text-gray-500">
                            Incluye {template.packages.length} paquetes de mantenimiento
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            onClick={() => handleInstall(template.id)}
                            disabled={installingId === template.id}
                        >
                            {installingId === template.id ? (
                                <span className="flex items-center gap-2">Instalando...</span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Download className="h-4 w-4" />
                                    Instalar en mi Flota
                                </span>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
            {templates.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                    No hay plantillas globales disponibles en este momento.
                </div>
            )}
        </div>
    );
}
