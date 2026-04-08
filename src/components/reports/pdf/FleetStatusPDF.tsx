import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555', marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 3 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', padding: '5 3', fontWeight: 'bold', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ddd', fontSize: 8 },
  tableRow: { flexDirection: 'row', padding: '4 3', borderBottomWidth: 1, borderBottomColor: '#eee' },
  staleRow: { flexDirection: 'row', padding: '4 3', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff8f0' },
  colPlate: { width: 70 },
  colBrand: { flex: 1 },
  colOdometer: { width: 70, textAlign: 'right' },
  colLastWO: { width: 80, textAlign: 'center' },
  colNextMaint: { width: 100 },
  colStatus: { width: 45, textAlign: 'center' },
  staleTag: { color: '#c55', fontSize: 7, fontWeight: 'bold' },
  okTag: { color: '#2a2', fontSize: 7 },
  legend: { marginTop: 12, fontSize: 8, color: '#888' },
  footer: { marginTop: 20, fontSize: 8, color: '#aaa', textAlign: 'center' },
});

type FleetVehicle = {
  plate: string;
  brand: string;
  odometer: number | null;
  lastWorkOrderDate: string | null;
  nextMaintenanceDesc: string | null;
  nextMaintenanceKm: number | null;
  stale: boolean;
};

type FleetStatusPDFProps = {
  vehicles: FleetVehicle[];
  generatedAt: string;
};

export function FleetStatusPDF({ vehicles, generatedAt }: FleetStatusPDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Estado de Flota</Text>
        <Text style={styles.subtitle}>Generado: {generatedAt}</Text>

        <Text style={styles.sectionTitle}>Vehículos ({vehicles.length})</Text>

        <View style={styles.tableHeader}>
          <Text style={styles.colPlate}>Placa</Text>
          <Text style={styles.colBrand}>Marca / Línea</Text>
          <Text style={styles.colOdometer}>Odómetro</Text>
          <Text style={styles.colLastWO}>Última OT</Text>
          <Text style={styles.colNextMaint}>Próx. Mantenimiento</Text>
          <Text style={styles.colStatus}>Estado</Text>
        </View>

        {vehicles.map((v, i) => (
          <View key={i} style={v.stale ? styles.staleRow : styles.tableRow}>
            <Text style={styles.colPlate}>{v.plate}</Text>
            <Text style={styles.colBrand}>{v.brand}</Text>
            <Text style={styles.colOdometer}>{v.odometer != null ? `${v.odometer.toLocaleString()} km` : '—'}</Text>
            <Text style={styles.colLastWO}>{v.lastWorkOrderDate ?? '—'}</Text>
            <Text style={styles.colNextMaint}>
              {v.nextMaintenanceDesc
                ? `${v.nextMaintenanceDesc}${v.nextMaintenanceKm ? ` (${v.nextMaintenanceKm.toLocaleString()} km)` : ''}`
                : '—'}
            </Text>
            <Text style={[styles.colStatus, v.stale ? styles.staleTag : styles.okTag]}>
              {v.stale ? 'SIN REG.' : 'OK'}
            </Text>
          </View>
        ))}

        <Text style={styles.legend}>* SIN REG. = sin registro de odómetro en los últimos 30 días</Text>
        <Text style={styles.footer}>Generado por Fleet Care SaaS — {generatedAt}</Text>
      </Page>
    </Document>
  );
}
