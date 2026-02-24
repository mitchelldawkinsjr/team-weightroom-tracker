// Reset storage before each test so identity/sessions don't leak
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await page.evaluate(() => window.__storageReset && window.__storageReset());
    await page.reload();
    await use(page);
  },
});

export { expect } from '@playwright/test';
