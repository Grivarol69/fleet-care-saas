export interface SerializedSlotData {
  position: string;
  serializedItemId: string;
  serialNumber: string;
  description?: string;
  type: string;
  specs: { usefulLifePct?: number | null; treadDepthMm?: number | null } | null;
  accumulatedKm?: number | null;
  activeAlertCount: number;
}

export interface AxleDiagramProps {
  axleConfig: string;
  slots: SerializedSlotData[];
  onSlotClick?: (position: string, data: SerializedSlotData | null) => void;
  className?: string;
}
