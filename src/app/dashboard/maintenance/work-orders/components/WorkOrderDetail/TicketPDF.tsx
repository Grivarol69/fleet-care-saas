'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export type WorkOrderItem = {
  id: string;
  description: string;
  mantItem: { name: string; type: string };
};

export type WorkOrderSummary = {
  title: string;
  vehicle: {
    licensePlate: string;
    brand: { name: string };
    line: { name: string };
  };
  technician: { name: string } | null;
};

export const pdfStyles = StyleSheet.create({
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

export function TicketPDF({
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
