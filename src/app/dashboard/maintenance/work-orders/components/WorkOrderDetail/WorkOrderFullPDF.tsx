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

export type WorkOrderFullPDFItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  provider?: { name: string } | null;
  itemSource?: string | null;
  mantItem: { name: string; type: string };
};

export type WorkOrderFullPDFProps = {
  tenant: TenantInfo;
  workOrder: {
    id: string;
    title: string;
    description: string | null;
    notes: string | null;
    status: string;
    priority: string;
    mantType: string;
    createdAt: string;
    startDate: string | null;
    endDate: string | null;
    creationMileage: number;
    completionMileage: number | null;
    estimatedCost: number | null;
    actualCost: number | null;
    vehicle: {
      licensePlate: string;
      brand: { name: string };
      line: { name: string };
      mileage: number;
    };
    technician: { name: string; email?: string | null; phone?: string | null } | null;
    provider: { name: string } | null;
    costCenterRef: { name: string } | null;
  };
  items: WorkOrderFullPDFItem[];
  invoices: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    supplier: { name: string } | null;
  }>;
};

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },

  // Company header
  companyHeader: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 12 },
  logo: { width: 60, height: 60, objectFit: 'contain', marginRight: 14 },
  companyInfo: { flex: 1, justifyContent: 'center' },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  companyDetail: { fontSize: 8, color: '#555', marginBottom: 1 },

  // OT header
  otTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  otSubtitle: { fontSize: 9, color: '#666', marginBottom: 14 },

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
  colName: { flex: 2, fontSize: 9 },
  colProvider: { flex: 1, fontSize: 8, color: '#6366f1' },
  colQty: { width: 30, textAlign: 'right', fontSize: 9 },
  colUnit: { width: 62, textAlign: 'right', fontSize: 9 },
  colTotal: { width: 72, textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // Totals
  subtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4, gap: 8 },
  subtotalLabel: { fontSize: 8, color: '#555' },
  subtotalValue: { width: 72, textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#333', marginTop: 12, paddingTop: 6, gap: 8 },
  grandTotalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  grandTotalValue: { width: 80, textAlign: 'right', fontSize: 11, fontFamily: 'Helvetica-Bold' },

  // Notes
  notesBlock: { marginTop: 10, padding: 8, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 3 },
  notesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#555', marginBottom: 3 },
  notesText: { fontSize: 9, color: '#333' },

  // Invoices
  invoiceRow: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },

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

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Planificación', APPROVED: 'Aprobada', COMPLETED: 'Completada',
  CLOSED: 'Cerrada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada',
};
const MANT_LABELS: Record<string, string> = {
  PREVENTIVE: 'Preventivo', CORRECTIVE: 'Correctivo', PREDICTIVE: 'Predictivo',
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente', CRITICAL: 'Crítica',
};

