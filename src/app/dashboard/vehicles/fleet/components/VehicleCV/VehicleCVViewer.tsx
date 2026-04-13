'use client';

import React, { useState } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { VehicleCV } from './VehicleCV';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';

interface Tenant {
  name: string;
  logo?: string | null;
}

interface Document {
  type: string;
  typeName?: string;
  documentNumber?: string | null;
  expiryDate?: string | null;
  entity?: string | null;
  fileUrl?: string;
  fileName?: string;
}

interface Vehicle {
  licensePlate: string;
  brand?: { name: string };
  line?: { name: string };
  type?: { name: string };
  year?: number;
  color?: string;
  mileage?: number;
  cylinder?: number;
  bodyWork?: string;
  engineNumber?: string;
  chasisNumber?: string;
  ownerCard?: string;
  fuelType?: string;
  serviceType?: string;
  photo?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  documents?: Document[];
  [key: string]: unknown;
}

type VehicleCVData = {
  licensePlate: string;
  brand?: { name: string };
  line?: { name: string };
  type?: { name: string };
  year: number;
  color: string;
  mileage: number;
  cylinder?: number;
  bodyWork?: string;
  engineNumber?: string;
  chasisNumber?: string;
  ownerCard?: string;
  fuelType?: string;
  serviceType?: string;
  photo?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

interface VehicleCVViewerProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  vehicle: Vehicle;
  vehicleId?: string;
  tenant?: Tenant;
  documents?: Document[];
  documentsLoading?: boolean;
}

export function VehicleCVViewer({
  isOpen,
  setIsOpen,
  vehicle,
  vehicleId,
  tenant,
  documents = [],
  documentsLoading = false,
}: VehicleCVViewerProps) {
  const [isClient, setIsClient] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const fileName = `CV_${vehicle.licensePlate}_${new Date().toISOString().split('T')[0]}.pdf`;

  const handleDownload = async () => {
    if (!vehicleId) return;
    setIsDownloading(true);
    try {
      const res = await fetch(
        `/api/vehicles/vehicles/${vehicleId}/cv-download`
      );
      if (!res.ok) throw new Error('Error generando PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isClient) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>CV del Vehículo - {vehicle.licensePlate}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span>CV del Vehículo - {vehicle.licensePlate}</span>
            {vehicleId ? (
              <Button
                size="sm"
                disabled={isDownloading}
                onClick={handleDownload}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </>
                )}
              </Button>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full flex-1 px-6 pb-6 flex gap-4 overflow-hidden min-h-0">
          <PDFViewer
            width="100%"
            height="100%"
            showToolbar={false}
            className="rounded-lg flex-1 min-w-0"
          >
            <VehicleCV
              vehicle={vehicle as VehicleCVData}
              {...(tenant && {
                tenant: {
                  name: tenant.name,
                  ...(tenant.logo && { logo: tenant.logo }),
                },
              })}
              documents={documents.map(doc => ({
                type: doc.type,
                typeName: doc.typeName,
                ...(doc.documentNumber && {
                  documentNumber: doc.documentNumber,
                }),
                ...(doc.expiryDate && { expiryDate: doc.expiryDate }),
                ...(doc.entity && { entity: doc.entity }),
              }))}
            />
          </PDFViewer>

          {(documentsLoading || documents.length > 0) && (
            <div className="w-56 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
              <p className="font-semibold text-sm">Documentos adjuntos</p>
              {documentsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando...
                </div>
              ) : (
                documents
                  .filter(d => d.fileUrl)
                  .map((doc, i) => (
                    <a
                      key={i}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded border hover:bg-accent text-sm transition-colors"
                    >
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">
                        {doc.typeName || doc.type}
                      </span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    </a>
                  ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
