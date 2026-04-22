'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Plus,
  Copy,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  GlobeIcon,
  BuildingIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type VehicleType = { id: string; name: string };

type TemplateItem = {
  id?: string;
  category: string;
  label: string;
  isRequired: boolean;
  order: number;
};

type Template = {
  id: string;
  name: string;
  isGlobal: boolean;
  isActive: boolean;
  countryCode: string | null;
  vehicleTypeId: string;
  vehicleType: { id: string; name: string };
  items: TemplateItem[];
  clonedFrom: { id: string; name: string } | null;
  _count: { checklists: number; clones: number };
  createdAt: string;
};

type CurrentUser = { role: string; isSuperAdmin: boolean };

type ModalState =
  | { type: 'create'; isGlobal: boolean }
  | { type: 'edit'; template: Template }
  | { type: 'clone'; template: Template }
  | { type: 'delete'; template: Template }
  | null;

// ─── Item Editor ─────────────────────────────────────────────────────────────

function ItemEditor({
  items,
  onChange,
}: {
  items: TemplateItem[];
  onChange: (items: TemplateItem[]) => void;
}) {
  const add = () =>
    onChange([
      ...items,
      { category: '', label: '', isRequired: true, order: items.length },
    ]);

  const remove = (idx: number) =>
    onChange(
      items
        .filter((_, i) => i !== idx)
        .map((item, i) => ({ ...item, order: i }))
    );

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next.map((item, i) => ({ ...item, order: i })));
  };

  const update = (idx: number, field: keyof TemplateItem, value: unknown) =>
    onChange(
      items.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_2fr_auto_auto_auto] gap-1 text-xs font-medium text-muted-foreground px-1">
        <span>Categoría</span>
        <span>Etiqueta</span>
        <span>Req.</span>
        <span />
        <span />
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-2 text-center">
          Sin ítems. Agregá al menos uno.
        </p>
      )}
      {items.map((item, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[1fr_2fr_auto_auto_auto] gap-1 items-center"
        >
          <Input
            placeholder="categoria"
            value={item.category}
            onChange={e => update(idx, 'category', e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Descripción del ítem"
            value={item.label}
            onChange={e => update(idx, 'label', e.target.value)}
            className="h-8 text-sm"
          />
          <Checkbox
            checked={item.isRequired}
            onCheckedChange={v => update(idx, 'isRequired', !!v)}
          />
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-20"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === items.length - 1}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-20"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => remove(idx)}
            className="p-1 rounded hover:bg-destructive/10 text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full mt-1"
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Agregar ítem
      </Button>
    </div>
  );
}

// ─── Template Form Dialog (Create / Edit) ────────────────────────────────────

function TemplateFormDialog({
  modal,
  vehicleTypes,
  onClose,
  onSaved,
}: {
  modal: Extract<ModalState, { type: 'create' | 'edit' }>;
  vehicleTypes: VehicleType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = modal.type === 'edit';
  const template = isEdit ? modal.template : null;

  const [name, setName] = useState(template?.name ?? '');
  const [vehicleTypeId, setVehicleTypeId] = useState(
    template?.vehicleTypeId ?? ''
  );
  const [countryCode, setCountryCode] = useState(template?.countryCode ?? 'CO');
  const [items, setItems] = useState<TemplateItem[]>(template?.items ?? []);
  const [submitting, setSubmitting] = useState(false);

  const isGlobal = isEdit
    ? template!.isGlobal
    : (modal as Extract<ModalState, { type: 'create' }>).isGlobal;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }
    if (!vehicleTypeId) {
      toast({ title: 'Tipo de vehículo requerido', variant: 'destructive' });
      return;
    }
    if (items.length === 0) {
      toast({ title: 'Agregá al menos un ítem', variant: 'destructive' });
      return;
    }
    const invalidItem = items.find(i => !i.category.trim() || !i.label.trim());
    if (invalidItem) {
      toast({
        title: 'Todos los ítems necesitan categoría y etiqueta',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await axios.patch(`/api/hseq/checklists/templates/${template!.id}`, {
          name: name.trim(),
          countryCode: countryCode || null,
          items,
        });
        toast({ title: 'Template actualizado' });
      } else {
        await axios.post('/api/hseq/checklists/templates', {
          name: name.trim(),
          vehicleTypeId,
          countryCode: countryCode || null,
          isGlobal,
          items,
        });
        toast({ title: 'Template creado' });
      }
      onSaved();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error
        : 'Error al guardar';
      toast({ title: msg ?? 'Error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? 'Editar template'
              : isGlobal
                ? 'Nuevo template global'
                : 'Nuevo template personalizado'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Pre-operacional Camioneta"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de vehículo</Label>
              <Select
                value={vehicleTypeId}
                onValueChange={setVehicleTypeId}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map(vt => (
                    <SelectItem key={vt.id} value={vt.id}>
                      {vt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Código de país{' '}
              <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
              placeholder="CO"
              className="w-24"
            />
          </div>

          <div className="space-y-2">
            <Label>Ítems del checklist</Label>
            <ItemEditor items={items} onChange={setItems} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? 'Guardando...'
              : isEdit
                ? 'Guardar cambios'
                : 'Crear template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Clone Dialog ─────────────────────────────────────────────────────────────

function CloneDialog({
  template,
  onClose,
  onSaved,
}: {
  template: Template;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(`${template.name} (copia)`);
  const [submitting, setSubmitting] = useState(false);

  const handleClone = async () => {
    if (!name.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(`/api/hseq/checklists/templates/${template.id}/clone`, {
        name: name.trim(),
      });
      toast({ title: 'Template clonado al tenant' });
      onSaved();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error
        : 'Error al clonar';
      toast({ title: msg ?? 'Error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Clonar template</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Se creará una copia independiente de <strong>{template.name}</strong>{' '}
          para tu tenant. Podés editarla libremente sin afectar el global.
        </p>
        <div className="space-y-1.5">
          <Label>Nombre del template clonado</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleClone} disabled={submitting}>
            {submitting ? 'Clonando...' : 'Clonar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteDialog({
  template,
  onClose,
  onDeleted,
}: {
  template: Template;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await axios.delete(`/api/hseq/checklists/templates/${template.id}`);
      toast({ title: 'Template eliminado' });
      onDeleted();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error
        : 'Error al eliminar';
      toast({ title: msg ?? 'Error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={open => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar template?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará <strong>{template.name}</strong>.
            {template._count.checklists > 0 && (
              <>
                {' '}
                Tiene {template._count.checklists} checklist(s) asociado(s), por
                lo que será <strong>desactivado</strong> en lugar de eliminado.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Templates Table ──────────────────────────────────────────────────────────

function TemplatesTable({
  templates,
  currentUser,
  tab,
  onEdit,
  onClone,
  onDelete,
}: {
  templates: Template[];
  currentUser: CurrentUser | null;
  tab: 'global' | 'custom';
  onEdit: (t: Template) => void;
  onClone: (t: Template) => void;
  onDelete: (t: Template) => void;
}) {
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;
  const canManage = ['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(
    currentUser?.role ?? ''
  );

  if (templates.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground text-sm">
        {tab === 'global'
          ? 'No hay templates globales.'
          : 'No hay templates personalizados. Cloná uno global o creá uno nuevo.'}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo de vehículo</TableHead>
            <TableHead className="text-center">Ítems</TableHead>
            <TableHead className="text-center">Checklists</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map(t => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {t.vehicleType.name}
              </TableCell>
              <TableCell className="text-center text-sm">
                {t.items.length}
              </TableCell>
              <TableCell className="text-center text-sm">
                {t._count.checklists}
              </TableCell>
              <TableCell>
                {t.isGlobal ? (
                  <Badge variant="secondary" className="gap-1">
                    <GlobeIcon className="h-3 w-3" /> Global
                  </Badge>
                ) : t.clonedFrom ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Copy className="h-3 w-3" /> Clonado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <BuildingIcon className="h-3 w-3" /> Personalizado
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    t.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }
                >
                  {t.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {/* Clone: shown on global tab for any management role */}
                  {tab === 'global' && canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClone(t)}
                      title="Clonar al tenant"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Edit: global → only SUPER_ADMIN; tenant → OWNER/MANAGER/SUPER_ADMIN */}
                  {(t.isGlobal ? isSuperAdmin : canManage) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(t)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Delete: same rules as edit */}
                  {(t.isGlobal ? isSuperAdmin : canManage) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(t)}
                      title="Eliminar"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChecklistTemplatesPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'global' | 'custom'>('global');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      const [templatesRes, typesRes, userRes] = await Promise.all([
        axios.get(`/api/hseq/checklists/templates?source=${tab}`),
        axios.get('/api/vehicles/types'),
        axios.get('/api/auth/me'),
      ]);
      setTemplates(templatesRes.data);
      setVehicleTypes(typesRes.data);
      setCurrentUser(userRes.data);
    } catch {
      toast({ title: 'Error al cargar datos', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const closeModal = () => setModal(null);
  const onSaved = () => {
    closeModal();
    fetchAll();
  };

  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;
  const canManage = ['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(
    currentUser?.role ?? ''
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Templates de Checklist</h1>
          <p className="text-muted-foreground mt-1">
            Configurá los ítems de inspección pre-operacional por tipo de
            vehículo
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button
              variant="outline"
              onClick={() => setModal({ type: 'create', isGlobal: false })}
            >
              <Plus className="h-4 w-4 mr-1" /> Nuevo personalizado
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              onClick={() => setModal({ type: 'create', isGlobal: true })}
            >
              <GlobeIcon className="h-4 w-4 mr-1" /> Nuevo global
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={v => setTab(v as 'global' | 'custom')}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="global">
            <GlobeIcon className="h-4 w-4 mr-1.5" /> Globales
          </TabsTrigger>
          <TabsTrigger value="custom">
            <BuildingIcon className="h-4 w-4 mr-1.5" /> Del tenant
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          Cargando...
        </div>
      ) : (
        <TemplatesTable
          templates={templates}
          currentUser={currentUser}
          tab={tab}
          onEdit={t => setModal({ type: 'edit', template: t })}
          onClone={t => setModal({ type: 'clone', template: t })}
          onDelete={t => setModal({ type: 'delete', template: t })}
        />
      )}

      {/* Dialogs */}
      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <TemplateFormDialog
          modal={modal}
          vehicleTypes={vehicleTypes}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
      {modal?.type === 'clone' && (
        <CloneDialog
          template={modal.template}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteDialog
          template={modal.template}
          onClose={closeModal}
          onDeleted={onSaved}
        />
      )}
    </div>
  );
}
