import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environmentMatchGlobs: [
      ['src/**/*.test.tsx', 'happy-dom'],
      ['src/features/**/components/**/*.test.ts', 'happy-dom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/features/**/actions.ts',
        'src/features/**/schemas.ts',
        'src/features/**/queries.ts',
        'src/features/**/components/**/*.tsx',
        'src/app/(public)/**/*.tsx',
        'src/app/admin/dashboard/**/*.tsx',
        'src/app/admin/layout.tsx',
        'src/lib/utils/**',
      ],
      exclude: [
        '**/*.test.*',
        '**/__tests__/**',
        '**/*.proto.tsx',
        '**/*.fixtures.ts',
      ],
    },
  },
});
