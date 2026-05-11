'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { FormAddDocument } from '../fleet/components/FormEditFleetVehicle/components/FormAddDocument/FormAddDocument';

// Types reuse
interface Vehicle {
  id: string;
  licensePlate: string;
  brand: { name: string };
  line: { name: string };
}

interface DocumentStatus {
  id: string;
  name: string;
  isMandatory: boolean;
  status: 'MISSING' | 'VALID' | 'EXPIRING' | 'EXPIRED';
  document?: {
    id: string;
    fileUrl: string;
    expiryDate: string | null;
    documentNumber: string | null;
  };
}

export default function DocumentsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { toast } = useToast();

  // Load vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await axios.get('/api/vehicles/vehicles');
        setVehicles(res.data);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los vehículos',
          variant: 'destructive',
        });
      }
    };
    fetchVehicles();
  }, [toast]);

  // Load compliance for selected vehicle
  useEffect(() => {
    if (!selectedVehicle) return;

    const fetchCompliance = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(
          `/api/vehicles/${selectedVehicle.id}/compliance`
        );

        const STATUS_ORDER: Record<string, number> = {
          MISSING: 0,
          EXPIRING: 1,
          EXPIRED: 2,
          VALID: 3,
        };

        const statusList: DocumentStatus[] = res.data.items
          .map(
            (item: {
              documentTypeId: string;
              name: string;
              isMandatory: boolean;
              status: 'MISSING' | 'VALID' | 'EXPIRING' | 'EXPIRED';
              document?: {
                id: string;
                fileUrl: string;
                expiryDate: string | null;
                documentNumber: string | null;
              };
            }) => ({
              id: item.documentTypeId,
              name: item.name,
              isMandatory: item.isMandatory,
              status: item.status,
              document: item.document,
            })
          )
          .sort(
            (a: DocumentStatus, b: DocumentStatus) =>
              (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
          );

        setDocumentStatuses(statusList);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Error verificando documentos',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompliance();
  }, [selectedVehicle, toast, isAddDialogOpen]); // Reload when dialog closes (successful add)

  const filteredVehicles = vehicles.filter(
    v =>
      v.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileText className="h-6 w-6" /> Gestión de Documentos
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Vehicle Selection */}
        <Card className="md:col-span-1 h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Vehículos</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar placa..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="divide-y">
              {filteredVehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedVehicle?.id === vehicle.id ? 'bg-slate-100 border-l-4 border-primary' : ''}`}
                >
                  <div className="font-bold">{vehicle.licensePlate}</div>
                  <div className="text-sm text-slate-500">
                    {vehicle.brand.name} {vehicle.line.name}
                  </div>
                </div>
              ))}
              {filteredVehicles.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No se encontraron vehículos.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Document Status */}
        <Card className="md:col-span-2">
          {selectedVehicle ? (
            <>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Estado Documental</CardTitle>
                  <CardDescription>
                    {selectedVehicle.licensePlate} -{' '}
                    {selectedVehicle.brand.name}
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  + Cargar Documento
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8">Cargando...</div>
                ) : (
                  <div className="space-y-4">
                    {documentStatuses.length === 0 ? (
                      <div className="text-center p-8 border-2 border-dashed rounded-lg">
                        <FileText className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                        <h3 className="font-semibold text-lg">
                          Sin requisitos configurados
                        </h3>
                        <p className="text-slate-500 mb-4">
                          Este tipo de vehículo no tiene requisitos de
                          documentos definidos. Ve a Tipos de Vehículo para
                          configurarlos.
                        </p>
                        <Button variant="outline" asChild>
                          <a href="/dashboard/vehicles/types">
                            Ir a Tipos de Vehículos
                          </a>
                        </Button>
                      </div>
                    ) : (
                      documentStatuses.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 border rounded-lg bg-card"
                        >
                          <div className="flex items-center gap-4">
                            <StatusIcon status={item.status} />
                            <div>
                              <span className="font-medium flex items-center gap-2">
                                {item.name}
                                {item.isMandatory && (
                                  <Badge variant="outline" className="text-xs">
                                    Obligatorio
                                  </Badge>
                                )}
                              </span>
                              <p className="text-sm text-slate-500">
                                {item.document
                                  ? `Vence: ${item.document.expiryDate ? new Date(item.document.expiryDate).toLocaleDateString() : 'N/A'}`
                                  : 'No cargado'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={item.status} />
                            {item.document && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={item.document.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Ver
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
              <FileText className="h-16 w-16 mb-4 opacity-20" />
              <p>Selecciona un vehículo para ver sus documentos</p>
            </div>
          )}
        </Card>
      </div>

      {selectedVehicle && (
        <FormAddDocument
          isOpen={isAddDialogOpen}
          setIsOpen={setIsAddDialogOpen}
          vehiclePlate={selectedVehicle.licensePlate}
          onAddDocument={() => {
            // Trigger refresh via effect dep
            setIsAddDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'VALID':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'MISSING':
      return <AlertTriangle className="h-5 w-5 text-red-400" />;
    case 'EXPIRED':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case 'EXPIRING':
      return <Clock className="h-5 w-5 text-yellow-500" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    VALID: 'bg-green-100 text-green-800 hover:bg-green-100',
    MISSING: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
    EXPIRED: 'bg-red-100 text-red-800 hover:bg-red-100',
    EXPIRING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  };

  const labels = {
    VALID: 'Vigente',
    MISSING: 'Faltante',
    EXPIRED: 'Vencido',
    EXPIRING: 'Por Vencer',
  };

  return (
    <Badge className={styles[status as keyof typeof styles]}>
      {labels[status as keyof typeof labels]}
    </Badge>
  );
}
