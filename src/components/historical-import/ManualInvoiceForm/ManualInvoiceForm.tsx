'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronsUpDown, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useToast } from '@/components/hooks/use-toast';
import { UploadButton } from '@/lib/uploadthing';
import type { FormFields, VehicleOption } from './ManualInvoiceForm.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function initialFields(): FormFields {
  return {
    invoiceNumber: '',
    invoiceDate: todayIso(),
    supplierName: '',
    description: '',
    subtotal: '',
    taxAmount: '',
    totalAmount: '',
    notes: '',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManualInvoiceForm() {
  // Sticky state — persists across form resets
  const [vehicleId, setVehicleId] = useState<string>('');
  const [vehicleLabel, setVehicleLabel] = useState<string>('');
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [comboQuery, setComboQuery] = useState('');

  // Resettable state — cleared on successful submit
  const [fields, setFields] = useState<FormFields>(initialFields());
  const [taxTouched, setTaxTouched] = useState(false);
  const [totalTouched, setTotalTouched] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  // Transient state
  const [submitting, setSubmitting] = useState(false);

  const invoiceNumberRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ---------------------------------------------------------------------------
  // Vehicle load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch('/api/vehicles/vehicles')
      .then(async res => {
        if (res.status === 401) {
          setVehiclesError('Sin autorización para cargar vehículos');
          return;
        }
        if (!res.ok) {
          setVehiclesError('Error al cargar vehículos');
          return;
        }
        const data = await res.json();
        const list: VehicleOption[] = (
          Array.isArray(data) ? data : (data.vehicles ?? [])
        ).map(
          (v: {
            id: string;
            licensePlate: string;
            brand?: { name?: string };
            line?: { name?: string };
          }) => {
            const brandName = v.brand?.name ?? '';
            const lineName = v.line?.name ?? '';
            const suffix = `${brandName} ${lineName}`.trim();
            return {
              id: v.id,
              licensePlate: v.licensePlate,
              brandName,
              lineName,
              label: suffix ? `${v.licensePlate} — ${suffix}` : v.licensePlate,
            };
          }
        );
        setVehicles(list);
      })
      .catch(() => {
        setVehiclesError('Error de red al cargar vehículos');
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleVehicleSelect(option: VehicleOption) {
    setVehicleId(option.id);
    setVehicleLabel(option.label);
    setComboOpen(false);
    setComboQuery('');
  }

  function clearVehicle() {
    setVehicleId('');
    setVehicleLabel('');
  }

  function handleSubtotalChange(val: string) {
    const sub = parseFloat(val) || 0;
    setFields(prev => {
      const tax = taxTouched ? prev.taxAmount : (sub * 0.19).toFixed(2);
      const taxNum = parseFloat(tax) || 0;
      const total = totalTouched ? prev.totalAmount : (sub + taxNum).toFixed(2);
      return { ...prev, subtotal: val, taxAmount: tax, totalAmount: total };
    });
  }

  function handleTaxChange(val: string) {
    setTaxTouched(true);
    setFields(prev => {
      const taxNum = parseFloat(val) || 0;
      const subNum = parseFloat(prev.subtotal) || 0;
      const total = totalTouched
        ? prev.totalAmount
        : (subNum + taxNum).toFixed(2);
      return { ...prev, taxAmount: val, totalAmount: total };
    });
  }

  function handleTotalChange(val: string) {
    setTotalTouched(true);
    setFields(prev => ({ ...prev, totalAmount: val }));
  }

  function handleUploadComplete(
    res: { url: string; serverData: Record<string, unknown> }[]
  ) {
    const uploaded = res?.[0];
    if (!uploaded?.url) return;

    setAttachmentUrl(uploaded.url);

    const sd = uploaded.serverData;
    const confidence =
      typeof sd?.ocrConfidence === 'number' ? (sd.ocrConfidence as number) : 0;

    if (confidence >= 40) {
      setFields(prev => ({
        ...prev,
        ...(typeof sd?.ocrInvoiceNumber === 'string' && sd.ocrInvoiceNumber
          ? { invoiceNumber: sd.ocrInvoiceNumber as string }
          : {}),
        ...(typeof sd?.ocrInvoiceDate === 'string' && sd.ocrInvoiceDate
          ? { invoiceDate: sd.ocrInvoiceDate as string }
          : {}),
        ...(typeof sd?.ocrSupplierName === 'string' && sd.ocrSupplierName
          ? { supplierName: sd.ocrSupplierName as string }
          : {}),
        ...(typeof sd?.ocrSubtotal === 'number'
          ? { subtotal: String(sd.ocrSubtotal) }
          : {}),
        ...(typeof sd?.ocrTaxAmount === 'number'
          ? { taxAmount: String(sd.ocrTaxAmount) }
          : {}),
        ...(typeof sd?.ocrTotal === 'number'
          ? { totalAmount: String(sd.ocrTotal) }
          : {}),
      }));
      setOcrNotice(
        `Datos extraídos por IA (${Math.round(confidence)}%) — revisá antes de confirmar`
      );
    } else {
      setOcrNotice(
        'No se pudo extraer información del archivo — completá los campos manualmente'
      );
    }
  }

  function resetForm() {
    setFields(initialFields());
    setTaxTouched(false);
    setTotalTouched(false);
    setAttachmentUrl('');
    setOcrNotice(null);
    // vehicleId and vehicleLabel are intentionally NOT reset
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!vehicleId) return;

    const payload = {
      rows: [
        {
          vehicleId,
          supplierName: fields.supplierName,
          invoiceNumber: fields.invoiceNumber,
          invoiceDate: fields.invoiceDate,
          description: fields.description || fields.invoiceNumber,
          subtotal: parseFloat(fields.subtotal) || 0,
          taxAmount: parseFloat(fields.taxAmount) || 0,
          totalAmount: parseFloat(fields.totalAmount) || 0,
          notes: fields.notes || undefined,
        },
      ],
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/historical-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errorMsg =
          (body as { errors?: { message: string }[] }).errors?.[0]?.message ??
          'Error al guardar';
        toast({
          title: 'Error al registrar factura',
          description: errorMsg,
          variant: 'destructive',
        });
        return;
      }

      const body = await res.json();
      const errors = (body as { errors?: { message: string }[] }).errors;

      if (errors && errors.length > 0) {
        toast({
          title: 'Error al registrar factura',
          description: errors[0].message ?? 'Error al guardar',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: `Factura ${fields.invoiceNumber} registrada`,
      });
      const savedInvoiceNumber = fields.invoiceNumber;
      resetForm();
      requestAnimationFrame(() => {
        invoiceNumberRef.current?.focus();
      });
      void savedInvoiceNumber; // used in toast above
    } catch {
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar al servidor',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const filteredVehicles = vehicles.filter(v =>
    v.licensePlate.toUpperCase().includes(comboQuery.toUpperCase())
  );

  const submitDisabled =
    !vehicleId ||
    !fields.invoiceNumber.trim() ||
    !fields.supplierName.trim() ||
    (parseFloat(fields.subtotal) || 0) <= 0 ||
    submitting;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehículo</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicleId ? (
            // Sticky vehicle banner
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Vehículo activo: {vehicleLabel}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={clearVehicle}
              >
                Cambiar vehículo
              </Button>
            </div>
          ) : (
            // Vehicle combobox (inline — NOT a separate component)
            <div className="space-y-2">
              <Label>Buscar vehículo</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    type="button"
                  >
                    {vehicleLabel || 'Buscar vehículo por placa...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Escribí la placa..."
                      value={comboQuery}
                      onValueChange={setComboQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {vehiclesError ?? 'No se encontró el vehículo'}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredVehicles.map(v => (
                          <CommandItem
                            key={v.id}
                            value={v.id}
                            onSelect={() => handleVehicleSelect(v)}
                          >
                            {v.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR upload — visible even without vehicle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Documento de factura (opcional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attachmentUrl ? (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
              <span className="text-sm font-medium text-green-700">
                ✓ Archivo cargado
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAttachmentUrl('');
                  setOcrNotice(null);
                }}
              >
                Cambiar archivo
              </Button>
            </div>
          ) : (
            <UploadButton
              endpoint="invoiceUploader"
              onClientUploadComplete={res => {
                handleUploadComplete(
                  res as { url: string; serverData: Record<string, unknown> }[]
                );
              }}
              onUploadError={error => {
                toast({
                  title: 'Error al subir archivo',
                  description: error.message,
                  variant: 'destructive',
                });
              }}
              className="ut-button:w-full ut-button:bg-primary ut-button:hover:bg-primary/90"
            />
          )}
          {ocrNotice && <p className="text-sm text-amber-700">{ocrNotice}</p>}
        </CardContent>
      </Card>

      {/* Invoice fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la factura</CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset disabled={!vehicleId} className="contents">
            <div className="grid grid-cols-2 gap-4">
              {/* invoiceNumber */}
              <div className="space-y-1">
                <Label htmlFor="invoiceNumber">Número de factura *</Label>
                <Input
                  id="invoiceNumber"
                  ref={invoiceNumberRef}
                  value={fields.invoiceNumber}
                  onChange={e =>
                    setFields(prev => ({
                      ...prev,
                      invoiceNumber: e.target.value,
                    }))
                  }
                  placeholder="Ej: FV-001-000123"
                  required
                />
              </div>

              {/* invoiceDate */}
              <div className="space-y-1">
                <Label htmlFor="invoiceDate">Fecha de factura *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={fields.invoiceDate}
                  onChange={e =>
                    setFields(prev => ({
                      ...prev,
                      invoiceDate: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              {/* supplierName — col-span-2 */}
              <div className="col-span-2 space-y-1">
                <Label htmlFor="supplierName">Proveedor *</Label>
                <Input
                  id="supplierName"
                  value={fields.supplierName}
                  onChange={e =>
                    setFields(prev => ({
                      ...prev,
                      supplierName: e.target.value,
                    }))
                  }
                  placeholder="Nombre del proveedor"
                  required
                />
              </div>

              {/* description — col-span-2 */}
              <div className="col-span-2 space-y-1">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={fields.description}
                  onChange={e =>
                    setFields(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Descripción del servicio o producto (opcional)"
                />
              </div>

              {/* subtotal */}
              <div className="space-y-1">
                <Label htmlFor="subtotal">Subtotal *</Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={fields.subtotal}
                  onChange={e => handleSubtotalChange(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* taxAmount */}
              <div className="space-y-1">
                <Label htmlFor="taxAmount">IVA (19%)</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fields.taxAmount}
                  onChange={e => handleTaxChange(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* totalAmount — col-span-2 */}
              <div className="col-span-2 space-y-1">
                <Label htmlFor="totalAmount">Total</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={fields.totalAmount}
                  onChange={e => handleTotalChange(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* notes — col-span-2 */}
              <div className="col-span-2 space-y-1">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={fields.notes}
                  onChange={e =>
                    setFields(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Observaciones adicionales (opcional)"
                  rows={3}
                />
              </div>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitDisabled} className="w-full">
        {submitting ? 'Guardando...' : 'Registrar factura'}
      </Button>
    </form>
  );
}
