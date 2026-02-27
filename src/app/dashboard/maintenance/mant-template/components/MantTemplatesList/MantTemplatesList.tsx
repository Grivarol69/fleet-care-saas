'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Package,
  Wrench,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  Settings,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormAddMantTemplate } from '../FormAddMantTemplate';
import { FormEditMantTemplate } from '../FormEditMantTemplate';
import { FormAddPackage } from '../FormEditMantTemplate/components/FormAddPackage';
import { FormEditPackage } from '../FormEditMantTemplate/components/FormEditPackage';
import { FormAddPackageItem } from '../FormEditMantTemplate/components/FormEditPackage/components/FormAddPackageItem';
import { FormEditPackageItem } from '../FormEditMantTemplate/components/FormEditPackage/components/FormEditPackageItem';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import {
  MantTemplatesListProps,
  MaintenancePackage,
  PackageItem,
} from './MantTemplatesList.types';

// Componente de métricas animadas (no usado actualmente)
// interface MetricsCardProps {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: string;
//   bgColor: string;
//   description?: string;
// }

// function MetricsCard({ title, value, icon, color, bgColor, description }: MetricsCardProps) {
//   return (
//     <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105">
//       <CardContent className="flex items-center p-6">
//         <div className={`p-3 rounded-full ${bgColor} mr-4`}>
//           <div className={`w-6 h-6 ${color}`}>
//             {icon}
//           </div>
//         </div>
//         <div className="flex-1">
//           <p className="text-sm font-medium text-gray-600">{title}</p>
//           <div className="flex items-center">
//             <p className={`text-2xl font-bold ${color}`}>{value}</p>
//             {description && (
//               <p className="text-xs text-gray-500 ml-2">{description}</p>
//             )}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// Componente de card compacta para templates
interface TemplateCardProps {
  template: MantTemplatesListProps;
  onSelect: (template: MantTemplatesListProps) => void;
  onEdit: (template: MantTemplatesListProps) => void;
  onDelete: (id: string) => void;
}

