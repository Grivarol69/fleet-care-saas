/**
 * OT — Cross-role lifecycle (TECHNICIAN crea, OWNER aprueba)
 *
 * Este es el test más importante del módulo Work Orders.
 * Verifica el flujo completo de una OT con dos roles:
 * - TECHNICIAN: crea la WO, puede enviar a aprobación e iniciar trabajo, pero NO puede aprobar ni cerrar
 * - OWNER: aprueba via UI y cierra via UI
 *
 * Usa dos contextos de browser en paralelo:
 * - Default (as-owner): page, request del proyecto as-owner
 * - techCtx: browser.newContext({ storageState: 'playwright/.auth/technician.json' })
 *
 * Nota sobre auth: El storageState usa cookies de Clerk (guardadas por auth.setup.ts).
 * El context.request() de Playwright reutiliza las cookies del contexto, lo que permite
 * hacer llamadas API autenticadas como TECHNICIAN sin navegación de browser.
 *
 * Corre en el proyecto `as-owner` (playwright.config.ts).
 */
import { test, expect, Browser, BrowserContext } from '@playwright/test';
import {
  fetchTestFixtures,
  buildDefaultItems,
} from '../helpers/work-order-helpers';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Cross-role lifecycle (TECHNICIAN crea, OWNER aprueba)', () => {
  let woId: string;
  let vehicleId: string;
  let serviceMantItemId: string;
  let partMantItemId: string;
  let techCtx: BrowserContext;

  test.beforeAll(
    async ({ request, browser }: { request: any; browser: Browser }) => {
      // 1. Obtener fixtures como OWNER
      const vehiclesRes = await request.get('/api/vehicles/vehicles');
      expect(vehiclesRes.status()).toBe(200);
      const vehicles = await vehiclesRes.json();
      vehicleId = vehicles[0].id;

      const mantItemsRes = await request.get('/api/maintenance/mant-items');
      expect(mantItemsRes.status()).toBe(200);
      const mantItemsRaw = await mantItemsRes.json();
      const allItems: any[] = Array.isArray(mantItemsRaw)
        ? mantItemsRaw
        : mantItemsRaw.items || [];

      const serviceItem = allItems.find(
        (i: any) => i.type === 'SERVICE' || i.type === 'ACTION'
      );
      const partItem = allItems.find((i: any) => i.type === 'PART');
      serviceMantItemId = serviceItem.id;
      partMantItemId = partItem.id;

      // 2. Abrir contexto TECHNICIAN (reutilizar entre tests para eficiencia)
      techCtx = await browser.newContext({
        storageState: 'playwright/.auth/technician.json',
      });

      // 3. TECHNICIAN crea la WO via API
      const createRes = await techCtx.request.post(
        '/api/maintenance/work-orders',
        {
          data: {
            vehicleId,
            title: `OT E2E CrossRole - ${Date.now()}`,
            mantType: 'CORRECTIVE',
            priority: 'MEDIUM',
            items: buildDefaultItems(serviceMantItemId, partMantItemId),
          },
        }
      );
      expect(
        createRes.status(),
        `TECHNICIAN POST /api/maintenance/work-orders falló: ${await createRes.text()}`
      ).toBe(201);

      const wo = await createRes.json();
      woId = wo.id;
      console.log(`WO creada por TECHNICIAN: ${woId}`);
    }
  );

  test.afterAll(async () => {
    if (techCtx) await techCtx.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: TECHNICIAN creó la WO → ID existe
  // ─────────────────────────────────────────────────────────────────────────
  test('1. TECHNICIAN creó WO vía API → 201, woId válido', async () => {
    expect(woId, 'woId debe ser un UUID válido').toBeTruthy();
    expect(woId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: TECHNICIAN puede enviar a aprobación (PENDING → PENDING_APPROVAL)
  // ─────────────────────────────────────────────────────────────────────────
  test('2. TECHNICIAN puede enviar a aprobación (PENDING→PENDING_APPROVAL)', async () => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    const patchRes = await techCtx.request.patch(
      `/api/maintenance/work-orders/${woId}`,
      { data: { status: 'PENDING_APPROVAL' } }
    );
    expect(
      patchRes.status(),
      `TECHNICIAN PATCH PENDING_APPROVAL falló: ${await patchRes.text()}`
    ).toBe(200);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: TECHNICIAN NO puede aprobar (PENDING_APPROVAL → APPROVED retorna 403)
  // ─────────────────────────────────────────────────────────────────────────
  test('3. TECHNICIAN NO puede aprobar (PENDING_APPROVAL→APPROVED retorna 403)', async () => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    const patchRes = await techCtx.request.patch(
      `/api/maintenance/work-orders/${woId}`,
      { data: { status: 'APPROVED' } }
    );
    expect(
      patchRes.status(),
      `Esperaba 403, TECHNICIAN recibió ${patchRes.status()}: ${await patchRes.text()}`
    ).toBe(403);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: OWNER aprueba via UI → badge "Aprobada"
  // ─────────────────────────────────────────────────────────────────────────
  test('4. OWNER aprueba via UI → badge Aprobada', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Badge debe mostrar "En Aprobación"
    await expect(page.getByText('En Aprobación').first()).toBeVisible({
      timeout: 10000,
    });

    const aprobarBtn = page.getByRole('button', { name: 'Aprobar OT' });
    await expect(aprobarBtn).toBeVisible({ timeout: 10000 });
    await aprobarBtn.click();

    const confirmarBtn = page.getByRole('button', {
      name: 'Confirmar Aprobación',
    });
    await expect(confirmarBtn).toBeVisible({ timeout: 5000 });

    // Esperar la respuesta PATCH del servidor antes de continuar —
    // evita falso positivo si el badge usa actualización optimista
    const approvalResponsePromise = page.waitForResponse(
      resp =>
        resp.url().includes(`/work-orders/${woId}`) &&
        resp.request().method() === 'PATCH',
      { timeout: 15000 }
    );
    await confirmarBtn.click();
    const approvalResponse = await approvalResponsePromise;
    expect(
      approvalResponse.status(),
      'El PATCH de aprobación debe retornar 200'
    ).toBe(200);

    await expect(page.getByText('Aprobada').first()).toBeVisible({
      timeout: 10000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: TECHNICIAN puede iniciar trabajo (APPROVED → IN_PROGRESS)
  // ─────────────────────────────────────────────────────────────────────────
  test('5. TECHNICIAN puede iniciar trabajo (APPROVED→IN_PROGRESS)', async () => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    const patchRes = await techCtx.request.patch(
      `/api/maintenance/work-orders/${woId}`,
      { data: { status: 'IN_PROGRESS' } }
    );
    expect(
      patchRes.status(),
      `TECHNICIAN PATCH IN_PROGRESS falló: ${await patchRes.text()}`
    ).toBe(200);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: TECHNICIAN NO puede cerrar OT (IN_PROGRESS → PENDING_INVOICE retorna 403)
  // ─────────────────────────────────────────────────────────────────────────
  test('6. TECHNICIAN NO puede cerrar OT (IN_PROGRESS→PENDING_INVOICE retorna 403)', async () => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    const patchRes = await techCtx.request.patch(
      `/api/maintenance/work-orders/${woId}`,
      { data: { status: 'PENDING_INVOICE' } }
    );
    expect(
      patchRes.status(),
      `Esperaba 403, TECHNICIAN recibió ${patchRes.status()}: ${await patchRes.text()}`
    ).toBe(403);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: OWNER cierra OT via UI → badge "Por Cerrar"
  // ─────────────────────────────────────────────────────────────────────────
  test('7. OWNER cierra OT via UI → badge Por Cerrar (PENDING_INVOICE)', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Badge debe mostrar "En Trabajo"
    await expect(page.getByText('En Trabajo').first()).toBeVisible({
      timeout: 10000,
    });

    const cerrarBtn = page.getByRole('button', { name: 'Cerrar OT' });
    await expect(cerrarBtn).toBeVisible({ timeout: 10000 });
    await cerrarBtn.click();

    // Dialog de cierre
    await expect(
      page.getByRole('dialog', { name: /cerrar orden de trabajo/i })
    ).toBeVisible({ timeout: 5000 });

    const confirmarCierreBtn = page.getByRole('button', {
      name: 'Confirmar cierre',
    });
    await expect(confirmarCierreBtn).toBeVisible({ timeout: 3000 });

    const closeResponsePromise = page.waitForResponse(
      resp =>
        resp.url().includes(`/work-orders/${woId}`) &&
        resp.request().method() === 'PATCH',
      { timeout: 15000 }
    );
    await confirmarCierreBtn.click();
    const closeResponse = await closeResponsePromise;
    expect(closeResponse.status(), 'El PATCH de cierre debe retornar 200').toBe(
      200
    );

    await expect(page.getByText('Por Cerrar').first()).toBeVisible({
      timeout: 10000,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: OWNER completa via UI → badge "Cerrada"
  // ─────────────────────────────────────────────────────────────────────────
  test('8. OWNER completa via UI → badge Cerrada (COMPLETED)', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    const completarBtn = page.getByRole('button', {
      name: 'Marcar como Completada',
    });
    await expect(completarBtn).toBeVisible({ timeout: 10000 });
    await completarBtn.click();

    await expect(page.getByText('Cerrada').first()).toBeVisible({
      timeout: 15000,
    });
  });
});
