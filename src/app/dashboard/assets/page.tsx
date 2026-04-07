'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { AxleDiagram } from './components/AxleDiagram';
import { SerializedItemTable } from './components/SerializedItemTable';
import { SerializedItemDetail } from './components/SerializedItemDetail';
import { SelectSerialDialog } from './components/SelectSerialDialog';
import { ItemAlertsWidget } from './components/ItemAlertsWidget';
import type { SerializedItemRow } from './components/SerializedItemTable/SerializedItemTable.types';
import type { SerializedSlotData } from './components/AxleDiagram/AxleDiagram.types';
import type { SerializedItemAlertRow } from './components/ItemAlertsWidget/ItemAlertsWidget.types';
import {
  SERIALIZED_ITEM_STATUS_LABELS,
  AXLE_CONFIG_LABELS,
} from '@/lib/serialized-asset-constants';

// ── Types ──────────────────────────────────────────────────────────────────

interface VehicleSummary {
  vehicleId: string;
  licensePlate: string;
  brandName: string;
  lineName: string;
  axleConfig: string;
  totalSlots: number;
  activeAlertCount: number;
  assignments: Array<{
    assignmentId: string;
    position: string;
    serializedItemId: string;
    serialNumber: string;
    description?: string;
    type: string;
    specs: Record<string, unknown> | null;
    activeAlertCount: number;
  }>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const { toast } = useToast();

  // Inventario tab
  const [items, setItems] = useState<SerializedItemRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [filterStatus, setFilterStatus] = useState('_all');
  const [filterType, setFilterType] = useState('_all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  // Vehicles tab
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );

  // Detail / slot dialogs
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [slotDialogData, setSlotDialogData] = useState<{
    vehicleId: string;
    vehicleLicensePlate: string;
    position: string;
  } | null>(null);
  const [selectSerialOpen, setSelectSerialOpen] = useState(false);

  // Alerts tab
  const [alerts, setAlerts] = useState<SerializedItemAlertRow[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  const debouncedSearch = useDebounce(filterSearch, 300);
  const debouncedVehicleSearch = useDebounce(vehicleSearch, 300);

  // ── Fetch items ──────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setIsLoadingItems(true);
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      if (filterStatus !== '_all') params.set('status', filterStatus);
      if (filterType !== '_all') params.set('type', filterType);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterBatch) params.set('batchNumber', filterBatch);

