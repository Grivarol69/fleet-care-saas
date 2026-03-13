'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';

type TemparioItem = {
  id: string;
  code: string;
  description: string;
  referenceHours: number;
  tempario: {
    name: string;
  };
};

type TemparioPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderItemId: string;
  workOrderId: string;
  nextSequence: number;
  onSuccess: () => void;
};

export function TemparioPickerModal({
  open,
  onOpenChange,
  workOrderItemId,
  workOrderId,
  nextSequence,
  onSuccess,
}: TemparioPickerModalProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<TemparioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchItems();
      setSelectedIds([]);
      setSearchQuery('');
    }
  }, [open]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/maintenance/tempario-items');
      setItems(res.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los items del tempario',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(
    item =>
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsSubmitting(true);

      const selectedItems = items.filter(item => selectedIds.includes(item.id));

      // Create subtasks in parallel
      await Promise.all(
        selectedItems.map((item, index) =>
          axios.post(`/api/maintenance/work-orders/${workOrderId}/subtasks`, {
            workOrderItemId,
            description: item.description,
            standardHours: item.referenceHours,
            temparioItemId: item.id,
            sequence: nextSequence + index,
          })
        )
      );

      toast({
        title: 'Éxito',
        description: `Se agregaron ${selectedIds.length} tareas al item.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron agregar algunas tareas',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Cargar desde Tempario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o descripción..."
              className="pl-8"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[400px] border rounded-md p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground text-center">
                  Cargando catálogo...
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">
                No se encontraron resultados para "{searchQuery}"
              </p>
            ) : (
              <div className="space-y-1">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer group"
                    onClick={() => toggleSelect(item.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] px-1 h-4"
                        >
                          {item.code}
                        </Badge>
                        <p className="text-sm font-medium truncate">
                          {item.description}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {item.tempario?.name}
                      </p>
                    </div>
                    <div className="text-xs font-mono font-medium text-muted-foreground">
                      {item.referenceHours} hs
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedIds.length} seleccionados
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0 || isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Agregar ({selectedIds.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
