import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 3 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 140, color: '#555' },
  value: { flex: 1, fontWeight: 'bold' },
  table: { marginTop: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', padding: '6 4', fontWeight: 'bold', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ddd' },
  tableRow: { flexDirection: 'row', padding: '5 4', borderBottomWidth: 1, borderBottomColor: '#eee' },
  col1: { flex: 2 },
  col2: { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', padding: '6 4', backgroundColor: '#f8f8f8', fontWeight: 'bold', borderTopWidth: 1, borderTopColor: '#999' },
  footer: { marginTop: 30, fontSize: 8, color: '#aaa', textAlign: 'center' },
});

type CostBreakdown = {
  maintenance: number;
  purchases: number;
  fuel: number;
  total: number;
};

type VehicleCostsPDFProps = {
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleYear: number;
  from: string;
  to: string;
  costs: CostBreakdown;
};

function formatCOP(amount: number): string {
  return `$ ${amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function VehicleCostsPDF({ vehiclePlate, vehicleBrand, vehicleYear, from, to, costs }: VehicleCostsPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte de Costos por Vehículo</Text>
        <Text style={styles.subtitle}>Período: {from} — {to}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Vehículo</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Placa:</Text>
            <Text style={styles.value}>{vehiclePlate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Marca / Línea:</Text>
            <Text style={styles.value}>{vehicleBrand}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Año:</Text>
            <Text style={styles.value}>{vehicleYear}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desglose de Costos</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Categoría</Text>
              <Text style={styles.col2}>Monto (COP)</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.col1}>Mantenimiento (Órdenes de Trabajo)</Text>
              <Text style={styles.col2}>{formatCOP(costs.maintenance)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.col1}>Compras / Facturas</Text>
              <Text style={styles.col2}>{formatCOP(costs.purchases)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.col1}>Combustible</Text>
              <Text style={styles.col2}>{formatCOP(costs.fuel)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.col1}>TOTAL</Text>
              <Text style={styles.col2}>{formatCOP(costs.total)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>Generado por Fleet Care SaaS — {new Date().toLocaleDateString('es-CO')}</Text>
      </Page>
    </Document>
  );
}
