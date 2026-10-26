import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', workers: 1, timeout: 45000,
  reporter: [['list'], ['json', { outputFile: 'evidencias/e2e-resultados.json' }]],
  use: { baseURL: 'http://127.0.0.1:3002', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: { command: 'npx tsx tests/e2e/server.ts', url: 'http://127.0.0.1:3002/api/health', reuseExistingServer: false, timeout: 30000 },
});
