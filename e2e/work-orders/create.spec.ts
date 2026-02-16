import { test, expect } from '@playwright/test';

test.describe('Work Order Security', () => {
    // Use a clean state
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should redirect unauthenticated users when accessing work order creation', async ({ page }) => {
        await page.goto('/dashboard/work-orders/new');
        await expect(page).toHaveURL(/.*sign-in/);
    });
});
