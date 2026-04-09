/**
 * OT — Estados terminales (OWNER)
 *
 * Cubre los estados terminales de la FSM:
 * - REJECTED: transición desde PENDING_APPROVAL via UI con dialog de confirmación
 * - CANCELLED: transición via API
 * - Verificación de que no existen botones de avance en estados terminales
 * - Verificación de que transiciones inválidas desde terminales retornan 400
 *
 * Cada test crea su propia WO para evitar estado compartido problemático.
 *
 * Corre en el proyecto `as-owner` (playwright.config.ts).
 */
import { test, expect } from '@playwright/test';
import {
  fetchTestFixtures,
  createBasicWO,
  advanceWOToStatus,
  buildDefaultItems,
} from '../helpers/work-order-helpers';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Estados terminales (REJECTED, CANCELLED)', () => {
  let vehicleId: string;
  let serviceMantItemId: string;
  let partMantItemId: string;
  let rejectedWoId: string;

  test.beforeAll(async ({ request }) => {
    const fixtures = await fetchTestFixtures(request);
    vehicleId = fixtures.vehicleId;
    serviceMantItemId = fixtures.serviceMantItemId;
    partMantItemId = fixtures.partMantItemId;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: PENDING_APPROVAL → REJECTED via UI: badge "Rechazada"
  // ─────────────────────────────────────────────────────────────────────────
  test('1. PENDING_APPROVAL → REJECTED via UI: badge Rechazada', async ({
    page,
    request,
  }) => {
    // Setup: crear WO y avanzar a PENDING_APPROVAL via API
    const woId = await createBasicWO(
      request,
      vehicleId,
      buildDefaultItems(serviceMantItemId, partMantItemId)
    );
    await advanceWOToStatus(request, woId, 'PENDING_APPROVAL');
    rejectedWoId = woId; // guardar para test 2

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Badge debe mostrar "En Aprobación"
    await expect(page.getByText('En Aprobación').first()).toBeVisible({
      timeout: 10000,
    });

    // Click en botón "Rechazar" (puede ser "Rechazar OT" o similar)
    const rechazarBtn = page.getByRole('button', { name: /rechazar/i });
    await expect(rechazarBtn).toBeVisible({ timeout: 10000 });
    await rechazarBtn.click();

    // Dialog de confirmación de rechazo
    // Buscar el botón de confirmación dentro del dialog
    const confirmarRechazoBtn = page
      .getByRole('button')
      .filter({ hasText: /confirmar rechazo|rechazar ot|rechazar/i })
      .last();
    await expect(confirmarRechazoBtn).toBeVisible({ timeout: 5000 });
    await confirmarRechazoBtn.click();

    // Badge debe cambiar a "Rechazada"
    await expect(page.getByText('Rechazada').first()).toBeVisible({
      timeout: 15000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: OT REJECTED no tiene botones de avance
  // ─────────────────────────────────────────────────────────────────────────
  test('2. OT REJECTED no tiene botones de avance', async ({ page }) => {
    test.skip(!rejectedWoId, 'No se pudo crear/rechazar la WO en test 1');

    await page.goto(`/dashboard/maintenance/work-orders/${rejectedWoId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Verificar que no existen botones de avance
    await expect(
      page.getByRole('button', { name: /aprobar ot/i })
    ).not.toBeVisible({ timeout: 3000 });
    await expect(
      page.getByRole('button', { name: /iniciar trabajo/i })
    ).not.toBeVisible({ timeout: 3000 });
    await expect(
      page.getByRole('button', { name: /cerrar ot/i })
    ).not.toBeVisible({ timeout: 3000 });
    await expect(
      page.getByRole('button', { name: /marcar como completada/i })
    ).not.toBeVisible({ timeout: 3000 });
    await expect(
      page.getByRole('button', { name: /enviar a aprobación/i })
    ).not.toBeVisible({ timeout: 3000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: PATCH status=COMPLETED desde PENDING retorna 400 (transición inválida)
  // ─────────────────────────────────────────────────────────────────────────
  test('3. PATCH PENDING→COMPLETED retorna 400 (transición inválida FSM)', async ({
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
  // Test 4: PATCH status=CANCELLED en WO COMPLETED retorna 400
  // ─────────────────────────────────────────────────────────────────────────
  test('4. PATCH COMPLETED→CANCELLED retorna 400 (terminal no reversible)', async ({
    request,
  }) => {
    const woId = await createBasicWO(
      request,
      vehicleId,
      buildDefaultItems(serviceMantItemId, partMantItemId)
    );
    await advanceWOToStatus(request, woId, 'COMPLETED');

    const patchRes = await request.patch(
      `/api/maintenance/work-orders/${woId}`,
      { data: { status: 'CANCELLED' } }
    );
    expect(
      patchRes.status(),
      `Esperaba 400, recibió ${patchRes.status()}: ${await patchRes.text()}`
    ).toBe(400);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: OT CANCELLED: badge "Cancelada", sin botones de avance
  // ─────────────────────────────────────────────────────────────────────────
  test('5. OT CANCELLED: badge Cancelada, sin botones de avance', async ({
    page,
    request,
  }) => {
    const woId = await createBasicWO(
      request,
      vehicleId,
      buildDefaultItems(serviceMantItemId, partMantItemId)
    );
    await advanceWOToStatus(request, woId, 'CANCELLED');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Badge debe mostrar "Cancelada"
    await expect(page.getByText('Cancelada').first()).toBeVisible({
      timeout: 10000,
    });

    // No deben existir botones de avance
    await expect(
      page.getByRole('button', { name: /enviar a aprobación/i })
    ).not.toBeVisible({ timeout: 3000 });
    await expect(
      page.getByRole('button', { name: /aprobar ot/i })
    ).not.toBeVisible({ timeout: 3000 });
    await expect(
      page.getByRole('button', { name: /iniciar trabajo/i })
    ).not.toBeVisible({ timeout: 3000 });
    await expect(
      page.getByRole('button', { name: /cerrar ot/i })
    ).not.toBeVisible({ timeout: 3000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: PATCH status=PENDING_APPROVAL en WO REJECTED retorna 400
  // ─────────────────────────────────────────────────────────────────────────
  test('6. PATCH REJECTED→PENDING_APPROVAL retorna 400 (no re-envío desde terminal)', async ({
    request,
  }) => {
    test.skip(!rejectedWoId, 'No se pudo crear la WO rechazada en test 1');

    const patchRes = await request.patch(
      `/api/maintenance/work-orders/${rejectedWoId}`,
      { data: { status: 'PENDING_APPROVAL' } }
    );
    expect(
      patchRes.status(),
      `Esperaba 400, recibió ${patchRes.status()}: ${await patchRes.text()}`
    ).toBe(400);
  });
});
