import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ExpenseReportPDFProps } from './ExpenseReportPDF.types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555', marginBottom: 4 },
  filters: { fontSize: 9, color: '#777', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 3,
  },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: '6 4',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '5 4',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  totalRow: {
    flexDirection: 'row',
    padding: '6 4',
    backgroundColor: '#f8f8f8',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#999',
  },
  // Summary table columns
  colLabel: { flex: 3 },
  colCount: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 2, textAlign: 'right' },
  // Line detail table columns
  lineDate: { width: 55 },
  lineInvoice: { width: 60 },
  lineProvider: { flex: 2 },
  lineVehicle: { flex: 2 },
  lineCategory: { flex: 2 },
  lineDesc: { flex: 3 },
  lineQty: { width: 30, textAlign: 'right' },
  lineUnit: { width: 60, textAlign: 'right' },
  lineTotal: { width: 65, textAlign: 'right' },
  emptyState: { padding: '10 4', color: '#999', fontStyle: 'italic' },
  footer: { marginTop: 30, fontSize: 8, color: '#aaa', textAlign: 'center' },
});

function formatCOP(amount: number): string {
  return `$ ${amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function ExpenseReportPDF(props: ExpenseReportPDFProps) {
  const { filters, summary, lines } = props;
  const generatedDate = new Date().toLocaleDateString('es-CO');

  const showByCategory = filters.category === null;
  const showByVehicle = filters.vehicle === null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.title}>Reporte de Gastos de Flota</Text>
        <Text style={styles.subtitle}>
          Período: {filters.from} — {filters.to}
        </Text>
        <Text style={styles.filters}>
          Vehículo: {filters.vehicle ? filters.vehicle.label : 'Todos'} |
          Categoría: {filters.category ? filters.category.label : 'Todas'} |
          Generado: {generatedDate}
        </Text>

        {/* Totals strip */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.colLabel}>TOTAL GENERAL</Text>
            <Text style={styles.colCount}>{summary.grandCount} ítems</Text>
            <Text style={styles.colTotal}>{formatCOP(summary.grandTotal)}</Text>
          </View>
        </View>

        {/* Summary by Category */}
        {showByCategory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen por Categoría</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader} fixed>
                <Text style={styles.colLabel}>Categoría</Text>
                <Text style={styles.colCount}>#</Text>
                <Text style={styles.colTotal}>Total</Text>
              </View>
              {summary.byCategory.length === 0 ? (
                <View style={styles.tableRow}>
                  <Text style={styles.emptyState}>Sin datos</Text>
                </View>
              ) : (
                summary.byCategory.map(cat => (
                  <View key={cat.key} style={styles.tableRow} wrap={false}>
                    <Text style={styles.colLabel}>{cat.label}</Text>
                    <Text style={styles.colCount}>{cat.count}</Text>
                    <Text style={styles.colTotal}>{formatCOP(cat.total)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Summary by Vehicle */}
        {showByVehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen por Vehículo</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader} fixed>
                <Text style={styles.colLabel}>Vehículo</Text>
                <Text style={styles.colCount}>#</Text>
                <Text style={styles.colTotal}>Total</Text>
              </View>
              {summary.byVehicle.length === 0 ? (
                <View style={styles.tableRow}>
                  <Text style={styles.emptyState}>Sin datos</Text>
                </View>
              ) : (
                summary.byVehicle.map(veh => (
                  <View key={veh.key} style={styles.tableRow} wrap={false}>
                    <Text style={styles.colLabel}>{veh.label}</Text>
                    <Text style={styles.colCount}>{veh.count}</Text>
                    <Text style={styles.colTotal}>{formatCOP(veh.total)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Line Detail */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de Líneas</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={styles.lineDate}>Fecha</Text>
              <Text style={styles.lineInvoice}>Factura</Text>
              <Text style={styles.lineProvider}>Proveedor</Text>
              <Text style={styles.lineVehicle}>Vehículo</Text>
              <Text style={styles.lineCategory}>Categoría</Text>
              <Text style={styles.lineDesc}>Descripción</Text>
              <Text style={styles.lineQty}>Cant</Text>
              <Text style={styles.lineTotal}>Total</Text>
            </View>
            {lines.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={styles.emptyState}>Sin resultados</Text>
              </View>
            ) : (
              lines.map(line => (
                <View key={line.id} style={styles.tableRow} wrap={false}>
                  <Text style={styles.lineDate}>
                    {formatDate(line.invoiceDate)}
                  </Text>
                  <Text style={styles.lineInvoice}>{line.invoiceNumber}</Text>
                  <Text style={styles.lineProvider}>{line.providerName}</Text>
                  <Text style={styles.lineVehicle}>{line.vehicleLabel}</Text>
                  <Text style={styles.lineCategory}>{line.categoryLabel}</Text>
                  <Text style={styles.lineDesc}>{line.description}</Text>
                  <Text style={styles.lineQty}>{line.quantity}</Text>
                  <Text style={styles.lineTotal}>{formatCOP(line.total)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Footer */}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Generado por Fleet Care SaaS — ${generatedDate} | Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
