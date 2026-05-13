'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Loader2, UserPlus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/hooks/use-toast';

import {
  WORecipient,
  TenantUser,
  WO_EVENTS_LABELS,
  WOEventKey,
} from './WONotificationConfig.types';

const EVENT_KEYS = Object.keys(WO_EVENTS_LABELS) as WOEventKey[];

export function WONotificationConfig() {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<WORecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // Add dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addForm, setAddForm] = useState({
    userId: '',
    phone: '',
    events: [] as WOEventKey[],
  });
  const [isAdding, setIsAdding] = useState(false);

  // Inline phone edit state: userId → draft value
  const [phoneEdits, setPhoneEdits] = useState<Record<string, string>>({});

  const fetchRecipients = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get<WORecipient[]>(
        '/api/wo-notification-recipients'
      );
      setRecipients(res.data);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los destinatarios.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // Toggle a single event checkbox for a recipient
  const handleEventToggle = async (
    recipient: WORecipient,
    event: WOEventKey
  ) => {
    const currentEvents = recipient.events as WOEventKey[];
    const newEvents = currentEvents.includes(event)
      ? currentEvents.filter(e => e !== event)
      : [...currentEvents, event];

    setSavingUserId(recipient.userId);
    try {
      const res = await axios.patch<WORecipient>(
        '/api/wo-notification-recipients',
        { userId: recipient.userId, events: newEvents }
      );
      setRecipients(prev =>
        prev.map(r => (r.userId === recipient.userId ? res.data : r))
      );
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar los eventos.',
        variant: 'destructive',
      });
    } finally {
      setSavingUserId(null);
    }
  };

  // Save phone on blur
  const handlePhoneSave = async (recipient: WORecipient) => {
    const draft = phoneEdits[recipient.userId];
    if (draft === undefined || draft === recipient.phone) return;

    setSavingUserId(recipient.userId);
    try {
      const res = await axios.patch<WORecipient>(
        '/api/wo-notification-recipients',
        { userId: recipient.userId, phone: draft }
      );
      setRecipients(prev =>
        prev.map(r => (r.userId === recipient.userId ? res.data : r))
      );
      setPhoneEdits(prev => {
        const next = { ...prev };
        delete next[recipient.userId];
        return next;
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el teléfono.',
        variant: 'destructive',
      });
    } finally {
      setSavingUserId(null);
    }
  };

  // Toggle active / inactive (soft delete / reactivate)
  const handleToggleActive = async (recipient: WORecipient) => {
    setSavingUserId(recipient.userId);
    try {
      const res = await axios.patch<WORecipient>(
        '/api/wo-notification-recipients',
        { userId: recipient.userId, isActive: !recipient.isActive }
      );
      setRecipients(prev =>
        prev.map(r => (r.userId === recipient.userId ? res.data : r))
      );
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado.',
        variant: 'destructive',
      });
    } finally {
      setSavingUserId(null);
    }
  };

  // Open add dialog — load tenant users
  const handleOpenAdd = async () => {
    setIsAddOpen(true);
    setAddForm({ userId: '', phone: '', events: [] });
    setLoadingUsers(true);
    try {
      const res = await axios.get<TenantUser[]>('/api/admin/users');
      // Filter out users already configured as recipients
      const existingUserIds = new Set(recipients.map(r => r.userId));
      setTenantUsers(res.data.filter(u => !existingUserIds.has(u.id)));
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios del tenant.',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddEventToggle = (event: WOEventKey) => {
    setAddForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleAddSubmit = async () => {
    if (!addForm.userId || !addForm.phone) {
      toast({
        title: 'Campos requeridos',
        description: 'Seleccioná un usuario e ingresá un teléfono.',
        variant: 'destructive',
      });
      return;
    }
    setIsAdding(true);
    try {
      await axios.post('/api/wo-notification-recipients', {
        userId: addForm.userId,
        phone: addForm.phone,
        events: addForm.events,
      });
      setIsAddOpen(false);
      await fetchRecipients();
      toast({
        title: 'Destinatario agregado',
        description: 'El usuario recibirá notificaciones WhatsApp.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el destinatario.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const getUserDisplayName = (recipient: WORecipient) => {
    const { firstName, lastName, email } = recipient.user;
    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(' ');
    }
    return email;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenAdd} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Agregar destinatario
        </Button>
      </div>

      {recipients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
          <Plus className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No hay destinatarios configurados. Agregá usuarios para recibir
            notificaciones de OT.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Nombre</TableHead>
                <TableHead className="min-w-[160px]">Teléfono</TableHead>
                {EVENT_KEYS.map(event => (
                  <TableHead
                    key={event}
                    className="text-center min-w-[90px] text-xs"
                  >
                    {WO_EVENTS_LABELS[event]}
                  </TableHead>
                ))}
                <TableHead className="text-center">Activo</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map(recipient => {
                const isSaving = savingUserId === recipient.userId;
                const phoneDraft =
                  phoneEdits[recipient.userId] ?? recipient.phone;

                return (
                  <TableRow
                    key={recipient.id}
                    className={!recipient.isActive ? 'opacity-50' : ''}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {getUserDisplayName(recipient)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {recipient.user.email}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-8 text-sm w-36"
                          value={phoneDraft}
                          onChange={e =>
                            setPhoneEdits(prev => ({
                              ...prev,
                              [recipient.userId]: e.target.value,
                            }))
                          }
                          onBlur={() => handlePhoneSave(recipient)}
                          disabled={isSaving}
                          placeholder="+57..."
                        />
                        {isSaving && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>

                    {EVENT_KEYS.map(event => (
                      <TableCell key={event} className="text-center">
                        <Checkbox
                          checked={(recipient.events as string[]).includes(
                            event
                          )}
                          onCheckedChange={() =>
                            handleEventToggle(recipient, event)
                          }
                          disabled={isSaving || !recipient.isActive}
                        />
                      </TableCell>
                    ))}

                    <TableCell className="text-center">
                      <Checkbox
                        checked={recipient.isActive}
                        onCheckedChange={() => handleToggleActive(recipient)}
                        disabled={isSaving}
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggleActive(recipient)}
                        disabled={isSaving}
                        title={recipient.isActive ? 'Desactivar' : 'Reactivar'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add recipient dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar destinatario</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Usuario</Label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Cargando usuarios...
                  </span>
                </div>
              ) : (
                <Select
                  value={addForm.userId}
                  onValueChange={val =>
                    setAddForm(prev => ({ ...prev, userId: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantUsers.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        Todos los usuarios ya están configurados
                      </SelectItem>
                    ) : (
                      tenantUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {[u.firstName, u.lastName]
                            .filter(Boolean)
                            .join(' ') || u.email}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {u.email}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Teléfono WhatsApp</Label>
              <Input
                placeholder="+57 300 123 4567"
                value={addForm.phone}
                onChange={e =>
                  setAddForm(prev => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Eventos a notificar</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_KEYS.map(event => (
                  <label
                    key={event}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={addForm.events.includes(event)}
                      onCheckedChange={() => handleAddEventToggle(event)}
                    />
                    {WO_EVENTS_LABELS[event]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isAdding}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={isAdding || !addForm.userId || !addForm.phone}
              className="gap-2"
            >
              {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {recipients.some(r => !r.isActive) && (
        <p className="text-xs text-muted-foreground">
          Los destinatarios inactivos{' '}
          <Badge variant="secondary" className="text-xs">
            desactivados
          </Badge>{' '}
          no reciben notificaciones pero se conservan en la lista.
        </p>
      )}
    </div>
  );
}
