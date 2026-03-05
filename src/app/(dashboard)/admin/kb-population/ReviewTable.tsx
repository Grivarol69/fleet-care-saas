"use client";

import { useState } from "react";
import { AIKBProposal } from "@/lib/validations/kb-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Trash2 } from "lucide-react";

export function ReviewTable({
    initialData,
    onSave,
    onCancel,
    isSaving,
}: {
    initialData: AIKBProposal;
    onSave: (data: AIKBProposal) => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    const [data, setData] = useState<AIKBProposal>(initialData);

    const handleItemChange = (index: number, field: string, value: string | number | null) => {
        const newData = { ...data };
        const currentItem = newData.maintenanceItems[index];
        newData.maintenanceItems[index] = { ...currentItem, [field]: value } as any;
        setData(newData);
    };

    const removeItem = (index: number) => {
        const newData = { ...data };
        newData.maintenanceItems.splice(index, 1);
        setData(newData);
    };

    return (
        <div className="space-y-6">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Operación (MantItem)</TableHead>
                            <TableHead>Frecuencia Km</TableHead>
                            <TableHead>Frecuencia Meses</TableHead>
                            <TableHead>Repuestos Vinculados (MasterPart)</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.maintenanceItems.map((item, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="align-top font-medium">
                                    <Input
                                        value={item.name}
                                        onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                                        className="h-8"
                                    />
                                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground uppercase">
                                        <span className="bg-primary/10 text-primary px-1 rounded">{item.type}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="align-top">
                                    <Input
                                        type="number"
                                        value={item.intervalKm || ""}
                                        onChange={(e) => handleItemChange(idx, "intervalKm", e.target.value ? Number(e.target.value) : null)}
                                        className="h-8 w-24"
                                        placeholder="N/A"
                                    />
                                </TableCell>
                                <TableCell className="align-top">
                                    <Input
                                        type="number"
                                        value={item.intervalMonths || ""}
                                        onChange={(e) => handleItemChange(idx, "intervalMonths", e.target.value ? Number(e.target.value) : null)}
                                        className="h-8 w-20"
                                        placeholder="N/A"
                                    />
                                </TableCell>
                                <TableCell className="align-top">
                                    {item.partsRequired?.length > 0 ? (
                                        <ul className="space-y-2">
                                            {item.partsRequired.map((part, pIdx) => (
                                                <li key={pIdx} className="text-sm bg-muted p-2 rounded-md flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">{part.name}</span>
                                                        {part.partNumber && <span className="text-xs text-muted-foreground font-mono">OEM: {part.partNumber}</span>}
                                                    </div>
                                                    <span className="text-xs font-bold px-2 bg-background border rounded-full">x{part.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-sm text-muted-foreground italic">Sin repuestos referenciados</span>
                                    )}
                                </TableCell>
                                <TableCell className="align-top text-right">
                                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancelar
                </Button>
                <Button onClick={() => onSave(data)} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar en KB Global
                </Button>
            </div>
        </div>
    );
}
