import type { HistoricalImportResponse } from '@/lib/validations/historical-import';

export type ConfirmStepProps = {
  result: HistoricalImportResponse;
  onRestart: () => void;
};
