import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Management', () => {
  // Basic smoke test to verify access and rendering
  // Authentication is handled via existing setup or manual login simulation
  // Since we don't have a global auth setup guaranteed, we'll use a skipped test
  // or a manual login if possible, similar to `vehicles/crud.spec.ts` but attempting to go further.

  // For now, we will verify the page exists and redirects if not logged in
  test('should redirect unauthenticated users', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard/vehicles/documents');
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test('should display active document types grid', async ({ page }) => {
    // 1. Navigate to Documents (auth state is loaded from storageState in global config)
    await page.goto('/dashboard/vehicles/documents');

    // 2. Verify we are on the correct page
    await expect(page).toHaveURL(/.*\/documents/);

    // 3. Verify Grid or List is visible (since we have 5 types configured)
    // We look for common elements like "Vencimiento" or "Estado" headers
    await expect(
      page.getByRole('heading', { level: 1, name: /biografía|document/i })
    ).toBeVisible();

    // Check for specific document types we know exist (based on typical seed data like SOAT, Tecno)
    // Or at least check that the empty state is NOT visible
    await expect(
      page.getByText('No hay tipos de documentos configurados')
    ).not.toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Ir a Configuración' })
    ).not.toBeVisible();
  });
});
