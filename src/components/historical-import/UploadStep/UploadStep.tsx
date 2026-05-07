'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  applyColumnMap,
  buildVehicleLookup,
  parseCsvFile,
  type ColumnMap,
  type RawRow,
  type VehicleLookup,
} from '../lib/csvParser';
import type { UploadStepProps } from './UploadStep.types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const REQUIRED_FIELDS: Array<{ key: keyof ColumnMap; label: string }> = [
  { key: 'vehicleColumn', label: 'Vehículo (UUID o Placa)' },
  { key: 'supplierName', label: 'Proveedor' },
  { key: 'invoiceNumber', label: 'Número de Factura' },
  { key: 'invoiceDate', label: 'Fecha de Factura (YYYY-MM-DD)' },
  { key: 'description', label: 'Descripción' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'taxAmount', label: 'Impuestos' },
  { key: 'totalAmount', label: 'Total' },
];

const OPTIONAL_FIELDS: Array<{ key: keyof ColumnMap; label: string }> = [
  { key: 'notes', label: 'Notas (opcional)' },
];

export function UploadStep({ onParsed }: UploadStepProps) {
  const [vehicleLookup, setVehicleLookup] = useState<VehicleLookup | null>(
    null
  );
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [columnMap, setColumnMap] = useState<Partial<ColumnMap>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch vehicles on mount
  useEffect(() => {
    fetch('/api/vehicles')
      .then(res => res.json())
      .then(
        (
          data: Array<{
            id: string;
            licensePlate: string;
            name?: string | null;
          }>
        ) => {
          // API returns licensePlate but VehicleLookup expects plate
          const normalized = data.map(v => ({
            id: v.id,
            plate: v.licensePlate,
            name: v.name ?? null,
          }));
          setVehicleLookup(buildVehicleLookup(normalized));
        }
      )
      .catch(() => setVehicleError('No se pudieron cargar los vehículos'))
      .finally(() => setLoadingVehicles(false));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    setRawRows([]);
    setCsvHeaders([]);
    setColumnMap({});
    setFileName(null);

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError('El archivo supera el límite de 5 MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileName(file.name);

    parseCsvFile(file)
      .then(rows => {
        if (rows.length === 0) {
          setFileError('El CSV no contiene filas de datos');
          return;
        }
        const headers = Object.keys(rows[0]);
        setCsvHeaders(headers);
        setRawRows(rows);
      })
      .catch(() =>
        setFileError('Error al parsear el CSV. Verificá el formato.')
      );
  }

  function handleMapChange(field: keyof ColumnMap, value: string) {
    setColumnMap(prev => ({ ...prev, [field]: value }));
  }

  const allRequiredMapped = REQUIRED_FIELDS.every(f => !!columnMap[f.key]);
  const canProceed =
    allRequiredMapped && rawRows.length > 0 && vehicleLookup !== null;

  function handleNext() {
    if (!canProceed || !vehicleLookup) return;

    const finalMap = columnMap as ColumnMap;
    const parsedRows = applyColumnMap(rawRows, finalMap, vehicleLookup);

    // Build the file reference from the input
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    onParsed({
      file,
      rawRows,
      columnMap: finalMap,
      parsedRows,
      vehicleLookup,
    });
  }

  if (loadingVehicles) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Cargando vehículos...
      </div>
    );
  }

  if (vehicleError) {
    return (
      <div className="rounded border border-destructive p-4 text-destructive">
        {vehicleError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="csv-file">Archivo CSV</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        {fileError && <p className="text-sm text-destructive">{fileError}</p>}
        {fileName && !fileError && (
          <p className="text-sm text-muted-foreground">
            {fileName} — {rawRows.length} filas detectadas
          </p>
        )}
      </div>

      {csvHeaders.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Mapeo de columnas</h3>
          <p className="text-sm text-muted-foreground">
            Seleccioná qué columna del CSV corresponde a cada campo del sistema.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REQUIRED_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm">
                  {label}{' '}
                  <span className="text-destructive" aria-hidden>
                    *
                  </span>
                </Label>
                {key === 'vehicleColumn' && (
                  <p className="text-xs text-muted-foreground">
                    Acepta UUID o placa (ej. ABC-123)
                  </p>
                )}
                <Select
                  value={columnMap[key] ?? ''}
                  onValueChange={v => handleMapChange(key, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar columna..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map(h => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {OPTIONAL_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-sm">{label}</Label>
                <Select
                  value={columnMap[key] ?? ''}
                  onValueChange={v =>
                    handleMapChange(key, v || (undefined as unknown as string))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(ninguna)" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map(h => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={handleNext} disabled={!canProceed}>
        Siguiente
      </Button>
    </div>
  );
}
