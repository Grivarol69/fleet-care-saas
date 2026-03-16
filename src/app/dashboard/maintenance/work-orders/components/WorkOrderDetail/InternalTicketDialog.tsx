'use client';

import { useState } from 'react';
import axios from 'axios';
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import { Loader2, Ticket } from 'lucide-react';

type WorkOrderItem = {
  id: string;
  description: string;
  mantItem: { name: string; type: string };
};

type WorkOrderSummary = {
  title: string;
  vehicle: {
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
  };
  technician: { name: string } | null;
};

type InternalTicketDialogProps = {
  workOrderId: string;
  pendingItems: WorkOrderItem[];
  workOrder: WorkOrderSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

// ─── PDF ────────────────────────────────────────────────────────────────────

const pdfStyles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  ticketNumber: { fontSize: 11, color: '#555', marginBottom: 18 },
  infoRow: { flexDirection: 'row', marginBottom: 5 },
  infoLabel: { width: 90, fontWeight: 'bold', color: '#444' },
  infoValue: { flex: 1 },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowIndex: { width: 20, color: '#999' },
  rowName: { flex: 1 },
  rowDesc: { flex: 1, color: '#666', fontSize: 9 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 36,
    right: 36,
    textAlign: 'center',
    color: '#aaa',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 6,
  },
});

function TicketPDF({
  ticketNumber,
  workOrder,
  services,
  parts,
}: {
  ticketNumber: string;
  workOrder: WorkOrderSummary;
  services: WorkOrderItem[];
  parts: WorkOrderItem[];
}) {
  const date = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Ticket de Taller Interno</Text>
        <Text style={pdfStyles.ticketNumber}>{ticketNumber}</Text>

        <View style={pdfStyles.infoRow}>
          <Text style={pdfStyles.infoLabel}>OT:</Text>
          <Text style={pdfStyles.infoValue}>{workOrder.title}</Text>
        </View>
        <View style={pdfStyles.infoRow}>
          <Text style={pdfStyles.infoLabel}>Vehículo:</Text>
          <Text style={pdfStyles.infoValue}>
            {workOrder.vehicle.licensePlate} — {workOrder.vehicle.brand.name}{' '}
            {workOrder.vehicle.line.name}
          </Text>
        </View>
        {workOrder.technician && (
          <View style={pdfStyles.infoRow}>
            <Text style={pdfStyles.infoLabel}>Técnico:</Text>
            <Text style={pdfStyles.infoValue}>{workOrder.technician.name}</Text>
          </View>
        )}
        <View style={pdfStyles.infoRow}>
          <Text style={pdfStyles.infoLabel}>Fecha:</Text>
          <Text style={pdfStyles.infoValue}>{date}</Text>
        </View>

        {services.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>
              Trabajos / Servicios ({services.length})
            </Text>
            {services.map((item, i) => (
              <View key={item.id} style={pdfStyles.row}>
                <Text style={pdfStyles.rowIndex}>{i + 1}.</Text>
                <Text style={pdfStyles.rowName}>{item.mantItem.name}</Text>
                {item.description ? (
                  <Text style={pdfStyles.rowDesc}>{item.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {parts.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>
              Repuestos ({parts.length})
            </Text>
            {parts.map((item, i) => (
              <View key={item.id} style={pdfStyles.row}>
                <Text style={pdfStyles.rowIndex}>{i + 1}.</Text>
                <Text style={pdfStyles.rowName}>{item.mantItem.name}</Text>
                {item.description ? (
                  <Text style={pdfStyles.rowDesc}>{item.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        <Text style={pdfStyles.footer}>
          Generado el {date} · Fleet Care · {ticketNumber}
        </Text>
      </Page>
    </Document>
  );
}

// ─── Dialog ─────────────────────────────────────────────────────────────────

export function InternalTicketDialog({
  workOrderId,
  pendingItems,
  workOrder,
  open,
  onOpenChange,
  onSuccess,
}: InternalTicketDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const services = pendingItems.filter(i => i.mantItem.type !== 'PART');
  const parts = pendingItems.filter(i => i.mantItem.type === 'PART');

  const handleGenerate = async () => {
    try {
      setIsSubmitting(true);

      const res = await axios.post(
        `/api/maintenance/work-orders/${workOrderId}/workshop-tickets`,
        { itemIds: pendingItems.map(i => i.id) }
      );

      const { ticketNumber } = res.data;

      const blob = await pdf(
        <TicketPDF
          ticketNumber={ticketNumber}
          workOrder={workOrder}
          services={services}
          parts={parts}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ticketNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Ticket generado',
        description: `${ticketNumber} descargado.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo generar el ticket de taller.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-blue-600" />
            Generar Ticket de Taller
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Se generará un ticket de taller con todos los ítems pendientes:
          </p>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
            {services.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">{services.length}</span> servicio
                {services.length !== 1 ? 's' : ''}
              </p>
            )}
            {parts.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">{parts.length}</span> repuesto
                {parts.length !== 1 ? 's' : ''}
              </p>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              Total: {pendingItems.length} ítem
              {pendingItems.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={pendingItems.length === 0 || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Generando PDF...' : 'Confirmar y descargar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
