import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: 'chrome',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /mobile\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      // M8 DoD: the full table flow must be playable on a 375x667 phone.
      name: 'mobile',
      testMatch: /(table|preview|mobile)\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { VITE_USE_EMULATORS: 'true' },
  },
});
