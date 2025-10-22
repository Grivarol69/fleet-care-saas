"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PDFImage,
  Font,
} from "@react-pdf/renderer";

// Registrar fuentes (opcional, usando Helvetica por defecto)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "/fonts/Helvetica.ttf" },
    { src: "/fonts/Helvetica-Bold.ttf", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: "#CC0000",
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 60,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerCode: {
    fontSize: 8,
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 8,
    marginBottom: 2,
  },
  headerVersion: {
    fontSize: 8,
  },

  // Sección de identificación principal
  mainInfoRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  redCell: {
    backgroundColor: "#CC0000",
    color: "#FFFFFF",
    padding: 5,
    fontWeight: "bold",
    fontSize: 9,
    textAlign: "center",
  },
  whiteCell: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #000000",
    padding: 5,
    fontSize: 9,
    textAlign: "center",
  },
  plateCell: {
    width: "15%",
  },
  ownerCell: {
    width: "20%",
  },
  ownerValueCell: {
    width: "35%",
  },
  cellularCell: {
    width: "15%",
  },
  cellularValueCell: {
    width: "15%",
  },

  // Foto del vehículo
  vehiclePhoto: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    marginBottom: 10,
    border: "1px solid #000000",
  },
  noPhoto: {
    width: "100%",
    height: 200,
    backgroundColor: "#F0F0F0",
    marginBottom: 10,
    border: "1px solid #000000",
    justifyContent: "center",
    alignItems: "center",
  },
  noPhotoText: {
    fontSize: 12,
    color: "#999999",
  },

  // Sección de datos del vehículo
  sectionTitle: {
    backgroundColor: "#CC0000",
    color: "#FFFFFF",
    padding: 5,
    fontWeight: "bold",
    fontSize: 10,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 5,
  },
  dataRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#CCCCCC",
  },
  dataLabel: {
    width: "20%",
    backgroundColor: "#F5F5F5",
    padding: 5,
    fontWeight: "bold",
    borderRight: 1,
    borderRightColor: "#CCCCCC",
  },
  dataValue: {
    width: "30%",
    padding: 5,
    borderRight: 1,
    borderRightColor: "#CCCCCC",
  },

  // Documentos legales
  docsRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#CCCCCC",
  },
  docLabel: {
    width: "15%",
    backgroundColor: "#F5F5F5",
    padding: 5,
    fontWeight: "bold",
    fontSize: 8,
    textAlign: "center",
    borderRight: 1,
    borderRightColor: "#CCCCCC",
  },
  docValue: {
    width: "20%",
    padding: 5,
    fontSize: 8,
    textAlign: "center",
    borderRight: 1,
    borderRightColor: "#CCCCCC",
  },
  docSmallLabel: {
    width: "10%",
    backgroundColor: "#F5F5F5",
    padding: 5,
    fontWeight: "bold",
    fontSize: 8,
    textAlign: "center",
    borderRight: 1,
    borderRightColor: "#CCCCCC",
  },
  docSmallValue: {
    width: "15%",
    padding: 5,
    fontSize: 8,
    textAlign: "center",
    borderRight: 1,
    borderRightColor: "#CCCCCC",
  },

  // Contacto de emergencia
  emergencyText: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#FFF9E6",
    border: "1px solid #FFD700",
    fontSize: 9,
  },
});

