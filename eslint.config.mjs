import nextPlugin from '@next/eslint-plugin-next';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ...nextPlugin.flatConfig.recommended,
    files: ['**/*.{js,jsx,ts,tsx}'],
  },
  {
    ...nextPlugin.flatConfig.coreWebVitals,
    files: ['**/*.{js,jsx,ts,tsx}'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Block A — restrict raw prisma import in API routes
  {
    files: ['src/app/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/prisma',
              importNames: ['prisma'],
              message:
                'Use tenantPrisma from requireCurrentUser() instead. If you genuinely need raw prisma (global data, platform admin, onboarding), add this file to the allowlist in eslint.config.mjs.',
            },
          ],
        },
      ],
    },
  },
  // Block B — allowlist: files where raw prisma is validated as safe
  // Original 13 audited files + additional legitimate uses discovered at lint time.
  // send-cv/route.tsx is intentionally excluded (fixed in Phase 1).
  {
    files: [
      // Original spec allowlist (13 files)
      // Note: brackets in Next.js dynamic segments must be escaped for minimatch
      'src/app/api/tenants/route.ts',
      'src/app/api/admin/users/\\[userId\\]/role/route.ts',
      'src/app/api/maintenance/work-orders/\\[id\\]/purchase-orders/route.ts',
      'src/app/api/maintenance/mant-items/\\[id\\]/route.ts',
      'src/app/api/maintenance/mant-categories/\\[id\\]/route.ts',
      'src/app/api/maintenance/mant-template/global/route.ts',
      'src/app/api/maintenance/mant-item-requests/route.ts',
      'src/app/api/maintenance/mant-items/similar/route.ts',
      'src/app/api/maintenance/vehicle-parts/route.ts',
      'src/app/api/maintenance/vehicles/\\[id\\]/recipes/route.ts',
      'src/app/api/vehicles/brands/\\[id\\]/route.ts',
      'src/app/api/vehicles/lines/\\[id\\]/route.ts',
      'src/app/api/vehicles/document-types/route.ts',
      // Additional legitimate uses (discovered at baseline lint)
      'src/app/api/admin/kb/import/route.ts',
      'src/app/api/admin/kb/save/route.ts',
      'src/app/api/dashboard/__tests__/dashboard-metrics.test.ts',
      'src/app/api/internal-tickets/route.ts',
      'src/app/api/inventory/purchases/route.ts',
      'src/app/api/inventory/__tests__/inventory-lifecycle.test.ts',
      'src/app/api/invoices/__tests__/invoice-lifecycle.test.ts',
      'src/app/api/maintenance/packages/route.ts',
      'src/app/api/maintenance/__tests__/mant-items-crud.test.ts',
      'src/app/api/maintenance/vehicle-parts/\\[id\\]/route.ts',
      'src/app/api/maintenance/vehicle-parts/suggest/route.ts',
      'src/app/api/maintenance/work-orders/\\[id\\]/__tests__/route.test.ts',
      'src/app/api/maintenance/work-orders/__tests__/corrective-internal.test.ts',
      'src/app/api/maintenance/work-orders/__tests__/e2e-flow.test.ts',
      'src/app/api/maintenance/work-orders/__tests__/preventive-circuit.test.ts',
      'src/app/api/maintenance/work-orders/__tests__/work-order-api.test.ts',
      'src/app/api/people/__tests__/people-crud.test.ts',
      'src/app/api/purchase-orders/\\[id\\]/send-email/route.tsx',
      'src/app/api/purchase-orders/__tests__/purchase-order-lifecycle.test.ts',
      'src/app/api/reports/maintenance-costs/route.ts',
      'src/app/api/tenants/current/route.ts',
      'src/app/api/__tests__/multi-tenant-security.test.ts',
      'src/app/api/users/\\[userId\\]/role/route.ts',
      'src/app/api/vehicles/__tests__/vehicles-crud.test.ts',
      'src/app/api/vehicles/types/\\[id\\]/route.ts',
      'src/app/api/webhooks/clerk/route.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];

export default eslintConfig;
