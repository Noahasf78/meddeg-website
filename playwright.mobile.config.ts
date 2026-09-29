import { defineConfig, devices } from '@playwright/test';
import { networkInterfaces } from 'node:os';

const lanAddress = Object.values(networkInterfaces()).flatMap(addresses => addresses ?? [])
  .find(address => address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.'))?.address;

export default defineConfig({
  testDir: './tests',
  testMatch: 'mobile-navigation.spec.ts',
  workers: 1,
  use: {
    // localhost alone cannot catch Next's dev-origin/hydration regression.
    baseURL: `http://${lanAddress ?? '127.0.0.1'}:3000`,
    ...devices['iPhone 13'],
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'webkit-touch', use: { browserName: 'webkit' } },
    { name: 'chromium-touch', use: { browserName: 'chromium', channel: 'msedge' } },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 0.0.0.0',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
