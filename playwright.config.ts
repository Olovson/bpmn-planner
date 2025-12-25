import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Isolerar Playwright-specar till en egen katalog så att de inte krockar
  // med Vitest-baserade tester i ./tests/.
  testDir: './tests/playwright-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './tests/playwright-e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    // Screenshots för att se vad som händer vid fel
    screenshot: 'only-on-failure',
    // Video för att se vad som händer (sparas bara vid fel för att spara diskutrymme)
    video: 'retain-on-failure',
    // Headless: false för att se browsern (kan sättas via --headed flagga också)
    // headless: false, // Kommenterat ut - använd --headed flagga istället
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Använd storage state för att spara login-session
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
