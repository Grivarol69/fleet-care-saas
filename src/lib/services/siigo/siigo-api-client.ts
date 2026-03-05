import { isSiigoError, throwSiigoError } from './siigo-errors';
import type {
  SiigoAuthResponse,
  SiigoClientConfig,
  SiigoCustomerRequest,
  SiigoCustomerResponse,
  SiigoCostCenter,
  SiigoDocumentType,
  SiigoPaymentInput,
  SiigoPaymentType,
  SiigoPurchaseInvoiceInput,
  SiigoPurchaseInvoiceRequest,
  SiigoPurchaseInvoiceResponse,
  SiigoProductRequest,
  SiigoProductResponse,
  SiigoProviderInput,
  SiigoProductInput,
  SiigoTax,
  SiigoTokenCache,
} from './siigo-types';

const SIIGO_BASE_URL = 'https://api.siigo.com';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const TOKEN_BUFFER_MS = 60 * 60 * 1000; // 60 min proactive refresh
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000; // 23h (24h - 1h buffer)

// Module-level cache: persiste entre requests en el mismo proceso (por tenant)
const tokenCache = new Map<string, SiigoTokenCache>();

// ─── NIT check digit (DIAN módulo-11) ────────────────────────────────────────

function calcCheckDigit(nit: string): string {
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const digits = nit.replace(/\D/g, '').split('').reverse();
  const sum = digits.reduce(
    (acc, d, i) => acc + parseInt(d) * (weights[i] ?? 1),
    0
  );
  const mod = sum % 11;
  return mod < 2 ? String(mod) : String(11 - mod);
}

// ─── ID type code mapper ──────────────────────────────────────────────────────

const ID_TYPE_CODE: Record<string, '13' | '22' | '31' | '41'> = {
  CC: '13',
  CE: '22',
  NIT: '31',
  PASSPORT: '41',
};

const TAX_CLASSIFICATION: Record<string, 'Taxed' | 'Exempt' | 'Excluded'> = {
  TAXED: 'Taxed',
  EXEMPT: 'Exempt',
  EXCLUDED: 'Excluded',
};

// ─── Factory function (replaces class) ───────────────────────────────────────

