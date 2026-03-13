import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 20000,
    hookTimeout: 20000,
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  resolve: {
    alias: {
      '@test': path.resolve(__dirname, './src/test'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
