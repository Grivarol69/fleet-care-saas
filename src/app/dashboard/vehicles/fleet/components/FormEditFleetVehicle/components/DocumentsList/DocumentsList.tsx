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
import axios from 'axios';
import { useToast } from '@/components/hooks/use-toast';
import { FormAddDocument } from '../FormAddDocument';
import { FormEditDocument } from '../FormEditDocument';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { DocumentProps } from '../SharedTypes/SharedTypes';

// Tipo actualizado según el schema de Prisma
// interface DocumentProps {
//   id: string;
//   vehicleId: string;
//   type: "SOAT" | "TECNOMECANICA" | "INSURANCE" | "REGISTRATION" | "OTHER";
//   fileName: string;
//   fileUrl: string;
//   expiryDate: Date | null;
//   status: "ACTIVE" | "EXPIRED" | "EXPIRING_SOON";
//   uploadedAt: Date;
//   createdAt: Date;
//   updatedAt: Date;
//   // Relación con el vehículo
//   vehicle: {
//     licensePlate: string;
//   };
// }

interface DocumentsListProps {
  vehiclePlate: string;
}

export function DocumentsList({ vehiclePlate }: DocumentsListProps) {
  const [data, setData] = useState<DocumentProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentProps | null>(
    null
  );

  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/vehicles/documents?vehiclePlate=${vehiclePlate}`
      );
      setData(response.data);
    } catch (error) {
      console.error('Error fetching Documents: ', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast({
          title: 'No autorizado',
          description: 'Debes iniciar sesión para ver los documentos',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Error cargando documentos',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [vehiclePlate, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleEdit = (document: DocumentProps) => {
    setEditingDocument(document);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      return;
    }

    try {
      await axios.delete(`/api/vehicles/documents/${id}`);
      setData(prevData => prevData.filter(doc => doc.id !== id));
      toast({
        title: 'Documento eliminado',
        description: 'El documento ha sido eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error eliminando documento',
        description: 'Por favor intenta de nuevo más tarde',
        variant: 'destructive',
      });
    }
  };

  const handleViewDocument = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const getStatusBadge = (
    status: DocumentProps['status'],
    expiryDate: string | null
  ) => {
    if (!expiryDate) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          Sin vencimiento
        </span>
      );
    }

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (status === 'EXPIRED' || daysUntilExpiry < 0) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
          Vencido
        </span>
      );
    } else if (status === 'EXPIRING_SOON' || daysUntilExpiry <= 30) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          Por vencer
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Vigente
        </span>
      );
    }
  };

  const columns: ColumnDef<DocumentProps>[] = [
    {
      accessorKey: 'documentType',
      header: 'Tipo',
      cell: ({ row }) => row.original.documentType.name,
    },
    {
      accessorKey: 'documentNumber',
      header: 'Número/Nombre',
    },
    {
      accessorKey: 'uploadedAt',
      header: 'Fecha Subida',
      cell: ({ row }) =>
        format(new Date(row.original.uploadedAt), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'expiryDate',
      header: 'Vencimiento',
      cell: ({ row }) => {
        const expiryDate = row.original.expiryDate;
        return expiryDate
          ? format(new Date(expiryDate), 'dd/MM/yyyy')
          : 'Sin vencimiento';
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) =>
        getStatusBadge(row.original.status, row.original.expiryDate),
    },
    {
      accessorKey: 'fileUrl',
      header: 'Archivo',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewDocument(row.original.fileUrl)}
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Ver
        </Button>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Documentos del Vehículo</h3>
          <p className="text-sm text-gray-600">Placa: {vehiclePlate}</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Agregar Documento
        </Button>
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
                  No hay documentos registrados para este vehículo
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogos */}
      <FormAddDocument
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        vehiclePlate={vehiclePlate}
        onAddDocument={(newDocument: DocumentProps) => {
          setData([newDocument, ...data]);
        }}
      />

      {editingDocument && (
        <FormEditDocument
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          document={editingDocument}
          onEditDocument={(editedDocument: DocumentProps) => {
            setData(
              data.map(item =>
                item.id === editedDocument.id ? editedDocument : item
              )
            );
          }}
        />
      )}
    </div>
  );
}
