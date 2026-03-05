'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { copyKnowledgeBaseToTenant } from '@/actions/copy-kb-to-tenant';
import { getKBCounts, type TemplateOption } from '@/actions/get-kb-counts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

type FormValues = {
  vehicleMetadata: boolean;
  maintenanceItems: boolean;
  lineIds: string[];
};

type KBCountsData = {
  brands: number;
  lines: number;
  types: number;
  categories: number;
  items: number;
  parts: number;
  itemParts: number;
  templates: TemplateOption[];
} | null;

async function submitCopy(
  _prevState: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const vehicleMetadata = formData.get('vehicleMetadata') === 'true';
  const maintenanceItems = formData.get('maintenanceItems') === 'true';
  const lineIdsRaw = formData.get('lineIds') as string;
  const lineIds = lineIdsRaw ? JSON.parse(lineIdsRaw) : [];
  const tenantId = formData.get('tenantId') as string;

  const result = await copyKnowledgeBaseToTenant(tenantId, {
    vehicleMetadata,
    maintenanceItems,
    lineIds,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Error al copiar datos' };
  }

  return { success: true };
}

export function OnboardingKBForm({
  tenantId,
  onSuccess,
}: {
  tenantId: string;
  onSuccess: () => Promise<{ success: boolean; error?: string }>;
}) {
  const [counts, setCounts] = useState<KBCountsData>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [submitState, formAction, isPending] = useActionState(submitCopy, null);
  const hasCompleted = useRef(false);
  const { control, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      vehicleMetadata: true,
      maintenanceItems: true,
      lineIds: [],
    },
  });

  const selectedLineIds = watch('lineIds');

  useEffect(() => {
    async function fetchCounts() {
      try {
        const data = await getKBCounts();
        setCounts(data);
      } catch (error) {
        console.error('[OnboardingKBForm] Error fetching counts:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCounts();
  }, []);

  useEffect(() => {
    if (submitState?.success && !hasCompleted.current) {
      hasCompleted.current = true;
      setCompleting(true);
      onSuccess().finally(() => setCompleting(false));
    }
  }, [submitState, onSuccess]);

  const onSubmit = (data: FormValues) => {
    const formData = new FormData();
    formData.append('vehicleMetadata', String(data.vehicleMetadata));
    formData.append('maintenanceItems', String(data.maintenanceItems));
    formData.append('lineIds', JSON.stringify(data.lineIds));
    formData.append('tenantId', tenantId);
    formAction(formData);
  };

  const handleSkip = async () => {
    setSkipError(null);
    setCompleting(true);
    const result = await onSuccess();
    if (!result.success) {
      setSkipError(result.error ?? 'Error al continuar. Intenta de nuevo.');
      setCompleting(false);
    }
  };

  const toggleLine = (lineId: string) => {
    const current = selectedLineIds || [];
    if (current.includes(lineId)) {
      setValue('lineIds', current.filter((id) => id !== lineId));
    } else {
      setValue('lineIds', [...current, lineId]);
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Cargando opciones...</span>
        </CardContent>
      </Card>
    );
  }

  const totalCounts = counts
    ? counts.brands + counts.lines + counts.types + counts.categories + counts.items + counts.parts + counts.itemParts
    : 0;

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader>
        <CardTitle>Precargar Datos Iniciales</CardTitle>
        <CardDescription>
          Copia datos globales de mantenimiento para comenzar más rápido.
          {totalCounts > 0 && (
            <span className="block mt-1 text-blue-600">
              Hay {totalCounts} registros disponibles para importar.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitState?.error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {submitState.error}
          </div>
        )}
        {skipError && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {skipError}
          </div>
        )}

        <form id="kb-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Controller
                name="vehicleMetadata"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="vehicleMetadata"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="vehicleMetadata" className="font-medium cursor-pointer">
                Marcas, Líneas y Tipos
              </Label>
              {counts && counts.brands > 0 && (
                <span className="text-sm text-slate-500">
                  (~{counts.brands} marcas, {counts.lines} líneas, {counts.types} tipos)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Controller
                name="maintenanceItems"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="maintenanceItems"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="maintenanceItems" className="font-medium cursor-pointer">
                Items y Repuestos de Mantenimiento
              </Label>
              {counts && counts.categories > 0 && (
                <span className="text-sm text-slate-500">
                  (~{counts.categories} categorías, {counts.items} items, {counts.parts} repuestos sugeridos)
                </span>
              )}
            </div>
          </div>

          {counts && counts.templates.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <Label className="text-sm font-medium text-slate-700">
                Planes de Mantenimiento por Línea
              </Label>
              <p className="text-xs text-slate-500">
                Selecciona las líneas de vehículos para copiar sus planes de mantenimiento.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {counts.templates.map((template) => (
                  <div
                    key={template.lineId}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleLine(template.lineId)}
                  >
                    <Checkbox
                      id={`line-${template.lineId}`}
                      checked={selectedLineIds?.includes(template.lineId) || false}
                      onCheckedChange={() => toggleLine(template.lineId)}
                    />
                    <Label
                      htmlFor={`line-${template.lineId}`}
                      className="cursor-pointer flex-1"
                    >
                      <span className="font-medium">{template.brandName} {template.lineName}</span>
                      <span className="text-slate-500 text-sm ml-2">
                        ({template.templateCount} plan{template.templateCount !== 1 ? 'es' : ''}, {template.packageCount} paquete{template.packageCount !== 1 ? 's' : ''})
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {counts && counts.templates.length === 0 && (
            <div className="p-3 text-sm text-slate-500 bg-slate-50 rounded-md">
              No hay planes de mantenimiento disponibles para mostrar.
            </div>
          )}
        </form>
      </CardContent>
      <div className="p-6 pt-0 flex flex-col sm:flex-row justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleSkip()}
          disabled={isPending || completing}
        >
          Continuar sin precargar
        </Button>
        <Button
          type="submit"
          form="kb-form"
          disabled={isPending || completing}
        >
          {isPending || completing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {completing ? 'Finalizando...' : 'Copiando datos...'}
            </>
          ) : (
            'Precargar y Continuar'
          )}
        </Button>
      </div>
    </Card>
  );
}
