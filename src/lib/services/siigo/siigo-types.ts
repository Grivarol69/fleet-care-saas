// Siigo API request/response shapes + internal input types

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface SiigoAuthRequest {
  username: string;
  access_key: string;
}

export interface SiigoAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ─── Customer (Tercero / Proveedor) ──────────────────────────────────────────

export interface SiigoCustomerRequest {
  type: 'Supplier';
  person_type: 'Person' | 'Company';
  id_type: { code: '13' | '22' | '31' | '41' };
  identification: string; // NIT sin dígito verificador
  check_digit?: string; // Calculado con algoritmo DIAN módulo-11
  name: [{ first_name?: string; last_name?: string; business_name?: string }];
  address: {
    address: string;
    city: { country_code: 'Co'; state_code: string; city_code: string };
  };
  phones: [{ number: string }];
  contacts: [{ first_name: string; last_name: string; email: string }];
  fiscal_responsibilities: { code: string }[];
  vat_responsible: boolean;
}

export interface SiigoCustomerResponse {
  id: string; // → Provider.siigoId
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface SiigoProductRequest {
  code: string; // MasterPart.code
  name: string; // MasterPart.description
  account_group: { id: number };
  type: 'Product';
  stock_control: false;
  tax_classification: 'Taxed' | 'Exempt' | 'Excluded';
  taxes: { id: number }[];
  unit: { id: number };
}

export interface SiigoProductResponse {
  id: string; // → MasterPart.siigoProductId
}

// ─── Purchase Invoice ─────────────────────────────────────────────────────────

export interface SiigoPurchaseInvoiceItem {
  code: string;
  description: string;
  quantity: number;
  price: number;
  discount?: number;
  taxes?: [{ id: number; percentage: number }];
}

export interface SiigoPurchaseInvoiceRequest {
  document: { id: number };
  date: string; // "YYYY-MM-DD"
  supplier: { identification: string; branch_office: 0 };
  cost_center?: { id: number };
  currency?: { code: string; exchange_rate?: number };
  observations?: string; // max 255 chars
  items: SiigoPurchaseInvoiceItem[];
  payments: [{ id: number; value: number; due_date: string }];
}

export interface SiigoPurchaseInvoiceResponse {
  id: string; // → Invoice.siigoId
}

// ─── Reference data ──────────────────────────────────────────────────────────

export interface SiigoCostCenter {
  id: number;
  code: string;
  name: string;
}

export interface SiigoPaymentType {
  id: number;
  name: string;
}

export interface SiigoDocumentType {
  id: number;
  code: string;
  name: string;
}

export interface SiigoTax {
  id: number;
  name: string;
  percentage: number;
}

// ─── Internal input types (Fleet Care → Siigo mapper) ────────────────────────

export interface SiigoProviderInput {
  id: string;
  name: string;
  nit: string;
  siigoIdType: 'NIT' | 'CC' | 'CE' | 'PASSPORT';
  siigoPersonType: 'PERSON' | 'COMPANY';
  stateCode: string;
  cityCode: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  fiscalResponsibilities: string[];
  vatResponsible: boolean;
}

export interface SiigoProductInput {
  id: string;
  code: string;
  description: string;
  accountGroup: number;
  siigoTaxClassification: 'TAXED' | 'EXEMPT' | 'EXCLUDED';
  siigoUnit: number;
  siigoTaxId?: number; // ID del impuesto (IVA) en Siigo — distinto de la unidad de medida
}

export interface SiigoPaymentInput {
  paymentTypeId: number;
  value: number;
  dueDate: string; // "YYYY-MM-DD"
}

export interface SiigoPurchaseInvoiceInput {
  documentTypeId: number;
  date: string; // "YYYY-MM-DD"
  supplierNit: string;
  costCenterId?: number;
  observations?: string;
  items: Array<{
    id: string;
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    masterPartId: string | null;
  }>;
  payment: SiigoPaymentInput;
}

// ─── Config & results ─────────────────────────────────────────────────────────

export interface TenantSiigoConfig {
  username: string;
  accessKeyEncrypted: string; // "enc:v1:<base64url>" — nunca en plaintext en DB
  defaultCostCenterId: number;
  defaultPaymentTypeId: number;
  defaultDocumentTypeId: number;
  enabled: boolean;
  lastTestAt?: string; // ISO string
}

export interface SiigoClientConfig {
  username: string;
  accessKey: string; // plaintext descifrado — nunca persistir
  baseUrl?: string; // default: "https://api.siigo.com"
  timeoutMs?: number; // default: 10_000
  maxRetries?: number; // default: 3
}

export interface BatchSyncResult {
  invoices: { success: number; failed: number; skipped: number };
  providers: { success: number; failed: number; skipped: number };
  parts: { success: number; failed: number; skipped: number };
}

// ─── Token cache ──────────────────────────────────────────────────────────────

export interface SiigoTokenCache {
  accessToken: string;
  expiresAt: Date;
  tenantId: string;
}
