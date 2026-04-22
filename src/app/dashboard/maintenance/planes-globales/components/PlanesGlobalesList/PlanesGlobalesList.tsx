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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { CloneTemplateModal } from '@/components/maintenance/templates/CloneTemplateModal';
import { Globe, Package, Search, Settings, Eye, Wrench } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';

interface PackageItem {
  order: number;
  mantItem: {
    name: string;
    category: { name: string };
  };
}

interface MantPackage {
  id: string;
  name: string;
  triggerKm: number | null;
  packageType: string;
  description: string | null;
  packageItems: PackageItem[];
}

interface GlobalTemplate {
  id: string;
  name: string;
  description: string | null;
  version: string;
  status: string;
  vehicleType: { id: string; name: string };
  brand: { id: string; name: string } | null;
  line: { id: string; name: string } | null;
  packages: MantPackage[];
}

export function PlanesGlobalesList() {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<GlobalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [vehicleTypes, setVehicleTypes] = useState<
    { id: string; name: string }[]
  >([]);
  const [detailTemplate, setDetailTemplate] = useState<GlobalTemplate | null>(
    null
  );

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesRes, typesRes] = await Promise.all([
        axios.get('/api/maintenance/mant-template/global'),
        axios.get('/api/vehicles/types'),
      ]);
      setTemplates(templatesRes.data);
      setVehicleTypes(typesRes.data);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los planes globales',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filtered = templates.filter(t => {
    const matchesSearch =
      searchTerm === '' ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vehicleType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.brand?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      selectedTypeFilter === 'all' || t.vehicleType.id === selectedTypeFilter;
    return matchesSearch && matchesType;
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
    <>
      <Sheet
        open={!!detailTemplate}
        onOpenChange={open => {
          if (!open) setDetailTemplate(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detailTemplate && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-600" />
                  {detailTemplate.name}
                </SheetTitle>
                <SheetDescription>
                  <span className="flex flex-wrap gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700"
                    >
                      {detailTemplate.vehicleType.name}
                    </Badge>
                    {detailTemplate.brand && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        {detailTemplate.brand.name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-gray-600">
                      v{detailTemplate.version}
                    </Badge>
                  </span>
                  {detailTemplate.description && (
                    <span className="block mt-2 text-sm">
                      {detailTemplate.description}
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                {detailTemplate.packages.map(pkg => {
                  const byCategory = pkg.packageItems.reduce<
                    Record<string, string[]>
                  >((acc, pi) => {
                    const cat = pi.mantItem.category.name;
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(pi.mantItem.name);
                    return acc;
                  }, {});

                  return (
                    <div key={pkg.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm text-gray-900">
                          {pkg.name}
                        </p>
                        <div className="flex items-center gap-1">
                          {pkg.triggerKm && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-orange-50 text-orange-700"
                            >
                              {pkg.triggerKm.toLocaleString()} km
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {pkg.packageItems.length} ítems
                          </Badge>
                        </div>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-gray-500 mb-2">
                          {pkg.description}
                        </p>
                      )}
                      <div className="space-y-1.5">
                        {Object.entries(byCategory).map(([cat, items]) => (
                          <div key={cat}>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                              {cat}
                            </p>
                            <ul className="space-y-0.5 pl-2">
                              {items.map(item => (
                                <li
                                  key={item}
                                  className="text-xs text-gray-700 flex items-start gap-1"
                                >
                                  <span className="text-gray-400 mt-0.5">
                                    •
                                  </span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <CloneTemplateModal
                  templateId={detailTemplate.id}
                  originalName={detailTemplate.name}
                  onSuccess={() =>
                    router.push('/dashboard/maintenance/mis-planes')
                  }
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Planes Globales de Mantenimiento
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Base de conocimiento de Fleet Care. Clona un plan para adaptarlo a
              tu flota.
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
          <Select
            value={selectedTypeFilter}
            onValueChange={setSelectedTypeFilter}
          >
            <SelectTrigger className="w-full sm:w-48 h-8 text-sm">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {vehicleTypes.map(vt => (
                <SelectItem key={vt.id} value={vt.id}>
                  {vt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-semibold mb-2">
                {templates.length === 0
                  ? 'No hay planes globales disponibles'
                  : 'Sin resultados'}
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
              <Card
                key={template.id}
                className="hover:shadow-lg transition-all duration-200"
              >
                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {template.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {template.description || 'Sin descripción'}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 text-xs px-2 py-0"
                      >
                        {template.vehicleType.name}
                      </Badge>
                      {template.brand && (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 text-xs px-2 py-0"
                        >
                          {template.brand.name}
                        </Badge>
                      )}
                      {template.line && (
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 text-xs px-2 py-0"
                        >
                          {template.line.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Package className="h-3 w-3" />
                      <span>{template.packages.length} paquetes</span>
                      <span className="ml-auto text-gray-400">
                        v{template.version}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1"
                      onClick={() => setDetailTemplate(template)}
                    >
                      <Eye className="h-3 w-3" />
                      Ver detalles
                    </Button>
                    <div className="flex-1">
                      <CloneTemplateModal
                        templateId={template.id}
                        originalName={template.name}
                        onSuccess={() =>
                          router.push('/dashboard/maintenance/mis-planes')
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
