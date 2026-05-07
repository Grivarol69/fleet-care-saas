'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronsUpDown, Loader2, Plus, Truck } from 'lucide-react';
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
import { InvoiceItemRow } from './InvoiceItemRow';
import type { MantItemOption } from './InvoiceItemRow';
import type {
  HeaderFields,
  InvoiceItemDraft,
  OcrItem,
  VehicleOption,
} from './ManualInvoiceForm.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function initialHeader(): HeaderFields {
  return {
    invoiceNumber: '',
    invoiceDate: todayIso(),
    supplierName: '',
    notes: '',
  };
}

function emptyDraft(): InvoiceItemDraft {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: '1',
    unitPrice: '',
    total: '',
    mantItemId: null,
    mantItemName: null,
    categoryId: null,
    confidence: 0,
  };
}

function parseOcrItems(ocrItemsJson: unknown): OcrItem[] {
  if (!ocrItemsJson || typeof ocrItemsJson !== 'string') return [];
  try {
    const parsed = JSON.parse(ocrItemsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null
      )
      .map(item => ({
        description:
          typeof item.description === 'string' ? item.description : '',
        quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
        unitPrice:
          typeof item.unitPrice === 'number' ? item.unitPrice : undefined,
        total: typeof item.total === 'number' ? item.total : undefined,
      }))
      .filter(item => item.description.length > 0);
  } catch {
    return [];
  }
}

function ocrItemToDraft(item: OcrItem): InvoiceItemDraft {
  const qty = item.quantity ?? 1;
  const price = item.unitPrice ?? 0;
  const total = item.total ?? qty * price;
  return {
    id: crypto.randomUUID(),
    description: item.description,
    quantity: String(qty),
    unitPrice: price > 0 ? String(price) : '',
    total: total > 0 ? total.toFixed(2) : '',
    mantItemId: null,
    mantItemName: null,
    categoryId: null,
    confidence: 0,
  };
}

