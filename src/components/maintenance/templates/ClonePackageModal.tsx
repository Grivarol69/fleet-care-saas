"use client";

import { useState } from "react";
import { Copy, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

interface ClonePackageModalProps {
    sourcePackageId: string;
    originalName: string;
    onSuccess?: (newPackageId: string) => void;
}

export function ClonePackageModal({ sourcePackageId, originalName, onSuccess }: ClonePackageModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    // Forms
    const [name, setName] = useState(`Copia de ${originalName}`);
    const [triggerKm, setTriggerKm] = useState<number | "">("");

    // Loading states
    const [isCloning, setIsCloning] = useState(false);

    const handleClone = async () => {
        if (!name || triggerKm === "" || triggerKm < 0) {
            toast.error("Por favor completa un nombre válido y un kilometraje mayor o igual a 0.");
            return;
        }

        setIsCloning(true);
        try {
            const res = await fetch("/api/maintenance/mant-package/clone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourcePackageId,
                    newName: name,
                    newTriggerKm: Number(triggerKm),
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                const errorMessage = errorData?.error || "Error al clonar el paquete de mantenimiento.";
                throw new Error(errorMessage);
            }

            const newPackage = await res.json();
            toast.success("Paquete clonado exitosamente.");

            setOpen(false);
            if (onSuccess) {
                onSuccess(newPackage.id);
            }
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Ocurrió un error al intentar clonar el paquete.");
        } finally {
            setIsCloning(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 shrink-0">
                    <Copy className="h-4 w-4" />
                    Clonar Paquete
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Clonar Paquete de Mantenimiento</DialogTitle>
                    <DialogDescription>
                        Crea un duplicado del paquete y sus tareas con un nuevo límite de kilometraje.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">

                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-sm text-amber-800 dark:text-amber-400">
                            <strong>Ahorro de tiempo:</strong> Todas las tareas y prioridades asociadas a <strong>{originalName}</strong> se copiarán automáticamente al nuevo paquete.
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="pkg-name">Nombre del Nuevo Paquete</Label>
                        <Input
                            id="pkg-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Servicio 60.000 KM"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="pkg-km">Kilometraje de Disparo (Trigger KM)</Label>
                        <Input
                            id="pkg-km"
                            type="number"
                            min="0"
                            step="1000"
                            value={triggerKm}
                            onChange={(e) => setTriggerKm(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="Ej: 60000"
                        />
                    </div>

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isCloning}>
                        Cancelar
                    </Button>
                    <Button onClick={handleClone} disabled={isCloning || !name || triggerKm === ""}>
                        {isCloning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Clonar Paquete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
