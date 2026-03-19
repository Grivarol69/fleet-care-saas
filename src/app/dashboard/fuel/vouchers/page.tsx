'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { FuelVoucherTable } from './components/FuelVoucherTable';
import { AddFuelVoucherDialog } from './components/AddFuelVoucherDialog';
import {
  FUEL_TYPE_LABELS,
  FUEL_TYPES,
} from './components/FuelVoucherForm/FuelVoucherForm.form';
import type { FuelVoucherRow } from './components/FuelVoucherTable/FuelVoucherTable.types';

interface Vehicle {
  id: string;
  licensePlate: string;
}

export default function FuelVouchersPage() {
  const [vouchers, setVouchers] = useState<FuelVoucherRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterVehicleId, setFilterVehicleId] = useState<string>('_all');
  const [filterFuelType, setFilterFuelType] = useState<string>('_all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const { toast } = useToast();

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await axios.get('/api/vehicles/vehicles');
      setVehicles(res.data);
    } catch {
      console.error('Error fetching vehicles');
    }
  }, []);

  const fetchVouchers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterVehicleId && filterVehicleId !== '_all')
        params.set('vehicleId', filterVehicleId);
      if (filterFuelType && filterFuelType !== '_all')
        params.set('fuelType', filterFuelType);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      params.set('pageSize', '50');

      const res = await axios.get(`/api/fuel/vouchers?${params.toString()}`);
      setVouchers(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (error) {
      console.error('Error fetching fuel vouchers:', error);
      toast({
        title: 'Error al cargar vales',
        description: 'No se pudieron cargar los vales de combustible.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filterVehicleId, filterFuelType, filterDateFrom, filterDateTo, toast]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este vale de combustible?')) return;
    try {
      await axios.delete(`/api/fuel/vouchers/${id}`);
      setVouchers(prev => prev.filter(v => v.id !== id));
      toast({
        title: 'Vale eliminado',
        description: 'El vale fue eliminado correctamente.',
      });
    } catch {
      toast({
        title: 'Error al eliminar',
        description: 'No se pudo eliminar el vale.',
        variant: 'destructive',
      });
    }
  };

  // Summary totals for current filter
  const totalLiters = vouchers.reduce((acc, v) => acc + Number(v.liters), 0);
  const totalAmount = vouchers.reduce(
    (acc, v) => acc + (v.totalAmount ? Number(v.totalAmount) : 0),
    0
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vales de Combustible</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} registros en total
          </p>
        </div>
        <AddFuelVoucherDialog onSuccess={fetchVouchers} />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="space-y-1">
          <Label className="text-xs">Vehículo</Label>
          <Select value={filterVehicleId} onValueChange={setFilterVehicleId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.licensePlate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Tipo de Combustible</Label>
          <Select value={filterFuelType} onValueChange={setFilterFuelType}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {FUEL_TYPES.map(ft => (
                <SelectItem key={ft} value={ft}>
                  {FUEL_TYPE_LABELS[ft]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <FuelVoucherTable
        vouchers={vouchers}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {/* Summary row */}
      {!isLoading && vouchers.length > 0 && (
        <div className="flex gap-6 justify-end text-sm text-muted-foreground border-t pt-3">
          <span>
            Total litros:{' '}
            <strong className="text-foreground">
              {totalLiters.toLocaleString('es-AR', {
                minimumFractionDigits: 3,
              })}{' '}
              L
            </strong>
          </span>
          {totalAmount > 0 && (
            <span>
              Total monto:{' '}
              <strong className="text-foreground">
                $
                {totalAmount.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
