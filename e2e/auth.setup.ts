import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    // Perform authentication steps similar to auth.spec.ts
    await page.goto('/sign-in');

    await page.waitForSelector('input[name="identifier"]');
    await page.fill('input[name="identifier"]', 'e2e-test-owner@fleetcare.app');
    await page.click('button[data-localization-key="formButtonPrimary"]');

    await page.waitForSelector('input[name="password"]');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[data-localization-key="formButtonPrimary"]');

    // Wait for redirect to Onboarding or Dashboard
    // Uses RegExp to match either
    await page.waitForURL(/(onboarding|dashboard)/);

    // Save storage state
    await page.context().storageState({ path: authFile });
});
