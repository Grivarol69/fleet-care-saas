'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { AddItemDialog } from '@/app/dashboard/maintenance/work-orders/components/WorkOrderDetail/AddItemDialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  GitMerge,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { canOverrideWorkOrderFreeze } from '@/lib/permissions';

const FROZEN_WO_STATUSES = new Set([
  'APPROVED',
  'IN_PROGRESS',
  'PENDING_INVOICE',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
]);

export function UnifiedWorkOrderForm({
  initialData,
  currentUser,
  onRefresh,
}: {
  initialData?: any;
  currentUser?: { id: string; role: string; isSuperAdmin: boolean } | null;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [mantItems, setMantItems] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);

  const isEditing = !!initialData?.id;
  const isFrozen =
    !!initialData?.status &&
    FROZEN_WO_STATUSES.has(initialData.status) &&
    !canOverrideWorkOrderFreeze(currentUser as any);

  // Clasificamos items originales
  const originalServices =
    initialData?.workOrderItems?.filter(
      (i: any) =>
        i.mantItem?.type === 'SERVICE' || i.mantItem?.type === 'ACTION'
    ) || [];
  const originalParts =
    initialData?.workOrderItems?.filter(
      (i: any) => i.mantItem?.type === 'PART'
    ) || [];

  const mapItem = (i: any) => ({
    id: i.id,
    mantItemId: i.mantItem?.id || i.mantItemId || '',
    description: i.description || '',
    closureType: i.closureType || 'PENDING',
    itemSource: i.itemSource || 'EXTERNAL',
    providerId: i.providerId || null,
    unitPrice: Number(i.unitPrice || 0),
    quantity: Number(i.quantity || 1),
    masterPartId: i.masterPartId || null,
    subTasks:
      i.workOrderSubTasks?.map((sub: any) => ({
        id: sub.id,
        procedureId: sub.procedureId,
        temparioItemId: sub.temparioItemId,
        description: sub.description,
        standardHours: sub.standardHours,
        directHours: sub.directHours,
        status: sub.status,
        notes: sub.notes,
      })) || [],
  });

  const form = useForm<any>({
    defaultValues: {
      vehicleId: initialData?.vehicleId || '',
      title: initialData?.title || '',
      description: initialData?.description || '',
      mantType: initialData?.mantType || 'CORRECTIVE',
      priority: initialData?.priority || 'MEDIUM',
      status: initialData?.status || 'PENDING',
      workType: initialData?.workType || 'MIXED',
      technicianId: initialData?.technicianId || null,
      costCenterId: initialData?.costCenterId || null,
      scheduledDate: initialData?.startDate || null,
      services: originalServices.map(mapItem),
      parts: originalParts.map(mapItem),
    },
  });

  const servicesArray = useFieldArray({
    control: form.control,
    name: 'services',
  });
  const partsArray = useFieldArray({ control: form.control, name: 'parts' });

  const [showAddPartDialog, setShowAddPartDialog] = useState(false);
  const [temparioItems, setTemparioItems] = useState<any[]>([]);
  const [temparioPickerMode, setTemparioPickerMode] = useState<
    Record<number, boolean>
  >({});
  const [temparioPickerSelected, setTemparioPickerSelected] = useState<
    Record<number, string>
  >({});
  const [mantItemComboOpen, setMantItemComboOpen] = useState<
    Record<number, boolean>
  >({});
  const [temparioComboOpen, setTemparioComboOpen] = useState<
    Record<number, boolean>
  >({});
  const [temparioPickerHours, setTemparioPickerHours] = useState<
    Record<number, number>
  >({});

  const servicesWatch = useWatch({ control: form.control, name: 'services' });
  const totalStdHours = (servicesWatch as any[])
    .flatMap((s: any) => s.subTasks ?? [])
    .reduce((acc: number, t: any) => acc + (Number(t.standardHours) || 0), 0);
  const totalDirectHours = (servicesWatch as any[])
    .flatMap((s: any) => s.subTasks ?? [])
    .reduce((acc: number, t: any) => acc + (Number(t.directHours) || 0), 0);

  const watchedVehicleId = form.watch('vehicleId');
  const selectedVehicle = vehicles.find(v => v.id === watchedVehicleId);

  useEffect(() => {
    axios
      .get('/api/vehicles/vehicles')
      .then(res => setVehicles(res.data || []));
    axios
      .get('/api/maintenance/mant-items')
      .then(res => setMantItems(res.data || []));
    axios
      .get('/api/people/providers')
      .then(res => setProviders(res.data || []));
    axios
      .get('/api/people/technicians')
      .then(res => setTechnicians(res.data || []));
  }, []);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      // Unificar para backend
      const payload = {
        ...data,
        items: [...data.services, ...data.parts],
      };
      delete payload.services;
      delete payload.parts;

      if (isEditing) {
        await axios.put(
          `/api/maintenance/work-orders/${initialData.id}`,
          payload
        );
        toast({
          title: 'Orden Actualizada',
          description: 'Los ítems se sincronizaron.',
        });
      } else {
        const res = await axios.post('/api/maintenance/work-orders', payload);
        toast({
          title: 'Orden Creada',
          description: 'La orden se guardó correctamente.',
        });
        router.push(`/dashboard/maintenance/work-orders/${res.data.id}`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Falló al guardar',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMantItemSelect = async (
    val: string,
    index: number,
    arrayName: 'services' | 'parts',
    onChangeUpdater: (val: string) => void
  ) => {
    onChangeUpdater(val);
    const selectedItem = mantItems.find(m => m.id === val);
    if (!selectedItem) return;

    if (!form.getValues(`${arrayName}.${index}.description`)) {
      form.setValue(`${arrayName}.${index}.description`, selectedItem.name);
    }

    if (selectedItem.type === 'PART') {
      const vehicleId = form.getValues('vehicleId');
      if (vehicleId) {
        try {
          const res = await axios.get(
            `/api/maintenance/vehicle-parts/suggest?mantItemId=${val}&vehicleId=${vehicleId}`
          );
          const data = res.data;
          if (data && data.masterPartId) {
            form.setValue(
              `${arrayName}.${index}.masterPartId`,
              data.masterPartId
            );
            if (data.stock && data.stock > 0) {
              form.setValue(
                `${arrayName}.${index}.itemSource`,
                'INTERNAL_STOCK'
              );
              toast({
                title: 'Stock Encontrado automáticamente',
                description: `Hay ${data.stock} unidades en tu inventario local.`,
              });
            } else {
              form.setValue(`${arrayName}.${index}.itemSource`, 'EXTERNAL');
              toast({
                title: 'Sin Stock Interno',
                description: `Este repuesto se marcó como externo para futura Orden de Compra.`,
              });
            }
          }
        } catch (e) {
          console.log('No master part mapping found for suggestion.');
        }
      }
    }
  };

  const handleLoadTempario = async (index: number, mantItemId: string) => {
    const vehicleId = form.getValues('vehicleId');
    const selectedVehicle = vehicles.find(v => v.id === vehicleId);
    if (!selectedVehicle?.brandId) {
      toast({
        title: 'Sin marca',
        description:
          'El vehículo no tiene marca — no se puede buscar Tempario.',
      });
      return;
    }
    if (!selectedVehicle || !mantItemId) return;

    try {
      const res = await axios.get(
        `/api/maintenance/tempario/lookup?mantItemId=${mantItemId}&vehicleBrandId=${selectedVehicle.brandId}&vehicleLineId=${selectedVehicle.lineId}`
      );
      const procedure = res.data;
      if (procedure && procedure.steps) {
        const newSteps = procedure.steps.map((s: any) => ({
          procedureId: procedure.id,
          temparioItemId: s.temparioItemId,
          description: s.temparioItem.description,
          standardHours: s.standardHours,
          status: 'PENDING',
        }));
        form.setValue(`services.${index}.subTasks`, newSteps);
        setTemparioPickerMode(prev => ({ ...prev, [index]: false }));
        toast({
          title: 'Despiece Cargado',
          description: `Se conectaron ${newSteps.length} tareas del Tempario a este servicio.`,
        });
      }
    } catch (e) {
      // Sin receta completa → habilitar picker de ítems individuales
      if (temparioItems.length === 0) {
        const res = await axios.get('/api/maintenance/tempario-items');
        setTemparioItems(res.data || []);
      }
      setTemparioPickerMode(prev => ({ ...prev, [index]: true }));
      toast({
        title: 'Sin receta automática',
        description:
          'Seleccioná las tareas manualmente desde el catálogo de Tempario.',
      });
    }
  };

  const renderServiceRow = (field: any, index: number) => {
    const itemSource = form.watch(`services.${index}.itemSource`);
    const mantItemId = form.watch(`services.${index}.mantItemId`);
    const subTasks = form.watch(`services.${index}.subTasks`);
    const selectedMantItem = mantItems.find((m: any) => m.id === mantItemId);

    return (
      <Card key={field.id} className="shadow-sm">
        <CardContent className="pt-4 flex flex-col gap-3">
          {/* Línea 1: Select MantItem + Toggle Origen + Trash */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`services.${index}.mantItemId`}
                render={({ field: mantField }) => (
                  <FormItem>
                    <FormLabel>Servicio / Tarea</FormLabel>
                    <Popover
                      open={mantItemComboOpen[index] || false}
                      onOpenChange={o =>
                        setMantItemComboOpen(prev => ({ ...prev, [index]: o }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {mantField.value
                              ? mantItems.find(
                                  (m: any) => m.id === mantField.value
                                )?.name
                              : 'Seleccione'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[380px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar servicio..." />
                          <CommandList>
                            <CommandEmpty>Sin resultados.</CommandEmpty>
                            <CommandGroup>
                              {mantItems
                                .filter(
                                  (mi: any) =>
                                    mi.type === 'SERVICE' ||
                                    mi.type === 'ACTION'
                                )
                                .map((mi: any) => (
                                  <CommandItem
                                    key={mi.id}
                                    value={mi.name}
                                    onSelect={() => {
                                      handleMantItemSelect(
                                        mi.id,
                                        index,
                                        'services',
                                        mantField.onChange
                                      );
                                      setMantItemComboOpen(prev => ({
                                        ...prev,
                                        [index]: false,
                                      }));
                                    }}
                                  >
                                    {mi.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-1 pb-[2px]">
              <Button
                type="button"
                size="sm"
                variant={
                  itemSource === 'INTERNAL_STOCK' ? 'default' : 'outline'
                }
                onClick={() =>
                  form.setValue(
                    `services.${index}.itemSource`,
                    'INTERNAL_STOCK'
                  )
                }
              >
                Taller Propio
              </Button>
              <Button
                type="button"
                size="sm"
                variant={itemSource === 'EXTERNAL' ? 'default' : 'outline'}
                onClick={() =>
                  form.setValue(`services.${index}.itemSource`, 'EXTERNAL')
                }
              >
                Servicio Externo
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="mb-[2px]"
              onClick={() => servicesArray.remove(index)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Línea 2: Descripción + Cant + Precio */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`services.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isFrozen} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="w-20">
              <FormField
                control={form.control}
                name={`services.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cant.</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        disabled={isFrozen}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="w-28">
              <FormField
                control={form.control}
                name={`services.${index}.unitPrice`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        disabled={isFrozen}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Línea 3: Proveedor (solo si EXTERNAL) */}
          {itemSource === 'EXTERNAL' && (
            <div>
              <FormField
                control={form.control}
                name={`services.${index}.providerId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Línea 4: Despiece de Tareas (solo si INTERNAL_STOCK + SERVICE/ACTION) */}
          {(selectedMantItem?.type === 'SERVICE' ||
            selectedMantItem?.type === 'ACTION') &&
            itemSource === 'INTERNAL_STOCK' && (
              <div className="border-t pt-3 mt-1 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    Despiece de Tareas
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadTempario(index, mantItemId)}
                  >
                    <GitMerge className="w-4 h-4 mr-2" /> Cargar Despiece
                  </Button>
                </div>

                {/* Picker manual cuando no hay receta completa */}
                {temparioPickerMode[index] && (
                  <div className="flex gap-2 items-center">
                    <Popover
                      open={temparioComboOpen[index] || false}
                      onOpenChange={o =>
                        setTemparioComboOpen(prev => ({ ...prev, [index]: o }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="flex-1 h-8 text-sm justify-between font-normal"
                        >
                          <span className="truncate">
                            {temparioPickerSelected[index]
                              ? (() => {
                                  const t = temparioItems.find(
                                    (t: any) =>
                                      t.id === temparioPickerSelected[index]
                                  );
                                  return t
                                    ? `${t.code} — ${t.description}`
                                    : 'Seleccionar tarea del Tempario...';
                                })()
                              : 'Seleccionar tarea del Tempario...'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[480px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar por código o descripción..." />
                          <CommandList className="max-h-64">
                            <CommandEmpty>Sin resultados.</CommandEmpty>
                            <CommandGroup>
                              {temparioItems.map((item: any) => (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.code} ${item.description}`}
                                  onSelect={() => {
                                    setTemparioPickerSelected(prev => ({
                                      ...prev,
                                      [index]: item.id,
                                    }));
                                    setTemparioPickerHours(prev => ({
                                      ...prev,
                                      [index]: Number(item.referenceHours),
                                    }));
                                    setTemparioComboOpen(prev => ({
                                      ...prev,
                                      [index]: false,
                                    }));
                                  }}
                                >
                                  <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">
                                    {item.code}
                                  </span>
                                  <span className="flex-1 truncate">
                                    {item.description}
                                  </span>
                                  <span className="ml-2 text-xs text-muted-foreground shrink-0">
                                    {Number(item.referenceHours)}h
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="Hrs"
                        className="w-16 h-8 text-sm text-center"
                        value={temparioPickerHours[index] ?? ''}
                        onChange={e =>
                          setTemparioPickerHours(prev => ({
                            ...prev,
                            [index]: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="text-xs text-muted-foreground">h</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const selectedId = temparioPickerSelected[index];
                        if (!selectedId) return;
                        const item = temparioItems.find(
                          (t: any) => t.id === selectedId
                        );
                        if (!item) return;
                        const hours =
                          temparioPickerHours[index] ??
                          Number(item.referenceHours);
                        const current =
                          form.getValues(`services.${index}.subTasks`) || [];
                        form.setValue(`services.${index}.subTasks`, [
                          ...current,
                          {
                            temparioItemId: item.id,
                            description: item.description,
                            standardHours: hours,
                            status: 'PENDING',
                            procedureId: null,
                          },
                        ]);
                        setTemparioPickerSelected(prev => ({
                          ...prev,
                          [index]: '',
                        }));
                        setTemparioPickerHours(prev => ({
                          ...prev,
                          [index]: 0,
                        }));
                        setTemparioComboOpen(prev => ({
                          ...prev,
                          [index]: false,
                        }));
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {subTasks && subTasks.length > 0 && (
                  <Collapsible
                    className="w-full border rounded-md"
                    defaultOpen={true}
                  >
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                      <h4 className="text-sm font-semibold">
                        {subTasks.length} Tareas
                      </h4>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="sm">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="p-4 space-y-2 bg-background">
                      {subTasks.map((t: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="flex justify-between items-center gap-4 p-2 border-b last:border-0 text-sm"
                        >
                          <span className="text-muted-foreground flex-1">
                            {t.description}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="bg-secondary text-secondary-foreground font-mono text-xs px-2 py-0.5 rounded">
                              {t.standardHours}h
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                const tasks = (
                                  form.getValues(
                                    `services.${index}.subTasks`
                                  ) || []
                                ).filter((_: any, i: number) => i !== sIdx);
                                form.setValue(
                                  `services.${index}.subTasks`,
                                  tasks
                                );
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
        </CardContent>
      </Card>
    );
  };

  const renderPartRow = (field: any, index: number) => {
    const itemSource = form.watch(`parts.${index}.itemSource`);

    return (
      <Card key={field.id} className="shadow-sm">
        <CardContent className="pt-4 flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`parts.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isFrozen} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="w-20">
              <FormField
                control={form.control}
                name={`parts.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cant.</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        disabled={isFrozen}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="w-28">
              <FormField
                control={form.control}
                name={`parts.${index}.unitPrice`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        disabled={isFrozen}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="pb-[2px]">
              <Badge variant="outline" className="text-xs">
                {itemSource === 'INTERNAL_STOCK' ? 'Taller' : 'Externo'}
              </Badge>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="mb-[2px]"
              onClick={() => partsArray.remove(index)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          {itemSource === 'EXTERNAL' && (
            <div>
              <FormField
                control={form.control}
                name={`parts.${index}.providerId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle>1. Detalles Principales de Orden</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6 pt-6">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vehículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="font-semibold">
                              {v.licensePlate}
                            </span>
                            {(v.brand?.name || v.line?.name) && (
                              <span className="text-muted-foreground ml-1">
                                —{' '}
                                {[v.brand?.name, v.line?.name]
                                  .filter(Boolean)
                                  .join(' ')}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título de la OT</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Mantenimiento 10K km"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Odómetro actual (km)</FormLabel>
                <Input
                  readOnly
                  value={
                    selectedVehicle
                      ? selectedVehicle.mileage.toLocaleString('es-AR')
                      : '—'
                  }
                  className="bg-muted text-muted-foreground cursor-default"
                />
              </FormItem>
              <FormField
                control={form.control}
                name="technicianId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico asignado</FormLabel>
                    <Select
                      value={field.value ?? ''}
                      onValueChange={val => field.onChange(val || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin técnico asignado" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-blue-100 shadow-sm">
            <CardHeader className="flex flex-row justify-between items-center bg-blue-50/50 pb-4">
              <div>
                <CardTitle className="text-blue-900">
                  2. Servicios y Tareas (Labor)
                </CardTitle>
                <CardDescription>
                  Trabajos a realizar, ya sea en Taller Propio o por Terceros.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Hrs Est: {totalStdHours.toFixed(1)}h
                </Badge>
                <Badge
                  variant={
                    totalDirectHours === 0
                      ? 'secondary'
                      : totalDirectHours >= totalStdHours
                        ? 'default'
                        : 'outline'
                  }
                >
                  Hrs Reales: {totalDirectHours.toFixed(1)}h
                </Badge>
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-blue-100 hover:bg-blue-200 text-blue-900"
                  onClick={() =>
                    servicesArray.append({
                      mantItemId: '',
                      description: '',
                      quantity: 1,
                      unitPrice: 0,
                      itemSource: 'INTERNAL_STOCK',
                      closureType: 'PENDING',
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-2" /> Añadir Servicio
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 bg-slate-50/30">
              {servicesArray.fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay servicios agregados todavía.
                </p>
              )}
              {servicesArray.fields.map((field, index) =>
                renderServiceRow(field, index)
              )}
            </CardContent>
          </Card>

          <Card className="border-orange-100 shadow-sm">
            <CardHeader className="flex flex-row justify-between items-center bg-orange-50/50 pb-4">
              <div>
                <CardTitle className="text-orange-900">
                  3. Repuestos e Insumos (Parts)
                </CardTitle>
                <CardDescription>
                  Materiales requeridos de Inventario Interno o por Comprar
                  (Externo).
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="bg-orange-100 hover:bg-orange-200 text-orange-900"
                onClick={() => setShowAddPartDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Añadir Repuesto
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 bg-slate-50/30">
              {partsArray.fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay repuestos agregados todavía.
                </p>
              )}
              {partsArray.fields.map((field, index) =>
                renderPartRow(field, index)
              )}
            </CardContent>
          </Card>

          <Card className="border-muted shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                4. Notas / Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones, diagnóstico inicial, condiciones del vehículo al ingreso..."
                        className="min-h-[100px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <AddItemDialog
            mode={initialData?.id ? 'endpoint' : 'form'}
            vehicleId={form.watch('vehicleId') ?? ''}
            open={showAddPartDialog}
            onClose={() => setShowAddPartDialog(false)}
            onItemAdded={
              !initialData?.id
                ? (item: any) => {
                    partsArray.append(item as any);
                    setShowAddPartDialog(false);
                  }
                : undefined
            }
            onSuccess={
              initialData?.id
                ? (createdItem?: any) => {
                    if (createdItem) {
                      partsArray.append({
                        id: createdItem.id,
                        mantItemId: createdItem.mantItemId,
                        description: createdItem.description || '',
                        closureType: createdItem.closureType || 'PENDING',
                        itemSource: createdItem.itemSource || 'EXTERNAL',
                        providerId: createdItem.providerId || null,
                        unitPrice: Number(createdItem.unitPrice || 0),
                        quantity: Number(createdItem.quantity || 1),
                        masterPartId: createdItem.masterPartId || null,
                        subTasks: [],
                      } as any);
                    }
                    setShowAddPartDialog(false);
                    onRefresh?.();
                  }
                : undefined
            }
            workOrderId={initialData?.id ?? ''}
          />

          <div className="flex justify-end sticky bottom-4 bg-background/80 backdrop-blur border-t p-4 rounded-xl shadow-lg">
            <Button
              type="submit"
              size="lg"
              disabled={isLoading || isFrozen}
              className="w-full sm:w-auto"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Sincronizar Cambios' : 'Confirmar y Guardar Orden'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
