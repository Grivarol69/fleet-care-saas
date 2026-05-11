'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import type {
  DocumentTypeRow,
  RequirementRow,
  RequirementsDialogProps,
} from './RequirementsDialog.types';

export function RequirementsDialog({
  vehicleType,
  open,
  onOpenChange,
  isSuperAdmin,
}: RequirementsDialogProps) {
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRow[]>([]);
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    setRemovedIds(new Set());

    Promise.all([
      axios.get<DocumentTypeRow[]>('/api/vehicles/document-types'),
      axios.get<RequirementRow[]>(
        `/api/vehicles/document-requirements?vehicleTypeId=${vehicleType.id}`
      ),
    ])
      .then(([typesRes, reqRes]) => {
        setDocumentTypes(typesRes.data);
        setRequirements(reqRes.data);
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los requisitos',
          variant: 'destructive',
        });
      })
      .finally(() => setIsLoading(false));
  }, [open, vehicleType.id, toast]);

  const isChecked = (documentTypeId: string) =>
    requirements.some(r => r.documentTypeId === documentTypeId);

  const handleToggle = async (
    documentType: DocumentTypeRow,
    checked: boolean
  ) => {
    const disabled = vehicleType.isGlobal && !isSuperAdmin;
    if (disabled) return;

    setLoadingRowId(documentType.id);
    try {
      if (checked) {
        // Create requirement
        const res = await axios.post<RequirementRow>(
          '/api/vehicles/document-requirements',
          {
            vehicleTypeId: vehicleType.id,
            documentTypeId: documentType.id,
          }
        );
        setRequirements(prev => [...prev, res.data]);
        setRemovedIds(prev => {
          const next = new Set(prev);
          next.delete(documentType.id);
          return next;
        });
      } else {
        // Delete requirement
        const existing = requirements.find(
          r => r.documentTypeId === documentType.id
        );
        if (!existing) return;
        await axios.delete(
          `/api/vehicles/document-requirements/${existing.id}`
        );
        setRequirements(prev =>
          prev.filter(r => r.documentTypeId !== documentType.id)
        );
        setRemovedIds(prev => new Set(prev).add(documentType.id));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: axios.isAxiosError(error)
          ? (error.response?.data?.error ?? 'Error al actualizar el requisito')
          : 'Error al actualizar el requisito',
        variant: 'destructive',
      });
    } finally {
      setLoadingRowId(null);
    }
  };

  const checkboxesDisabled = vehicleType.isGlobal && !isSuperAdmin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Documentos requeridos — {vehicleType.name}
            {vehicleType.isGlobal && (
              <Badge variant="secondary" className="text-xs">
                Global
              </Badge>
            )}
          </DialogTitle>
          {vehicleType.isGlobal && !isSuperAdmin && (
            <p className="text-sm text-muted-foreground mt-1">
              Global — solo la plataforma puede modificar
            </p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documentTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay tipos de documentos disponibles.
          </p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {documentTypes.map(dt => {
              const checked = isChecked(dt.id);
              const isRowLoading = loadingRowId === dt.id;
              const wasRemoved = removedIds.has(dt.id);

              return (
                <div key={dt.id} className="space-y-1">
                  <div className="flex items-center gap-3 py-2">
                    {isRowLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <Checkbox
                        id={`req-${dt.id}`}
                        checked={checked}
                        disabled={checkboxesDisabled || isRowLoading}
                        onCheckedChange={c => handleToggle(dt, c === true)}
                      />
                    )}
                    <label
                      htmlFor={`req-${dt.id}`}
                      className={`flex-1 text-sm cursor-pointer ${
                        checkboxesDisabled
                          ? 'opacity-60 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <span className="font-medium">{dt.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">
                        {dt.code}
                      </span>
                      {dt.requiresExpiry && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Vencimiento
                        </Badge>
                      )}
                    </label>
                  </div>
                  {wasRemoved && !checked && (
                    <p className="text-xs text-amber-600 ml-7">
                      Los documentos ya cargados no serán eliminados.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
