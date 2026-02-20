import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface POItem {
  description: string;
  masterPartCode?: string | null;
  masterPartDescription?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PurchaseOrderPDFProps {
  orderNumber: string;
  orderDate: string;
  orderType: 'SERVICES' | 'PARTS';
  status: string;
  tenant: { name: string };
  provider: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  workOrder?: {
    id: number;
    title: string;
    vehicle?: {
      licensePlate: string;
      brand?: string;
      line?: string;
      year?: number;
    };
  };
  items: POItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottom: '2px solid #CC0000',
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#CC0000',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  orderNumber: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  orderDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f0f0f0',
    padding: '6 8',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 120,
    fontFamily: 'Helvetica-Bold',
    color: '#555',
  },
  value: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#CC0000',
    color: '#fff',
    padding: '6 4',
    marginTop: 8,
  },
  tableHeaderText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #eee',
    padding: '6 4',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #eee',
    padding: '6 4',
    backgroundColor: '#fafafa',
  },
  colDesc: { flex: 3, paddingRight: 4 },
  colCode: { width: 80, paddingRight: 4 },
  colQty: { width: 50, textAlign: 'right', paddingRight: 4 },
  colPrice: { width: 70, textAlign: 'right', paddingRight: 4 },
  colTotal: { width: 70, textAlign: 'right' },
  totalsSection: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#555',
  },
  grandTotal: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    borderTop: '2px solid #CC0000',
    paddingTop: 4,
    marginTop: 4,
  },
  grandTotalText: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#CC0000',
  },
  notesSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fffde7',
    borderRadius: 4,
  },
  notesTitle: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTop: '1px solid #eee',
    paddingTop: 8,
  },
});

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);

export function PurchaseOrderPDF({
  orderNumber,
  orderDate,
  orderType,
  tenant,
  provider,
  workOrder,
  items,
  subtotal,
  taxRate,
  taxAmount,
  total,
  notes,
  approvedBy,
  approvedAt,
}: PurchaseOrderPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>ORDEN DE COMPRA</Text>
            <Text style={styles.subtitle}>
              {orderType === 'PARTS' ? 'Repuestos' : 'Servicios'} -{' '}
              {tenant.name}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.orderNumber}>{orderNumber}</Text>
            <Text style={styles.orderDate}>Fecha: {orderDate}</Text>
            {approvedBy && (
              <Text style={styles.orderDate}>Aprobada: {approvedAt || ''}</Text>
            )}
          </View>
        </View>

        {/* Proveedor */}
        <Text style={styles.sectionTitle}>PROVEEDOR</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre:</Text>
          <Text style={styles.value}>{provider.name}</Text>
        </View>
        {provider.email && (
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{provider.email}</Text>
          </View>
        )}
        {provider.phone && (
          <View style={styles.row}>
            <Text style={styles.label}>Telefono:</Text>
            <Text style={styles.value}>{provider.phone}</Text>
          </View>
        )}
        {provider.address && (
          <View style={styles.row}>
            <Text style={styles.label}>Direccion:</Text>
            <Text style={styles.value}>{provider.address}</Text>
          </View>
        )}

        {/* Referencia OT + Vehículo */}
        {workOrder && (
          <>
            <Text style={styles.sectionTitle}>REFERENCIA</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Orden de Trabajo:</Text>
              <Text style={styles.value}>
                OT-{workOrder.id} - {workOrder.title}
              </Text>
            </View>
            {workOrder.vehicle && (
              <View style={styles.row}>
                <Text style={styles.label}>Vehiculo:</Text>
                <Text style={styles.value}>
                  {workOrder.vehicle.licensePlate}
                  {workOrder.vehicle.brand && ` - ${workOrder.vehicle.brand}`}
                  {workOrder.vehicle.line && ` ${workOrder.vehicle.line}`}
                  {workOrder.vehicle.year && ` (${workOrder.vehicle.year})`}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Tabla de Items */}
        <Text style={styles.sectionTitle}>DETALLE DE ITEMS</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>
            Descripcion
          </Text>
          <Text style={[styles.tableHeaderText, styles.colCode]}>Codigo</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Cant.</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>
            P. Unit.
          </Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
        </View>

        {items.map((item, index) => (
          <View
            key={index}
            style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            <Text style={styles.colDesc}>
              {item.description}
              {item.masterPartDescription &&
              item.masterPartDescription !== item.description
                ? ` (${item.masterPartDescription})`
                : ''}
            </Text>
            <Text style={styles.colCode}>{item.masterPartCode || '-'}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>
              {formatCurrency(item.unitPrice)}
            </Text>
            <Text style={styles.colTotal}>{formatCurrency(item.total)}</Text>
          </View>
        ))}

        {/* Totales */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text>{formatCurrency(subtotal)}</Text>
          </View>
          {taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA ({Number(taxRate)}%):</Text>
              <Text>{formatCurrency(taxAmount)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalText}>TOTAL:</Text>
            <Text style={styles.grandTotalText}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Notas */}
        {notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notas:</Text>
            <Text>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Documento generado automaticamente por {tenant.name} via FleetCare |{' '}
          {orderNumber} | {orderDate}
        </Text>
      </Page>
    </Document>
  );
}
