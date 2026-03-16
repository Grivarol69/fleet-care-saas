/**
 * Tests públicos (sin autenticación).
 * Verifican que las rutas protegidas redirijan a /sign-in.
 */
import { test, expect } from '@playwright/test';

test.describe('Rutas protegidas — sin autenticación', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/maintenance/alerts',
    '/dashboard/maintenance/work-orders',
    '/dashboard/vehicles',
    '/dashboard/inventory',
  ];

  for (const route of protectedRoutes) {
    test(`redirige ${route} → /sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
    });
  }
});
