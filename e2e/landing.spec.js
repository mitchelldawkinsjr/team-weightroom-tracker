import { test, expect } from './fixtures.js';

test('landing shows title and who are you', async ({ page }) => {
  await expect(page.getByText('STATE CHAMPIONSHIP')).toBeVisible();
  await expect(page.getByText('Training Tracker')).toBeVisible();
  await expect(page.getByText('Who are you?')).toBeVisible();
});

test('landing has athlete and coach options', async ({ page }) => {
  await expect(page.getByRole('button', { name: /I'm an Athlete/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /I'm a Coach/i })).toBeVisible();
});

test('clicking athlete goes to setup', async ({ page }) => {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await expect(page.getByText('Set Up Your Profile')).toBeVisible();
  await expect(page.getByPlaceholder(/First name/)).toBeVisible();
});

test('clicking coach goes to setup', async ({ page }) => {
  await page.getByRole('button', { name: /I'm a Coach/i }).click();
  await expect(page.getByText('Set Up Your Profile')).toBeVisible();
});

test('team code info box is visible', async ({ page }) => {
  await expect(page.getByText(/Both athletes and coaches use the same/)).toBeVisible();
  await expect(page.getByText(/Team Code/)).toBeVisible();
});
