import { defineConfig } from 'vitest/config';

// Config for Firebase Security Rules tests (run inside the emulator via `npm run test:rules`).
// Real tests are added in Milestone M3 (plan.md section 6).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    passWithNoTests: true,
  },
});
