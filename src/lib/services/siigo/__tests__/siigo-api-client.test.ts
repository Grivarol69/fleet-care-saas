import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSiigoClient } from '../siigo-api-client';
import { isSiigoError } from '../siigo-errors';

const TENANT_ID = 'tenant-test-001';
const BASE_CONFIG = { username: 'api@test.com', accessKey: 'secret' };

// Helper: build a mock Response
function mockResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('createSiigoClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear module-level token cache between tests by using a unique tenantId per test
  });

  describe('authenticate / token caching', () => {
    it('fetches a new token on first call', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValueOnce(
        mockResponse(200, { access_token: 'tok-abc', token_type: 'Bearer', expires_in: 86400 })
      );

      const client = createSiigoClient('tenant-auth-1', BASE_CONFIG);
      const token = await client.authenticate();

      expect(token).toBe('tok-abc');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns cached token on second authenticate() call if not expired', async () => {
      const fetchMock = vi.mocked(fetch);
      // Use mockImplementation so each call creates a fresh Response (body can only be read once)
      fetchMock.mockImplementation(() =>
        Promise.resolve(mockResponse(200, { access_token: 'tok-cached', token_type: 'Bearer', expires_in: 86400 }))
      );

      const client = createSiigoClient('tenant-auth-2', BASE_CONFIG);
      await client.authenticate();
      await client.authenticate();

      // Only 1 real fetch — second call uses cache
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws a rate_limit error (kind) on 429 after retries exhausted', async () => {
      const fetchMock = vi.mocked(fetch);
      // Auth succeeds, then getCostCenters gets 429 repeatedly
      fetchMock
        .mockImplementationOnce(() =>
          Promise.resolve(mockResponse(200, { access_token: 'tok', token_type: 'Bearer', expires_in: 86400 }))
        )
        .mockImplementation(() =>
          Promise.resolve(mockResponse(429, { message: 'Too many requests' }, { 'Retry-After': '0' }))
        );

      const client = createSiigoClient('tenant-429b', { ...BASE_CONFIG, maxRetries: 1 });

      try {
        await client.getCostCenters();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(isSiigoError(err)).toBe(true);
        if (isSiigoError(err)) {
          expect(err.kind).toBe('rate_limit');
        }
      }
    });

    it('throws SiigoAuthError (kind=auth) on 401', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(401, { message: 'Unauthorized' }));

      const client = createSiigoClient('tenant-401', BASE_CONFIG);
      try {
        await client.authenticate();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(isSiigoError(err)).toBe(true);
        if (isSiigoError(err)) {
          expect(err.kind).toBe('auth');
        }
      }
    });
  });

  describe('fetchWithRetry', () => {
    it('retries 3 times on 5xx then throws api error', async () => {
      const fetchMock = vi.mocked(fetch);
      // First call = auth (success), then 3x 500
      fetchMock
        .mockImplementationOnce(() =>
          Promise.resolve(mockResponse(200, { access_token: 'tok', token_type: 'Bearer', expires_in: 86400 }))
        )
        .mockImplementation(() =>
          Promise.resolve(mockResponse(500, { message: 'Internal Server Error' }))
        );

      const client = createSiigoClient('tenant-retry', { ...BASE_CONFIG, maxRetries: 3 });
      try {
        await client.getCostCenters();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(isSiigoError(err)).toBe(true);
        if (isSiigoError(err)) {
          expect(err.kind).toBe('api');
          expect((err as { statusCode: number }).statusCode).toBe(500);
        }
        // auth(1) + original attempt(1) + 3 retries(3) = 5 total calls
        expect(fetchMock).toHaveBeenCalledTimes(5);
      }
    });

    it('does NOT retry on 400 — throws validation error immediately', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(
          mockResponse(200, { access_token: 'tok', token_type: 'Bearer', expires_in: 86400 })
        )
        .mockResolvedValueOnce(mockResponse(400, { errors: { code: ['is invalid'] } }));

      const client = createSiigoClient('tenant-400', BASE_CONFIG);
      try {
        await client.getCostCenters();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(isSiigoError(err)).toBe(true);
        if (isSiigoError(err)) {
          expect(err.kind).toBe('validation');
        }
        // auth + 1 attempt = 2 total, no retries
        expect(fetchMock).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('ensureProvider', () => {
    it('maps Provider fields to SiigoCustomerRequest correctly including check digit for NIT', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(
          mockResponse(200, { access_token: 'tok', token_type: 'Bearer', expires_in: 86400 })
        )
        .mockResolvedValueOnce(mockResponse(201, { id: 'siigo-provider-123' }));

      const client = createSiigoClient('tenant-provider', BASE_CONFIG);
      const siigoId = await client.ensureProvider({
        id: 'local-id',
        name: 'Proveedor SAS',
        nit: '900123456',
        siigoIdType: 'NIT',
        siigoPersonType: 'COMPANY',
        stateCode: '11',
        cityCode: '11001',
        address: 'Cra 7 #45-20',
        phone: '3001234567',
        email: 'contacto@proveedor.com',
        fiscalResponsibilities: ['R-99-PN'],
        vatResponsible: true,
      });

      expect(siigoId).toBe('siigo-provider-123');

      // Verify the request body
      const callArgs = fetchMock.mock.calls[1];
      expect(callArgs).toBeDefined();
      const body = JSON.parse((callArgs![1] as RequestInit).body as string) as Record<string, unknown>;
      expect(body['type']).toBe('Supplier');
      expect(body['person_type']).toBe('Company');
      expect(body['identification']).toBe('900123456');
      expect(body['check_digit']).toBeDefined(); // NIT → check digit calculado
    });

    it('omits check_digit for CC type', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(
          mockResponse(200, { access_token: 'tok', token_type: 'Bearer', expires_in: 86400 })
        )
        .mockResolvedValueOnce(mockResponse(201, { id: 'siigo-cc-456' }));

      const client = createSiigoClient('tenant-cc', BASE_CONFIG);
      await client.ensureProvider({
        id: 'local-id-2',
        name: 'Juan Pérez',
        nit: '1234567890',
        siigoIdType: 'CC',
        siigoPersonType: 'PERSON',
        stateCode: '11',
        cityCode: '11001',
        address: null,
        phone: null,
        email: null,
        fiscalResponsibilities: [],
        vatResponsible: false,
      });

      const body = JSON.parse(
        (fetchMock.mock.calls[1]![1] as RequestInit).body as string
      ) as Record<string, unknown>;
      expect(body['check_digit']).toBeUndefined();
    });
  });

  describe('ensureProduct', () => {
    it('creates a product mapping fields correctly', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(mockResponse(200, { access_token: 'tok', token_type: 'Bearer', expires_in: 86400 }))
        .mockResolvedValueOnce(mockResponse(201, { id: 'siigo-prod-123' }));

      const client = createSiigoClient('tenant-prod', BASE_CONFIG);
      const siigoId = await client.ensureProduct({
        id: 'local-part-1',
        code: 'PART-001',
        description: 'Filtro de Aceite',
        accountGroup: 10,
        siigoTaxClassification: 'TAXED',
        siigoTaxId: 1,
        siigoUnit: 94,
      });

      expect(siigoId).toBe('siigo-prod-123');

      const callArgs = fetchMock.mock.calls[1];
      const body = JSON.parse((callArgs![1] as RequestInit).body as string) as Record<string, unknown>;
      expect(body['code']).toBe('PART-001');
      expect(body['name']).toBe('Filtro de Aceite');
      expect(body['account_group']).toEqual({ id: 10 });
      expect(body['type']).toBe('Product');
      expect(body['unit']).toEqual({ id: 94 });
      expect((body['taxes'] as any[])[0].id).toBe(1); // Mapped from TAXED correctly by the client implementation
    });
  });

  describe('createPurchaseInvoice', () => {
    it('creates a purchase invoice mapping fields correctly', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(mockResponse(200, { access_token: 'tok', token_type: 'Bearer', expires_in: 86400 }))
        .mockResolvedValueOnce(mockResponse(201, { id: 'siigo-invoice-123' }));

      const client = createSiigoClient('tenant-inv', BASE_CONFIG);
      const siigoId = await client.createPurchaseInvoice({
        documentTypeId: 55,
        date: '2023-10-25',
        supplierNit: '900123456',
        costCenterId: 100,
        observations: 'Test invoice',
        items: [
          { id: '1', code: 'PART-001', description: 'Item A', quantity: 2, unitPrice: 50.0, masterPartId: 'part1' }
        ],
        payment: { paymentTypeId: 10, value: 100.0, dueDate: '2023-11-25' }
      });

      expect(siigoId).toBe('siigo-invoice-123');

      const callArgs = fetchMock.mock.calls[1];
      const body = JSON.parse((callArgs![1] as RequestInit).body as string) as Record<string, unknown>;

      expect(body['document']).toEqual({ id: 55 });
      expect(body['date']).toBe('2023-10-25');
      expect(body['seller']).toBeUndefined(); // Assuming default config for purchase invoices
      expect((body['items'] as any[]).length).toBe(1);
      expect((body['payments'] as any[]).length).toBe(1);
      expect(body['cost_center']).toEqual({ id: 100 });
      expect(body['observations']).toBe('Test invoice');
    });
  });

  describe('addPayment', () => {
    it('adds a payment to an invoice successfully', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock
        .mockResolvedValueOnce(mockResponse(200, { access_token: 'tok', token_type: 'Bearer', expires_in: 86400 }))
        .mockResolvedValueOnce(mockResponse(201, { id: 'siigo-payment-1' }));

      const client = createSiigoClient('tenant-pay', BASE_CONFIG);
      await client.addPayment('siigo-invoice-123', {
        paymentTypeId: 20,
        value: 100.0,
        dueDate: '2023-11-25',
      });

      const callArgs = fetchMock.mock.calls[1];
      expect(callArgs![0]).toContain('/purchase-invoices/siigo-invoice-123/payments');
      const body = JSON.parse((callArgs![1] as RequestInit).body as string) as Record<string, unknown>;
      expect(body['id']).toBe(20);
      expect(body['value']).toBe(100);
      expect(body['due_date']).toBe('2023-11-25');
    });
  });
});
