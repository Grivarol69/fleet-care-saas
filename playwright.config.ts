import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Carga .env.e2e si existe, sino .env.test
const e2eEnv = path.resolve(__dirname, '.env.e2e');
const testEnv = path.resolve(__dirname, '.env.test');
dotenv.config({ path: e2eEnv });
dotenv.config({ path: testEnv, override: false });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/global.setup.ts',
    fullyParallel: false, // secuencial en staging para evitar rate limits
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [['html', { open: 'never' }], ['list']],
    timeout: 60000,

    use: {
        baseURL: BASE_URL,
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },

    projects: [
        // --- Setup: crea los archivos de sesión autenticada ---
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },

        // --- Tests sin auth (redirecciones, seguridad pública) ---
        {
            name: 'unauthenticated',
            use: {
                ...devices['Desktop Chrome'],
                storageState: { cookies: [], origins: [] },
            },
            testMatch: /.*\.public\.spec\.ts/,
        },

        // --- Tests como OWNER ---
        {
            name: 'as-owner',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/owner.json',
            },
            dependencies: ['setup'],
            testMatch: /.*\.owner\.spec\.ts/,
        },

        // --- Tests como TECHNICIAN ---
        {
            name: 'as-technician',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/technician.json',
            },
            dependencies: ['setup'],
            testMatch: /.*\.technician\.spec\.ts/,
        },
    ],
});
