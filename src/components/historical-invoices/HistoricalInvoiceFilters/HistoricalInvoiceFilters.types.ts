export type HistoricalInvoiceFilterValue = {
  vehicleId: string | null;
  dateFrom: string | null; // YYYY-MM-DD
  dateTo: string | null; // YYYY-MM-DD
};

export type HistoricalInvoiceFiltersProps = {
  value: HistoricalInvoiceFilterValue;
  onChange: (next: HistoricalInvoiceFilterValue) => void;
  onClear: () => void;
};
