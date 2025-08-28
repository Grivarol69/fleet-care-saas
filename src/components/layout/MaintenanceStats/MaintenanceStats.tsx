"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import axios from "axios";
import { useToast } from "@/components/hooks/use-toast";
import Image from "next/image";

type MaintenanceAlerts = {
  id: number;
  vehiclePlate: string;
  photo: string;
  brandName?: string;
  lineName?: string;
  mantItemDescription: string;
  currentKm: number;
  executionKm: number;
  kmToMaintenance: number;
  state: "YELLOW" | "RED";
  status: "ACTIVE" | "INACTIVE"; // Agregado status ya que viene en los datos
};

const mantAlerts: MaintenanceAlerts[] = [
  {
    id: 1,
    vehiclePlate: "ABC123",
    photo: "https://utfs.io/f/ed8f2e8a-1265-4310-b086-1385aa133fc8-zbbdk9.jpg",
    brandName: "Ford",
    lineName: "Ranger",
    mantItemDescription: "Cambio Aceite Motor",
    currentKm: 88000,
    executionKm: 88100,
    kmToMaintenance: 88120,
    state: "YELLOW",
    status: "ACTIVE",
  },
  {
    id: 2,
    vehiclePlate: "ZID234",
    photo: "https://utfs.io/f/5fc9e64d-e7f0-4320-a5be-3ef46bbd8308-zbbdj8.jpg",
    brandName: "Chevrolet",
    lineName: "Colorado",
    mantItemDescription: "Cambio Filtro Aceite Motor",
    currentKm: 88000,
    executionKm: 88100,
    kmToMaintenance: 88120,
    state: "RED",
    status: "ACTIVE",
  },
  {
    id: 3,
    vehiclePlate: "HJO125",
    photo: "https://utfs.io/f/d3519253-287d-4309-8da2-ddd02aa4731f-zbv05e.jpg",
    brandName: "Toyota",
    lineName: "Hilux",
    mantItemDescription: "Revisión Presión Motor",
    currentKm: 88000,
    executionKm: 88100,
    kmToMaintenance: 88120,
    state: "YELLOW",
    status: "ACTIVE",
  },
  {
    id: 4,
    vehiclePlate: "HJK789",
    photo: "https://utfs.io/f/5a7e64aa-98fa-47b6-8720-1dc1f6d985cb-zbbdk6.jpg",
    brandName: "Ino",
    lineName: "Turbo",
    mantItemDescription: "Cambio Aceite Motor",
    currentKm: 88000,
    executionKm: 88100,
    kmToMaintenance: 88120,
    state: "YELLOW",
    status: "ACTIVE",
  },
  {
    id: 5,
    vehiclePlate: "KLJ675",
    photo: "https://utfs.io/f/ed8f2e8a-1265-4310-b086-1385aa133fc8-zbbdk9.jpg",
    brandName: "VolksWagen",
    lineName: "Volqueta",
    mantItemDescription: "Cambio Filtros",
    currentKm: 88000,
    executionKm: 88100,
    kmToMaintenance: 88120,
    state: "RED",
    status: "ACTIVE",
  },
  {
    id: 6,
    vehiclePlate: "GHF456",
    photo: "https://utfs.io/f/5fc9e64d-e7f0-4320-a5be-3ef46bbd8308-zbbdj8.jpg",
    brandName: "Ford",
    lineName: "Ranger",
    mantItemDescription: "Cambio Aceite Motor",
    currentKm: 88000,
    executionKm: 88100,
    kmToMaintenance: 88120,
    state: "YELLOW",
    status: "ACTIVE",
  },
  {
    id: 7,
    vehiclePlate: "JKY654",
    photo: "https://utfs.io/f/d3519253-287d-4309-8da2-ddd02aa4731f-zbv05e.jpg",
    brandName: "Chevrolet",
    lineName: "Colorado",
    mantItemDescription: "Cambio Aceite Motor",
    currentKm: 88000,
    executionKm: 88100,
    kmToMaintenance: 88120,
    state: "YELLOW",
    status: "ACTIVE",
  },
  {
    id: 8,
    vehiclePlate: "DFE567",
    photo: "https://utfs.io/f/5a7e64aa-98fa-47b6-8720-1dc1f6d985cb-zbbdk6.jpg",
    brandName: "Dongfeng",
    lineName: "Rich6",
    mantItemDescription: "Cambio Neumáticos",
    currentKm: 88000,
    executionKm: 88100,
    kmToMaintenance: 88120,
    state: "RED",
    status: "ACTIVE",
  },
];

export function MaintenanceStats() {
  const [data, setData] = useState<MaintenanceAlerts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMaintenanceAlerts = useCallback(async () => {
    try {
      const response = await axios.get(`/api/mantenaince/maintenance-alerts`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching Maintenance Alerts: ", error);
      toast({
        title: "Error fetching Maintenance Alerts",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMaintenanceAlerts();
  }, [fetchMaintenanceAlerts]);

  const columns: ColumnDef<MaintenanceAlerts>[] = [
    {
      accessorKey: "photo",
      header: "Imagen",
      cell: ({ row }) => (
        <div className="relative h-16 w-16">
          {row.original.photo ? (
            <Image
              src={row.original.photo}
              alt={`Imagen de ${row.original.vehiclePlate}`}
              fill
              className="rounded-full object-cover"
            />
          ) : (
            <div className="h-full w-full rounded-full bg-gray-200" />
          )}
        </div>
      ),
    },
    {
      accessorKey: "state",
      header: "Estado",
      cell: ({ row }) => {
        const state = row.original.state;
        return (
          <div className="flex items-center justify-center">
            {state === "YELLOW" ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-yellow-400" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-red-500" />
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "vehiclePlate",
      header: "Placa",
      cell: ({ row }) => (
        <span className="text-xl font-bold">{row.original.vehiclePlate}</span>
      ),
    },
    {
      accessorKey: "brandName",
      header: "Marca",
      cell: ({ row }) => row.original.brandName || "N/A",
    },
    {
      accessorKey: "lineName",
      header: "Linea",
      cell: ({ row }) => row.original.lineName || "N/A",
    },
    {
      accessorKey: "mantItemDescription",
      header: "Item Mantenimiento",
    },
    {
      accessorKey: "currentKm",
      header: "KM Actuales",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.currentKm.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "executionKm",
      header: "KM Ejecución",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.executionKm.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "kmToMaintenance",
      header: "KM Restantes",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.kmToMaintenance.toLocaleString()}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: mantAlerts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return <div>Cargando alertas de mantenimiento...</div>;
  }

  const getRowColor = (state: "YELLOW" | "RED") => {
    switch (state) {
      case "YELLOW":
        return "bg-yellow-100 hover:bg-yellow-200";
      case "RED":
        return "bg-red-100 hover:bg-red-200";
      default:
        return "";
    }
  };

  // Si no hay datos después de cargar, mostramos un mensaje
  if (!isLoading && data.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        No hay alertas de mantenimiento disponibles
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border ">
      <div className="rounded-md border ">
        <div className="h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-center">
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
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`${getRowColor(
                    row.original.state
                  )} transition-colors`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-center">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
