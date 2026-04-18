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
  'CLOSED',
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
  const [mantItemComboOpen, setMantItemComboOpen] = useState<
    Record<number, boolean>
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

  // Reinicializar form cuando initialData cambia (ej: después de onRefresh tras PUT)
  useEffect(() => {
    if (!initialData?.id) return;
    const services = (initialData?.workOrderItems || [])
      .filter((i: any) => i.mantItem?.type === 'SERVICE' || i.mantItem?.type === 'ACTION')
      .map(mapItem);
    const parts = (initialData?.workOrderItems || [])
      .filter((i: any) => i.mantItem?.type === 'PART')
      .map(mapItem);
    form.reset({
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
      services,
      parts,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, (initialData?.workOrderItems ?? []).length]);

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
        onRefresh?.();
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

  const renderServiceRow = (field: any, index: number) => {
    const itemSource = form.watch(`services.${index}.itemSource`);
    const subTasks = form.watch(`services.${index}.subTasks`);
    const isExternal = itemSource === 'EXTERNAL';

    return (
      <div key={field.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            isExternal
              ? 'bg-blue-50/40 border-blue-200'
              : 'bg-muted/20 border-border'
          }`}
        >
          {/* Servicio selector */}
          <div className="w-[190px] shrink-0">
            <FormField
              control={form.control}
              name={`services.${index}.mantItemId`}
              render={({ field: mantField }) => (
                <FormItem className="space-y-0">
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
                        className="w-full justify-between font-normal h-8 text-xs"
                      >
                        <span className="truncate">
                          {mantField.value
                            ? mantItems.find(
                                (m: any) => m.id === mantField.value
                              )?.name
                            : 'Seleccione...'}
                        </span>
                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
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

          {/* Descripción */}
          <div className="flex-1 min-w-0">
            <FormField
              control={form.control}
              name={`services.${index}.description`}
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <Input
                      className="h-8 text-xs"
                      {...field}
                      disabled={isFrozen}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Cant */}
          <div className="w-14 shrink-0">
            <FormField
              control={form.control}
              name={`services.${index}.quantity`}
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <Input
                      type="number"
                      className="h-8 text-xs text-center"
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                      disabled={isFrozen}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Precio */}
          <div className="w-28 shrink-0">
            <FormField
              control={form.control}
              name={`services.${index}.unitPrice`}
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground shrink-0">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="h-8 text-xs"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        disabled={isFrozen}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Proveedor */}
          <div className="w-40 shrink-0">
            {isExternal ? (
              <FormField
                control={form.control}
                name={`services.${index}.providerId`}
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Proveedor..." />
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
            ) : (
              <span className="text-xs text-muted-foreground italic px-2">
                —
              </span>
            )}
          </div>

          {/* Tipo toggle */}
          <div className="flex gap-1 shrink-0">
            <Button
              type="button"
              size="sm"
              variant={
                itemSource === 'INTERNAL_STOCK' ? 'default' : 'outline'
              }
              className="h-7 px-2 text-xs"
              onClick={() =>
                form.setValue(
                  `services.${index}.itemSource`,
                  'INTERNAL_STOCK'
                )
              }
            >
              Propio
            </Button>
            <Button
              type="button"
              size="sm"
              variant={itemSource === 'EXTERNAL' ? 'default' : 'outline'}
              className="h-7 px-2 text-xs"
              onClick={() =>
                form.setValue(`services.${index}.itemSource`, 'EXTERNAL')
              }
            >
              Externo
            </Button>
          </div>

          {/* Delete */}
          {!isFrozen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => servicesArray.remove(index)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Subtareas (debajo de la fila, colapsable) */}
        {subTasks && subTasks.length > 0 && (
          <Collapsible className="border-x border-b rounded-b-lg -mt-px mb-1">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">
                {subTasks.length} tarea{subTasks.length !== 1 ? 's' : ''}
              </span>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="px-3 pb-2 space-y-1 bg-background">
              {subTasks.map((t: any, sIdx: number) => (
                <div
                  key={sIdx}
                  className="flex justify-between items-center gap-3 py-1 border-b last:border-0 text-xs"
                >
                  <span className="text-muted-foreground flex-1">
                    {t.description}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-secondary text-secondary-foreground font-mono text-[10px] px-1.5 py-0.5 rounded">
                      {t.standardHours}h
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        const tasks = (
                          form.getValues(`services.${index}.subTasks`) || []
                        ).filter((_: any, i: number) => i !== sIdx);
                        form.setValue(`services.${index}.subTasks`, tasks);
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
    );
  };

  const renderPartRow = (field: any, index: number) => {
    const itemSource = form.watch(`parts.${index}.itemSource`);
    const isExternal = itemSource === 'EXTERNAL';

    return (
      <div
        key={field.id}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          isExternal
            ? 'bg-orange-50/40 border-orange-200'
            : 'bg-muted/20 border-border'
        }`}
      >
        {/* Descripción */}
        <div className="flex-1 min-w-0">
          <FormField
            control={form.control}
            name={`parts.${index}.description`}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Input
                    className="h-8 text-xs"
                    {...field}
                    disabled={isFrozen}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Cant */}
        <div className="w-14 shrink-0">
          <FormField
            control={form.control}
            name={`parts.${index}.quantity`}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Input
                    type="number"
                    className="h-8 text-xs text-center"
                    {...field}
                    onChange={e => field.onChange(Number(e.target.value))}
                    disabled={isFrozen}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Precio */}
        <div className="w-28 shrink-0">
          <FormField
            control={form.control}
            name={`parts.${index}.unitPrice`}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground shrink-0">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="h-8 text-xs"
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                      disabled={isFrozen}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Proveedor */}
        <div className="w-40 shrink-0">
          {isExternal ? (
            <FormField
              control={form.control}
              name={`parts.${index}.providerId`}
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Proveedor..." />
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
          ) : (
            <span className="text-xs text-muted-foreground italic px-2">
              —
            </span>
          )}
        </div>

        {/* Badge tipo */}
        <div className="shrink-0 w-16 text-center">
          <Badge
            variant={isExternal ? 'secondary' : 'default'}
            className="text-xs"
          >
            {itemSource === 'INTERNAL_STOCK' ? 'Taller' : 'Externo'}
          </Badge>
        </div>

        {/* Delete */}
        {!isFrozen && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => partsArray.remove(index)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
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
                  disabled={isFrozen}
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
            <CardContent className="pt-4 pb-5 bg-slate-50/30">
              {servicesArray.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay servicios agregados todavía.
                </p>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="flex items-center gap-2 px-3 pb-1 text-[11px] font-medium text-muted-foreground">
                    <div className="w-[190px] shrink-0">Servicio / Tarea</div>
                    <div className="flex-1 min-w-0">Descripción</div>
                    <div className="w-14 shrink-0 text-center">Cant.</div>
                    <div className="w-28 shrink-0">Precio</div>
                    <div className="w-40 shrink-0">Proveedor</div>
                    <div className="w-[104px] shrink-0">Tipo</div>
                    <div className="w-7 shrink-0" />
                  </div>
                  <div className="space-y-2">
                    {servicesArray.fields.map((field, index) =>
                      renderServiceRow(field, index)
                    )}
                  </div>
                </>
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
                disabled={isFrozen}
                onClick={() => setShowAddPartDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Añadir Repuesto
              </Button>
            </CardHeader>
            <CardContent className="pt-4 pb-5 bg-slate-50/30">
              {partsArray.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay repuestos agregados todavía.
                </p>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="flex items-center gap-2 px-3 pb-1 text-[11px] font-medium text-muted-foreground">
                    <div className="flex-1 min-w-0">Descripción</div>
                    <div className="w-14 shrink-0 text-center">Cant.</div>
                    <div className="w-28 shrink-0">Precio</div>
                    <div className="w-40 shrink-0">Proveedor</div>
                    <div className="w-16 shrink-0 text-center">Origen</div>
                    <div className="w-7 shrink-0" />
                  </div>
                  <div className="space-y-2">
                    {partsArray.fields.map((field, index) =>
                      renderPartRow(field, index)
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {!isEditing && (
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
          )}

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
                    // No llamar onRefresh aquí: causaría un form.reset() que borra
                    // servicios inline no guardados aún en DB
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
