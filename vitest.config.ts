import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    // Use jsdom for tests that need DOM (bpmn-js, parseBpmnFile tests)
    environmentMatchGlobs: [
      ['**/bpmnParser*.test.ts', 'jsdom'],
      ['**/bpmnRealParse*.test.ts', 'jsdom'],
      ['**/bpmnHierarchy*.test.ts', 'jsdom'],
      ['**/processExplorer*.test.ts', 'jsdom'],
    ],
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
