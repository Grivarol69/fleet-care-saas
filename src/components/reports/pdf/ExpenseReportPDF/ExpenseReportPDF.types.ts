export type CategorySummary = {
  key: string;
  label: string;
  total: number;
  count: number;
};

export type VehicleSummary = {
  key: string;
  label: string;
  total: number;
  count: number;
};

export type ExpenseReportLine = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO string
  providerName: string;
  vehicleLabel: string; // e.g. "ABC-123 — Toyota Hilux" or "Sin vehículo"
  categoryLabel: string; // category.name or "Sin categoría"
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ExpenseReportFilters = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  vehicle: { id: string; label: string } | null;
  category: { id: string | null; label: string } | null; // null when "any"
};

export type ExpenseReportResponse = {
  filters: ExpenseReportFilters;
  summary: {
    byCategory: CategorySummary[];
    byVehicle: VehicleSummary[];
    grandTotal: number;
    grandCount: number;
  };
  lines: ExpenseReportLine[];
};

export type ExpenseReportPDFProps = ExpenseReportResponse;
