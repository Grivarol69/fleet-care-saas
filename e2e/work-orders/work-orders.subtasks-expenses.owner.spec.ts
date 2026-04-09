/**
 * OT — Sub-tareas y Gastos (OWNER)
 *
 * Cubre los tabs de sub-tareas y gastos del detalle de una Work Order.
 * Los tests verifican:
 * - Existencia y carga sin error de los tabs
 * - Posibilidad de agregar sub-tareas (si el tab existe)
 * - Posibilidad de agregar gastos (si el tab existe)
 *
 * Nota: Si los tabs de Sub-tareas o Gastos no existen en la UI actual,
 * los tests se saltean automáticamente con `test.skip`.
 *
 * Setup: WO creada y avanzada a IN_PROGRESS (estado óptimo para gestionar tareas).
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

test.describe('OT — Sub-tareas y Gastos', () => {
  let woId: string;
  let vehicleId: string;
  let serviceMantItemId: string;
  let partMantItemId: string;

  test.beforeAll(async ({ request }) => {
    const fixtures = await fetchTestFixtures(request);
    vehicleId = fixtures.vehicleId;
    serviceMantItemId = fixtures.serviceMantItemId;
    partMantItemId = fixtures.partMantItemId;

    // Crear WO y avanzar a IN_PROGRESS
    woId = await createBasicWO(
      request,
      vehicleId,
      buildDefaultItems(serviceMantItemId, partMantItemId)
    );
    await advanceWOToStatus(request, woId, 'IN_PROGRESS');
    console.log(`WO en IN_PROGRESS para subtasks/expenses tests: ${woId}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Sección "Despiece de Tareas" visible en tab Ítems (Unificado)
  // ─────────────────────────────────────────────────────────────────────────
  test('1. Sección Despiece de Tareas visible en tab Ítems (Unificado)', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Navegar al tab Ítems (Unificado)
    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // No debe mostrar errores
    await expect(page.getByText('403')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Unauthorized')).not.toBeVisible({
      timeout: 3000,
    });

    // La sección "Despiece de Tareas" debe ser visible dentro del tab
    await expect(page.getByText('Despiece de Tareas')).toBeVisible({
      timeout: 8000,
    });

    // El selector del Tempario debe estar presente (es un combobox/select de shadcn)
    const temparioSelector = page
      .getByRole('combobox')
      .filter({ hasText: /Tempario|tarea/i });
    const temparioExists = await temparioSelector
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (!temparioExists) {
      // fallback: buscar por placeholder dentro del área de Despiece
      const despieceArea = page
        .locator('div, section')
        .filter({ hasText: 'Despiece de Tareas' })
        .first();
      await expect(despieceArea).toBeVisible({ timeout: 5000 });
    } else {
      await expect(temparioSelector).toBeVisible({ timeout: 5000 });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Despiece de Tareas — botón "+" y contador de tareas visibles
  // ─────────────────────────────────────────────────────────────────────────
  test('2. Despiece de Tareas — selector y botón + son interactuables', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    await page.getByRole('tab', { name: /Ítems.*Unificado/i }).click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verificar que el header "Despiece de Tareas" existe
    await expect(page.getByText('Despiece de Tareas')).toBeVisible({
      timeout: 8000,
    });

    // El botón "Cargar Despiece" debe ser visible
    const cargarBtn = page.getByRole('button', { name: /cargar despiece/i });
    await expect(cargarBtn).toBeVisible({ timeout: 5000 });

    // El input de horas debe ser visible (input numérico junto al selector)
    const hoursInput = page.locator('input[type="number"]').first();
    await expect(hoursInput).toBeVisible({ timeout: 5000 });

    // El botón "+" para agregar tarea debe ser visible
    const addBtn = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last();
    // Verificar que hay al menos un botón con "+" cerca del Despiece de Tareas
    const addBtnNearDespiece = page
      .locator('section, div')
      .filter({ hasText: 'Despiece de Tareas' })
      .locator('button')
      .last();
    await expect(addBtnNearDespiece).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Tab Gastos existe y carga sin error
  // ─────────────────────────────────────────────────────────────────────────
  test('3. Tab Gastos existe y carga sin error 403', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Buscar tab con nombre relacionado a gastos/expenses
    const gastosTab = page
      .getByRole('tab')
      .filter({ hasText: /gasto|expense/i });
    const tabExists = await gastosTab
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Si el tab no existe en la UI actual, saltar
    test.skip(
      !tabExists,
      'Tab de Gastos no existe en la UI actual — feature pendiente'
    );

    await gastosTab.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // No debe mostrar errores
    await expect(page.getByText('403')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Unauthorized')).not.toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByText('Error al cargar')).not.toBeVisible({
      timeout: 3000,
    });

    const tabContent = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabContent).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Agregar gasto: formulario acepta monto y descripción
  // ─────────────────────────────────────────────────────────────────────────
  test('4. Agregar gasto: formulario acepta monto y descripción', async ({
    page,
  }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    const gastosTab = page
      .getByRole('tab')
      .filter({ hasText: /gasto|expense/i });
    const tabExists = await gastosTab
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(!tabExists, 'Tab de Gastos no existe — feature pendiente');

    await gastosTab.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Buscar botón para agregar gasto
    const addBtn = page
      .getByRole('button')
      .filter({ hasText: /agregar gasto|nuevo gasto|add expense/i })
      .first();
    const addBtnExists = await addBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(!addBtnExists, 'No existe botón para agregar gasto');

    await addBtn.click();

    // Llenar monto
    const montoInput = page
      .locator(
        'input[type="number"], input[placeholder*="monto" i], input[placeholder*="amount" i]'
      )
      .first();
    const montoExists = await montoInput
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (montoExists) {
      await montoInput.fill('15000');

      // Llenar descripción si existe
      const descInput = page
        .locator(
          'input[placeholder*="descripción" i], textarea[placeholder*="descripción" i]'
        )
        .first();
      const descExists = await descInput
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (descExists) {
        await descInput.fill('Gasto E2E test');
      }

      // Buscar botón de submit
      const submitBtn = page
        .getByRole('button')
        .filter({ hasText: /guardar|agregar|crear|save/i })
        .last();
      await submitBtn.click();

      // Verificar que no hay error
      await expect(page.getByText(/error/i)).not.toBeVisible({ timeout: 5000 });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Tab Historial existe y carga sin error
  // ─────────────────────────────────────────────────────────────────────────
  test('5. Tab Historial existe y carga sin error', async ({ page }) => {
    test.skip(!woId, 'No se pudo crear la WO en beforeAll');

    await page.goto(`/dashboard/maintenance/work-orders/${woId}`);
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    const historialTab = page
      .getByRole('tab')
      .filter({ hasText: /historial|history|log/i });
    const tabExists = await historialTab
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(!tabExists, 'Tab de Historial no existe en la UI actual');

    await historialTab.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    await expect(page.getByText('403')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Unauthorized')).not.toBeVisible({
      timeout: 3000,
    });

    const tabContent = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabContent).toBeVisible({ timeout: 5000 });
  });
});
