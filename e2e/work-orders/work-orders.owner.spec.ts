/**
 * Tests de Órdenes de Trabajo — rol OWNER.
 *
 * Verifica el flujo completo: acceso, creación, cambios de estado.
 */
import { test, expect } from '@playwright/test';

test.describe('OT — OWNER', () => {
  test('puede acceder al listado de OTs', async ({ page }) => {
    await page.goto('/dashboard/maintenance/work-orders');
    await expect(page).toHaveURL(/maintenance\/work-orders/, {
      timeout: 15000,
    });
    await expect(page.locator('text=403')).not.toBeVisible();
    await expect(page.locator('text=Unauthorized')).not.toBeVisible();
  });

  test('puede acceder al módulo de alertas', async ({ page }) => {
    await page.goto('/dashboard/maintenance/alerts');
    await expect(page).toHaveURL(/maintenance\/alerts/, { timeout: 15000 });
    await expect(page.locator('text=403')).not.toBeVisible();
  });

  test('ve el botón de Crear OT en alertas al seleccionar una alerta', async ({
    page,
  }) => {
    await page.goto('/dashboard/maintenance/alerts');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Expandir la primera fila de vehículo (h3 con la placa burbujea el click al padre)
    const firstPlate = page.locator('h3.font-bold').first();
    await expect(firstPlate).toBeVisible({ timeout: 10000 });
    await firstPlate.click();

    // Esperar a que el contenido expandido sea visible y marcar el primer checkbox
    const firstCheckbox = page.locator('[role="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible({ timeout: 5000 });
    await firstCheckbox.click();

    // El botón "Crear Orden de Trabajo" debe aparecer en el footer sticky
    const createBtn = page.getByRole('button', {
      name: /crear orden de trabajo/i,
    });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
  });

  test('puede ver el detalle de una OT existente', async ({ page }) => {
    await page.goto('/dashboard/maintenance/work-orders');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Si hay OTs, hacer click en la primera
    const firstRow = page.locator('table tbody tr').first();
    const hasRows = await firstRow.isVisible().catch(() => false);

    if (hasRows) {
      await firstRow.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      // Debe mostrar el detalle (no 403 ni 404)
      await expect(page.locator('text=403')).not.toBeVisible();
      await expect(page.locator('text=404')).not.toBeVisible();
    } else {
      test.skip(true, 'No hay OTs en staging para verificar detalle');
    }
  });

  test('puede acceder al dashboard principal sin errores', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    // No debe haber errores visibles
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('el sidebar es visible y tiene scroll habilitado', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Buscar el div con overflow-y-auto aplicado por SidebarRoutes
    const sidebarScroll = page.locator('.overflow-y-auto').first();
    await expect(sidebarScroll).toBeVisible({ timeout: 10000 });

    // Verificar que el overflow-y es auto o scroll (scroll habilitado)
    const overflowY = await sidebarScroll.evaluate(
      el => window.getComputedStyle(el).overflowY
    );
    expect(['auto', 'scroll']).toContain(overflowY);
  });
});
