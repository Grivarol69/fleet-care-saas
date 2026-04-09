/**
 * Tests de Órdenes de Trabajo — rol TECHNICIAN.
 *
 * Cubre el flujo que falló en staging:
 *   TECHNICIAN debía poder crear OTs (antes retornaba 403).
 */
import { test, expect } from '@playwright/test';

test.describe('OT — TECHNICIAN', () => {
  test('puede acceder al módulo de alertas de mantenimiento', async ({
    page,
  }) => {
    await page.goto('/dashboard/maintenance/alerts');
    await expect(page).toHaveURL(/maintenance\/alerts/, { timeout: 15000 });
    // No debe mostrar "Unauthorized" ni error
    await expect(page.locator('text=Unauthorized')).not.toBeVisible();
    await expect(page.locator('text=403')).not.toBeVisible();
  });

  test('puede acceder al listado de órdenes de trabajo', async ({ page }) => {
    await page.goto('/dashboard/maintenance/work-orders');
    await expect(page).toHaveURL(/maintenance\/work-orders/, {
      timeout: 15000,
    });
    await expect(page.locator('text=403')).not.toBeVisible();
  });

  test('puede crear una OT desde alertas — sin 403', async ({ page }) => {
    await page.goto('/dashboard/maintenance/alerts');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Expandir la primera fila de vehículo (h3 con la placa burbujea el click al padre)
    const firstPlate = page.locator('h3.font-bold').first();
    await expect(firstPlate).toBeVisible({ timeout: 10000 });
    await firstPlate.click();

    // Marcar el primer checkbox disponible para seleccionar una alerta
    const firstCheckbox = page.locator('[role="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible({ timeout: 5000 });
    await firstCheckbox.click();

    // El botón "Crear Orden de Trabajo" aparece en el footer sticky
    const createBtn = page.getByRole('button', {
      name: /crear orden de trabajo/i,
    });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    // El botón está en un footer fixed (position: fixed bottom-6) — dispatchEvent
    // para evitar el error "outside of viewport" de Playwright
    await createBtn.dispatchEvent('click');

    // Debe aparecer el modal de creación (no un error 403)
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 10000,
    });

    // Verificar que no hay error de permisos
    await expect(page.locator('text=403')).not.toBeVisible();
    await expect(page.locator('text=No tienes permisos')).not.toBeVisible();
  });

  test('NO puede aprobar órdenes de trabajo', async ({ page }) => {
    await page.goto('/dashboard/maintenance/work-orders');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // El botón "Aprobar" no debe aparecer para TECHNICIAN
    await expect(page.locator('button:has-text("Aprobar")')).not.toBeVisible();
  });
});
