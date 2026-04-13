'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import axios from 'axios';
import { ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { LookupItem, LookupSelectFieldProps } from './LookupSelectField.types';

export function LookupSelectField<T extends LookupItem>({
  label,
  placeholder = 'Seleccione...',
  value,
  onChange,
  items,
  onItemsChange,
  disabled,
  renderCreateDialog,
  renderEditDialog,
  deleteEndpoint,
}: LookupSelectFieldProps<T>) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  const { toast } = useToast();

  const selectedItem = items.find(item => item.id === value);

  const handleSelect = (item: T) => {
    onChange(item.id);
    setPopoverOpen(false);
  };

  const handleCreate = (item: T) => {
    onItemsChange([...items, item]);
    onChange(item.id);
  };

  const handleEditClick = (item: T) => {
    setEditingItem(item);
    setPopoverOpen(false);
    setEditOpen(true);
  };

  const handleEditSuccess = (updated: T) => {
    onItemsChange(items.map(i => (i.id === updated.id ? updated : i)));
    setEditOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async (item: T) => {
    try {
      await axios.delete(deleteEndpoint(item.id));
      onItemsChange(items.filter(i => i.id !== item.id));
      if (value === item.id) {
        onChange('');
      }
      toast({
        title: 'Eliminado',
        description: `"${item.name}" fue eliminado exitosamente`,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: 'No se puede eliminar',
          description: 'El registro tiene datos asociados',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error al eliminar',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {selectedItem ? selectedItem.name : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="start">
          <div className="flex items-center justify-between mb-2 pb-2 border-b">
            <span className="text-sm font-medium">{label}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setPopoverOpen(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Nuevo
            </Button>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {items.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">
                No hay registros. Crea uno nuevo.
              </p>
            ) : (
              items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent"
                >
                  <span className="text-sm flex-1 truncate min-w-0">
                    {item.name}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant={value === item.id ? 'default' : 'outline'}
                      className="h-6 px-2 text-xs"
                      onClick={() => handleSelect(item)}
                    >
                      Seleccionar
                    </Button>
                    {!item.isGlobal && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="Editar"
                          onClick={() => handleEditClick(item)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          title="Eliminar"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {renderCreateDialog({
        isOpen: createOpen,
        setIsOpen: setCreateOpen,
        onSuccess: handleCreate,
      })}

      {editingItem &&
        renderEditDialog({
          item: editingItem,
          isOpen: editOpen,
          setIsOpen: setEditOpen,
          onSuccess: handleEditSuccess,
        })}
    </div>
  );
}
