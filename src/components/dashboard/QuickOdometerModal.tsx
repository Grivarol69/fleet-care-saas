'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/hooks/use-toast';
import axios from 'axios';
import {
  Gauge,
  Truck,
  User,
  Check,
  ChevronsUpDown,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Vehicle = {
  id: number;
  licensePlate: string;
  brandName: string;
  lineName: string;
  mileage: number;
  lastUpdate: Date | null;
  daysSinceUpdate: number;
};

type Driver = {
  id: number;
  name: string;
};

type QuickOdometerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedVehicle?: {
    id: number;
    licensePlate: string;
    currentMileage: number;
  } | null;
  onSuccess?: () => void;
};

export function QuickOdometerModal({
  open,
  onOpenChange,
  preselectedVehicle,
  onSuccess,
}: QuickOdometerModalProps) {
  const { toast } = useToast();
  const mileageInputRef = useRef<HTMLInputElement>(null);

  // Estados del formulario
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [measureType, setMeasureType] = useState<'KILOMETERS' | 'HOURS'>(
    'KILOMETERS'
  );
  const [value, setValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Datos
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Cargar vehículos y conductores al abrir
  useEffect(() => {
    if (open) {
      fetchVehicles();
      fetchDrivers();

      // Si hay vehículo preseleccionado
      if (preselectedVehicle) {
        setSelectedVehicle({
          id: preselectedVehicle.id,
          licensePlate: preselectedVehicle.licensePlate,
          brandName: '',
          lineName: '',
          mileage: preselectedVehicle.currentMileage,
          lastUpdate: null,
          daysSinceUpdate: 0,
        });
        // Focus en el campo de kilometraje
        setTimeout(() => mileageInputRef.current?.focus(), 100);
      }
    } else {
      // Reset al cerrar
      resetForm();
    }
  }, [open, preselectedVehicle]);

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await axios.get('/api/dashboard/fleet-status');
      const fleetData = response.data.vehicles.map(
        (v: {
          id: number;
          licensePlate: string;
          brandName: string;
          lineName: string;
          currentMileage: number;
          odometer: { lastUpdate: Date | null; daysSinceUpdate: number };
        }) => ({
          id: v.id,
          licensePlate: v.licensePlate,
          brandName: v.brandName,
          lineName: v.lineName,
          mileage: v.currentMileage,
          lastUpdate: v.odometer.lastUpdate,
          daysSinceUpdate: v.odometer.daysSinceUpdate,
        })
      );
      setVehicles(fleetData);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('/api/people/drivers');
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const resetForm = () => {
    setSelectedVehicle(null);
    setSelectedDriver('');
    setMeasureType('KILOMETERS');
    setValue('');
    setVehicleOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedVehicle) {
      toast({
        title: 'Error',
        description: 'Selecciona un vehículo',
        variant: 'destructive',
      });
      return;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa un valor válido',
        variant: 'destructive',
      });
      return;
    }

    // Validar que el nuevo valor sea mayor al actual
    if (measureType === 'KILOMETERS' && numValue <= selectedVehicle.mileage) {
      toast({
        title: 'Error',
        description: `El kilometraje debe ser mayor a ${selectedVehicle.mileage.toLocaleString()} km`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await axios.post('/api/vehicles/odometer', {
        vehicleId: selectedVehicle.id,
        driverId: selectedDriver ? parseInt(selectedDriver) : null,
        measureType,
        kilometers: measureType === 'KILOMETERS' ? numValue : null,
        hours: measureType === 'HOURS' ? numValue : null,
        recordedAt: new Date().toISOString(),
      });

      const increment = numValue - selectedVehicle.mileage;

      toast({
        title: 'Registrado',
        description: (
          <div className="flex flex-col gap-1">
            <span className="font-semibold">
              {selectedVehicle.licensePlate}
            </span>
            <span>
              {numValue.toLocaleString()}{' '}
              {measureType === 'KILOMETERS' ? 'km' : 'hrs'}
              {measureType === 'KILOMETERS' && increment > 0 && (
                <span className="text-green-600 ml-2">
                  +{increment.toLocaleString()} km
                </span>
              )}
            </span>
          </div>
        ),
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: string } };
      toast({
        title: 'Error',
        description: axiosError.response?.data || 'No se pudo registrar',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar Enter para enviar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedVehicle && value) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Gauge className="h-5 w-5 text-blue-600" />
            </div>
            Registro Rápido de Odómetro
          </DialogTitle>
          <DialogDescription>
            Registra el kilometraje o las horas de operación del vehículo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4" onKeyDown={handleKeyDown}>
          {/* Selector de Vehículo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Vehículo
            </Label>
            <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={vehicleOpen}
                  className="w-full justify-between h-12 text-left"
                  disabled={!!preselectedVehicle}
                >
                  {selectedVehicle ? (
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="font-mono text-base"
                      >
                        {selectedVehicle.licensePlate}
                      </Badge>
                      <span className="text-muted-foreground text-sm">
                        {selectedVehicle.brandName} {selectedVehicle.lineName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Buscar por placa...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar placa..." />
                  <CommandList>
                    <CommandEmpty>
                      {loadingVehicles
                        ? 'Cargando...'
                        : 'No se encontró el vehículo'}
                    </CommandEmpty>
                    <CommandGroup>
                      {vehicles.map(vehicle => (
                        <CommandItem
                          key={vehicle.id}
                          value={vehicle.licensePlate}
                          onSelect={() => {
                            setSelectedVehicle(vehicle);
                            setVehicleOpen(false);
                            setTimeout(
                              () => mileageInputRef.current?.focus(),
                              100
                            );
                          }}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <Check
                              className={cn(
                                'h-4 w-4',
                                selectedVehicle?.id === vehicle.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <Badge variant="outline" className="font-mono">
                              {vehicle.licensePlate}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {vehicle.brandName} {vehicle.lineName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {vehicle.daysSinceUpdate > 10 ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {vehicle.daysSinceUpdate}d
                              </Badge>
                            ) : vehicle.daysSinceUpdate > 5 ? (
                              <Badge
                                variant="secondary"
                                className="gap-1 bg-yellow-100 text-yellow-800"
                              >
                                <Clock className="h-3 w-3" />
                                {vehicle.daysSinceUpdate}d
                              </Badge>
                            ) : null}
                            <span className="text-muted-foreground">
                              {vehicle.mileage.toLocaleString()} km
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Info del vehículo seleccionado */}
            {selectedVehicle && (
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg text-sm">
                <span className="text-muted-foreground">Último registro:</span>
                <span className="font-medium">
                  {selectedVehicle.mileage.toLocaleString()} km
                  {selectedVehicle.daysSinceUpdate > 0 && (
                    <span className="text-muted-foreground ml-2">
                      (hace {selectedVehicle.daysSinceUpdate} días)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Selector de Conductor (Opcional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Conductor{' '}
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Seleccionar conductor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin conductor</SelectItem>
                {drivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id.toString()}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Medición y Valor */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Tipo</Label>
              <Select
                value={measureType}
                onValueChange={v => setMeasureType(v as 'KILOMETERS' | 'HOURS')}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KILOMETERS">
                    <span className="flex items-center gap-2">
                      <Gauge className="h-4 w-4" /> Kilómetros
                    </span>
                  </SelectItem>
                  <SelectItem value="HOURS">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Horas
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-3 space-y-2">
              <Label>
                {measureType === 'KILOMETERS' ? 'Kilometraje' : 'Horas'}
              </Label>
              <div className="relative">
                <Input
                  ref={mileageInputRef}
                  type="number"
                  min={selectedVehicle ? selectedVehicle.mileage + 1 : 0}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={
                    selectedVehicle
                      ? `Mayor a ${selectedVehicle.mileage.toLocaleString()}`
                      : '0'
                  }
                  className="h-12 text-lg font-semibold pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {measureType === 'KILOMETERS' ? 'km' : 'hrs'}
                </span>
              </div>
            </div>
          </div>

          {/* Preview del incremento */}
          {selectedVehicle &&
            value &&
            parseInt(value) > selectedVehicle.mileage && (
              <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-green-700">Incremento:</span>
                <Badge className="bg-green-600 text-white text-base px-3 py-1">
                  +
                  {(parseInt(value) - selectedVehicle.mileage).toLocaleString()}{' '}
                  km
                </Badge>
              </div>
            )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedVehicle || !value || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Registrar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
