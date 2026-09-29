import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testIgnore: ['mobile-navigation.spec.ts', 'server/**'], fullyParallel: false, workers: 1,
  use: { baseURL: 'http://localhost:3000', browserName: 'chromium', channel: 'msedge' },
  webServer: { command: 'npm run start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, timeout: 120000 },
});
