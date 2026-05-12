'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FileText, Plus, Trash2, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import { cn } from '@/lib/utils';

type VehicleType = { id: string; name: string };
type DocumentType = {
  id: string;
  name: string;
  code: string;
  requiresExpiry: boolean;
};
type Requirement = {
  id: string;
  vehicleTypeId: string;
  documentTypeId: string;
};

export default function DocumentRequirementsPage() {
  const { toast } = useToast();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedDocToAdd, setSelectedDocToAdd] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vtRes, dtRes, reqRes] = await Promise.all([
        axios.get<VehicleType[]>('/api/vehicles/types'),
        axios.get<DocumentType[]>('/api/vehicles/document-types'),
        axios.get<Requirement[]>('/api/vehicles/document-requirements'),
      ]);
      setVehicleTypes(vtRes.data);
      setDocumentTypes(dtRes.data);
      setRequirements(reqRes.data);
      if (vtRes.data.length > 0 && !selectedTypeId) {
        setSelectedTypeId(vtRes.data[0].id);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error al cargar la plantilla documental',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedTypeId]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedType = vehicleTypes.find(vt => vt.id === selectedTypeId);

  const selectedRequirements = requirements.filter(
    r => r.vehicleTypeId === selectedTypeId
  );

  const assignedDocIds = new Set(
    selectedRequirements.map(r => r.documentTypeId)
  );

  const availableToAdd = documentTypes.filter(dt => !assignedDocIds.has(dt.id));

  const handleAdd = async () => {
    if (!selectedTypeId || !selectedDocToAdd) return;
    setAdding(true);
    const optimistic: Requirement = {
      id: `temp-${Date.now()}`,
      vehicleTypeId: selectedTypeId,
      documentTypeId: selectedDocToAdd,
    };
    setRequirements(prev => [...prev, optimistic]);
    setSelectedDocToAdd('');
    try {
      const res = await axios.post<Requirement>(
        '/api/vehicles/document-requirements',
        {
          vehicleTypeId: selectedTypeId,
          documentTypeId: selectedDocToAdd,
        }
      );
      setRequirements(prev =>
        prev.map(r => (r.id === optimistic.id ? res.data : r))
      );
    } catch {
      setRequirements(prev => prev.filter(r => r.id !== optimistic.id));
      toast({
        variant: 'destructive',
        title: 'No se pudo agregar el documento',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (req: Requirement) => {
    setRemovingId(req.id);
    setRequirements(prev => prev.filter(r => r.id !== req.id));
    try {
      await axios.delete(`/api/vehicles/document-requirements/${req.id}`);
    } catch {
      setRequirements(prev => [...prev, req]);
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar el documento',
      });
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCheck className="h-6 w-6" />
          Plantilla Documental
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurá qué documentos son requeridos para cada tipo de vehículo en
          tu flota.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Left panel — vehicle type list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tipos de Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {vehicleTypes.map(vt => (
                <li key={vt.id}>
                  <button
                    onClick={() => setSelectedTypeId(vt.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50',
                      selectedTypeId === vt.id
                        ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                        : 'text-foreground'
                    )}
                  >
                    {vt.name}
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Right panel — documents for selected type */}
        <Card className="md:col-span-2">
          {!selectedType ? (
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <FileText className="h-8 w-8 opacity-40" />
              <p className="text-sm">Seleccioná un tipo de vehículo</p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {selectedType.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {selectedRequirements.length} documento
                    {selectedRequirements.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {/* Assigned documents */}
                {selectedRequirements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No hay documentos configurados para este tipo.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedRequirements.map(req => {
                      const dt = documentTypes.find(
                        d => d.id === req.documentTypeId
                      );
                      if (!dt) return null;
                      return (
                        <li
                          key={req.id}
                          className="flex items-center justify-between rounded-lg border px-4 py-3 bg-background"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{dt.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {dt.requiresExpiry
                                  ? 'Requiere vencimiento'
                                  : 'Sin vencimiento'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={removingId === req.id}
                            onClick={() => handleRemove(req)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Add document */}
                {availableToAdd.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Select
                      value={selectedDocToAdd}
                      onValueChange={setSelectedDocToAdd}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Agregar documento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToAdd.map(dt => (
                          <SelectItem key={dt.id} value={dt.id}>
                            {dt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!selectedDocToAdd || adding}
                      onClick={handleAdd}
                      className="gap-1 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                )}

                {availableToAdd.length === 0 &&
                  selectedRequirements.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                      Todos los tipos de documento están asignados.
                    </p>
                  )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
