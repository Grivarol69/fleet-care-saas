'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ListPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Procedure = {
  id: string;
  mantItemId: string;
  vehicleBrandId: string | null;
  vehicleLineId: string | null;
  isGlobal: boolean;
  mantItem: { id: string; name: string };
  vehicleBrand: { id: string; name: string } | null;
  vehicleLine: { id: string; name: string } | null;
  _count?: {
    steps: number;
  };
};

type Step = {
  id: string;
  procedureId: string;
  temparioItemId: string;
  order: number;
  standardHours: number;
  temparioItem: {
    id: string;
    code: string;
    description: string;
    referenceHours: number;
  };
};

type TemparioItem = {
  id: string;
  code: string;
  description: string;
  referenceHours: number;
};

type MantItem = { id: string; name: string; type: string };
type VehicleBrand = { id: string; name: string };
type VehicleLine = { id: string; name: string; brandId: string };

export function TemparioList() {
  const { toast } = useToast();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(
    null
  );
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);

  // Options
  const [mantItems, setMantItems] = useState<MantItem[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleLines, setVehicleLines] = useState<VehicleLine[]>([]);
  const [temparioItems, setTemparioItems] = useState<TemparioItem[]>([]);

  // Procedure Dialog
  const [isProcDialogOpen, setIsProcDialogOpen] = useState(false);
  const [isSubmittingProc, setIsSubmittingProc] = useState(false);
  const [editingProcId, setEditingProcId] = useState<string | null>(null);
  const [mantItemId, setMantItemId] = useState<string>('');
  const [vehicleBrandId, setVehicleBrandId] = useState<string>('none');
  const [vehicleLineId, setVehicleLineId] = useState<string>('none');

  // Step Dialog
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [isSubmittingStep, setIsSubmittingStep] = useState(false);
  const [stepTemparioItemId, setStepTemparioItemId] = useState<string>('');
  const [stepOrder, setStepOrder] = useState<number>(1);
  const [stepStandardHours, setStepStandardHours] = useState<number | ''>('');

  useEffect(() => {
    fetchProcedures();
    fetchOptions();
  }, []);

  const fetchProcedures = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/maintenance/tempario');
      setProcedures(res.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el tempario',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSteps = async (procId: string) => {
    setIsLoadingSteps(true);
    try {
      const res = await axios.get(`/api/maintenance/tempario/${procId}/steps`);
      setSteps(res.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los pasos',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSteps(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [itemsRes, brandsRes, linesRes, tempItemsRes] = await Promise.all([
        axios.get('/api/maintenance/mant-items'),
        axios.get('/api/vehicles/brands'),
        axios.get('/api/vehicles/lines'),
        axios.get('/api/maintenance/tempario-items'),
      ]);
      setMantItems(
        itemsRes.data.filter(
          (i: any) => i.type === 'ACTION' || i.type === 'SERVICE'
        )
      );
      setVehicleBrands(brandsRes.data);
      setVehicleLines(linesRes.data);
      setTemparioItems(tempItemsRes.data);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleSelectProcedure = (proc: Procedure) => {
    setSelectedProcedure(proc);
    fetchSteps(proc.id);
  };

  const openNewProcDialog = () => {
    setEditingProcId(null);
    setMantItemId('');
    setVehicleBrandId('none');
    setVehicleLineId('none');
    setIsProcDialogOpen(true);
  };

  const openEditProcDialog = (proc: Procedure) => {
    setEditingProcId(proc.id);
    setMantItemId(proc.mantItemId);
    setVehicleBrandId(proc.vehicleBrandId || 'none');
    setVehicleLineId(proc.vehicleLineId || 'none');
    setIsProcDialogOpen(true);
  };

  const handleSubmitProc = async () => {
    if (!mantItemId) {
      toast({
        title: 'Error',
        description: 'Item de Mantenimiento requerido',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      mantItemId,
      vehicleBrandId: vehicleBrandId === 'none' ? null : vehicleBrandId,
      vehicleLineId: vehicleLineId === 'none' ? null : vehicleLineId,
    };

    setIsSubmittingProc(true);
    try {
      if (editingProcId) {
        await axios.patch(
          `/api/maintenance/tempario/${editingProcId}`,
          payload
        );
      } else {
        await axios.post('/api/maintenance/tempario', payload);
      }
      setIsProcDialogOpen(false);
      fetchProcedures();
      toast({
        title: 'Éxito',
        description: `Procedimiento ${editingProcId ? 'actualizado' : 'creado'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Error interno',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingProc(false);
    }
  };

  const handleDeleteProc = async (id: string, isGlobal: boolean) => {
    if (isGlobal) {
      toast({
        title: 'Aviso',
        description: 'No puedes eliminar un procedimiento global',
        variant: 'destructive',
      });
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este procedimiento?')) return;
    try {
      await axios.delete(`/api/maintenance/tempario/${id}`);
      if (selectedProcedure?.id === id) setSelectedProcedure(null);
      fetchProcedures();
      toast({ title: 'Éxito', description: 'Procedimiento eliminado' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar',
        variant: 'destructive',
      });
    }
  };

  const openAddStepDialog = () => {
    if (!selectedProcedure) return;
    setStepTemparioItemId('');
    setStepOrder(steps.length + 1);
    setStepStandardHours('');
    setIsStepDialogOpen(true);
  };

  const handleSubmitStep = async () => {
    if (!selectedProcedure || !stepTemparioItemId || stepStandardHours === '')
      return;

    const payload = {
      temparioItemId: stepTemparioItemId,
      order: stepOrder,
      standardHours: Number(stepStandardHours),
    };

    setIsSubmittingStep(true);
    try {
      await axios.post(
        `/api/maintenance/tempario/${selectedProcedure.id}/steps`,
        payload
      );
      setIsStepDialogOpen(false);
      fetchSteps(selectedProcedure.id);
      fetchProcedures(); // Update step count
      toast({ title: 'Éxito', description: 'Paso agregado' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Error interno',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingStep(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!selectedProcedure) return;
    if (!confirm('¿Eliminar este paso?')) return;
    try {
      await axios.delete(
        `/api/maintenance/tempario/${selectedProcedure.id}/steps/${stepId}`
      );
      fetchSteps(selectedProcedure.id);
      fetchProcedures(); // Update step count
      toast({ title: 'Éxito', description: 'Paso eliminado' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el paso',
        variant: 'destructive',
      });
    }
  };

  const filteredLines = vehicleLines.filter(l => l.brandId === vehicleBrandId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* PANEL IZQUIERDO: PROCEDIMIENTOS */}
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">
            Procedimientos (Flat Rate)
          </CardTitle>
          <Button size="sm" onClick={openNewProcDialog}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : procedures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay procedimientos registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mant Item</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead className="text-center">Pasos</TableHead>
                  <TableHead>Ámbito</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procedures.map(p => (
                  <TableRow
                    key={p.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedProcedure?.id === p.id
                        ? 'bg-muted'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => handleSelectProcedure(p)}
                  >
                    <TableCell className="font-medium">
                      {p.mantItem?.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.vehicleBrand?.name || 'Todas'}
                      {p.vehicleLine ? ` / ${p.vehicleLine.name}` : ''}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{p._count?.steps || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.isGlobal ? (
                        <Badge
                          className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                          variant="secondary"
                        >
                          Global
                        </Badge>
                      ) : (
                        <Badge variant="outline">Tenant</Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      {!p.isGlobal && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditProcDialog(p)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProc(p.id, p.isGlobal)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 inline-block ml-2 text-muted-foreground opacity-50" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PANEL DERECHO: PASOS */}
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b mb-4">
          <div>
            <CardTitle className="text-lg font-bold">
              Pasos del Procedimiento
            </CardTitle>
            {selectedProcedure && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProcedure.mantItem.name} —{' '}
                {selectedProcedure.vehicleBrand?.name || 'Geral'}
              </p>
            )}
          </div>
          {selectedProcedure && !selectedProcedure.isGlobal && (
            <Button size="sm" variant="outline" onClick={openAddStepDialog}>
              <ListPlus className="h-4 w-4 mr-2" /> Agregar Paso
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!selectedProcedure ? (
            <div className="text-center py-20 text-muted-foreground bg-slate-50 border border-dashed rounded-lg">
              Seleccione un procedimiento para ver sus pasos
            </div>
          ) : isLoadingSteps ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : steps.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              Este procedimiento no tiene pasos registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  {!selectedProcedure.isGlobal && (
                    <TableHead className="text-right w-12"></TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {steps.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">
                      {s.order}
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      {s.temparioItem.code}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.temparioItem.description}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(s.standardHours).toFixed(2)}
                    </TableCell>
                    {!selectedProcedure.isGlobal && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDeleteStep(s.id)}
                        >
                          <Plus className="h-3 w-3 text-destructive rotate-45" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell colSpan={3}>TOTAL HORAS</TableCell>
                  <TableCell className="text-right font-mono">
                    {steps
                      .reduce((acc, s) => acc + Number(s.standardHours), 0)
                      .toFixed(2)}
                  </TableCell>
                  {!selectedProcedure.isGlobal && <TableCell></TableCell>}
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DIALOG: NUEVO/EDITAR PROCEDIMIENTO */}
      <Dialog open={isProcDialogOpen} onOpenChange={setIsProcDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProcId ? 'Editar' : 'Nuevo'} Procedimiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Item de Mantenimiento
              </label>
              <Select
                value={mantItemId}
                onValueChange={setMantItemId}
                disabled={!!editingProcId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un item..." />
                </SelectTrigger>
                <SelectContent>
                  {mantItems.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Marca (opcional)</label>
                <Select
                  value={vehicleBrandId}
                  onValueChange={val => {
                    setVehicleBrandId(val);
                    setVehicleLineId('none');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Todas las marcas --</SelectItem>
                    {vehicleBrands.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Línea (opcional)</label>
                <Select
                  value={vehicleLineId}
                  onValueChange={setVehicleLineId}
                  disabled={vehicleBrandId === 'none'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Todas las líneas --</SelectItem>
                    {filteredLines.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProcDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitProc} disabled={isSubmittingProc}>
              {isSubmittingProc && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingProcId ? 'Guardar Cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: AGREGAR PASO */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Paso al Procedimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Operación del Tempario
              </label>
              <Select
                value={stepTemparioItemId}
                onValueChange={val => {
                  setStepTemparioItemId(val);
                  const item = temparioItems.find(i => i.id === val);
                  if (item) setStepStandardHours(item.referenceHours);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione operación..." />
                </SelectTrigger>
                <SelectContent>
                  {temparioItems.map(ti => (
                    <SelectItem key={ti.id} value={ti.id}>
                      {ti.code} - {ti.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Orden</label>
                <Input
                  type="number"
                  min={1}
                  value={stepOrder}
                  onChange={e => setStepOrder(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Horas Estándar</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={stepStandardHours}
                  onChange={e =>
                    setStepStandardHours(
                      e.target.value ? Number(e.target.value) : ''
                    )
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStepDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitStep} disabled={isSubmittingStep}>
              {isSubmittingStep && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Agregar Paso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
