"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Search } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";

import { formSchema } from "./FormEditVehicleTemplate.form";
import {
  FormEditVehicleTemplateProps,
  Vehicle,
  MantPlan,
} from "../types";
import { VehicleSelectModal } from "../VehicleSelectModal";
import { MantPlanSelectModal } from "../MantPlanSelectModal";

export function FormEditVehicleTemplate({
  isOpen,
  setIsOpen,
  item,
  onEditVehicleTemplate,
}: FormEditVehicleTemplateProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isVehicleSelectOpen, setIsVehicleSelectOpen] = useState(false);
  
  const [mantPlans, setMantPlans] = useState<MantPlan[]>([]);
  const [selectedMantPlan, setSelectedMantPlan] = useState<MantPlan | null>(null);
  const [isMantPlanSelectOpen, setIsMantPlanSelectOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: item?.vehicleId || 0,
      mantPlanId: item?.mantPlanId || 0,
      assignedAt: item?.assignedAt ? new Date(item.assignedAt) : new Date(),
      lastKmCheck: item?.lastKmCheck || undefined,
      status: item?.status as "ACTIVE" | "INACTIVE" || "ACTIVE",
    },
  });

  const { toast } = useToast();

  // Reset form cuando cambie el item
  useEffect(() => {
    if (item && isOpen) {
      form.reset({
        vehicleId: item.vehicleId,
        mantPlanId: item.mantPlanId,
        assignedAt: new Date(item.assignedAt),
        lastKmCheck: item.lastKmCheck || undefined,
        status: item.status as "ACTIVE" | "INACTIVE",
      });

      // Set selected vehicle and plan from item data
      if (item.vehicle) {
        setSelectedVehicle(item.vehicle);
      }
      if (item.mantPlan) {
        setSelectedMantPlan(item.mantPlan);
      }
    }
  }, [item, isOpen, form]);

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

  // Fetch maintenance plans
  useEffect(() => {
    const fetchMantPlans = async () => {
      try {
        const response = await axios.get("/api/maintenance/mant-template");
        setMantPlans(response.data);
      } catch (error) {
        console.error("Error fetching maintenance plans:", error);
        toast({
          title: "Error al cargar planes",
          description: "No se pudieron cargar los planes de mantenimiento",
          variant: "destructive",
        });
      }
    };

    if (isOpen) {
      fetchMantPlans();
    }
  }, [isOpen, toast]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    form.setValue("vehicleId", vehicle.id);
    setIsVehicleSelectOpen(false);
  };

  const handleMantPlanSelect = (plan: MantPlan) => {
    setSelectedMantPlan(plan);
    form.setValue("mantPlanId", plan.id);
    setIsMantPlanSelectOpen(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      const response = await axios.put(`/api/maintenance/vehicle-template/${item.id}`, {
        vehicleId: values.vehicleId,
        mantPlanId: values.mantPlanId,
        assignedAt: values.assignedAt,
        lastKmCheck: values.lastKmCheck || null,
        status: values.status,
      });

      onEditVehicleTemplate(response.data);
      setIsOpen(false);
      
      toast({
        title: "Plantilla actualizada",
        description: "La plantilla de mantenimiento ha sido actualizada correctamente",
      });
    } catch (error) {
      console.error("Error updating vehicle template:", error);
      toast({
        title: "Error al actualizar plantilla",
        description: "No se pudo actualizar el plan de mantenimiento",
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
    setSelectedMantPlan(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Plantilla de Mantenimiento</DialogTitle>
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

            {/* Selector de Plan de Mantenimiento */}
            <FormField
              control={form.control}
              name="mantPlanId"
              render={({ field: _field }) => (
                <FormItem>
                  <FormLabel>Plan de Mantenimiento *</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="ID del plan"
                          value={selectedMantPlan ? selectedMantPlan.id.toString() : ""}
                          readOnly
                        />
                        <Input
                          placeholder="Plan seleccionado"
                          value={
                            selectedMantPlan
                              ? `${selectedMantPlan.name} - ${selectedMantPlan.brand?.name || "N/A"} ${selectedMantPlan.line?.name || "N/A"}`
                              : ""
                          }
                          readOnly
                        />
                      </div>
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsMantPlanSelectOpen(true)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de Asignación */}
            <FormField
              control={form.control}
              name="assignedAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Asignación *</FormLabel>
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

            {/* Último Kilometraje Registrado */}
            <FormField
              control={form.control}
              name="lastKmCheck"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Último Kilometraje Registrado</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 15000"
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? undefined : Number(value));
                      }}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="INACTIVE">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Actualizar"}
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

      <MantPlanSelectModal
        isOpen={isMantPlanSelectOpen}
        setIsOpen={setIsMantPlanSelectOpen}
        mantPlans={mantPlans}
        onSelectMantPlan={handleMantPlanSelect}
      />
    </Dialog>
  );
}