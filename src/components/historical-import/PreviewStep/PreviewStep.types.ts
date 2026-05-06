import type { ParsedRow, VehicleLookup } from '../lib/csvParser';
import type { HistoricalImportResponse } from '@/lib/validations/historical-import';

export type PreviewStepProps = {
  parsedRows: ParsedRow[];
  vehicleLookup: VehicleLookup;
  onConfirmed: (result: HistoricalImportResponse) => void;
  onBack: () => void;
};
