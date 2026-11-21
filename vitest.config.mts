import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Systems, tables and saves are engine-agnostic, so no DOM is needed.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