function TemplateCard({
  template,
  onSelect,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
              {template.name}
            </h3>
            <p className="text-xs text-gray-500 line-clamp-1">
              {template.description || 'Sin descripción'}
            </p>
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                onEdit(template);
              }}
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                onDelete(template.id);
              }}
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 text-xs px-2 py-0"
            >
              {template.brand.name}
            </Badge>
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-700 text-xs px-2 py-0"
            >
              {template.line.name}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Package className="h-3 w-3" />
              <span>{template.packages?.length || 0} paquetes</span>
            </div>
            <Badge
              variant={template.status === 'ACTIVE' ? 'default' : 'secondary'}
              className={`text-xs ${
                template.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {template.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>

        <Button
          onClick={() => onSelect(template)}
          className="w-full h-8 text-xs"
          size="sm"
        >
          <ChevronRight className="h-3 w-3 mr-1" />
          Seleccionar
        </Button>
      </CardContent>
    </Card>
  );
}

// Componente principal
export function MantTemplatesList() {
  // Estados principales
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] =
    useState<MantTemplatesListProps | null>(null);
  const [selectedPackage, setSelectedPackage] =
    useState<MaintenancePackage | null>(null);

  // Estados de datos
  const [templates, setTemplates] = useState<MantTemplatesListProps[]>([]);
  const [packages, setPackages] = useState<MaintenancePackage[]>([]);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [vehicleBrands, setVehicleBrands] = useState<
    { id: string; name: string }[]
  >([]);

  // Estados de modales
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<MantTemplatesListProps | null>(null);

  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<MaintenancePackage | null>(null);

  const [isAddPackageItemOpen, setIsAddPackageItemOpen] = useState(false);
  const [isEditPackageItemOpen, setIsEditPackageItemOpen] = useState(false);
  const [editingPackageItem, setEditingPackageItem] =
    useState<PackageItem | null>(null);

  const { toast } = useToast();

  // Fetch templates and brands
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesRes, brandsRes] = await Promise.all([
        axios.get('/api/maintenance/mant-template'),
        axios.get('/api/vehicles/brands'),
      ]);
      setTemplates(templatesRes.data);
      setVehicleBrands(brandsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch packages cuando se selecciona un template
  const fetchPackages = useCallback(
    async (templateId: string) => {
      if (!templateId) return;
      try {
        const response = await axios.get(
          `/api/maintenance/packages?templateId=${templateId}`
        );
        setPackages(response.data);
      } catch (error) {
        console.error('Error fetching packages:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los paquetes',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // Fetch package items cuando se selecciona un package
  const fetchPackageItems = useCallback(
    async (packageId: string) => {
      if (!packageId) return;
      try {
        const response = await axios.get(
          `/api/maintenance/package-items?packageId=${packageId}`
        );
        setPackageItems(response.data);
      } catch (error) {
        console.error('Error fetching package items:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los items del paquete',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Navegación inteligente
  const handleSelectTemplate = (template: MantTemplatesListProps) => {
    setSelectedTemplate(template);
    setSelectedPackage(null);
    setPackageItems([]);
    setActiveTab('packages');
    fetchPackages(template.id);
  };

  const handleSelectPackage = (pkg: MaintenancePackage) => {
    setSelectedPackage(pkg);
    setPackageItems([]);
    setActiveTab('items');
    fetchPackageItems(pkg.id);
  };

  // Handlers para templates
  const handleEditTemplate = (template: MantTemplatesListProps) => {
    setEditingTemplate(template);
    setIsEditTemplateOpen(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este template?')) return;
    try {
      await axios.delete(`/api/maintenance/mant-template/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        setPackages([]);
        setPackageItems([]);
        setActiveTab('templates');
      }
      toast({
        title: 'Template eliminado',
        description: 'El template ha sido eliminado exitosamente.',
      });
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el template.',
        variant: 'destructive',
      });
    }
  };

  // Handlers para packages
  const handleEditPackage = (pkg: MaintenancePackage) => {
    setEditingPackage(pkg);
    setIsEditPackageOpen(true);
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este paquete?')) return;
    try {
      await axios.delete(`/api/maintenance/packages/${id}`);
      setPackages(prev => prev.filter(p => p.id !== id));
      if (selectedPackage?.id === id) {
        setSelectedPackage(null);
        setPackageItems([]);
      }
      toast({
        title: 'Paquete eliminado',
        description: 'El paquete ha sido eliminado exitosamente.',
      });
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el paquete.',
        variant: 'destructive',
      });
    }
  };

  // Handlers para package items
  const handleEditPackageItem = (item: PackageItem) => {
    setEditingPackageItem(item);
    setIsEditPackageItemOpen(true);
  };

  const handleDeletePackageItem = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este item?')) return;
    try {
      await axios.delete(`/api/maintenance/package-items/${id}`);
      setPackageItems(prev => prev.filter(i => i.id !== id));
      toast({
        title: 'Item eliminado',
        description: 'El item ha sido eliminado exitosamente.',
      });
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el item.',
        variant: 'destructive',
      });
    }
  };

  // Utilidades
  const formatMantType = (mantType: string) => {
    const types = {
      PREVENTIVE: 'Preventivo',
      PREDICTIVE: 'Predictivo',
      CORRECTIVE: 'Correctivo',
      EMERGENCY: 'Emergencia',
    };
    return types[mantType as keyof typeof types] || mantType;
  };

  const getMantTypeColor = (mantType: string) => {
    const colors = {
      PREVENTIVE: 'bg-green-100 text-green-800',
      PREDICTIVE: 'bg-blue-100 text-blue-800',
      CORRECTIVE: 'bg-yellow-100 text-yellow-800',
      EMERGENCY: 'bg-red-100 text-red-800',
    };
    return (
      colors[mantType as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return (
      colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    );
  };

  const formatPriority = (priority: string) => {
    const priorities = {
      LOW: 'Baja',
      MEDIUM: 'Media',
      HIGH: 'Alta',
      CRITICAL: 'Crítica',
    };
    return priorities[priority as keyof typeof priorities] || priority;
  };

  // Métricas calculadas
  const templateMetrics = {
    total: templates.length,
    active: templates.filter(t => t.status === 'ACTIVE').length,
    withPackages: templates.filter(t => t.packages && t.packages.length > 0)
      .length,
  };

  const packageMetrics = selectedTemplate
    ? {
        total: packages.length,
        preventive: packages.filter(p => p.packageType === 'PREVENTIVE').length,
        corrective: packages.filter(p => p.packageType === 'CORRECTIVE').length,
        predictive: packages.filter(p => p.packageType === 'PREDICTIVE').length,
      }
    : null;

  const itemMetrics = selectedPackage
    ? {
        total: packageItems.length,
        low: packageItems.filter(i => i.priority === 'LOW').length,
        medium: packageItems.filter(i => i.priority === 'MEDIUM').length,
        high: packageItems.filter(i => i.priority === 'HIGH').length,
        critical: packageItems.filter(i => i.priority === 'CRITICAL').length,
      }
    : null;

  // Columnas para templates (no usado - usando grid de cards en su lugar)
  // const templateColumns: ColumnDef<MantTemplatesListProps>[] = [
  //   {
  //     accessorKey: 'name',
  //     header: 'Nombre del Template',
  //     cell: ({ row }) => (
  //       <div>
  //         <div className="font-semibold text-gray-900">{row.getValue('name')}</div>
  //         <div className="text-sm text-gray-500">{row.original.description || 'Sin descripción'}</div>
  //       </div>
  //     ),
  //   },
  //   {
  //     accessorKey: 'brand',
  //     header: 'Marca / Línea',
  //     cell: ({ row }) => (
  //       <div className="space-y-1">
  //         <Badge variant="outline" className="bg-blue-50 text-blue-700">
  //           {row.original.brand.name}
  //         </Badge>
  //         <br />
  //         <Badge variant="outline" className="bg-purple-50 text-purple-700">
  //           {row.original.line.name}
  //         </Badge>
  //       </div>
  //     ),
  //   },
  //   {
  //     accessorKey: 'packages',
  //     header: 'Paquetes',
  //     cell: ({ row }) => {
  //       const packageCount = row.original.packages?.length || 0;
  //       return (
  //         <div className="flex items-center gap-2">
  //           <Package className="h-4 w-4 text-blue-500" />
  //           <span className="font-semibold">{packageCount}</span>
  //           <span className="text-sm text-gray-500">paquetes</span>
  //         </div>
  //       );
  //     },
  //   },
  //   {
  //     accessorKey: 'status',
  //     header: 'Estado',
  //     cell: ({ row }) => {
  //       const isActive = row.getValue('status') === 'ACTIVE';
  //       return (
  //         <Badge variant={isActive ? "default" : "secondary"}
  //                className={isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
  //           {isActive ? 'Activo' : 'Inactivo'}
  //         </Badge>
  //       );
  //     },
  //   },
  //   {
  //     id: 'actions',
  //     header: 'Acciones',
  //     cell: ({ row }) => (
  //       <div className="flex gap-2">
  //         <Button
  //           variant="outline"
  //           size="sm"
  //           onClick={() => handleSelectTemplate(row.original)}
  //           className="text-blue-600 hover:text-blue-700"
  //         >
  //           <ChevronRight className="h-4 w-4 mr-1" />
  //           Seleccionar
  //         </Button>
  //         <Button
  //           variant="outline"
  //           size="sm"
  //           onClick={() => handleEditTemplate(row.original)}
  //         >
  //           <Edit className="h-4 w-4" />
  //         </Button>
  //         <Button
  //           variant="destructive"
  //           size="sm"
  //           onClick={() => handleDeleteTemplate(row.original.id)}
  //         >
  //           <Trash2 className="h-4 w-4" />
  //         </Button>
  //       </div>
  //     ),
  //   },
  // ];

  // Columnas para packages
  const packageColumns: ColumnDef<MaintenancePackage>[] = [
    {
      accessorKey: 'triggerKm',
      header: 'Kilometraje',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {(row.getValue('triggerKm') as number).toLocaleString()} km
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nombre del Paquete',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold">{row.getValue('name')}</div>
          <div className="text-sm text-gray-500">
            {row.original._count?.packageItems || 0} items
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'packageType',
      header: 'Tipo',
      cell: ({ row }) => {
        const type = row.getValue('packageType') as string;
        return (
          <Badge className={getMantTypeColor(type)}>
            {formatMantType(type)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Prioridad',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as string;
        return (
          <Badge className={getPriorityColor(priority)}>
            {formatPriority(priority)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'estimatedCost',
      header: 'Costo Est.',
      cell: ({ row }) => {
        const cost = row.getValue('estimatedCost') as number;
        return cost ? `$${cost.toLocaleString()}` : '-';
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectPackage(row.original)}
            className="text-blue-600 hover:text-blue-700"
          >
            <ChevronRight className="h-4 w-4 mr-1" />
            Ver Items
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditPackage(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeletePackage(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Columnas para package items
  const packageItemColumns: ColumnDef<PackageItem>[] = [
    {
      accessorKey: 'mantItem.name',
      header: 'Item de Mantenimiento',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold">{row.original.mantItem.name}</div>
          <div className="text-sm text-gray-500">
            {row.original.mantItem.category.name}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'mantItem.mantType',
      header: 'Tipo',
      cell: ({ row }) => {
        const type = row.original.mantItem.mantType;
        return (
          <Badge className={getMantTypeColor(type)}>
            {formatMantType(type)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Prioridad',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as string;
        return (
          <Badge className={getPriorityColor(priority)}>
            {formatPriority(priority)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'triggerKm',
      header: 'Frecuencia',
      cell: ({ row }) => (
        <span className="font-mono">
          {(row.getValue('triggerKm') as number).toLocaleString()} km
        </span>
      ),
    },
    {
      accessorKey: 'estimatedTime',
      header: 'Tiempo Est.',
      cell: ({ row }) => {
        const time = row.original.estimatedTime;
        return time ? `${time}h` : '-';
      },
    },
    {
      accessorKey: 'estimatedCost',
      header: 'Costo Est.',
      cell: ({ row }) => {
        const cost = row.original.estimatedCost;
        return cost ? `$${cost.toLocaleString()}` : '-';
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditPackageItem(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeletePackageItem(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Filtrar templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch =
      searchTerm === '' ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.line.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBrand =
      selectedBrandFilter === 'all' ||
      t.brand.id.toString() === selectedBrandFilter;

    return matchesSearch && matchesBrand;
  });

  // Ya no necesitamos la tabla de templates - usando grid de cards

  const packagesTable = useReactTable({
    data: packages,
    columns: packageColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const packageItemsTable = useReactTable({
    data: packageItems,
    columns: packageItemColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">
            Cargando templates de mantenimiento...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header ultra-compacto */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Gestión de Mantenimiento
          </h1>
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <FileText className="h-4 w-4 mr-1" />
            <span>Plantillas</span>
            {selectedTemplate && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
                <Package className="h-4 w-4 mr-1" />
                <span>{selectedTemplate.name}</span>
              </>
            )}
            {selectedPackage && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
                <Wrench className="h-4 w-4 mr-1" />
                <span>{selectedPackage.name}</span>
              </>
            )}
          </div>
        </div>

        {/* Botón contextual */}
        {activeTab === 'templates' && (
          <Button
            onClick={() => setIsAddTemplateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        )}
        {activeTab === 'packages' && selectedTemplate && (
          <Button
            onClick={() => setIsAddPackageOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Paquete
          </Button>
        )}
        {activeTab === 'items' && selectedPackage && (
          <Button
            onClick={() => setIsAddPackageItemOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Item
          </Button>
        )}
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="templates"
            className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
          >
            <FileText className="h-4 w-4" />
            Plantillas ({templateMetrics.total})
          </TabsTrigger>
          <TabsTrigger
            value="packages"
            disabled={!selectedTemplate}
            className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
          >
            <Package className="h-4 w-4" />
            Paquetes ({packageMetrics?.total || 0})
          </TabsTrigger>
          <TabsTrigger
            value="items"
            disabled={!selectedPackage}
            className="flex items-center gap-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
          >
            <Wrench className="h-4 w-4" />
            Items ({itemMetrics?.total || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Plantillas */}
        <TabsContent value="templates" className="space-y-2">
          {/* Métricas ultra-compactas */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded p-2 text-center">
              <div className="text-sm font-bold text-blue-600">
                {templateMetrics.total}
              </div>
              <div className="text-xs text-blue-700">Total</div>
            </div>
            <div className="bg-green-50 rounded p-2 text-center">
              <div className="text-sm font-bold text-green-600">
                {templateMetrics.active}
              </div>
              <div className="text-xs text-green-700">Activos</div>
            </div>
            <div className="bg-purple-50 rounded p-2 text-center">
              <div className="text-sm font-bold text-purple-600">
                {templateMetrics.withPackages}
              </div>
              <div className="text-xs text-purple-700">Con Paquetes</div>
            </div>
            <div className="bg-gray-50 rounded p-2 text-center">
              <div className="text-sm font-bold text-gray-600">
                {filteredTemplates.length}
              </div>
              <div className="text-xs text-gray-700">Filtrados</div>
            </div>
          </div>

          {/* Filtros compactos */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select
              value={selectedBrandFilter}
              onValueChange={setSelectedBrandFilter}
            >
              <SelectTrigger className="w-full sm:w-40 h-8 text-sm">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {vehicleBrands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid de templates */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                  onEdit={handleEditTemplate}
                  onDelete={handleDeleteTemplate}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="text-lg font-semibold mb-2">
                    {templates.length === 0
                      ? 'No hay plantillas registradas'
                      : 'No se encontraron plantillas'}
                  </h4>
                  <p className="text-gray-600 mb-4">
                    {templates.length === 0
                      ? 'Crea tu primera plantilla de mantenimiento para comenzar.'
                      : 'Intenta ajustar los filtros de búsqueda.'}
                  </p>
                  {templates.length === 0 && (
                    <Button onClick={() => setIsAddTemplateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Plantilla
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Packages */}
        <TabsContent value="packages" className="space-y-3">
          {selectedTemplate && (
            <>
              {/* Template seleccionado compacto */}
              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-green-800">
                        {selectedTemplate.name}
                      </h3>
                      <p className="text-green-600 text-xs">
                        {selectedTemplate.brand.name} -{' '}
                        {selectedTemplate.line.name}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('templates')}
                      className="border-green-300 text-green-700 hover:bg-green-200 h-7 text-xs"
                    >
                      <ChevronRight className="h-3 w-3 mr-1 rotate-180" />
                      Cambiar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de packages compactas */}
              {packageMetrics && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-green-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-green-600">
                      {packageMetrics.total}
                    </div>
                    <div className="text-xs text-green-700">Total</div>
                  </div>
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-blue-600">
                      {packageMetrics.preventive}
                    </div>
                    <div className="text-xs text-blue-700">Preventivos</div>
                  </div>
                  <div className="bg-yellow-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-yellow-600">
                      {packageMetrics.corrective}
                    </div>
                    <div className="text-xs text-yellow-700">Correctivos</div>
                  </div>
                  <div className="bg-purple-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-purple-600">
                      {packageMetrics.predictive}
                    </div>
                    <div className="text-xs text-purple-700">Predictivos</div>
                  </div>
                </div>
              )}

              {/* Tabla de packages compacta */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-green-500" />
                    Paquetes de Mantenimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        {packagesTable.getHeaderGroups().map(headerGroup => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                              <TableHead
                                key={header.id}
                                className="font-semibold"
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {packagesTable.getRowModel().rows?.length ? (
                          packagesTable.getRowModel().rows.map(row => (
                            <TableRow
                              key={row.id}
                              className="hover:bg-gray-50"
                              data-state={row.getIsSelected() && 'selected'}
                            >
                              {row.getVisibleCells().map(cell => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={packageColumns.length}
                              className="h-24 text-center"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Package className="h-8 w-8 text-gray-400" />
                                <p className="text-gray-500">
                                  No hay paquetes configurados en este template
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsAddPackageOpen(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Crear primer paquete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab 3: Package Items */}
        <TabsContent value="items" className="space-y-3">
          {selectedPackage && (
            <>
              {/* Package seleccionado compacto */}
              <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-purple-800">
                        {selectedPackage.name}
                      </h3>
                      <p className="text-purple-600 text-xs">
                        {selectedPackage.triggerKm.toLocaleString()} km •{' '}
                        {formatMantType(selectedPackage.packageType)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('packages')}
                      className="border-purple-300 text-purple-700 hover:bg-purple-200 h-7 text-xs"
                    >
                      <ChevronRight className="h-3 w-3 mr-1 rotate-180" />
                      Cambiar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de items compactas */}
              {itemMetrics && (
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-purple-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-purple-600">
                      {itemMetrics.total}
                    </div>
                    <div className="text-xs text-purple-700">Total</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-gray-600">
                      {itemMetrics.low}
                    </div>
                    <div className="text-xs text-gray-700">Baja</div>
                  </div>
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-blue-600">
                      {itemMetrics.medium}
                    </div>
                    <div className="text-xs text-blue-700">Media</div>
                  </div>
                  <div className="bg-orange-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-orange-600">
                      {itemMetrics.high}
                    </div>
                    <div className="text-xs text-orange-700">Alta</div>
                  </div>
                  <div className="bg-red-50 rounded p-2 text-center">
                    <div className="text-sm font-bold text-red-600">
                      {itemMetrics.critical}
                    </div>
                    <div className="text-xs text-red-700">Crítica</div>
                  </div>
                </div>
              )}

              {/* Tabla de package items compacta */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-purple-500" />
                    Items del Paquete
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        {packageItemsTable
                          .getHeaderGroups()
                          .map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map(header => (
                                <TableHead
                                  key={header.id}
                                  className="font-semibold"
                                >
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                      )}
                                </TableHead>
                              ))}
                            </TableRow>
                          ))}
                      </TableHeader>
                      <TableBody>
                        {packageItemsTable.getRowModel().rows?.length ? (
                          packageItemsTable.getRowModel().rows.map(row => (
                            <TableRow
                              key={row.id}
                              className="hover:bg-gray-50"
                              data-state={row.getIsSelected() && 'selected'}
                            >
                              {row.getVisibleCells().map(cell => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={packageItemColumns.length}
                              className="h-24 text-center"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Wrench className="h-8 w-8 text-gray-400" />
                                <p className="text-gray-500">
                                  No hay items configurados en este paquete
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsAddPackageItemOpen(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Agregar primer item
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modales */}

      {/* Template Modales */}
      <FormAddMantTemplate
        isOpen={isAddTemplateOpen}
        setIsOpen={setIsAddTemplateOpen}
        onAddTemplate={newTemplate => {
          setTemplates([...templates, newTemplate]);
          fetchTemplates();
        }}
      />

      {editingTemplate && (
        <FormEditMantTemplate
          isOpen={isEditTemplateOpen}
          setIsOpen={setIsEditTemplateOpen}
          template={editingTemplate}
          onEditTemplate={editedTemplate => {
            setTemplates(
              templates.map(t =>
                t.id === editedTemplate.id ? editedTemplate : t
              )
            );
            if (selectedTemplate?.id === editedTemplate.id) {
              setSelectedTemplate(editedTemplate);
            }
          }}
        />
      )}

      {/* Package Modales */}
      {selectedTemplate && (
        <FormAddPackage
          isOpen={isAddPackageOpen}
          setIsOpen={setIsAddPackageOpen}
          templateId={selectedTemplate.id}
          onAddPackage={() => fetchPackages(selectedTemplate.id)}
        />
      )}

      {editingPackage && (
        <FormEditPackage
          isOpen={isEditPackageOpen}
          setIsOpen={setIsEditPackageOpen}
          packageData={editingPackage}
          onEditPackage={() => {
            if (selectedTemplate) {
              fetchPackages(selectedTemplate.id);
            }
          }}
        />
      )}

      {/* Package Item Modales */}
      {selectedPackage && (
        <FormAddPackageItem
          isOpen={isAddPackageItemOpen}
          setIsOpen={setIsAddPackageItemOpen}
          packageId={selectedPackage.id}
          onAddItem={() => fetchPackageItems(selectedPackage.id)}
        />
      )}

      {editingPackageItem && (
        <FormEditPackageItem
          isOpen={isEditPackageItemOpen}
          setIsOpen={setIsEditPackageItemOpen}
          item={editingPackageItem}
          onEditItem={() => {
            if (selectedPackage) {
              fetchPackageItems(selectedPackage.id);
            }
          }}
        />
      )}
    </div>
  );
}
