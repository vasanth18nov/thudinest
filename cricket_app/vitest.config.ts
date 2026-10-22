import { defineConfig } from 'vitest/config';

// Unit tests for pure logic (points table, NRR, fixture generation, stats, CSV).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