      const res = await fetch(`/api/serialized-items?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalItems(data.total ?? 0);
    } catch {
      toast({ title: 'Error al cargar activos', variant: 'destructive' });
    } finally {
      setIsLoadingItems(false);
    }
  }, [filterStatus, filterType, debouncedSearch, filterBatch, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ── Fetch vehicles ───────────────────────────────────────────────────────

  const fetchVehicles = useCallback(async () => {
    setIsLoadingVehicles(true);
    try {
      const params = new URLSearchParams();
      if (debouncedVehicleSearch) params.set('search', debouncedVehicleSearch);
      const res = await fetch(
        `/api/serialized-items/vehicles-summary?${params}`
      );
      const data = await res.json();
      setVehicles(data.vehicles ?? []);
    } catch {
      toast({ title: 'Error al cargar vehículos', variant: 'destructive' });
    } finally {
      setIsLoadingVehicles(false);
    }
  }, [debouncedVehicleSearch, toast]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // ── Fetch alerts ─────────────────────────────────────────────────────────

  const fetchAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);
    try {
      const res = await fetch('/api/serialized-items/alerts?status=ACTIVE');
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      /* silent */
    } finally {
      setIsLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleResolveAlert(alertId: string) {
    await fetch(`/api/serialized-items/alerts/${alertId}`, { method: 'PATCH' });
    fetchAlerts();
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const selectedVehicle =
    vehicles.find(v => v.vehicleId === selectedVehicleId) ?? null;

  const axleSlots: SerializedSlotData[] = (
    selectedVehicle?.assignments ?? []
  ).map(a => ({
    position: a.position ?? '',
    serializedItemId: a.serializedItemId,
    serialNumber: a.serialNumber,
    description: a.description,
    type: a.type,
    specs: a.specs as SerializedSlotData['specs'],
    activeAlertCount: a.activeAlertCount,
  }));

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activos Serializados</h1>
        {alerts.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Vehículos</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas
            {alerts.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-4 px-1 text-[10px]"
              >
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Vehicles tab ── */}
        <TabsContent value="vehicles" className="space-y-4 pt-4">
          <Input
            placeholder="Buscar vehículo por patente..."
            value={vehicleSearch}
            onChange={e => setVehicleSearch(e.target.value)}
            className="max-w-xs"
          />

          {isLoadingVehicles ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-md bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map(v => (
                <button
                  key={v.vehicleId}
                  type="button"
                  onClick={() =>
                    setSelectedVehicleId(
                      v.vehicleId === selectedVehicleId ? null : v.vehicleId
                    )
                  }
                  className={`text-left rounded-lg border p-4 transition-colors ${
                    selectedVehicleId === v.vehicleId
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{v.licensePlate}</p>
                      <p className="text-sm text-muted-foreground">
                        {v.brandName} {v.lineName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {AXLE_CONFIG_LABELS[v.axleConfig] ?? v.axleConfig} ·{' '}
                        {v.assignments.length}/{v.totalSlots} posiciones
                      </p>
                    </div>
                    {v.activeAlertCount > 0 && (
                      <Badge variant="destructive" className="shrink-0">
                        {v.activeAlertCount}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedVehicle && (
            <div className="mt-4 flex flex-col lg:flex-row gap-6">
              <div className="w-full max-w-[260px]">
                <p className="text-sm font-medium mb-2">
                  {selectedVehicle.licensePlate} —{' '}
                  {AXLE_CONFIG_LABELS[selectedVehicle.axleConfig] ??
                    selectedVehicle.axleConfig}
                </p>
                <AxleDiagram
                  axleConfig={selectedVehicle.axleConfig}
                  slots={axleSlots}
                  onSlotClick={(position, data) => {
                    if (data) {
                      setSelectedItemId(data.serializedItemId);
                      setDetailOpen(true);
                    } else {
                      setSlotDialogData({
                        vehicleId: selectedVehicle.vehicleId,
                        vehicleLicensePlate: selectedVehicle.licensePlate,
                        position,
                      });
                      setSelectSerialOpen(true);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Inventory tab ── */}
        <TabsContent value="inventory" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos los estados</SelectItem>
                {Object.entries(SERIALIZED_ITEM_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos los tipos</SelectItem>
                <SelectItem value="TIRE">Neumático</SelectItem>
                <SelectItem value="EXTINGUISHER">Extintor</SelectItem>
                <SelectItem value="OTHER">Otro</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Buscar por serie..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              className="w-48"
            />

            <Input
              placeholder="Número de lote..."
              value={filterBatch}
              onChange={e => setFilterBatch(e.target.value)}
              className="w-40"
            />

            <span className="self-center text-sm text-muted-foreground">
              {totalItems} activos
            </span>
          </div>

          <SerializedItemTable
            items={items}
            isLoading={isLoadingItems}
            onRowClick={item => {
              setSelectedItemId(item.id);
              setDetailOpen(true);
            }}
          />
        </TabsContent>

        {/* ── Alerts tab ── */}
        <TabsContent value="alerts" className="pt-4">
          {isLoadingAlerts ? (
            <div className="h-32 rounded-md bg-muted animate-pulse" />
          ) : (
            <ItemAlertsWidget alerts={alerts} onResolve={handleResolveAlert} />
          )}
        </TabsContent>
      </Tabs>

      {/* Detail sheet */}
      <SerializedItemDetail
        itemId={selectedItemId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefresh={() => {
          fetchItems();
          fetchVehicles();
          fetchAlerts();
        }}
      />

      {/* Install dialog */}
      {slotDialogData && (
        <SelectSerialDialog
          vehicleId={slotDialogData.vehicleId}
          vehicleLicensePlate={slotDialogData.vehicleLicensePlate}
          position={slotDialogData.position}
          itemType="TIRE"
          open={selectSerialOpen}
          onOpenChange={setSelectSerialOpen}
          onSuccess={() => {
            setSelectSerialOpen(false);
            setSlotDialogData(null);
            fetchVehicles();
          }}
        />
      )}
    </div>
  );
}