export function WorkOrderFullPDF({ tenant, workOrder, items, invoices }: WorkOrderFullPDFProps) {
  const currency = tenant.currency || 'COP';
  const services = items.filter(i => i.mantItem.type !== 'PART');
  const parts = items.filter(i => i.mantItem.type === 'PART');
  const totalServices = services.reduce((s, i) => s + Number(i.totalCost), 0);
  const totalParts = parts.reduce((s, i) => s + Number(i.totalCost), 0);
  const grandTotal = totalServices + totalParts;
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

        {/* OT title */}
        <Text style={s.otTitle}>{workOrder.title}</Text>
        <Text style={s.otSubtitle}>
          Orden de Trabajo · {STATUS_LABELS[workOrder.status] ?? workOrder.status} · Impreso el {printDate}
        </Text>

        {/* Info grid */}
        <View style={s.infoGrid}>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Vehículo</Text>
            <Text style={s.infoValue}>{workOrder.vehicle.licensePlate} — {workOrder.vehicle.brand.name} {workOrder.vehicle.line.name}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Técnico</Text>
            <Text style={s.infoValue}>{workOrder.technician?.name ?? '—'}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Tipo</Text>
            <Text style={s.infoValue}>{MANT_LABELS[workOrder.mantType] ?? workOrder.mantType}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Prioridad</Text>
            <Text style={s.infoValue}>{PRIORITY_LABELS[workOrder.priority] ?? workOrder.priority}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Fecha inicio</Text>
            <Text style={s.infoValue}>{fmtDate(workOrder.startDate)}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Fecha cierre</Text>
            <Text style={s.infoValue}>{fmtDate(workOrder.endDate)}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Km ingreso</Text>
            <Text style={s.infoValue}>{workOrder.creationMileage?.toLocaleString() ?? '—'} km</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Km egreso</Text>
            <Text style={s.infoValue}>{workOrder.completionMileage != null ? `${workOrder.completionMileage.toLocaleString()} km` : '—'}</Text>
          </View>
          {workOrder.costCenterRef && (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Centro de costos</Text>
              <Text style={s.infoValue}>{workOrder.costCenterRef.name}</Text>
            </View>
          )}
          {workOrder.provider && (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Proveedor principal</Text>
              <Text style={s.infoValue}>{workOrder.provider.name}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {(workOrder.description || workOrder.notes) && (
          <View style={s.notesBlock}>
            <Text style={s.notesLabel}>Observaciones</Text>
            <Text style={s.notesText}>{workOrder.description || workOrder.notes}</Text>
          </View>
        )}

        {/* Services */}
        {services.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Servicios / Mano de Obra ({services.length})</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { width: 18 }]}>#</Text>
              <Text style={[s.tableHeaderText, { flex: 2 }]}>Descripción</Text>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>Proveedor</Text>
              <Text style={[s.tableHeaderText, { width: 30, textAlign: 'right' }]}>Cant.</Text>
              <Text style={[s.tableHeaderText, { width: 62, textAlign: 'right' }]}>P. Unit.</Text>
              <Text style={[s.tableHeaderText, { width: 72, textAlign: 'right' }]}>Total</Text>
            </View>
            {services.map((item, i) => (
              <View key={item.id} style={s.tableRow}>
                <Text style={s.colIdx}>{i + 1}.</Text>
                <Text style={s.colName}>{item.mantItem.name}{item.description ? `\n${item.description}` : ''}</Text>
                <Text style={s.colProvider}>{item.provider?.name ?? '—'}</Text>
                <Text style={s.colQty}>{item.quantity}</Text>
                <Text style={s.colUnit}>{fmt(Number(item.unitPrice), currency)}</Text>
                <Text style={s.colTotal}>{fmt(Number(item.totalCost), currency)}</Text>
              </View>
            ))}
            <View style={s.subtotalRow}>
              <Text style={s.subtotalLabel}>Subtotal servicios:</Text>
              <Text style={s.subtotalValue}>{fmt(totalServices, currency)}</Text>
            </View>
          </View>
        )}

        {/* Parts */}
        {parts.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Repuestos / Materiales ({parts.length})</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { width: 18 }]}>#</Text>
              <Text style={[s.tableHeaderText, { flex: 2 }]}>Descripción</Text>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>Proveedor</Text>
              <Text style={[s.tableHeaderText, { width: 30, textAlign: 'right' }]}>Cant.</Text>
              <Text style={[s.tableHeaderText, { width: 62, textAlign: 'right' }]}>P. Unit.</Text>
              <Text style={[s.tableHeaderText, { width: 72, textAlign: 'right' }]}>Total</Text>
            </View>
            {parts.map((item, i) => (
              <View key={item.id} style={s.tableRow}>
                <Text style={s.colIdx}>{i + 1}.</Text>
                <Text style={s.colName}>{item.mantItem.name}{item.description ? `\n${item.description}` : ''}</Text>
                <Text style={s.colProvider}>{item.provider?.name ?? '—'}</Text>
                <Text style={s.colQty}>{item.quantity}</Text>
                <Text style={s.colUnit}>{fmt(Number(item.unitPrice), currency)}</Text>
                <Text style={s.colTotal}>{fmt(Number(item.totalCost), currency)}</Text>
              </View>
            ))}
            <View style={s.subtotalRow}>
              <Text style={s.subtotalLabel}>Subtotal repuestos:</Text>
              <Text style={s.subtotalValue}>{fmt(totalParts, currency)}</Text>
            </View>
          </View>
        )}

        {/* Grand total */}
        {grandTotal > 0 && (
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>TOTAL:</Text>
            <Text style={s.grandTotalValue}>{fmt(grandTotal, currency)}</Text>
          </View>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Facturas Vinculadas ({invoices.length})</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>N° Factura</Text>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>Proveedor</Text>
              <Text style={[s.tableHeaderText, { width: 60 }]}>Fecha</Text>
              <Text style={[s.tableHeaderText, { width: 80, textAlign: 'right' }]}>Monto</Text>
            </View>
            {invoices.map((inv, i) => (
              <View key={i} style={s.invoiceRow}>
                <Text style={[s.colName, { flex: 1 }]}>{inv.invoiceNumber}</Text>
                <Text style={[s.colName, { flex: 1 }]}>{inv.supplier?.name ?? '—'}</Text>
                <Text style={{ width: 60, fontSize: 9 }}>{fmtDate(inv.invoiceDate)}</Text>
                <Text style={{ width: 80, textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
                  {fmt(Number(inv.totalAmount), currency)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footer}>
          {tenant.name} · Impreso el {printDate} · Fleet Care
        </Text>
      </Page>
    </Document>
  );
}
