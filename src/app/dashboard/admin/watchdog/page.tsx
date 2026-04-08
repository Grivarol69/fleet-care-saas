'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Check, X } from 'lucide-react';

type WatchdogConfig = {
  id: string;
  category: string | null;
  threshold: number;
  isActive: boolean;
  createdAt: string;
};

export default function WatchdogConfigPage() {
  const [configs, setConfigs] = useState<WatchdogConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New config form state
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  const [saving, setSaving] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/watchdog-config');
      if (!res.ok) { setError('Error al cargar configuraciones'); return; }
      setConfigs(await res.json());
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const threshold = Number(newThreshold);
    if (!newThreshold || threshold < 1 || threshold > 100) {
      setError('El threshold debe ser entre 1 y 100');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/watchdog-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory.trim() || null, threshold }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Error al crear'); return; }
      setConfigs((prev) => [...prev, body]);
      setShowForm(false);
      setNewCategory('');
      setNewThreshold('');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const threshold = Number(editThreshold);
    if (!editThreshold || threshold < 1 || threshold > 100) {
      setError('El threshold debe ser entre 1 y 100');
      return;
    }
    setError('');
    try {
      const res = await fetch(`/api/watchdog-config/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Error al actualizar'); return; }
      setConfigs((prev) => prev.map((c) => (c.id === id ? body : c)));
      setEditingId(null);
    } catch {
      setError('Error de conexión');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta configuración? El threshold volverá al nivel anterior.')) return;
    try {
      await fetch(`/api/watchdog-config/${id}`, { method: 'DELETE' });
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Error al eliminar');
    }
  }

  const hasGlobal = configs.some((c) => c.category === null);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Watchdog de Precios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura el umbral de alerta por desviación de precio. Sin configuración, aplica el default del 10%.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Umbrales configurados</CardTitle>
          <Button size="sm" onClick={() => { setShowForm(true); setError(''); }}>
            <Plus className="h-4 w-4 mr-2" /> Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-sm mb-3">{error}</p>}

          {showForm && (
            <form onSubmit={handleCreate} className="flex gap-3 items-end mb-4 p-3 border rounded-md bg-muted/30">
              <div className="flex-1 space-y-1">
                <Label>Categoría (vacío = global)</Label>
                <Input
                  placeholder="Ej: LUBRICANTES, NEUMATICOS…"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              </div>
              <div className="w-28 space-y-1">
                <Label>Threshold %</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="10"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" disabled={saving}>Guardar</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            </form>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right w-36">Threshold</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hasGlobal && (
                <TableRow className="text-muted-foreground italic">
                  <TableCell>Global (todas las categorías)</TableCell>
                  <TableCell className="text-right">10% <span className="text-xs">(default)</span></TableCell>
                  <TableCell />
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">Cargando…</TableCell>
                </TableRow>
              )}
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    {config.category
                      ? <Badge variant="outline">{config.category}</Badge>
                      : <span className="font-medium">Global (todas las categorías)</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === config.id ? (
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={editThreshold}
                        onChange={(e) => setEditThreshold(e.target.value)}
                        className="w-20 h-7 text-right inline-block"
                        autoFocus
                      />
                    ) : (
                      <button
                        className="font-mono hover:underline cursor-pointer"
                        onClick={() => { setEditingId(config.id); setEditThreshold(String(config.threshold)); setError(''); }}
                      >
                        {Number(config.threshold)}%
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {editingId === config.id ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(config.id)}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(config.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="text-xs text-muted-foreground mt-4">
            Prioridad de resolución: categoría específica → global → 10% default. Haz clic en el % para editar inline.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
