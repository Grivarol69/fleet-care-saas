// Volume unit suffix display labels
export const VOLUME_UNIT_SUFFIX = {
  LITERS: 'L',
  GALLONS: 'gal',
} as const;

export type VolumeUnitKey = keyof typeof VOLUME_UNIT_SUFFIX;

// Default volume unit per country code (fallback: LITERS)
export const VOLUME_UNIT_DEFAULT = {
  CO: 'GALLONS',
  AR: 'LITERS',
} as const satisfies Record<string, VolumeUnitKey>;

/**
 * Returns the default VolumeUnit for a given country code.
 * Defaults to 'LITERS' for any country not explicitly listed.
 */
export function getVolumeUnitDefault(country: string): VolumeUnitKey {
  if (country === 'CO') return 'GALLONS';
  return 'LITERS';
}

// Localized fuel type display names per country
export const FUEL_TYPE_LABELS = {
  AR: {
    NAFTA_SUPER: 'Nafta Súper',
    NAFTA_PREMIUM: 'Nafta Premium',
    DIESEL: 'Gasoil',
    DIESEL_PREMIUM: 'Gasoil Premium',
    GNC: 'GNC',
  },
  CO: {
    NAFTA_SUPER: 'Gasolina Corriente',
    NAFTA_PREMIUM: 'Gasolina Extra',
    DIESEL: 'ACPM',
    DIESEL_PREMIUM: 'ACPM Extra / EuroDiesel',
    GNC: 'GNV',
  },
  _default: {
    NAFTA_SUPER: 'Nafta Súper',
    NAFTA_PREMIUM: 'Nafta Premium',
    DIESEL: 'Gasoil',
    DIESEL_PREMIUM: 'Gasoil Premium',
    GNC: 'GNC',
  },
} as const;

export type FuelTypeLabelsMap = Record<string, string>;

/**
 * Returns the localized fuel type labels map for a given country code.
 * Falls back to _default (AR labels) for any country not explicitly listed.
 */
export function getFuelTypeLabels(country: string): FuelTypeLabelsMap {
  if (country === 'AR') return FUEL_TYPE_LABELS.AR;
  if (country === 'CO') return FUEL_TYPE_LABELS.CO;
  return FUEL_TYPE_LABELS._default;
}
