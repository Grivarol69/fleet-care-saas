import { test, expect } from '@playwright/test';

test.describe('Vehicle Security', () => {
    // Use a clean state
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should redirect unauthenticated users when accessing vehicles', async ({ page }) => {
        // 1. Navigate to Vehicles
        await page.goto('/dashboard/vehicles');

        // 2. Expect redirect to sign-in
        await expect(page).toHaveURL(/.*sign-in/);
    });
});
