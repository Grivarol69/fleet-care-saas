export const SERIALIZED_ITEM_TYPES = {
  TIRE: 'TIRE',
  EXTINGUISHER: 'EXTINGUISHER',
  OTHER: 'OTHER',
} as const;
export type SerializedItemType =
  (typeof SERIALIZED_ITEM_TYPES)[keyof typeof SERIALIZED_ITEM_TYPES];

export const SERIALIZED_ITEM_STATUSES = {
  IN_STOCK: 'IN_STOCK',
  INSTALLED: 'INSTALLED',
  RETIRED: 'RETIRED',
} as const;
export type SerializedItemStatus =
  (typeof SERIALIZED_ITEM_STATUSES)[keyof typeof SERIALIZED_ITEM_STATUSES];

export const SERIALIZED_ITEM_STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'En Stock',
  INSTALLED: 'Instalado',
  RETIRED: 'Dado de baja',
};

export const SERIALIZED_ITEM_EVENT_TYPES = {
  ALTA: 'ALTA',
  REVISION: 'REVISION',
  ROTACION: 'ROTACION',
  BAJA: 'BAJA',
  INSPECCION: 'INSPECCION',
  RECARGA: 'RECARGA',
} as const;
export type SerializedItemEventType =
  (typeof SERIALIZED_ITEM_EVENT_TYPES)[keyof typeof SERIALIZED_ITEM_EVENT_TYPES];

export const ALLOWED_EVENT_TYPES: readonly string[] = Object.values(
  SERIALIZED_ITEM_EVENT_TYPES
);

export const SERIALIZED_ITEM_EVENT_TYPE_LABELS: Record<string, string> = {
  ALTA: 'Alta',
  REVISION: 'Revisión',
  ROTACION: 'Rotación',
  BAJA: 'Baja',
  INSPECCION: 'Inspección',
  RECARGA: 'Recarga',
};

export const SERIALIZED_ITEM_ALERT_TYPES = {
  LOW_TREAD: 'LOW_TREAD',
  LOW_USEFUL_LIFE: 'LOW_USEFUL_LIFE',
  INSPECTION_DUE: 'INSPECTION_DUE',
  RECHARGE_DUE: 'RECHARGE_DUE',
} as const;

export const TIRE_USEFUL_LIFE_ALERT_THRESHOLD = 30;
export const TIRE_TREAD_DEPTH_MIN_MM = 4;
export const EXTINGUISHER_INSPECTION_WARNING_DAYS = 30;

export const AXLE_CONFIG_LABELS: Record<string, string> = {
  STANDARD_4: 'Estándar (4)',
  PACHA_6: 'Pacha (6)',
  TRUCK_10: 'Camión (10)',
  TRUCK_14: 'Camión (14)',
  SEMI_18: 'Semi (18)',
  VAN: 'Van',
};

export const AXLE_CONFIG_POSITIONS: Record<string, string[]> = {
  STANDARD_4: ['FL', 'FR', 'RL', 'RR'],
  PACHA_6: ['FL', 'FR', 'ML', 'MR', 'RL', 'RR'],
  TRUCK_10: ['FL', 'FR', 'ML', 'ML2', 'MR', 'MR2', 'RL', 'RL2', 'RR', 'RR2'],
  TRUCK_14: [
    'FL',
    'FR',
    'ML',
    'ML2',
    'MR',
    'MR2',
    'RL',
    'RL2',
    'RR',
    'RR2',
    'FL2',
    'FR2',
    'FL3',
    'FR3',
  ],
  SEMI_18: [
    'FL',
    'FR',
    'ML',
    'ML2',
    'MR',
    'MR2',
    'RL',
    'RL2',
    'RR',
    'RR2',
    'FL2',
    'FR2',
    'FL3',
    'FR3',
    'RL3',
    'RR3',
    'SPARE',
  ],
  VAN: ['FL', 'FR', 'RL', 'RR', 'SPARE'],
};

export const TIRE_POSITION_LABELS: Record<string, string> = {
  FL: 'Del. Izq.',
  FR: 'Del. Der.',
  RL: 'Tras. Izq.',
  RR: 'Tras. Der.',
  ML: 'Med. Izq.',
  MR: 'Med. Der.',
  FL2: 'Del. Izq. 2',
  FR2: 'Del. Der. 2',
  RL2: 'Tras. Izq. 2',
  RR2: 'Tras. Der. 2',
  ML2: 'Med. Izq. 2',
  MR2: 'Med. Der. 2',
  FL3: 'Del. Izq. 3',
  FR3: 'Del. Der. 3',
  RL3: 'Tras. Izq. 3',
  RR3: 'Tras. Der. 3',
  SPARE: 'Repuesto',
};

export function getSerialItemColor(
  item: { specs?: { usefulLifePct?: number | null } | null } | null
): string {
  if (!item) return '#E5E7EB';
  const pct = item.specs?.usefulLifePct;
  if (pct === null || pct === undefined) return '#9CA3AF';
  if (pct >= 60) return '#22C55E';
  if (pct >= 30) return '#EAB308';
  return '#EF4444';
}
