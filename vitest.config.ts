import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
