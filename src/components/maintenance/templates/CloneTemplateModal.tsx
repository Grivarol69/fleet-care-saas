'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface Brand {
  id: string;
  name: string;
}

interface Line {
  id: string;
  name: string;
}

interface CloneTemplateModalProps {
  templateId: string;
  originalName: string;
  onSuccess?: (newId: string) => void;
}

export function CloneTemplateModal({
  templateId,
  originalName,
  onSuccess,
}: CloneTemplateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Forms
  const [name, setName] = useState(`${originalName} (Copia)`);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<string>('');

  // Data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [lines, setLines] = useState<Line[]>([]);

  // Loading states
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  // Fetch Brands on Open
  useEffect(() => {
    if (open && brands.length === 0) {
      const fetchBrands = async () => {
        setIsLoadingBrands(true);
        try {
          const res = await fetch('/api/vehicles/brands');
          if (!res.ok) throw new Error('Failed to fetch brands');
          const data = await res.json();
          setBrands(data);
        } catch (error) {
          console.error(error);
          toast.error('Error al cargar las marcas de vehículos.');
        } finally {
          setIsLoadingBrands(false);
        }
      };
      fetchBrands();
    }
  }, [open, brands.length]);

  // Fetch Lines on Brand Change
  useEffect(() => {
    if (selectedBrand) {
      const fetchLines = async () => {
        setIsLoadingLines(true);
        setSelectedLine(''); // Reset line when brand changes
        try {
          const res = await fetch(
            `/api/vehicles/lines?brandId=${selectedBrand}`
          );
          if (!res.ok) throw new Error('Failed to fetch lines');
          const data = await res.json();
          setLines(data);
        } catch (error) {
          console.error(error);
          toast.error('Error al cargar las líneas de vehículos.');
        } finally {
          setIsLoadingLines(false);
        }
      };
      fetchLines();
    } else {
      setLines([]);
    }
  }, [selectedBrand]);

  const handleClone = async () => {
    if (!name || !selectedBrand || !selectedLine) {
      toast.error('Por favor completa todos los campos.');
      return;
    }

    setIsCloning(true);
    try {
      const res = await fetch('/api/maintenance/mant-template/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          name,
          vehicleBrandId: selectedBrand,
          vehicleLineId: selectedLine,
        }),
      });

      if (!res.ok) {
        const _data = await res.text();
        throw new Error(_data || 'Error al clonar el template');
      }

      const newTemplate = await res.json();
      toast.success('Template clonado exitosamente.');
      toast.info(
        'Importante: Recuerda agregar los repuestos específicos para este nuevo vehículo.',
        { duration: 6000 }
      );
      setOpen(false);
      if (onSuccess) {
        onSuccess(newTemplate.id);
      } else {
        router.push(`/maintenance/programs/${newTemplate.id}`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Ocurrió un error al intentar clonar el plan.');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Copy className="h-4 w-4" />
          Usar como Plantilla
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Clonar Plan de Mantenimiento</DialogTitle>
          <DialogDescription>
            Configura el nuevo plan basado en {originalName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-400">
              <strong>Atención:</strong> Para prevenir cruce de datos, el nuevo
              plan <strong>NO incluirá</strong> los repuestos automotrices del
              plan original. Deberás vincular repuestos específicos en el CRUD
              del nuevo plan.
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nuevo Nombre del Plan</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Mantenimiento Preventivo F150"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="brand">Marca Destino</Label>
            <Select
              onValueChange={setSelectedBrand}
              value={selectedBrand}
              disabled={isLoadingBrands}
            >
              <SelectTrigger id="brand">
                <SelectValue
                  placeholder={
                    isLoadingBrands ? 'Cargando...' : 'Selecciona una marca'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {brands.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="line">Línea Destino</Label>
            <Select
              onValueChange={setSelectedLine}
              value={selectedLine}
              disabled={!selectedBrand || isLoadingLines}
            >
              <SelectTrigger id="line">
                <SelectValue
                  placeholder={
                    !selectedBrand
                      ? 'Selecciona una marca primero'
                      : isLoadingLines
                        ? 'Cargando...'
                        : 'Selecciona una línea'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {lines.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedBrand && (
              <span className="text-xs text-muted-foreground">
                Si no encuentras la línea, regístrala desde Catálogos primero.
              </span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCloning}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleClone}
            disabled={isCloning || !name || !selectedBrand || !selectedLine}
          >
            {isCloning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Clonar y Configurar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
