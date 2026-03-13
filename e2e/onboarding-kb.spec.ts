import { test, expect } from '@playwright/test';

test.describe('Onboarding KB Precarga', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should redirect unauthenticated users from onboarding', async ({ page }) => {
        await page.goto('/onboarding');
        await expect(page).toHaveURL(/.*sign-in/);
    });

    test('onboarding page loads with correct structure when authenticated', async ({ page }) => {
        test.skip(true, 'Requires authenticated user - skipped until auth setup is complete');
        
        await page.goto('/onboarding');
        
        await expect(page.locator('h1')).toContainText('Bienvenido a Fleet Care');
        await expect(page.locator('text=Configuremos tu espacio de trabajo')).toBeVisible();
    });

    test('KB step shows checkboxes and data counts', async ({ page }) => {
        test.skip(true, 'Requires authenticated user - skipped until auth setup is complete');
        
        await page.goto('/onboarding');
        
        await expect(page.locator('text=Precargar Datos Iniciales')).toBeVisible();
        
        await expect(page.locator('text=Marcas, Líneas y Tipos')).toBeVisible();
        await expect(page.locator('text=Items de Mantenimiento')).toBeVisible();
        
        await expect(page.locator('button:has-text("Continuar sin precargar")')).toBeVisible();
        await expect(page.locator('button:has-text("Precargar y Continuar")')).toBeVisible();
    });

    test('skip button calls onSuccess without copying', async ({ page }) => {
        test.skip(true, 'Requires authenticated user - skipped until auth setup is complete');
        
        await page.goto('/onboarding');
        
        await page.click('button:has-text("Continuar sin precargar")');
        
        await expect(page).toHaveURL(/.*dashboard/);
    });
});
