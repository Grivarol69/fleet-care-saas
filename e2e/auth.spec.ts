import { test, expect } from '@playwright/test';

test.describe('Authentication & Security', () => {
    // Use a clean state
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should redirect unauthenticated users to sign-in', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*sign-in/);
    });

    // FIXME: Login flow validation requires stable environment/mocking strategy
    test.skip('should login successfully with test user', async ({ page }) => {
        await page.goto('/sign-in');

        // Clerk's Hosted UI or Custom UI?
        // Based on .env, it seems we use /sign-in route which likely mounts <SignIn />

        // Fill Email
        // Clerk usually has an input with name="identifier"
        await page.waitForSelector('input[name="identifier"]');
        await page.fill('input[name="identifier"]', 'e2e-test-owner@fleetcare.app');

        // Click Continue (Commonly "Continue" or "Continuar")
        // Try to find the button by role
        await page.getByRole('button', { name: /continuar|continue/i }).click();

        // Fill Password
        await page.waitForSelector('input[name="password"]');
        await page.fill('input[name="password"]', 'password123');

        // Click Sign In (Commonly "Sign In" or "Iniciar Sesión" or "Continue")
        await page.getByRole('button', { name: /iniciar|sign in|continue|continuar/i }).click();

        // Wait for navigation
        // It might go to /onboarding OR /dashboard
        await page.waitForURL(/.*(onboarding|dashboard)/, { timeout: 15000 });

        console.log('Navigated to:', page.url());

        // Perform Onboarding (Basic Smoke)
        // Create expectations based on where we landed
        if (page.url().includes('onboarding')) {
            await expect(page.locator('h1')).toBeVisible();
        } else {
            await expect(page).toHaveURL(/.*dashboard/);
        }
    });
});
