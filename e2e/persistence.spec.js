import { test, expect } from './fixtures.js';

test('identity persists after reload', async ({ page }) => {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await page.getByPlaceholder(/First name/).fill('Saved User');
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill('PERSIST1');
  await page.getByRole('button', { name: 'QB' }).click();
  await page.getByRole('button', { name: '11th' }).click();
  await page.getByRole('button', { name: /Join Team & Start Tracking/ }).click();
  await expect(page.getByText('Saved User')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Saved User')).toBeVisible();
  await expect(page.getByText('PICK PHASE + SESSION TYPE')).toBeVisible();
});
