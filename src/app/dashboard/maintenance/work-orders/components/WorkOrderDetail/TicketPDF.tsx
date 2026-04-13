'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export type WorkOrderSubTask = {
  description: string;
  standardHours: number;
};

export type WorkOrderItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  supplier?: string | null;
  provider?: { name: string } | null;
  itemSource?: string | null;
  mantItem: { name: string; type: string };
  workOrderSubTasks?: WorkOrderSubTask[];
};

export type WorkOrderSummary = {
  title: string;
  description?: string | null;
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
    alignItems: 'flex-start',
  },
  rowIndex: { width: 20, color: '#999' },
  rowName: { flex: 2 },
  rowDesc: { flex: 1, color: '#666', fontSize: 9 },
  rowQty: { width: 32, textAlign: 'right', color: '#555', fontSize: 9 },
  rowPrice: { width: 64, textAlign: 'right', fontSize: 9 },
  rowTotal: { width: 72, textAlign: 'right', fontWeight: 'bold', fontSize: 9 },
  supplierTag: {
    fontSize: 8,
    color: '#6366f1',
    marginTop: 2,
  },
  sectionTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 6,
    paddingBottom: 2,
    marginTop: 2,
    gap: 8,
  },
  sectionTotalLabel: { fontSize: 9, color: '#555' },
  sectionTotalValue: {
    width: 72,
    textAlign: 'right',
    fontSize: 9,
    fontWeight: 'bold',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 16,
    paddingTop: 8,
    gap: 8,
  },
  grandTotalLabel: { fontSize: 10, fontWeight: 'bold' },
  grandTotalValue: {
    width: 80,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 2,
  },
  tableHeaderText: { fontSize: 8, color: '#888', fontWeight: 'bold' },
  subTaskBlock: {
    marginLeft: 20,
    marginTop: 3,
    marginBottom: 2,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#ccc',
  },
  subTaskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  subTaskDesc: { fontSize: 9, color: '#555', flex: 1 },
  subTaskHours: { fontSize: 9, color: '#888', width: 32, textAlign: 'right' },
  notesBlock: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 3,
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 3,
  },
  notesText: { fontSize: 9, color: '#333' },
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

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

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

  const totalServices = services.reduce((s, i) => s + Number(i.totalCost), 0);
  const totalParts = parts.reduce((s, i) => s + Number(i.totalCost), 0);
  const grandTotal = totalServices + totalParts;

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

        {/* Notas generales de la OT */}
        {workOrder.description && (
          <View style={pdfStyles.notesBlock}>
            <Text style={pdfStyles.notesLabel}>Notas del técnico:</Text>
            <Text style={pdfStyles.notesText}>{workOrder.description}</Text>
          </View>
        )}

        {services.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>
              Trabajos / Servicios ({services.length})
            </Text>
            {/* Table header */}
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderText, { width: 20 }]}>#</Text>
              <Text style={[pdfStyles.tableHeaderText, { flex: 2 }]}>
                Descripción
              </Text>
              <Text style={[pdfStyles.tableHeaderText, { flex: 1 }]}> </Text>
              <Text
                style={[
                  pdfStyles.tableHeaderText,
                  { width: 32, textAlign: 'right' },
                ]}
              >
                Cant.
              </Text>
              <Text
                style={[
                  pdfStyles.tableHeaderText,
                  { width: 64, textAlign: 'right' },
                ]}
              >
                P. Unit.
              </Text>
              <Text
                style={[
                  pdfStyles.tableHeaderText,
                  { width: 72, textAlign: 'right' },
                ]}
              >
                Total
              </Text>
            </View>
            {services.map((item, i) => (
              <View key={item.id}>
                <View style={pdfStyles.row}>
                  <Text style={pdfStyles.rowIndex}>{i + 1}.</Text>
                  <Text style={pdfStyles.rowName}>{item.mantItem.name}</Text>
                  {item.description ? (
                    <Text style={pdfStyles.rowDesc}>{item.description}</Text>
                  ) : (
                    <Text style={pdfStyles.rowDesc}> </Text>
                  )}
                  <Text style={pdfStyles.rowQty}>{Number(item.quantity)}</Text>
                  <Text style={pdfStyles.rowPrice}>
                    {fmt(Number(item.unitPrice))}
                  </Text>
                  <Text style={pdfStyles.rowTotal}>
                    {fmt(Number(item.totalCost))}
                  </Text>
                </View>
                {item.workOrderSubTasks &&
                  item.workOrderSubTasks.length > 0 && (
                    <View style={pdfStyles.subTaskBlock}>
                      {item.workOrderSubTasks.map((sub, sIdx) => (
                        <View key={sIdx} style={pdfStyles.subTaskRow}>
                          <Text style={pdfStyles.subTaskDesc}>
                            {sub.description}
                          </Text>
                          <Text style={pdfStyles.subTaskHours}>
                            {Number(sub.standardHours)}h
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
              </View>
            ))}
            {totalServices > 0 && (
              <View style={pdfStyles.sectionTotal}>
                <Text style={pdfStyles.sectionTotalLabel}>
                  Subtotal servicios:
                </Text>
                <Text style={pdfStyles.sectionTotalValue}>
                  {fmt(totalServices)}
                </Text>
              </View>
            )}
          </View>
        )}

        {parts.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>
              Repuestos ({parts.length})
            </Text>
            {/* Table header */}
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderText, { width: 20 }]}>#</Text>
              <Text style={[pdfStyles.tableHeaderText, { flex: 2 }]}>
                Repuesto
              </Text>
              <Text style={[pdfStyles.tableHeaderText, { flex: 1 }]}>
                Ref. / Proveedor
              </Text>
              <Text
                style={[
                  pdfStyles.tableHeaderText,
                  { width: 32, textAlign: 'right' },
                ]}
              >
                Cant.
              </Text>
              <Text
                style={[
                  pdfStyles.tableHeaderText,
                  { width: 64, textAlign: 'right' },
                ]}
              >
                P. Unit.
              </Text>
              <Text
                style={[
                  pdfStyles.tableHeaderText,
                  { width: 72, textAlign: 'right' },
                ]}
              >
                Total
              </Text>
            </View>
            {parts.map((item, i) => {
              const supplierName = item.provider?.name ?? item.supplier ?? null;
              const isExternal = item.itemSource === 'EXTERNAL_PURCHASE';
              return (
                <View key={item.id} style={pdfStyles.row}>
                  <Text style={pdfStyles.rowIndex}>{i + 1}.</Text>
                  <View style={{ flex: 2 }}>
                    <Text style={pdfStyles.rowName}>{item.mantItem.name}</Text>
                    {isExternal && supplierName && (
                      <Text style={pdfStyles.supplierTag}>
                        Compra externa · {supplierName}
                      </Text>
                    )}
                  </View>
                  {item.description ? (
                    <Text style={pdfStyles.rowDesc}>{item.description}</Text>
                  ) : (
                    <Text style={pdfStyles.rowDesc}> </Text>
                  )}
                  <Text style={pdfStyles.rowQty}>{Number(item.quantity)}</Text>
                  <Text style={pdfStyles.rowPrice}>
                    {fmt(Number(item.unitPrice))}
                  </Text>
                  <Text style={pdfStyles.rowTotal}>
                    {fmt(Number(item.totalCost))}
                  </Text>
                </View>
              );
            })}
            {totalParts > 0 && (
              <View style={pdfStyles.sectionTotal}>
                <Text style={pdfStyles.sectionTotalLabel}>
                  Subtotal repuestos:
                </Text>
                <Text style={pdfStyles.sectionTotalValue}>
                  {fmt(totalParts)}
                </Text>
              </View>
            )}
          </View>
        )}

        {grandTotal > 0 && (
          <View style={pdfStyles.grandTotal}>
            <Text style={pdfStyles.grandTotalLabel}>TOTAL:</Text>
            <Text style={pdfStyles.grandTotalValue}>{fmt(grandTotal)}</Text>
          </View>
        )}

        <Text style={pdfStyles.footer}>
          Generado el {date} · Fleet Care · {ticketNumber}
        </Text>
      </Page>
    </Document>
  );
}
