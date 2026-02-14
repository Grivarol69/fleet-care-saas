'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnFiltersState,
  flexRender,
  ColumnDef,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FleetVehicle } from '../SharedTypes/sharedTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormAddFleetVehicle } from '../FormAddFleetVehicle';
import { FormEditFleetVehicle } from '../FormEditFleetVehicle';
import { VehicleCVViewer } from '../VehicleCV';
import { SendCVDialog } from '../SendCVDialog';
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import Image from 'next/image';
import { DownloadBtn } from './DownloadBtn';
import {
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Mail,
  MessageCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function FleetVehiclesList() {
  const [data, setData] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCVDialogOpen, setIsCVDialogOpen] = useState(false);
  const [isSendEmailDialogOpen, setIsSendEmailDialogOpen] = useState(false);
  const [editingFleetVehicle, setEditingFleetVehicle] =
    useState<FleetVehicle | null>(null);
  const [viewingVehicleCV, setViewingVehicleCV] = useState<FleetVehicle | null>(
    null
  );
  const [sendingVehicleCV, setSendingVehicleCV] = useState<FleetVehicle | null>(
    null
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { toast } = useToast();

  const fetchFleetVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/vehicles/vehicles');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching Vehicles: ', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description: 'Debes iniciar sesión para ver los vehículos',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Error cargando vehículos',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFleetVehicles();
  }, [fetchFleetVehicles]);

  const handleEdit = useCallback((fleetVehicle: FleetVehicle) => {
    setEditingFleetVehicle(fleetVehicle);
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('¿Estás seguro de que quieres eliminar este vehículo?')) {
        return;
      }

      try {
        await axios.delete(`/api/vehicles/vehicles/${id}`);
        setData(prevData => prevData.filter(vehicle => vehicle.id !== id));
        toast({
          title: 'Vehículo eliminado',
          description: 'El vehículo ha sido eliminado exitosamente',
        });
      } catch (error) {
        console.error('Error deleting Vehicle:', error);

        if (axios.isAxiosError(error) && error.response?.status === 409) {
          toast({
            title: 'No se puede eliminar',
            description: 'El vehículo tiene registros asociados',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Error eliminando vehículo',
          description: 'Por favor intenta de nuevo más tarde',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const columns = useMemo<ColumnDef<FleetVehicle>[]>(
    () => [
      {
        accessorKey: 'photo',
        header: 'Imagen',
        cell: ({ row }) => (
          <div className="w-16 h-16 relative">
            {row.original.photo ? (
              <Image
                src={row.original.photo}
                alt={`Imagen de ${row.original.licensePlate}`}
                fill
                className="rounded-lg object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                Sin imagen
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'licensePlate',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Placa
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-bold text-lg">{row.original.licensePlate}</span>
        ),
      },
      {
        accessorKey: 'typePlate',
        header: 'Tipo Placa',
        cell: ({ row }) => {
          const typePlateLabels = {
            PARTICULAR: 'Particular',
            PUBLICO: 'Público',
          };
          return (
            typePlateLabels[row.original.typePlate] || row.original.typePlate
          );
        },
      },
      {
        accessorKey: 'brand.name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Marca
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original.brand?.name || 'N/A',
      },
      {
        accessorKey: 'line.name',
        header: 'Línea',
        cell: ({ row }) => row.original.line?.name || 'N/A',
      },
      {
        accessorKey: 'type.name',
        header: 'Tipo',
        cell: ({ row }) => row.original.type?.name || 'N/A',
      },
      {
        accessorKey: 'year',
        header: 'Año',
      },
      {
        accessorKey: 'color',
        header: 'Color',
      },
      {
        accessorKey: 'mileage',
        header: 'Kilometraje',
        cell: ({ row }) => (
          <span>{row.original.mileage.toLocaleString()} km</span>
        ),
      },
      {
        accessorKey: 'owner',
        header: 'Propietario',
        cell: ({ row }) => {
          const ownerLabels = {
            OWN: 'Propio',
            LEASED: 'Arrendado',
            RENTED: 'Rentado',
          };
          return ownerLabels[row.original.owner] || row.original.owner;
        },
      },
      {
        accessorKey: 'situation',
        header: 'Estado',
        cell: ({ row }) => {
          const situationLabels = {
            AVAILABLE: 'Disponible',
            IN_USE: 'En uso',
            MAINTENANCE: 'Mantenimiento',
          };
          const situation = row.original.situation;
          const label = situationLabels[situation] || situation;

          const statusColors = {
            AVAILABLE: 'bg-green-100 text-green-800',
            IN_USE: 'bg-blue-100 text-blue-800',
            MAINTENANCE: 'bg-yellow-100 text-yellow-800',
          };

          return (
            <span
              className={`px-2 py-1 rounded-full text-xs ${statusColors[situation]}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Acciones</div>,
        cell: ({ row }) => {
          const vehicle = row.original;

          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleDelete(vehicle.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => {
                      setViewingVehicleCV(vehicle);
                      setIsCVDialogOpen(true);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Ver CV
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      setSendingVehicleCV(vehicle);
                      setIsSendEmailDialogOpen(true);
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar por Email
                  </DropdownMenuItem>

                  <DropdownMenuItem disabled>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar por WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleDelete, handleEdit]
  );

  const table = useReactTable({
    data,
    columns,
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con botones */}
      <div className="flex justify-between items-center">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Agregar Vehículo
        </Button>
        <DownloadBtn data={data} fileName="vehiculos" />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Buscar por placa..."
          value={
            (table.getColumn('licensePlate')?.getFilterValue() as string) ?? ''
          }
          onChange={event =>
            table.getColumn('licensePlate')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="hover:bg-muted/50">
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No hay vehículos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Filas por página</p>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="h-8 w-[70px] rounded border border-input bg-background px-3 py-2 text-sm"
          >
            {[5, 10, 20, 30, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Página {table.getState().pagination.pageIndex + 1} de{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* Diálogos */}
      <FormAddFleetVehicle
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onAddFleetVehicle={vehicle => {
          setData([...data, vehicle]);
          fetchFleetVehicles(); // Refrescar para obtener datos completos con relaciones
        }}
      />

      {editingFleetVehicle && (
        <FormEditFleetVehicle
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          fleetVehicle={editingFleetVehicle}
          onEditFleetVehicle={() => {
            // Refrescar los datos desde el servidor en lugar de hacer merge manual
            fetchFleetVehicles();
          }}
        />
      )}

      {viewingVehicleCV && (
        <VehicleCVViewer
          isOpen={isCVDialogOpen}
          setIsOpen={setIsCVDialogOpen}
          vehicle={{
            licensePlate: viewingVehicleCV.licensePlate,
            brand: viewingVehicleCV.brand,
            line: viewingVehicleCV.line,
            type: viewingVehicleCV.type,
            year: viewingVehicleCV.year ?? 0,
            color: viewingVehicleCV.color ?? '',
            mileage: viewingVehicleCV.mileage,
            ...(viewingVehicleCV.cylinder && {
              cylinder: viewingVehicleCV.cylinder,
            }),
            ...(viewingVehicleCV.bodyWork && {
              bodyWork: viewingVehicleCV.bodyWork,
            }),
            ...(viewingVehicleCV.engineNumber && {
              engineNumber: viewingVehicleCV.engineNumber,
            }),
            ...(viewingVehicleCV.chasisNumber && {
              chasisNumber: viewingVehicleCV.chasisNumber,
            }),
            ...(viewingVehicleCV.ownerCard && {
              ownerCard: viewingVehicleCV.ownerCard,
            }),
            ...(viewingVehicleCV.fuelType && {
              fuelType: viewingVehicleCV.fuelType,
            }),
            ...(viewingVehicleCV.serviceType && {
              serviceType: viewingVehicleCV.serviceType,
            }),
            ...(viewingVehicleCV.photo && { photo: viewingVehicleCV.photo }),
            ...(viewingVehicleCV.emergencyContactName && {
              emergencyContactName: viewingVehicleCV.emergencyContactName,
            }),
            ...(viewingVehicleCV.emergencyContactPhone && {
              emergencyContactPhone: viewingVehicleCV.emergencyContactPhone,
            }),
          }}
          documents={viewingVehicleCV.documents || []}
        />
      )}

      {sendingVehicleCV && (
        <SendCVDialog
          isOpen={isSendEmailDialogOpen}
          setIsOpen={setIsSendEmailDialogOpen}
          vehicleId={sendingVehicleCV.id}
          vehiclePlate={sendingVehicleCV.licensePlate}
        />
      )}
    </div>
  );
}