interface VehicleCVProps {
  vehicle: {
    licensePlate: string;
    brand?: { name: string };
    line?: { name: string };
    type?: { name: string };
    year: number;
    color: string;
    cylinder?: number;
    bodyWork?: string;
    engineNumber?: string;
    chasisNumber?: string;
    ownerCard?: string;
    fuelType?: string;
    serviceType?: string;
    photo?: string;
    mileage: number;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  tenant?: {
    name: string;
    logo?: string;
  };
  documents?: Array<{
    type: string;
    documentNumber?: string;
    expiryDate?: string;
    entity?: string;
  }>;
}

export const VehicleCV: React.FC<VehicleCVProps> = ({ vehicle, tenant, documents = [] }) => {
  const today = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Buscar documentos específicos
  const soat = documents.find((d) => d.type === "SOAT");
  const technicalReview = documents.find((d) => d.type === "TECNOMECANICA");
  const insurance = documents.find((d) => d.type === "INSURANCE");

  const formatDate = (date?: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {tenant?.logo ? (
            <View style={styles.headerLeft}>
              <PDFImage src={tenant.logo} style={styles.logo} />
            </View>
          ) : (
            <View style={styles.headerLeft} />
          )}
          <Text style={styles.headerTitle}>HOJA DE VIDA DE VEHICULO Y MAQUINARIA</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerCode}>OP-FO-01</Text>
            <Text style={styles.headerDate}>{today}</Text>
            <Text style={styles.headerVersion}>Versión 3</Text>
          </View>
        </View>

        {/* Información principal */}
        <View style={styles.mainInfoRow}>
          <View style={[styles.redCell, styles.plateCell]}>
            <Text>PLACA</Text>
          </View>
          <View style={[styles.whiteCell, styles.plateCell]}>
            <Text>{vehicle.licensePlate}</Text>
          </View>

          <View style={[styles.redCell, styles.ownerCell]}>
            <Text>PROPIETARIO</Text>
          </View>
          <View style={[styles.whiteCell, styles.ownerValueCell]}>
            <Text>{tenant?.name || "N/A"}</Text>
          </View>

          <View style={[styles.redCell, styles.cellularCell]}>
            <Text>CELULAR</Text>
          </View>
          <View style={[styles.whiteCell, styles.cellularValueCell]}>
            <Text>{vehicle.emergencyContactPhone || "N/A"}</Text>
          </View>
        </View>

        {/* Foto del vehículo */}
        {vehicle.photo ? (
          <PDFImage src={vehicle.photo} style={styles.vehiclePhoto} />
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>Sin imagen disponible</Text>
          </View>
        )}

        {/* DATOS VEHICULO */}
        <Text style={styles.sectionTitle}>DATOS VEHICULO</Text>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Marca</Text>
          <Text style={styles.dataValue}>{vehicle.brand?.name || "N/A"}</Text>
          <Text style={styles.dataLabel}>Cilindraje</Text>
          <Text style={styles.dataValue}>{vehicle.cylinder || "N/A"}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Línea</Text>
          <Text style={styles.dataValue}>{vehicle.line?.name || "N/A"}</Text>
          <Text style={styles.dataLabel}>Combustible</Text>
          <Text style={styles.dataValue}>{vehicle.fuelType || "N/A"}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Clase de vehículo</Text>
          <Text style={styles.dataValue}>{vehicle.type?.name || "N/A"}</Text>
          <Text style={styles.dataLabel}>Servicio</Text>
          <Text style={styles.dataValue}>{vehicle.serviceType || "N/A"}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Color</Text>
          <Text style={styles.dataValue}>{vehicle.color}</Text>
          <Text style={styles.dataLabel}>Nº Chasis</Text>
          <Text style={styles.dataValue}>{vehicle.chasisNumber || "N/A"}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Modelo</Text>
          <Text style={styles.dataValue}>{vehicle.year}</Text>
          <Text style={styles.dataLabel}>Carrocería</Text>
          <Text style={styles.dataValue}>{vehicle.bodyWork || "N/A"}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Kilometraje</Text>
          <Text style={styles.dataValue}>{vehicle.mileage.toLocaleString()} km</Text>
          <Text style={styles.dataLabel}>Nº Motor</Text>
          <Text style={styles.dataValue}>{vehicle.engineNumber || "N/A"}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}></Text>
          <Text style={styles.dataValue}></Text>
          <Text style={styles.dataLabel}>Nº Tarjeta de propiedad</Text>
          <Text style={styles.dataValue}>{vehicle.ownerCard || "N/A"}</Text>
        </View>

        {/* DOCUMENTOS LEGALES */}
        <Text style={styles.sectionTitle}>DOCUMENTOS LEGALES</Text>

        <View style={styles.docsRow}>
          <Text style={styles.docLabel}>Nº SOAT</Text>
          <Text style={styles.docValue}>{soat?.documentNumber || "N/A"}</Text>
          <Text style={styles.docSmallLabel}>Vence:</Text>
          <Text style={styles.docSmallValue}>{formatDate(soat?.expiryDate)}</Text>
          <Text style={styles.docSmallLabel}>Estado:</Text>
          <Text style={styles.docSmallValue}>{soat?.entity || "N/A"}</Text>
        </View>

        <View style={styles.docsRow}>
          <Text style={styles.docLabel}>Nº TECNOMECÁNICA</Text>
          <Text style={styles.docValue}>{technicalReview?.documentNumber || "N/A"}</Text>
          <Text style={styles.docSmallLabel}>Vence:</Text>
          <Text style={styles.docSmallValue}>{formatDate(technicalReview?.expiryDate)}</Text>
          <Text style={styles.docSmallLabel}>Estado:</Text>
          <Text style={styles.docSmallValue}>{technicalReview?.entity || "N/A"}</Text>
        </View>

        <View style={styles.docsRow}>
          <Text style={styles.docLabel}>Nº POLIZA</Text>
          <Text style={styles.docValue}>{insurance?.documentNumber || "N/A"}</Text>
          <Text style={styles.docSmallLabel}>Vence:</Text>
          <Text style={styles.docSmallValue}>{formatDate(insurance?.expiryDate)}</Text>
          <Text style={styles.docSmallLabel}>Entidad:</Text>
          <Text style={styles.docSmallValue}>{insurance?.entity || "N/A"}</Text>
        </View>

        {/* Contacto de emergencia */}
        {(vehicle.emergencyContactName || vehicle.emergencyContactPhone) && (
          <View style={styles.emergencyText}>
            <Text>
              Número de contacto en caso de emergencia:{" "}
              {vehicle.emergencyContactPhone || "N/A"}
              {vehicle.emergencyContactName && ` - ${vehicle.emergencyContactName}`}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};
