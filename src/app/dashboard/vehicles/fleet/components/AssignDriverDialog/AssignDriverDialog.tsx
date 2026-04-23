'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/hooks/use-toast';
import { UserCheck, UserX } from 'lucide-react';
import { FleetVehicle } from '../SharedTypes/sharedTypes';

type Driver = {
  id: string;
  name: string;
  email: string | null;
  licenseNumber: string | null;
};
type CurrentAssignment = { id: string; driver: Driver } | null;

interface AssignDriverDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vehicle: FleetVehicle;
}

export function AssignDriverDialog({
  isOpen,
  setIsOpen,
  vehicle,
}: AssignDriverDialogProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [current, setCurrent] = useState<CurrentAssignment>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, assignmentRes] = await Promise.all([
        axios.get('/api/people/drivers'),
        axios.get(`/api/vehicles/assignments?vehicleId=${vehicle.id}`),
      ]);
      setDrivers(driversRes.data);
      setCurrent(assignmentRes.data ?? null);
      setSelectedDriverId(assignmentRes.data?.driver?.id ?? '');
    } catch {
      toast({ title: 'Error cargando datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [vehicle.id, toast]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  const handleAssign = async () => {
    if (!selectedDriverId) return;
    setSaving(true);
    try {
      await axios.post('/api/vehicles/assignments', {
        vehicleId: vehicle.id,
        driverId: selectedDriverId,
      });
      toast({ title: 'Conductor asignado correctamente' });
      setIsOpen(false);
    } catch {
      toast({ title: 'Error al asignar conductor', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    setSaving(true);
    try {
      await axios.delete('/api/vehicles/assignments', {
        data: { vehicleId: vehicle.id },
      });
      toast({ title: 'Conductor desasignado' });
      setIsOpen(false);
    } catch {
      toast({ title: 'Error al desasignar conductor', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar conductor — {vehicle.licensePlate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {current && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Conductor actual</p>
                <p className="text-sm text-muted-foreground">
                  {current.driver.name}
                </p>
              </div>
              <Badge variant="default">Activo</Badge>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Seleccionar conductor
              </label>
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegir conductor..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                      {driver.licenseNumber && (
                        <span className="text-muted-foreground ml-1">
                          · {driver.licenseNumber}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {current && (
            <Button
              variant="outline"
              onClick={handleUnassign}
              disabled={saving}
            >
              <UserX className="mr-2 h-4 w-4" />
              Desasignar
            </Button>
          )}
          <Button
            onClick={handleAssign}
            disabled={
              !selectedDriverId ||
              saving ||
              selectedDriverId === current?.driver?.id
            }
          >
            <UserCheck className="mr-2 h-4 w-4" />
            {current ? 'Reasignar' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
