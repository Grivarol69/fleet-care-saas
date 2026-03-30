export interface SerializedItemAlertRow {
  id: string;
  alertType: string;
  message: string;
  createdAt: string;
  serializedItem: { id: string; serialNumber: string; type: string };
  vehicle: { id: string; licensePlate: string } | null;
}

export interface ItemAlertsWidgetProps {
  alerts: SerializedItemAlertRow[];
  onResolve: (alertId: string) => void;
}
