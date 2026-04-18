'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormAddMantTemplate } from '@/app/dashboard/maintenance/mant-template/components/FormAddMantTemplate';
import { FormEditMantTemplate } from '@/app/dashboard/maintenance/mant-template/components/FormEditMantTemplate';
import {
  ChevronRight,
  Edit,
  FileText,
  Globe,
  Plus,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';

interface CustomTemplate {
  id: string;
  name: string;
  description: string | null;
  version: string;
  status: string;
  clonedFromId: string | null;
  brand: { id: string; name: string };
  line: { id: string; name: string };
  packages: { id: string }[];
}

export function MisPlanesList() {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('all');
  const [vehicleBrands, setVehicleBrands] = useState<{ id: string; name: string }[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesRes, brandsRes] = await Promise.all([
        axios.get('/api/maintenance/mant-template?source=custom'),
        axios.get('/api/vehicles/brands'),
      ]);
      setTemplates(templatesRes.data);
      setVehicleBrands(brandsRes.data);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar tus planes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este plan de mantenimiento?')) return;
    try {
      await axios.delete(`/api/maintenance/mant-template/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Plan eliminado' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el plan', variant: 'destructive' });
    }
  };

  const filtered = templates.filter(t => {
    const matchesSearch =
      searchTerm === '' ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.line.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrandFilter === 'all' || t.brand.id === selectedBrandFilter;
    return matchesSearch && matchesBrand;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Cargando tus planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Mis Planes de Mantenimiento
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Planes propios de tu empresa. Créalos desde cero o basándote en un plan global.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/maintenance/planes-globales')}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            Ver Planes Globales
          </Button>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-green-600 hover:bg-green-700 gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Nuevo Plan
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 h-3 w-3" />
          <Input
            placeholder="Buscar por nombre, marca o línea..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={selectedBrandFilter} onValueChange={setSelectedBrandFilter}>
          <SelectTrigger className="w-full sm:w-44 h-8 text-sm">
            <SelectValue placeholder="Filtrar por marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            {vehicleBrands.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-semibold mb-2">Aún no tienes planes propios</h4>
            <p className="text-gray-500 text-sm mb-6">
              Crea un plan desde cero o clona uno de la base de conocimiento global para empezar.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => router.push('/dashboard/maintenance/planes-globales')}>
                <Globe className="h-4 w-4 mr-2" />
                Ver Planes Globales
              </Button>
              <Button onClick={() => setIsAddOpen(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Crear mi primer plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Sin resultados. Ajusta los filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(template => (
            <Card key={template.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{template.name}</h3>
                    {template.clonedFromId && (
                      <p className="text-xs text-blue-600 flex items-center gap-1 mb-1">
                        <Globe className="h-3 w-3" />
                        Basado en plan global
                      </p>
                    )}
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {template.description || 'Sin descripción'}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingTemplate(template); setIsEditOpen(true); }}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs px-2 py-0">
                      {template.brand.name}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs px-2 py-0">
                      {template.line.name}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{template.packages.length} paquetes</span>
                    <Badge
                      className={`text-xs ${template.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {template.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={() => { setEditingTemplate(template); setIsEditOpen(true); }}
                  className="w-full h-8 text-xs"
                  size="sm"
                  variant="outline"
                >
                  <ChevronRight className="h-3 w-3 mr-1" />
                  Ver Paquetes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormAddMantTemplate
        isOpen={isAddOpen}
        setIsOpen={setIsAddOpen}
        onAddTemplate={newTemplate => {
          setTemplates(prev => [...prev, newTemplate as unknown as CustomTemplate]);
          fetchTemplates();
        }}
      />

      {editingTemplate && (
        <FormEditMantTemplate
          isOpen={isEditOpen}
          setIsOpen={setIsEditOpen}
          template={editingTemplate as any}
          onEditTemplate={() => fetchTemplates()}
        />
      )}
    </div>
  );
}
