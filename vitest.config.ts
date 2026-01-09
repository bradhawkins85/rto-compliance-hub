import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'dist/',
        'server/dist/',
        '.prisma/',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'server/dist',
      '.prisma',
      'tests/e2e/**', // Exclude E2E tests - they run with Playwright
      'tests/integration/**', // Exclude integration tests for now
    ],
  },
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
      '@server': resolve(projectRoot, 'server/src'),
    },
  },
});
