import { test, expect } from './fixtures.js';

test('setup back returns to landing', async ({ page }) => {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await expect(page.getByText('Set Up Your Profile')).toBeVisible();
  await page.getByRole('button').first().click();
  await expect(page.getByText('Who are you?')).toBeVisible();
});

test('setup shows coach checkbox and PIN when checked', async ({ page }) => {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await expect(page.getByLabel(/I am a coach/)).toBeVisible();
  await page.getByLabel(/I am a coach/).check();
  await expect(page.getByPlaceholder(/Enter coach PIN/)).toBeVisible();
});

test('setup validation: empty name shows error', async ({ page }) => {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await page.getByPlaceholder(/First name/).fill('');
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill('HAWK');
  await page.getByRole('button', { name: /Join Team/ }).click();
  await expect(page.getByText('Enter your name.')).toBeVisible();
});

test('setup validation: short team code shows error', async ({ page }) => {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await page.getByPlaceholder(/First name/).fill('Test Athlete');
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill('AB');
  await page.getByRole('button', { name: /Join Team/ }).click();
  await expect(page.getByText(/Team code must be at least 4/)).toBeVisible();
});

test('setup athlete: position and grade selectors visible', async ({ page }) => {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await expect(page.getByRole('button', { name: 'QB' })).toBeVisible();
  await expect(page.getByRole('button', { name: '9th' })).toBeVisible();
});

test('setup athlete: valid submit enters athlete app', async ({ page }) => {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await page.getByPlaceholder(/First name/).fill('Marcus J');
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill('HAWKS2025');
  await page.getByRole('button', { name: 'RB' }).click();
  await page.getByRole('button', { name: '10th' }).click();
  await page.getByRole('button', { name: /Join Team & Start Tracking/ }).click();
  await expect(page.getByText('Marcus J')).toBeVisible();
  await expect(page.getByText('PICK PHASE + SESSION TYPE')).toBeVisible();
});

test('setup coach: wrong PIN shows error', async ({ page }) => {
  await page.getByRole('button', { name: /I'm a Coach/i }).click();
  await page.getByPlaceholder(/First name/).fill('Coach Smith');
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill('HAWKS2025');
  await page.getByLabel(/I am a coach/).check();
  await page.getByPlaceholder(/Enter coach PIN/).fill('wrong');
  await page.getByRole('button', { name: /Enter Coach Dashboard/ }).click();
  await expect(page.getByText(/Incorrect coach PIN/)).toBeVisible();
});

test('setup coach: correct PIN enters coach dashboard', async ({ page }) => {
  await page.getByRole('button', { name: /I'm a Coach/i }).click();
  await page.getByPlaceholder(/First name/).fill('Coach Smith');
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill('HAWKS2025');
  await page.getByLabel(/I am a coach/).check();
  await page.getByPlaceholder(/Enter coach PIN/).fill('COACH2025');
  await page.getByRole('button', { name: /Enter Coach Dashboard/ }).click();
  await expect(page.getByText('📋 COACH VIEW')).toBeVisible();
  await expect(page.getByText('Coach Smith')).toBeVisible();
});
