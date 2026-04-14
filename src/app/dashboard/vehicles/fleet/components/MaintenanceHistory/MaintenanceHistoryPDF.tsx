import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: '/fonts/Helvetica.ttf' },
    { src: '/fonts/Helvetica-Bold.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#CC0000',
    paddingBottom: 10,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 10, color: '#666666', marginTop: 4 },
  headerRight: { alignItems: 'flex-end' },
  headerDate: { fontSize: 8 },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 4,
    border: '1px solid #E5E5E5',
    justifyContent: 'space-between',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 8, color: '#6B7280', fontWeight: 'bold' },
  summaryValue: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  woContainer: { marginBottom: 15, border: '1px solid #E5E5E5' },
  woHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderBottom: '1px solid #E5E5E5',
    alignItems: 'center',
  },
  woColDate: { width: '15%', fontSize: 8, fontWeight: 'bold' },
  woColKm: { width: '15%', fontSize: 8, textAlign: 'center' },
  woColType: { width: '15%', fontSize: 8, textAlign: 'center' },
  woColTitle: { width: '30%', fontSize: 8 },
  woColProvider: { width: '15%', fontSize: 8 },
  woColTotal: {
    width: '10%',
    fontSize: 8,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  woBody: { padding: 0 },
  itemHeaderTable: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderBottom: '1px dotted #D1D5DB',
  },
  itemRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #F3F4F6',
    padding: 6,
    backgroundColor: '#FAFAFA',
  },
  itemColDesc: { width: '35%', fontSize: 7 },
  itemColPart: { width: '20%', fontSize: 7 },
  itemColBrand: { width: '15%', fontSize: 7 },
  itemColProvider: { width: '20%', fontSize: 7 },
  itemColCost: { width: '10%', fontSize: 7, textAlign: 'right' },
  badgeContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    alignSelf: 'center',
  },
  badgeText: { fontSize: 6, fontWeight: 'bold' },
  badgePreventive: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  badgePredictive: { backgroundColor: '#F3E8FF', color: '#7E22CE' },
  badgeCorrective: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
  badgeEmergency: { backgroundColor: '#FFEDD5', color: '#C2410C' },
  badgeDefault: { backgroundColor: '#F3F4F6', color: '#374151' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: 'grey',
    fontSize: 8,
    borderTop: '1px solid #E5E5E5',
    paddingTop: 10,
  },
});

interface MaintenanceHistoryPDFProps {
  vehicle: {
    licensePlate: string;
    mileage: number;
    brand?: { name: string };
    line?: { name: string };
  };
  workOrders: any[];
}

export const OBJ_MANT_TYPE_BADGE_STYLE = {
  PREVENTIVE: styles.badgePreventive,
  PREDICTIVE: styles.badgePredictive,
  CORRECTIVE: styles.badgeCorrective,
  EMERGENCY: styles.badgeEmergency,
} as const;

export const OBJ_MANT_TYPE_LABEL = {
  PREVENTIVE: 'Preventivo',
  PREDICTIVE: 'Predictivo',
  CORRECTIVE: 'Correctivo',
  EMERGENCY: 'Emergencia',
} as const;

export const MaintenanceHistoryPDF: React.FC<MaintenanceHistoryPDFProps> = ({
  vehicle,
  workOrders,
}) => {
  const today = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const totalCost = workOrders.reduce(
    (sum, wo) => sum + (Number(wo.actualCost) || 0),
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
              Historial de Mantenimiento - {vehicle.licensePlate}
            </Text>
            <Text style={styles.headerSubtitle}>
              {vehicle.brand?.name || 'Marca N/A'} -{' '}
              {vehicle.line?.name || 'Línea N/A'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDate}>Generado: {today}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Intervenciones</Text>
            <Text style={styles.summaryValue}>{workOrders.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Gastos Totales</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalCost)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Odómetro Actual</Text>
            <Text style={styles.summaryValue}>
              {vehicle.mileage.toLocaleString('es-CO')} km
            </Text>
          </View>
        </View>

        {workOrders.map((wo, idx) => {
          const badgeStyle =
            OBJ_MANT_TYPE_BADGE_STYLE[
              wo.mantType as keyof typeof OBJ_MANT_TYPE_BADGE_STYLE
            ] || styles.badgeDefault;
          const mantTypeLabel =
            OBJ_MANT_TYPE_LABEL[
              wo.mantType as keyof typeof OBJ_MANT_TYPE_LABEL
            ] || wo.mantType;
          const woTitle = wo.isPackageWork ? wo.packageName : wo.title;

          return (
            <View key={wo.id || idx} style={styles.woContainer} wrap={false}>
              <View style={styles.woHeaderRow}>
                <Text style={styles.woColDate}>{formatDate(wo.endDate)}</Text>
                <Text style={styles.woColKm}>
                  {wo.completionMileage?.toLocaleString('es-CO') || '--'} km
                </Text>
                <View
                  style={[styles.woColType, styles.badgeContainer, badgeStyle]}
                >
                  <Text style={styles.badgeText}>{mantTypeLabel}</Text>
                </View>
                <Text style={styles.woColTitle}>{woTitle}</Text>
                <Text style={styles.woColProvider}>
                  {wo.provider?.name || 'Interno / No asignado'}
                </Text>
                <Text style={styles.woColTotal}>
                  {formatCurrency(Number(wo.actualCost) || 0)}
                </Text>
              </View>

              {wo.workOrderItems && wo.workOrderItems.length > 0 && (
                <View style={styles.woBody}>
                  <View style={styles.itemHeaderTable}>
                    <Text
                      style={[
                        styles.itemColDesc,
                        { fontWeight: 'bold', color: '#6B7280' },
                      ]}
                    >
                      Descripción
                    </Text>
                    <Text
                      style={[
                        styles.itemColPart,
                        { fontWeight: 'bold', color: '#6B7280' },
                      ]}
                    >
                      Nº Parte
                    </Text>
                    <Text
                      style={[
                        styles.itemColBrand,
                        { fontWeight: 'bold', color: '#6B7280' },
                      ]}
                    >
                      Marca
                    </Text>
                    <Text
                      style={[
                        styles.itemColProvider,
                        { fontWeight: 'bold', color: '#6B7280' },
                      ]}
                    >
                      Proveedor
                    </Text>
                    <Text
                      style={[
                        styles.itemColCost,
                        { fontWeight: 'bold', color: '#6B7280' },
                      ]}
                    >
                      Costo
                    </Text>
                  </View>
                  {wo.workOrderItems.map((item: any, iIdx: number) => (
                    <View key={item.id || iIdx} style={styles.itemRow}>
                      <Text style={styles.itemColDesc}>
                        {item.description || item.mantItem?.name || '--'}
                      </Text>
                      <Text style={styles.itemColPart}>
                        {item.partNumber || item.masterPart?.code || '--'}
                      </Text>
                      <Text style={styles.itemColBrand}>
                        {item.brand || '--'}
                      </Text>
                      <Text style={styles.itemColProvider}>
                        {item.provider?.name || item.supplier || '--'}
                      </Text>
                      <Text style={styles.itemColCost}>
                        {formatCurrency(Number(item.totalCost) || 0)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
