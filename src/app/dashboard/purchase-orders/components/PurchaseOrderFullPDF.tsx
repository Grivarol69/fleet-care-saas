'use client';

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

export type TenantInfo = {
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  taxId: string | null;
  currency: string;
};

export type PurchaseOrderFullPDFItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
};

export type PurchaseOrderFullPDFProps = {
  tenant: TenantInfo;
  purchaseOrder: {
    orderNumber: string;
    type: string;
    status: string;
    notes: string | null;
    total: number;
    createdAt: string;
    provider: { name: string; nit?: string | null } | null;
    workOrder?: {
      title: string;
      vehicle: { licensePlate: string; brand?: { name: string } };
    } | null;
  };
  items: PurchaseOrderFullPDFItem[];
};

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },

  // Company header
  companyHeader: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 12 },
  logo: { width: 60, height: 60, objectFit: 'contain', marginRight: 14 },
  companyInfo: { flex: 1, justifyContent: 'center' },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  companyDetail: { fontSize: 8, color: '#555', marginBottom: 1 },

  // PO header
  poTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  poSubtitle: { fontSize: 9, color: '#666', marginBottom: 14 },

  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 4 },
  infoCell: { width: '48%', marginBottom: 5 },
  infoLabel: { fontSize: 8, color: '#888', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 1 },
  infoValue: { fontSize: 9 },

  // Section
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', borderBottomWidth: 1, borderBottomColor: '#999', paddingBottom: 3, marginBottom: 6 },

  // Table
  tableHeader: { flexDirection: 'row', paddingVertical: 3, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#ccc' },
  tableHeaderText: { fontSize: 8, color: '#555', fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#eee' },
  colIdx: { width: 18, fontSize: 9 },
  colName: { flex: 3, fontSize: 9 },
  colQty: { width: 30, textAlign: 'right', fontSize: 9 },
  colUnit: { width: 62, textAlign: 'right', fontSize: 9 },
  colTotal: { width: 72, textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // Totals
  grandTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#333', marginTop: 12, paddingTop: 6, gap: 8 },
  grandTotalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  grandTotalValue: { width: 80, textAlign: 'right', fontSize: 11, fontFamily: 'Helvetica-Bold' },

  // Notes
  notesBlock: { marginTop: 10, padding: 8, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 3 },
  notesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#555', marginBottom: 3 },
  notesText: { fontSize: 9, color: '#333' },

  // Footer
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, textAlign: 'center', color: '#aaa', fontSize: 7, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 5 },
});

function fmt(n: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'En Aprobación',
  APPROVED: 'Aprobada',
  SENT: 'Enviada',
  PARTIAL: 'Parcial',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const PO_TYPE_LABELS: Record<string, string> = {
  SERVICES: 'Servicios',
  PARTS: 'Repuestos',
};

export function PurchaseOrderFullPDF({ tenant, purchaseOrder, items }: PurchaseOrderFullPDFProps) {
  const currency = tenant.currency || 'COP';
  const printDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Company header */}
        <View style={s.companyHeader}>
          {tenant.logo && <Image style={s.logo} src={tenant.logo} />}
          <View style={s.companyInfo}>
            <Text style={s.companyName}>{tenant.name}</Text>
            {tenant.taxId && <Text style={s.companyDetail}>NIT/RUT: {tenant.taxId}</Text>}
            {tenant.address && <Text style={s.companyDetail}>{tenant.address}</Text>}
            {tenant.phone && <Text style={s.companyDetail}>Tel: {tenant.phone}</Text>}
          </View>
        </View>

        {/* PO title */}
        <Text style={s.poTitle}>Orden de Compra: {purchaseOrder.orderNumber}</Text>
        <Text style={s.poSubtitle}>
          {PO_TYPE_LABELS[purchaseOrder.type] ?? purchaseOrder.type} · {PO_STATUS_LABELS[purchaseOrder.status] ?? purchaseOrder.status} · Impreso el {printDate}
        </Text>

        {/* Info grid */}
        <View style={s.infoGrid}>
          {purchaseOrder.provider && (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Proveedor</Text>
              <Text style={s.infoValue}>{purchaseOrder.provider.name}</Text>
              {purchaseOrder.provider.nit && (
                <Text style={{ fontSize: 8, color: '#555' }}>NIT: {purchaseOrder.provider.nit}</Text>
              )}
            </View>
          )}
          {purchaseOrder.workOrder && (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Orden de Trabajo / Vehículo</Text>
              <Text style={s.infoValue}>
                {purchaseOrder.workOrder.title} — {purchaseOrder.workOrder.vehicle.licensePlate} 
                {purchaseOrder.workOrder.vehicle.brand ? ` ${purchaseOrder.workOrder.vehicle.brand.name}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {purchaseOrder.notes && (
          <View style={s.notesBlock}>
            <Text style={s.notesLabel}>Observaciones</Text>
            <Text style={s.notesText}>{purchaseOrder.notes}</Text>
          </View>
        )}

        {/* Items Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ítems Solicitados ({items.length})</Text>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, { width: 18 }]}>#</Text>
            <Text style={[s.tableHeaderText, { flex: 3 }]}>Descripción</Text>
            <Text style={[s.tableHeaderText, { width: 30, textAlign: 'right' }]}>Cant.</Text>
            <Text style={[s.tableHeaderText, { width: 62, textAlign: 'right' }]}>P. Unit.</Text>
            <Text style={[s.tableHeaderText, { width: 72, textAlign: 'right' }]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View key={item.id} style={s.tableRow}>
              <Text style={s.colIdx}>{i + 1}.</Text>
              <Text style={s.colName}>{item.description}</Text>
              <Text style={s.colQty}>{item.quantity}</Text>
              <Text style={s.colUnit}>{fmt(Number(item.unitPrice), currency)}</Text>
              <Text style={s.colTotal}>{fmt(Number(item.totalCost), currency)}</Text>
            </View>
          ))}
        </View>

        {/* Grand total */}
        {purchaseOrder.total > 0 && (
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>TOTAL:</Text>
            <Text style={s.grandTotalValue}>{fmt(purchaseOrder.total, currency)}</Text>
          </View>
        )}

        <Text style={s.footer}>
          {tenant.name} · Impreso el {printDate} · Fleet Care
        </Text>
      </Page>
    </Document>
  );
}
