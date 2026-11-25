import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'tests']
    },
    setupFiles: ['./tests/setup.ts'],
    reporters: ['verbose'],
    outputFile: {
      junit: './tests/results/junit.xml'
    }
  }
});
