import { test, expect } from './fixtures.js';

async function loginAthlete(page, name = 'Marcus J', teamCode = 'HAWKS2025') {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await page.getByPlaceholder(/First name/).fill(name);
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill(teamCode);
  await page.getByRole('button', { name: 'RB' }).click();
  await page.getByRole('button', { name: '10th' }).click();
  await page.getByRole('button', { name: /Join Team & Start Tracking/ }).click();
  await expect(page.getByText(name)).toBeVisible();
}

async function completeCheckIn(page, sleep = 7, soreness = 3, mood = 8, motivation = 9) {
  await expect(page.getByText('PRE-SESSION CHECK-IN')).toBeVisible();
  const scales = page.getByPlaceholder('1–10');
  await scales.nth(0).fill(String(sleep));
  await scales.nth(1).fill(String(soreness));
  await scales.nth(2).fill(String(mood));
  await scales.nth(3).fill(String(motivation));
  await page.getByRole('button', { name: 'No' }).click();
  await page.getByRole('button', { name: 'Start session' }).click();
}

test('athlete sees Start, Log, History tabs', async ({ page }) => {
  await loginAthlete(page);
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'History' })).toBeVisible();
});

test('athlete sees all 5 phases with Lift and Speed', async ({ page }) => {
  await loginAthlete(page);
  await expect(page.getByText('Phase 1 — Foundation')).toBeVisible();
  await page.getByText('Phase 5 — Camp Ready').scrollIntoViewIfNeeded();
  await expect(page.getByText('Phase 5 — Camp Ready')).toBeVisible();
  await expect(page.getByText('LIFT').first()).toBeVisible();
  await expect(page.getByText('SPEED').first()).toBeVisible();
});

test('athlete can start a Phase 1 Lift session', async ({ page }) => {
  await loginAthlete(page);
  await page.locator('button:has-text("LIFT")').first().click();
  await completeCheckIn(page);
  await expect(page.getByText('PHASE 1 — LIFT DAY')).toBeVisible();
  await expect(page.getByText('Goblet Squat')).toBeVisible();
});

test('athlete can start a Phase 1 Speed session', async ({ page }) => {
  await loginAthlete(page);
  await page.locator('button:has-text("SPEED")').first().click();
  await completeCheckIn(page);
  await expect(page.getByText('PHASE 1 — SPEED DAY')).toBeVisible();
});

test('athlete Log tab shows exercise sets and wrap-up', async ({ page }) => {
  await loginAthlete(page);
  await page.locator('button:has-text("LIFT")').first().click();
  await completeCheckIn(page);
  await expect(page.getByPlaceholder('lbs / kg').first()).toBeVisible();
  await expect(page.getByPlaceholder('reps').first()).toBeVisible();
  await expect(page.getByText('Session Wrap-Up')).toBeVisible();
  await expect(page.getByText('HOW HARD? (1–10)')).toBeVisible();
  await expect(page.getByPlaceholder('RPE')).toBeVisible();
  await expect(page.getByPlaceholder('mins')).toBeVisible();
});

test('athlete can toggle set done and add set', async ({ page }) => {
  await loginAthlete(page);
  await page.locator('button:has-text("LIFT")').first().click();
  await completeCheckIn(page);
  const checkButtons = page.getByRole('button').filter({ has: page.locator('svg') });
  await checkButtons.first().click();
  await expect(page.getByText('1/24')).toBeVisible();
  await page.getByRole('button', { name: /Add Set/ }).first().click();
  await expect(page.getByText('1/25')).toBeVisible();
});

test('athlete can enter weight and reps', async ({ page }) => {
  await loginAthlete(page);
  await page.locator('button:has-text("LIFT")').first().click();
  await completeCheckIn(page);
  await page.getByPlaceholder('lbs / kg').first().fill('135');
  await page.getByPlaceholder('reps').first().fill('10');
  await expect(page.getByPlaceholder('lbs / kg').first()).toHaveValue('135');
  await expect(page.getByPlaceholder('reps').first()).toHaveValue('10');
});

test('athlete RPE and duration show Load Score', async ({ page }) => {
  await loginAthlete(page);
  await page.locator('button:has-text("LIFT")').first().click();
  await completeCheckIn(page);
  await page.getByPlaceholder('RPE').fill('7');
  await page.getByPlaceholder('mins').fill('45');
  await expect(page.getByText('Load Score (Gabbett)')).toBeVisible();
  await expect(page.getByText('315')).toBeVisible();
});

test('athlete can finish session and see in History', async ({ page }) => {
  await loginAthlete(page);
  await page.locator('button:has-text("LIFT")').first().click();
  await completeCheckIn(page);
  await page.getByRole('button', { name: /Save Progress|Save & Sync Session/ }).click();
  await expect(page.getByText('PICK PHASE + SESSION TYPE')).toBeVisible();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText('1 SESSION')).toBeVisible();
  await expect(page.getByText('Phase 1 · Lift')).toBeVisible();
});

test('athlete can discard session', async ({ page }) => {
  await loginAthlete(page);
  await page.locator('button:has-text("LIFT")').first().click();
  await completeCheckIn(page);
  await page.getByRole('button', { name: 'Discard session' }).click();
  await expect(page.getByText('PICK PHASE + SESSION TYPE')).toBeVisible();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText('0 SESSIONS')).toBeVisible();
});

test('athlete switch account returns to setup', async ({ page }) => {
  await loginAthlete(page);
  await expect(page.getByRole('button', { name: 'Switch account / team code' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch account / team code' }).click();
  await expect(page.getByText('Set Up Your Profile')).toBeVisible();
});

test('athlete History empty state', async ({ page }) => {
  await loginAthlete(page);
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText('No sessions yet.')).toBeVisible();
});