function computeGrandTotal(items: InvoiceItemDraft[]): number {
  return items.reduce((sum, item) => {
    const val = parseFloat(item.total);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
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

  // Header fields — cleared on successful submit
  const [header, setHeader] = useState<HeaderFields>(initialHeader());

  // Items state
  const [items, setItems] = useState<InvoiceItemDraft[]>([emptyDraft()]);
  const [mapperLoading, setMapperLoading] = useState(false);

  // MantItem candidates (loaded once)
  const [mantCandidates, setMantCandidates] = useState<MantItemOption[]>([]);

  // Upload state
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  // Transient
  const [submitting, setSubmitting] = useState(false);

  const invoiceNumberRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ---------------------------------------------------------------------------
  // Load vehicles
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

  function handleItemChange(index: number, updated: InvoiceItemDraft) {
    setItems(prev => prev.map((item, i) => (i === index ? updated : item)));
  }

  function handleItemRemove(index: number) {
    setItems(prev => {
      if (prev.length <= 1) return prev; // keep at least one row
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleAddItem() {
    setItems(prev => [...prev, emptyDraft()]);
  }

  async function callMapper(ocrItems: OcrItem[], candidates: MantItemOption[]) {
    if (ocrItems.length === 0) return;
    setMapperLoading(true);
    try {
      const res = await fetch('/api/ai/mant-mapper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: ocrItems.map(item => ({
            description: item.description,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? 0,
            total: item.total ?? 0,
          })),
        }),
      });

      if (!res.ok) return;

      const data = (await res.json()) as {
        mappings?: Array<{
          ocrDescription: string;
          mantItemId: string | null;
          confidence: number;
        }>;
      };

      const mappings = data.mappings ?? [];

      setItems(prev =>
        prev.map((draft, i) => {
          const mapping = mappings[i];
          if (!mapping) return draft;
          const shouldPreSelect =
            mapping.confidence >= 70 && mapping.mantItemId;
          const candidate = shouldPreSelect
            ? candidates.find(c => c.id === mapping.mantItemId)
            : undefined;
          return {
            ...draft,
            mantItemId: shouldPreSelect ? mapping.mantItemId : null,
            mantItemName: shouldPreSelect ? (candidate?.name ?? null) : null,
            categoryId: shouldPreSelect
              ? (candidate?.categoryId ?? null)
              : null,
            confidence: mapping.confidence,
          };
        })
      );
    } catch {
      // Mapper errors are non-blocking
    } finally {
      setMapperLoading(false);
    }
  }

  async function loadMantCandidates(): Promise<MantItemOption[]> {
    try {
      const res = await fetch('/api/maintenance/mant-items');
      if (!res.ok) return [];
      const data = (await res.json()) as Array<{
        id: string;
        name: string;
        category?: { id?: string; name?: string };
      }>;
      const candidates: MantItemOption[] = Array.isArray(data)
        ? data.map(item => ({
            id: item.id,
            name: item.name,
            categoryName: item.category?.name ?? '',
            categoryId: item.category?.id ?? null,
          }))
        : [];
      setMantCandidates(candidates);
      return candidates;
    } catch {
      return [];
    }
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

    // Update header fields from OCR
    if (confidence >= 40) {
      setHeader(prev => ({
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
      }));
    }

    // Parse OCR items
    const ocrItems = parseOcrItems(sd?.ocrItemsJson);

    if (ocrItems.length > 0) {
      const drafts = ocrItems.map(ocrItemToDraft);
      setItems(drafts);
      setOcrNotice(
        `${ocrItems.length} ítem(s) extraído(s) por IA (${Math.round(confidence)}%) — revisá antes de confirmar`
      );
      // Load candidates first, pass directly to mapper to avoid stale state closure
      void loadMantCandidates().then(candidates =>
        callMapper(ocrItems, candidates)
      );
    } else if (confidence >= 40) {
      // Fallback: OCR extracted header but no items — keep single empty draft
      setOcrNotice(
        `Datos de cabecera extraídos por IA (${Math.round(confidence)}%) — agregá los ítems manualmente`
      );
    } else {
      setOcrNotice(
        'No se pudo extraer información del archivo — completá los campos manualmente'
      );
    }
  }

  function resetForm() {
    setHeader(initialHeader());
    setItems([emptyDraft()]);
    setAttachmentUrl('');
    setOcrNotice(null);
    // vehicleId and vehicleLabel are intentionally NOT reset
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!vehicleId) return;

    const grandTotal = computeGrandTotal(items);
    const subtotal = grandTotal; // For historical import we treat total as subtotal
    const taxAmount = 0;
    const totalAmount = grandTotal;

    const payload = {
      rows: [
        {
          vehicleId,
          supplierName: header.supplierName,
          invoiceNumber: header.invoiceNumber,
          invoiceDate: header.invoiceDate,
          subtotal,
          taxAmount,
          totalAmount,
          notes: header.notes || undefined,
          items: items
            .filter(item => item.description.trim())
            .map(item => ({
              description: item.description,
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: parseFloat(item.unitPrice) || 0,
              total: parseFloat(item.total) || 0,
              mantItemId: item.mantItemId ?? null,
              categoryId: item.categoryId ?? null,
            })),
        },
      ],
    };

    // Ensure at least one valid item
    if (payload.rows[0].items.length === 0) {
      toast({
        title: 'Sin ítems',
        description: 'Agregá al menos un ítem con descripción',
        variant: 'destructive',
      });
      return;
    }

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
        title: `Factura ${header.invoiceNumber} registrada`,
      });
      resetForm();
      requestAnimationFrame(() => {
        invoiceNumberRef.current?.focus();
      });
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

  const grandTotal = computeGrandTotal(items);
  const hasValidItems = items.some(item => item.description.trim().length > 0);

  const submitDisabled =
    !vehicleId ||
    !header.invoiceNumber.trim() ||
    !header.supplierName.trim() ||
    !hasValidItems ||
    grandTotal <= 0 ||
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

      {/* OCR upload */}
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

      {/* Header fields */}
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
                  value={header.invoiceNumber}
                  onChange={e =>
                    setHeader(prev => ({
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
                  value={header.invoiceDate}
                  onChange={e =>
                    setHeader(prev => ({
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
                  value={header.supplierName}
                  onChange={e =>
                    setHeader(prev => ({
                      ...prev,
                      supplierName: e.target.value,
                    }))
                  }
                  placeholder="Nombre del proveedor"
                  required
                />
              </div>

              {/* notes — col-span-2 */}
              <div className="col-span-2 space-y-1">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={header.notes}
                  onChange={e =>
                    setHeader(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Observaciones adicionales (opcional)"
                  rows={2}
                />
              </div>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      {/* Items section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ítems de factura</CardTitle>
            {mapperLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Clasificando con IA...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <fieldset disabled={!vehicleId} className="space-y-1">
            {/* Column headers */}
            <div className="grid grid-cols-[4fr_1fr_1.5fr_1.5fr_3fr_40px] gap-2 pb-1 border-b text-xs font-medium text-muted-foreground">
              <div>Descripción</div>
              <div>Cant.</div>
              <div>P. Unit.</div>
              <div>Total</div>
              <div>Categoría</div>
              <div></div>
            </div>

            {/* Item rows */}
            {items.map((draft, index) => (
              <InvoiceItemRow
                key={draft.id}
                draft={draft}
                candidates={mantCandidates}
                onChange={updated => handleItemChange(index, updated)}
                onRemove={() => handleItemRemove(index)}
              />
            ))}

            {/* Add item button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={handleAddItem}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar ítem
            </Button>

            {/* Grand total */}
            <div className="flex justify-end pt-3 border-t">
              <div className="text-sm font-semibold">
                Total:{' '}
                <span className="text-base">
                  {grandTotal.toLocaleString('es-CO', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
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
