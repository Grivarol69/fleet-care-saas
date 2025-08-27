import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownNarrowWide } from "lucide-react";
import * as XLSX from "xlsx";

interface FleetVehicle {
  id: number;
  licensePlate: string;
  typePlate: "PARTICULAR" | "PUBLICO";
  year: number;
  color: string;
  mileage: number;
  situation: "AVAILABLE" | "IN_USE" | "MAINTENANCE";
  owner: "OWN" | "LEASED" | "RENTED";
  brand: { name: string };
  line: { name: string };
  type: { name: string };
  cylinder?: number | null;
  bodyWork?: string | null;
}

type DownloadBtnProps = {
  data: FleetVehicle[];
  fileName: string;
};

export function DownloadBtn({ data = [], fileName }: DownloadBtnProps) {
  const handleDownload = () => {
    if (!data.length) {
      alert("No hay datos para descargar");
      return;
    }

    // Formatear datos para Excel
    const formattedData = data.map((vehicle) => ({
      ID: vehicle.id,
      Placa: vehicle.licensePlate,
      "Tipo Placa": vehicle.typePlate === "PARTICULAR" ? "Particular" : "Público",
      Marca: vehicle.brand?.name || "N/A",
      Línea: vehicle.line?.name || "N/A",
      Tipo: vehicle.type?.name || "N/A",
      Año: vehicle.year,
      Color: vehicle.color,
      Kilometraje: vehicle.mileage,
      Cilindraje: vehicle.cylinder || "N/A",
      Carrocería: vehicle.bodyWork || "N/A",
      Propietario:
        vehicle.owner === "OWN"
          ? "Propio"
          : vehicle.owner === "LEASED"
          ? "Arrendado"
          : "Rentado",
      Estado:
        vehicle.situation === "AVAILABLE"
          ? "Disponible"
          : vehicle.situation === "IN_USE"
          ? "En uso"
          : "Mantenimiento",
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vehículos");

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 8 }, // ID
        { wch: 12 }, // Placa
        { wch: 12 }, // Tipo Placa
        { wch: 15 }, // Marca
        { wch: 15 }, // Línea
        { wch: 12 }, // Tipo
        { wch: 8 }, // Año
        { wch: 12 }, // Color
        { wch: 12 }, // Kilometraje
        { wch: 12 }, // Cilindraje
        { wch: 15 }, // Carrocería
        { wch: 12 }, // Propietario
        { wch: 15 }, // Estado
      ];
      worksheet["!cols"] = colWidths;

      XLSX.writeFile(
        workbook,
        `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`
      );
    } catch (error) {
      console.error("Error al generar archivo Excel:", error);
      alert("Error al generar el archivo Excel");
    }
  };

  return (
    <Button
      className="flex items-center gap-2"
      onClick={handleDownload}
      variant="outline"
    >
      <ArrowDownNarrowWide className="h-4 w-4" />
      Descargar Excel
    </Button>
  );
}
