/**
 * OT — Price Freeze (OWNER)
 *
 * Cubre el comportamiento de "price freeze" cuando una OT está en estado
 * APPROVED o IN_PROGRESS:
 * - OWNER puede hacer override (botón "Sincronizar Cambios" habilitado)
 * - TECHNICIAN NO puede editar items (botón disabled o no visible)
 * - El freeze persiste al avanzar a IN_PROGRESS
 *
 * Setup: WO creada + avanzada a APPROVED via helpers.
 * Cross-role: abre un segundo contexto de browser como TECHNICIAN para verificar permisos.
 *
 * Corre en el proyecto `as-owner` (playwright.config.ts).
 */
import { test, expect, Browser } from '@playwright/test';
import {
  fetchTestFixtures,
  createBasicWO,
  advanceWOToStatus,
  buildDefaultItems,
} from '../helpers/work-order-helpers';

test.describe.configure({ mode: 'serial' });

test.describe('OT — Price Freeze (APPROVED/IN_PROGRESS)', () => {
  let woId: string;
  let vehicleId: string;
  let serviceMantItemId: string;
  let partMantItemId: string;

  test.beforeAll(async ({ request }) => {
    const fixtures = await fetchTestFixtures(request);
    vehicleId = fixtures.vehicleId;
    serviceMantItemId = fixtures.serviceMantItemId;
    partMantItemId = fixtures.partMantItemId;

    // Crear WO y avanzar a APPROVED
    woId = await createBasicWO(
      request,
      vehicleId,
      buildDefaultItems(serviceMantItemId, partMantItemId)
    );
    await advanceWOToStatus(request, woId, 'APPROVED');
    console.log(`WO en APPROVED para price-freeze tests: ${woId}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: OWNER ve botón "Sincronizar Cambios" habilitado en APPROVED
  // ─────────────────────────────────────────────────────────────────────────
  test('1. OWNER ve botón Sincronizar Cambios habilitado en APPROVED (override OK)', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Navegar al tab de items
    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // El botón de guardado debe estar presente y habilitado para OWNER
    const saveBtn = page.getByRole('button', { name: /sincronizar cambios/i });
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await expect(saveBtn).not.toBeDisabled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: TECHNICIAN ve botón deshabilitado o no visible en APPROVED
  // ─────────────────────────────────────────────────────────────────────────
  test('2. TECHNICIAN ve botón Sincronizar Cambios disabled en APPROVED', async ({
    browser,
  }: {
    browser: Browser;
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    const techCtx = await browser.newContext({
      storageState: 'playwright/.auth/technician.json',
    });
    const techPage = await techCtx.newPage();

    try {
      await techPage.goto(`/dashboard/maintenance/work-orders/${woId}`);
      await techPage.waitForLoadState('networkidle', { timeout: 20000 });

      // Navegar al tab de items
      const itemsTab = techPage.getByRole('tab', { name: /Ítems.*Unificado/i });
      const tabExists = await itemsTab
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (tabExists) {
        await itemsTab.click();
        await techPage.waitForLoadState('networkidle', { timeout: 10000 });

        const saveBtn = techPage.getByRole('button', {
          name: /sincronizar cambios/i,
        });
        const btnExists = await saveBtn
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (btnExists) {
          // Si existe, debe estar disabled para TECHNICIAN
          await expect(saveBtn).toBeDisabled();
        }
        // Si no existe el botón, también es válido (no puede editar)
      }
    } finally {
      await techCtx.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Avanzar a IN_PROGRESS: price freeze persiste para TECHNICIAN
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Avanzar a IN_PROGRESS: price freeze persiste (OWNER puede, TECH no puede)', async ({
    page,
    request,
    browser,
  }: {
    page: any;
    request: any;
    browser: Browser;
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    // Avanzar a IN_PROGRESS via API
    const patchRes = await request.patch(
      `/api/maintenance/work-orders/${woId}`,
      { data: { status: 'IN_PROGRESS' } }
    );
    expect(
      patchRes.status(),
      `PATCH → IN_PROGRESS falló: ${await patchRes.text()}`
    ).toBe(200);

    // Verificar que OWNER sigue teniendo el botón habilitado
    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const saveBtnOwner = page.getByRole('button', {
      name: /sincronizar cambios/i,
    });
    await expect(saveBtnOwner).toBeVisible({ timeout: 10000 });
    await expect(saveBtnOwner).not.toBeDisabled();

    // Verificar que TECHNICIAN sigue sin poder editar en IN_PROGRESS
    const techCtx = await browser.newContext({
      storageState: 'playwright/.auth/technician.json',
    });
    const techPage = await techCtx.newPage();

    try {
      await techPage.goto(`/dashboard/maintenance/work-orders/${woId}`);
      await techPage.waitForLoadState('networkidle', { timeout: 20000 });

      const itemsTab = techPage.getByRole('tab', { name: /Ítems.*Unificado/i });
      const tabExists = await itemsTab
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (tabExists) {
        await itemsTab.click();
        await techPage.waitForLoadState('networkidle', { timeout: 10000 });

        const saveBtnTech = techPage.getByRole('button', {
          name: /sincronizar cambios/i,
        });
        const btnExists = await saveBtnTech
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (btnExists) {
          await expect(saveBtnTech).toBeDisabled();
        }
      }
    } finally {
      await techCtx.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: OWNER puede seguir viendo la WO en IN_PROGRESS sin errores
  // ─────────────────────────────────────────────────────────────────────────
  test('4. WO en IN_PROGRESS carga correctamente para OWNER', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Badge debe mostrar "En Trabajo"
    await expect(page.getByText('En Trabajo').first()).toBeVisible({
      timeout: 10000,
    });

    // No debe haber errores de autorización
    await expect(page.getByText('403')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Unauthorized')).not.toBeVisible({
      timeout: 3000,
    });
  });
});
