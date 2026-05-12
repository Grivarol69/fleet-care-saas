'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

type VehicleType = {
  id: string;
  name: string;
};

type DocumentType = {
  id: string;
  name: string;
  code: string;
};

type Requirement = {
  id: string;
  vehicleTypeId: string;
  documentTypeId: string;
};

function buildKey(vehicleTypeId: string, documentTypeId: string): string {
  return `${vehicleTypeId}:${documentTypeId}`;
}

export default function DocumentRequirementsPage() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [requirements, setRequirements] = useState<Set<string>>(new Set());
  const [requirementIds, setRequirementIds] = useState<Map<string, string>>(
    new Map()
  );
  const [loadingCell, setLoadingCell] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

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

      const reqSet = new Set<string>();
      const reqMap = new Map<string, string>();
      for (const r of reqRes.data) {
        const key = buildKey(r.vehicleTypeId, r.documentTypeId);
        reqSet.add(key);
        reqMap.set(key, r.id);
      }
      setRequirements(reqSet);
      setRequirementIds(reqMap);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error al cargar la plantilla documental',
        description: 'Por favor recargá la página e intentá de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = useCallback(
    async (vehicleTypeId: string, documentTypeId: string) => {
      const key = buildKey(vehicleTypeId, documentTypeId);
      const wasChecked = requirements.has(key);

      // Optimistic update
      setRequirements(prev => {
        const next = new Set(prev);
        if (wasChecked) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      setLoadingCell(key);

      try {
        if (wasChecked) {
          const reqId = requirementIds.get(key);
          if (!reqId) throw new Error('Requirement ID not found');
          await axios.delete(`/api/vehicles/document-requirements/${reqId}`);
          setRequirementIds(prev => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        } else {
          const res = await axios.post<Requirement>(
            '/api/vehicles/document-requirements',
            {
              vehicleTypeId,
              documentTypeId,
            }
          );
          setRequirementIds(prev => new Map(prev).set(key, res.data.id));
        }
      } catch {
        // Rollback optimistic update
        setRequirements(prev => {
          const next = new Set(prev);
          if (wasChecked) {
            next.add(key);
          } else {
            next.delete(key);
          }
          return next;
        });
        toast({
          variant: 'destructive',
          title: 'No se pudo actualizar',
          description: 'Revisá tu conexión e intentá de nuevo.',
        });
      } finally {
        setLoadingCell(null);
      }
    },
    [requirements, requirementIds, toast]
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Plantilla Documental por Tipo de Vehículo
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configurá qué documentos son obligatorios para cada tipo de vehículo
          en tu flota.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Tipo de Vehículo
                </th>
                {documentTypes.map(dt => (
                  <th
                    key={dt.id}
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {dt.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {vehicleTypes.map((vt, idx) => (
                <tr
                  key={vt.id}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {vt.name}
                  </td>
                  {documentTypes.map(dt => {
                    const key = buildKey(vt.id, dt.id);
                    const isChecked = requirements.has(key);
                    const isCellLoading = loadingCell === key;
                    return (
                      <td key={dt.id} className="px-4 py-3 text-center">
                        <Checkbox
                          checked={isChecked}
                          disabled={isCellLoading}
                          onCheckedChange={() => handleToggle(vt.id, dt.id)}
                          aria-label={`${vt.name} requiere ${dt.name}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {vehicleTypes.length === 0 && (
                <tr>
                  <td
                    colSpan={documentTypes.length + 1}
                    className="px-4 py-8 text-center text-sm text-gray-400"
                  >
                    No hay tipos de vehículo configurados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
