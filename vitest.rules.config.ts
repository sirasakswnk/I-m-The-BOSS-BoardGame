import { defineConfig } from 'vitest/config';

// Config for Firebase Security Rules tests (run inside the emulator via `npm run test:rules`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
  },
});
