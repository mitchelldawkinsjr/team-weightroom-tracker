import { test, expect } from './fixtures.js';

async function loginCoach(page, teamCode = 'HAWKS2025') {
  await page.getByRole('button', { name: /I'm a Coach/i }).click();
  await page.getByPlaceholder(/First name/).fill('Coach Smith');
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill(teamCode);
  await page.getByLabel(/I am a coach/).check();
  await page.getByPlaceholder(/Enter coach PIN/).fill('COACH2025');
  await page.getByRole('button', { name: /Enter Coach Dashboard/ }).click();
  await expect(page.getByText('📋 COACH VIEW')).toBeVisible();
}

async function loginAthlete(page, name = 'Marcus J', teamCode = 'HAWKS2025') {
  await page.getByRole('button', { name: /I'm an Athlete/i }).click();
  await page.getByPlaceholder(/First name/).fill(name);
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill(teamCode);
  await page.getByRole('button', { name: 'RB' }).click();
  await page.getByRole('button', { name: '10th' }).click();
  await page.getByRole('button', { name: /Join Team & Start Tracking/ }).click();
  await expect(page.getByText(name)).toBeVisible();
}

test('coach dashboard shows Roster, Today, Total cards', async ({ page }) => {
  await loginCoach(page);
  await expect(page.getByText('ROSTER').first()).toBeVisible();
  await expect(page.getByText('TODAY').first()).toBeVisible();
  await expect(page.getByText('TOTAL').first()).toBeVisible();
});

test('coach dashboard shows Refresh button', async ({ page }) => {
  await loginCoach(page);
  await expect(page.getByRole('button', { name: /Refresh/ })).toBeVisible();
});

test('coach shows empty roster when no athletes', async ({ page }) => {
  await loginCoach(page);
  await expect(page.getByText(/No athletes on roster yet/)).toBeVisible();
  await expect(page.getByText(/Share your team code/)).toBeVisible();
});

test('coach sees athlete after athlete joins same team', async ({ page }) => {
  await loginAthlete(page, 'Jake R', 'TEAM1');
  await page.getByRole('button', { name: 'Switch account / team code' }).click();
  await expect(page.getByText('Set Up Your Profile')).toBeVisible();
  await page.locator('button').first().click();
  await expect(page.getByText('Who are you?')).toBeVisible();
  await loginCoach(page, 'TEAM1');
  await expect(page.getByText('Jake R').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('ROSTER').first()).toBeVisible();
});

test('coach session feed has date and phase filters', async ({ page }) => {
  await loginCoach(page);
  await expect(page.getByLabel(/date/i).or(page.locator('input[type="date"]'))).toBeVisible();
  await expect(page.getByRole('combobox').or(page.locator('select'))).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
});

test('coach FULL ROSTER section and sign out', async ({ page }) => {
  await loginCoach(page);
  await expect(page.getByText('FULL ROSTER')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out of coach view' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Sign out of coach view' }).click();
  await expect(page.getByText('Set Up Your Profile')).toBeVisible();
});

test('coach can open athlete detail when roster has athlete', async ({ page }) => {
  await loginAthlete(page, 'Alex K', 'TEAM2');
  await page.getByRole('button', { name: 'Switch account / team code' }).click();
  await expect(page.getByText('Set Up Your Profile')).toBeVisible();
  await page.locator('button').first().click();
  await loginCoach(page, 'TEAM2');
  await page.getByRole('button', { name: 'Alex K' }).click();
  await expect(page.getByText('Alex K').first()).toBeVisible();
  await expect(page.getByText('ALL SESSIONS')).toBeVisible();
  await page.getByRole('button').first().click();
  await expect(page.getByText('📋 COACH VIEW')).toBeVisible();
});
