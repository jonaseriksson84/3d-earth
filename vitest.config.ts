import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/scripts/earth/*.ts'],
      exclude: [
        'src/scripts/earth/index.ts',
        'src/scripts/earth/types.ts',
        'src/scripts/main.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@scripts': '/src/scripts',
    },
  },
});
