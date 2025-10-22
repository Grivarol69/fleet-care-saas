"use client";

import React, { useState } from "react";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { VehicleCV } from "./VehicleCV";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface Tenant {
  name: string;
  logo?: string | null;
}

interface Document {
  type: string;
  documentNumber?: string | null;
  expiryDate?: string | null;
  entity?: string | null;
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
}

interface VehicleCVViewerProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  vehicle: Vehicle;
  tenant?: Tenant;
  documents?: Document[];
}

export function VehicleCVViewer({
  isOpen,
  setIsOpen,
  vehicle,
  tenant,
  documents = [],
}: VehicleCVViewerProps) {
  const [isClient, setIsClient] = useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const fileName = `CV_${vehicle.licensePlate}_${new Date().toISOString().split("T")[0]}.pdf`;

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
            <PDFDownloadLink
              document={
                <VehicleCV
                  vehicle={vehicle as VehicleCVData}
                  {...(tenant && {
                    tenant: {
                      name: tenant.name,
                      ...(tenant.logo && { logo: tenant.logo })
                    }
                  })}
                  documents={documents.map(doc => ({
                    type: doc.type,
                    ...(doc.documentNumber && { documentNumber: doc.documentNumber }),
                    ...(doc.expiryDate && { expiryDate: doc.expiryDate }),
                    ...(doc.entity && { entity: doc.entity })
                  }))}
                />
              }
              fileName={fileName}
            >
              {({ loading }) => (
                <Button size="sm" disabled={loading}>
                  {loading ? (
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
              )}
            </PDFDownloadLink>
          </DialogTitle>
        </DialogHeader>

        <div className="w-full flex-1 px-6 pb-6">
          <PDFViewer width="100%" height="100%" showToolbar={true} className="rounded-lg">
            <VehicleCV
              vehicle={vehicle as VehicleCVData}
              {...(tenant && {
                tenant: {
                  name: tenant.name,
                  ...(tenant.logo && { logo: tenant.logo })
                }
              })}
              documents={documents.map(doc => ({
                type: doc.type,
                ...(doc.documentNumber && { documentNumber: doc.documentNumber }),
                ...(doc.expiryDate && { expiryDate: doc.expiryDate }),
                ...(doc.entity && { entity: doc.entity })
              }))}
            />
          </PDFViewer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
