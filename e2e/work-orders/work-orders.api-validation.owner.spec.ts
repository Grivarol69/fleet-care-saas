/**
 * OT — Validación API (OWNER)
 *
 * Tests de validación a nivel API (sin UI, solo fixture `request`).
 * Verifica que el backend rechaza correctamente:
 * - Requests incompletos (sin vehicleId, sin items)
 * - Transiciones de estado inválidas según la FSM
 * - Acceso a WOs de otros tenants (404/403)
 *
 * Corre en el proyecto `as-owner` (playwright.config.ts).
 *
 * Nota: El test de TECHNICIAN no puede aprobar se cubre vía browser context
 * en work-orders.crossrole.lifecycle.owner.spec.ts.
 */
import { test, expect } from '@playwright/test';
import {
  fetchTestFixtures,
  createBasicWO,
  buildDefaultItems,
} from '../helpers/work-order-helpers';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Validación API', () => {
  let vehicleId: string;
  let serviceMantItemId: string;
  let partMantItemId: string;

  test.beforeAll(async ({ request }) => {
    const fixtures = await fetchTestFixtures(request);
    vehicleId = fixtures.vehicleId;
    serviceMantItemId = fixtures.serviceMantItemId;
    partMantItemId = fixtures.partMantItemId;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: POST sin vehicleId retorna 400
  // ─────────────────────────────────────────────────────────────────────────
  test('1. POST sin vehicleId retorna 400', async ({ request }) => {
    const res = await request.post('/api/maintenance/work-orders', {
      data: {
        title: 'OT sin vehicleId E2E',
        mantType: 'CORRECTIVE',
        priority: 'MEDIUM',
        items: buildDefaultItems(serviceMantItemId, partMantItemId),
      },
    });
    expect(
      res.status(),
      `Esperaba 400, recibió ${res.status()}: ${await res.text()}`
    ).toBe(400);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: POST con items vacíos retorna 400
  // ─────────────────────────────────────────────────────────────────────────
  test('2. POST con items vacíos retorna 400', async ({ request }) => {
    const res = await request.post('/api/maintenance/work-orders', {
      data: {
        vehicleId,
        title: 'OT sin items E2E',
        mantType: 'CORRECTIVE',
        priority: 'MEDIUM',
        items: [],
      },
    });
    // El backend debe rechazar WOs sin items
    expect(
      [400, 422],
      `Esperaba 400 o 422, recibió ${res.status()}: ${await res.text()}`
    ).toContain(res.status());
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: PATCH con transición inválida retorna 400
  // PENDING → COMPLETED directo (saltando todos los pasos intermedios)
  // ─────────────────────────────────────────────────────────────────────────
  test('3. PATCH transición inválida PENDING→COMPLETED retorna 400', async ({
    request,
  }) => {
    const woId = await createBasicWO(
      request,
      vehicleId,
      buildDefaultItems(serviceMantItemId, partMantItemId)
    );

    const patchRes = await request.patch(
      `/api/maintenance/work-orders/${woId}`,
      { data: { status: 'COMPLETED' } }
    );

    expect(
      patchRes.status(),
      `Esperaba 400, recibió ${patchRes.status()}: ${await patchRes.text()}`
    ).toBe(400);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: PATCH a WO de otro tenant (UUID inexistente) retorna 403 o 404
  // ─────────────────────────────────────────────────────────────────────────
  test('4. PATCH a UUID inexistente retorna 403 o 404', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await request.patch(`/api/maintenance/work-orders/${fakeId}`, {
      data: { status: 'PENDING_APPROVAL' },
    });
    expect(
      [403, 404],
      `Esperaba 403 o 404, recibió ${res.status()}: ${await res.text()}`
    ).toContain(res.status());
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: GET de WO con UUID inexistente retorna 403 o 404
  // ─────────────────────────────────────────────────────────────────────────
  test('5. GET de WO con UUID inexistente retorna 403 o 404', async ({
    request,
  }) => {
    const fakeId = '00000000-0000-0000-0000-000000000002';
    const res = await request.get(`/api/maintenance/work-orders/${fakeId}`);
    expect(
      [403, 404],
      `Esperaba 403 o 404, recibió ${res.status()}: ${await res.text()}`
    ).toContain(res.status());
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: POST con vehicleId inválido (no UUID) retorna 400
  // ─────────────────────────────────────────────────────────────────────────
  test('6. POST con vehicleId inválido retorna 400 o 422', async ({
    request,
  }) => {
    const res = await request.post('/api/maintenance/work-orders', {
      data: {
        vehicleId: 'not-a-valid-uuid',
        title: 'OT vehicleId inválido',
        mantType: 'CORRECTIVE',
        priority: 'MEDIUM',
        items: buildDefaultItems(serviceMantItemId, partMantItemId),
      },
    });
    expect(
      [400, 422, 404],
      `Esperaba 400, 422 o 404, recibió ${res.status()}: ${await res.text()}`
    ).toContain(res.status());
  });
});
