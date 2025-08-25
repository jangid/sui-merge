import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/setupTests.ts',
    css: true,
    singleThread: true,
    pool: 'vmThreads',
    threads: false,
    coverage: {
      provider: (process.env.CI_COVERAGE_PROVIDER as 'v8' | 'istanbul') || 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.d.ts'],
      thresholds: {
        lines: Number(process.env.CI_COVERAGE_THRESH_LINES || 70),
        functions: Number(process.env.CI_COVERAGE_THRESH_FUNCTIONS || 70),
        statements: Number(process.env.CI_COVERAGE_THRESH_STATEMENTS || 70),
        branches: Number(process.env.CI_COVERAGE_THRESH_BRANCHES || 60),
      },
    },
  },
});
