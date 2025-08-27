"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const DocumentStats = () => {
  const documentAlerts = [
    {
      plate: "ABC123",
      document: "SOAT",
      expiryDate: "2024-12-31",
      daysLeft: 45,
      status: "warning",
    },
    {
      plate: "ABC123",
      document: "Tecnomecánica",
      expiryDate: "2024-12-31",
      daysLeft: 30,
      status: "warning",
    },
  ];

  const getStatusColor = (status: any) => {
    switch (status) {
      case "danger":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "success":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    // <div className="container mx-auto px-4 py-6 max-w-7xl">
    // <div className="grid grid-cols-12 gap-6">
    //   <div className="col-span-12 md:col-span-8 space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Documentos por Vencer</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentAlerts.map((alert, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{alert.plate}</TableCell>
                <TableCell>{alert.document}</TableCell>
                <TableCell>
                  {new Date(alert.expiryDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      alert.status
                    )}`}
                  >
                    {alert.daysLeft} días
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    //   </div>
    // </div>
    // </div>
  );
};
