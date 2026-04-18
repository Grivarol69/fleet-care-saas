'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CloneTemplateModal } from '@/components/maintenance/templates/CloneTemplateModal';
import { Globe, Package, Search, Settings } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';

interface GlobalTemplate {
  id: string;
  name: string;
  description: string | null;
  version: string;
  status: string;
  brand: { id: string; name: string };
  line: { id: string; name: string };
  packages: { id: string }[];
}

export function PlanesGlobalesList() {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<GlobalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('all');
  const [vehicleBrands, setVehicleBrands] = useState<{ id: string; name: string }[]>([]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesRes, brandsRes] = await Promise.all([
        axios.get('/api/maintenance/mant-template/global'),
        axios.get('/api/vehicles/brands'),
      ]);
      setTemplates(templatesRes.data);
      setVehicleBrands(brandsRes.data);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los planes globales', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

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
          <p className="text-gray-600">Cargando planes globales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Planes Globales de Mantenimiento
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Base de conocimiento de Fleet Care. Clona un plan para adaptarlo a tu flota.
          </p>
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

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-semibold mb-2">
              {templates.length === 0 ? 'No hay planes globales disponibles' : 'Sin resultados'}
            </h4>
            <p className="text-gray-500 text-sm">
              {templates.length === 0
                ? 'El administrador aún no ha cargado planes en la base de conocimiento.'
                : 'Ajusta los filtros de búsqueda.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(template => (
            <Card key={template.id} className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{template.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {template.description || 'Sin descripción'}
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs px-2 py-0">
                      {template.brand.name}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs px-2 py-0">
                      {template.line.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Package className="h-3 w-3" />
                    <span>{template.packages.length} paquetes</span>
                    <span className="ml-auto text-gray-400">v{template.version}</span>
                  </div>
                </div>

                <CloneTemplateModal
                  templateId={template.id}
                  originalName={template.name}
                  onSuccess={() => router.push('/dashboard/maintenance/mis-planes')}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
