"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, Search } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";

import { odometerFormSchema, OdometerFormValues } from "./schema";
import { Vehicle, Driver } from "./types";
import { VehicleSelectModal } from "./VehicleSelectModal";
import { DriverSelectModal } from "./DriverSelectModal";

interface FormAddOdometerProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAddOdometer: (odometer: any) => void;
}

export function FormAddOdometer({ isOpen, setIsOpen, onAddOdometer }: FormAddOdometerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isVehicleSelectOpen, setIsVehicleSelectOpen] = useState(false);
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDriverSelectOpen, setIsDriverSelectOpen] = useState(false);

  const form = useForm<OdometerFormValues>({
    resolver: zodResolver(odometerFormSchema),
    defaultValues: {
      vehicleId: 0,
      driverId: undefined,
      measureType: "KILOMETERS",
      measureValue: 0,
      recordedAt: new Date(),
    },
  });

  const { toast } = useToast();

  // Fetch vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await axios.get("/api/vehicles/vehicles");
        setVehicles(response.data);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        toast({
          title: "Error al cargar vehículos",
          description: "No se pudieron cargar los vehículos disponibles",
          variant: "destructive",
        });
      }
    };

    if (isOpen) {
      fetchVehicles();
    }
  }, [isOpen, toast]);

  // Fetch drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await axios.get("/api/people/drivers");
        setDrivers(response.data);
      } catch (error) {
        console.error("Error fetching drivers:", error);
        toast({
          title: "Error al cargar conductores",
          description: "No se pudieron cargar los conductores disponibles",
          variant: "destructive",
        });
      }
    };

    if (isOpen) {
      fetchDrivers();
    }
  }, [isOpen, toast]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    form.setValue("vehicleId", vehicle.id);
    setIsVehicleSelectOpen(false);
  };

  const handleDriverSelect = (driver: Driver | null) => {
    setSelectedDriver(driver);
    form.setValue("driverId", driver?.id);
    setIsDriverSelectOpen(false);
  };

  const onSubmit = async (values: OdometerFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Prepare data for API
      const odometerData = {
        vehicleId: values.vehicleId,
        driverId: values.driverId || null,
        [values.measureType === "KILOMETERS" ? "kilometers" : "hours"]: values.measureValue,
        measureType: values.measureType,
        recordedAt: values.recordedAt,
      };

      const response = await axios.post("/api/vehicles/odometer", odometerData);

      onAddOdometer(response.data);
      setIsOpen(false);
      form.reset();
      setSelectedVehicle(null);
      setSelectedDriver(null);
      
      toast({
        title: "Registro creado",
        description: "El registro de odómetro ha sido guardado correctamente",
      });
    } catch (error) {
      console.error("Error creating odometer log:", error);
      toast({
        title: "Error al crear registro",
        description: "No se pudo guardar el registro de odómetro",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    form.reset();
    setSelectedVehicle(null);
    setSelectedDriver(null);
  };

  const measureType = form.watch("measureType");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Odómetro/Horómetro</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Selector de Vehículo */}
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field: _field }) => (
                <FormItem>
                  <FormLabel>Vehículo *</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="ID del vehículo"
                          value={selectedVehicle ? selectedVehicle.id.toString() : ""}
                          readOnly
                        />
                        <Input
                          placeholder="Vehículo seleccionado"
                          value={
                            selectedVehicle
                              ? `${selectedVehicle.licensePlate} - ${selectedVehicle.brand?.name || "N/A"} ${selectedVehicle.line?.name || "N/A"}`
                              : ""
                          }
                          readOnly
                        />
                      </div>
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsVehicleSelectOpen(true)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selector de Conductor */}
            <FormField
              control={form.control}
              name="driverId"
              render={({ field: _field }) => (
                <FormItem>
                  <FormLabel>Conductor</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="ID del conductor"
                          value={selectedDriver ? selectedDriver.id.toString() : ""}
                          readOnly
                        />
                        <Input
                          placeholder="Conductor seleccionado"
                          value={selectedDriver ? selectedDriver.name : "Sin conductor"}
                          readOnly
                        />
                      </div>
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDriverSelectOpen(true)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Medida */}
            <FormField
              control={form.control}
              name="measureType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Medida *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de medida" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="KILOMETERS">Kilómetros</SelectItem>
                      <SelectItem value="HOURS">Horas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor de la Medida */}
            <FormField
              control={form.control}
              name="measureValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {measureType === "KILOMETERS" ? "Kilómetros" : "Horas"} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        measureType === "KILOMETERS" 
                          ? "Ej: 15000" 
                          : "Ej: 250.5"
                      }
                      type="number"
                      step={measureType === "HOURS" ? "0.1" : "1"}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de Registro */}
            <FormField
              control={form.control}
              name="recordedAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Registro *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Seleccione una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Modales de Selección */}
      <VehicleSelectModal
        isOpen={isVehicleSelectOpen}
        setIsOpen={setIsVehicleSelectOpen}
        vehicles={vehicles}
        onSelectVehicle={handleVehicleSelect}
      />

      <DriverSelectModal
        isOpen={isDriverSelectOpen}
        setIsOpen={setIsDriverSelectOpen}
        drivers={drivers}
        onSelectDriver={handleDriverSelect}
      />
    </Dialog>
  );
}