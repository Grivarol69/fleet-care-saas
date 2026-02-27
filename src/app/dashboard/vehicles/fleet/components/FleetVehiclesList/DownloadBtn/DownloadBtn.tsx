import { Button } from '@/components/ui/button';
import { ArrowDownNarrowWide } from 'lucide-react';
import * as ExcelJS from 'exceljs';

interface FleetVehicle {
  id: string;
  licensePlate: string;
  typePlate: 'PARTICULAR' | 'PUBLICO';
  year: number;
  color: string;
  mileage: number;
  situation: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
  owner: 'OWN' | 'LEASED' | 'RENTED';
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
  const handleDownload = async () => {
    if (!data.length) {
      alert('No hay datos para descargar');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Vehículos');

      // Definir columnas con formato
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Placa', key: 'licensePlate', width: 12 },
        { header: 'Tipo Placa', key: 'typePlate', width: 12 },
        { header: 'Marca', key: 'brand', width: 15 },
        { header: 'Línea', key: 'line', width: 15 },
        { header: 'Tipo', key: 'type', width: 12 },
        { header: 'Año', key: 'year', width: 8 },
        { header: 'Color', key: 'color', width: 12 },
        { header: 'Kilometraje', key: 'mileage', width: 12 },
        { header: 'Cilindraje', key: 'cylinder', width: 12 },
        { header: 'Carrocería', key: 'bodyWork', width: 15 },
        { header: 'Propietario', key: 'owner', width: 12 },
        { header: 'Estado', key: 'situation', width: 15 },
      ];

      // Formatear y agregar datos
      const formattedData = data.map(vehicle => ({
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        typePlate:
          vehicle.typePlate === 'PARTICULAR' ? 'Particular' : 'Público',
        brand: vehicle.brand?.name || 'N/A',
        line: vehicle.line?.name || 'N/A',
        type: vehicle.type?.name || 'N/A',
        year: vehicle.year,
        color: vehicle.color,
        mileage: vehicle.mileage,
        cylinder: vehicle.cylinder || 'N/A',
        bodyWork: vehicle.bodyWork || 'N/A',
        owner:
          vehicle.owner === 'OWN'
            ? 'Propio'
            : vehicle.owner === 'LEASED'
              ? 'Arrendado'
              : 'Rentado',
        situation:
          vehicle.situation === 'AVAILABLE'
            ? 'Disponible'
            : vehicle.situation === 'IN_USE'
              ? 'En uso'
              : 'Mantenimiento',
      }));

      worksheet.addRows(formattedData);

      // Aplicar estilos al header
      worksheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F3FF' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Generar buffer y descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al generar archivo Excel:', error);
      alert('Error al generar el archivo Excel');
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