export function createSiigoClient(tenantId: string, config: SiigoClientConfig) {
  const baseUrl = config.baseUrl ?? SIIGO_BASE_URL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

  // ── Token management ────────────────────────────────────────────────────────

  async function authenticate(): Promise<string> {
    // Return cached token if still valid (>60 min remaining)
    const cached = tokenCache.get(tenantId);
    if (cached && cached.expiresAt.getTime() - Date.now() > TOKEN_BUFFER_MS) {
      return cached.accessToken;
    }

    const res = await fetch(`${baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: config.username, access_key: config.accessKey }),
    });

    if (res.status === 401 || res.status === 403) {
      throwSiigoError({ kind: 'auth', statusCode: res.status, message: 'Siigo authentication failed — check username and access key' });
    }

    if (!res.ok) {
      throwSiigoError({ kind: 'api', statusCode: res.status, message: `Siigo auth error: ${res.statusText}` });
    }

    const data = (await res.json()) as SiigoAuthResponse;
    const entry: SiigoTokenCache = {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      tenantId,
    };
    tokenCache.set(tenantId, entry);
    return data.access_token;
  }

  async function getToken(): Promise<string> {
    const cached = tokenCache.get(tenantId);
    if (cached && cached.expiresAt.getTime() - Date.now() > TOKEN_BUFFER_MS) {
      return cached.accessToken;
    }
    return authenticate();
  }

  // ── Fetch with retry + timeout ───────────────────────────────────────────────

  async function fetchWithRetry(
    url: string,
    init: RequestInit,
    attempt = 1
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });

      if (res.ok) return res;

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '2') * 1000;
        if (attempt <= maxRetries) {
          await new Promise<void>((r) => setTimeout(r, retryAfter));
          return fetchWithRetry(url, init, attempt + 1);
        }
        throwSiigoError({ kind: 'rate_limit', retryAfterMs: retryAfter, message: 'Siigo rate limit exceeded after retries' });
      }

      if (res.status >= 500) {
        if (attempt <= maxRetries) {
          const backoff = Math.pow(2, attempt - 1) * 1000; // 1s → 2s → 4s
          await new Promise<void>((r) => setTimeout(r, backoff));
          return fetchWithRetry(url, init, attempt + 1);
        }
        throwSiigoError({ kind: 'api', statusCode: res.status, message: `Siigo server error after ${maxRetries} retries` });
      }

      if (res.status === 400 || res.status === 422) {
        let body: unknown;
        try { body = await res.json(); } catch { body = undefined; }
        const fieldErrors = extractFieldErrors(body);
        throwSiigoError({ kind: 'validation', fieldErrors, message: `Siigo validation error (${res.status})`, });
      }

      return res; // otros 4xx — caller maneja
    } catch (err) {
      // Re-throw Siigo errors as-is
      if (isSiigoError(err)) throw err;
      // Retry network errors (AbortController timeout, DNS fail, etc.)
      if (attempt <= maxRetries) {
        const backoff = Math.pow(2, attempt - 1) * 1000;
        await new Promise<void>((r) => setTimeout(r, backoff));
        return fetchWithRetry(url, init, attempt + 1);
      }
      throwSiigoError({ kind: 'api', statusCode: 0, message: `Network error: ${String(err)}` });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function authorizedFetch(url: string, init: RequestInit): Promise<Response> {
    const token = await getToken();
    return fetchWithRetry(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  async function ensureProvider(input: SiigoProviderInput): Promise<string> {
    const idCode = ID_TYPE_CODE[input.siigoIdType];
    if (!idCode) {
      throwSiigoError({ kind: 'validation', fieldErrors: { siigoIdType: ['Unknown ID type'] }, message: 'Invalid siigoIdType' });
    }

    const nit = input.nit.replace(/\D/g, '');
    const isCompany = input.siigoPersonType === 'COMPANY';

    const body: SiigoCustomerRequest = {
      type: 'Supplier',
      person_type: isCompany ? 'Company' : 'Person',
      id_type: { code: idCode },
      identification: nit,
      ...(input.siigoIdType === 'NIT' ? { check_digit: calcCheckDigit(nit) } : {}),
      name: isCompany
        ? [{ business_name: input.name }]
        : [{ first_name: input.name.split(' ')[0] ?? input.name, last_name: input.name.split(' ').slice(1).join(' ') || '-' }],
      address: {
        address: input.address ?? 'Sin dirección',
        city: { country_code: 'Co', state_code: input.stateCode, city_code: input.cityCode },
      },
      phones: [{ number: input.phone ?? '0000000' }],
      contacts: [{ first_name: input.name, last_name: '-', email: input.email ?? 'sin@email.com' }],
      fiscal_responsibilities: input.fiscalResponsibilities.map((code) => ({ code })),
      vat_responsible: input.vatResponsible,
    };

    const res = await authorizedFetch(`${baseUrl}/v1/customers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as SiigoCustomerResponse;
    return data.id;
  }

  async function ensureProduct(input: SiigoProductInput): Promise<string> {
    const taxClass = TAX_CLASSIFICATION[input.siigoTaxClassification];
    if (!taxClass) {
      throwSiigoError({ kind: 'validation', fieldErrors: { siigoTaxClassification: ['Unknown tax classification'] }, message: 'Invalid siigoTaxClassification' });
    }

    const body: SiigoProductRequest = {
      code: input.code,
      name: input.description,
      account_group: { id: input.accountGroup },
      type: 'Product',
      stock_control: false,
      tax_classification: taxClass,
      taxes: input.siigoTaxId ? [{ id: input.siigoTaxId }] : [], // IVA tax ID — separate from unit-of-measure
      unit: { id: input.siigoUnit },
    };

    const res = await authorizedFetch(`${baseUrl}/v1/products`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as SiigoProductResponse;
    return data.id;
  }

  async function createPurchaseInvoice(input: SiigoPurchaseInvoiceInput): Promise<string> {
    const body: SiigoPurchaseInvoiceRequest = {
      document: { id: input.documentTypeId },
      date: input.date,
      supplier: { identification: input.supplierNit.replace(/\D/g, ''), branch_office: 0 },
      ...(input.costCenterId ? { cost_center: { id: input.costCenterId } } : {}),
      ...(input.observations ? { observations: input.observations.slice(0, 255) } : {}),
      items: input.items.map((item) => ({
        // Items sin MasterPart usan código fallback
        code: item.masterPartId ? item.code : `MISC-${item.id.slice(-8)}`,
        description: item.description,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
      payments: [
        {
          id: input.payment.paymentTypeId,
          value: input.payment.value,
          due_date: input.payment.dueDate,
        },
      ],
    };

    const res = await authorizedFetch(`${baseUrl}/v1/purchase-invoices`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as SiigoPurchaseInvoiceResponse;
    return data.id;
  }

  async function addPayment(siigoInvoiceId: string, payment: SiigoPaymentInput): Promise<void> {
    await authorizedFetch(`${baseUrl}/v1/purchase-invoices/${siigoInvoiceId}/payments`, {
      method: 'PATCH',
      body: JSON.stringify({ id: payment.paymentTypeId, value: payment.value, due_date: payment.dueDate }),
    });
  }

  async function getCostCenters(): Promise<SiigoCostCenter[]> {
    const res = await authorizedFetch(`${baseUrl}/v1/cost-centers`, { method: 'GET' });
    return (await res.json()) as SiigoCostCenter[];
  }

  async function getPaymentTypes(): Promise<SiigoPaymentType[]> {
    const res = await authorizedFetch(`${baseUrl}/v1/payment-types`, { method: 'GET' });
    return (await res.json()) as SiigoPaymentType[];
  }

  async function getDocumentTypes(): Promise<SiigoDocumentType[]> {
    const res = await authorizedFetch(`${baseUrl}/v1/document-types?type=FCC`, { method: 'GET' });
    return (await res.json()) as SiigoDocumentType[];
  }

  async function getTaxes(): Promise<SiigoTax[]> {
    const res = await authorizedFetch(`${baseUrl}/v1/taxes`, { method: 'GET' });
    return (await res.json()) as SiigoTax[];
  }

  return {
    authenticate,
    ensureProvider,
    ensureProduct,
    createPurchaseInvoice,
    addPayment,
    getCostCenters,
    getPaymentTypes,
    getDocumentTypes,
    getTaxes,
  };
}

export type SiigoClient = ReturnType<typeof createSiigoClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractFieldErrors(body: unknown): Record<string, string[]> {
  if (body && typeof body === 'object' && 'errors' in body) {
    const errors = (body as Record<string, unknown>)['errors'];
    if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
      return errors as Record<string, string[]>;
    }
  }
  return {};
}

