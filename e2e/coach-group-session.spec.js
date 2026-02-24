import { test, expect } from "./fixtures.js";

const COACH_PIN = "COACH2025";
const TEAM = "GRP2025";

async function loginCoach(page, teamCode = TEAM) {
  await page.getByRole("button", { name: /I'm a Coach/i }).click();
  await page.getByPlaceholder(/First name/).fill("Coach Smith");
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill(teamCode);
  await page.getByLabel(/I am a coach/).check();
  await page.getByPlaceholder(/Enter coach PIN/).fill(COACH_PIN);
  await page.getByRole("button", { name: /Enter Coach Dashboard/ }).click();
  await expect(page.getByText("COACH VIEW").first()).toBeVisible();
}

async function addAthleteWithJersey(page, name, jersey, teamCode = TEAM) {
  await page.getByRole("button", { name: /I'm an Athlete/i }).click();
  await page.getByPlaceholder(/First name/).fill(name);
  await page.getByPlaceholder(/e.g. HAWKS2025/).fill(teamCode);
  await page.getByRole("button", { name: "RB" }).click();
  await page.getByRole("button", { name: "10th" }).click();
  const jerseyInput = page.getByPlaceholder(/e.g. 12/);
  if (await jerseyInput.isVisible()) {
    await jerseyInput.fill(String(jersey));
  }
  await page.getByRole("button", { name: /Join Team & Start Tracking/ }).click();
  await expect(page.getByText(name)).toBeVisible();
}

test("coach dashboard shows Start Group Session button", async ({ page }) => {
  await loginCoach(page);
  await expect(page.getByRole("button", { name: /Start Group Session/ })).toBeVisible();
});

test("group session opens and shows Step 1 select athletes", async ({ page }) => {
  await loginCoach(page);
  await page.getByRole("button", { name: /Start Group Session/ }).click();
  await expect(page.getByText("Group Session").first()).toBeVisible();
  await expect(page.getByText("Step 1: Select Athletes")).toBeVisible();
  await expect(page.getByPlaceholder(/e.g. 12, 7, 23/)).toBeVisible();
});

test("group session Next disabled when no athletes selected", async ({ page }) => {
  await loginCoach(page);
  await page.getByRole("button", { name: /Start Group Session/ }).click();
  await expect(page.getByText("Step 1: Select Athletes")).toBeVisible();
  const nextBtn = page.getByRole("button", { name: /Next: Pick Session Type/ });
  await expect(nextBtn).toBeDisabled();
});

test("group session: select one athlete by checkbox then pick phase and reach exercise log", async ({ page }) => {
  await addAthleteWithJersey(page, "Sam P", 9);
  await page.getByRole("button", { name: "Switch account / team code" }).click();
  await expect(page.getByText("Set Up Your Profile")).toBeVisible();
  await page.locator("button").first().click();
  await loginCoach(page);
  await expect(page.getByText("COACH VIEW").first()).toBeVisible();
  await expect(page.getByText("Sam P").first()).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: /Start Group Session/ }).click();
  await expect(page.getByText("Step 1: Select Athletes")).toBeVisible();
  await page.getByRole("checkbox", { name: /Sam P/ }).check();
  await page.getByRole("button", { name: /Next: Pick Session Type \(1 athlete\)/ }).click();
  await expect(page.getByText(/Step 2.*Phase/)).toBeVisible();
  await page.getByText("Phase 1").first().click();
  await page.getByText("LIFT").first().click();
  await expect(page.getByText("Exercise 1 of")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("PHASE 1")).toBeVisible();
});

test("group session: quick entry by jersey number adds athlete", async ({ page }) => {
  await addAthleteWithJersey(page, "Jake R", 12);
  await page.getByRole("button", { name: "Switch account / team code" }).click();
  await expect(page.getByText("Set Up Your Profile")).toBeVisible();
  await page.locator("button").first().click();
  await loginCoach(page);
  await expect(page.getByText("COACH VIEW").first()).toBeVisible();
  await expect(page.getByText("Jake R").first()).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Start Group Session/ }).click();
  await page.getByPlaceholder(/e.g. 12, 7, 23/).fill("12");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText(/Selected \(1\)/)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Jake R").first()).toBeVisible();
});

test("group session: complete flow to wrap-up and save", async ({ page }) => {
  await addAthleteWithJersey(page, "Alex K", 5);
  await page.getByRole("button", { name: "Switch account / team code" }).click();
  await page.locator("button").first().click();
  await loginCoach(page);
  await expect(page.getByText("Alex K").first()).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: /Start Group Session/ }).click();
  await page.getByLabel(/Alex K/).check();
  await page.getByRole("button", { name: /Next: Pick Session Type \(1 athlete\)/ }).click();
  await page.getByText("Phase 1").first().click();
  await page.getByText("LIFT").first().click();
  await expect(page.getByText("Exercise 1 of")).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: /Continue to Wrap-Up/ }).click();
  await expect(page.getByText(/Step 4.*Wrap-Up/)).toBeVisible();
  await page.getByPlaceholder(/e.g. 8/).fill("8");
  await page.getByPlaceholder(/e.g. 60/).fill("60");
  await page.getByRole("button", { name: /Save All 1 Session/ }).click();
  await expect(page.getByText(/session.*saved/i)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("COACH VIEW").first()).toBeVisible({ timeout: 5000 });
});

test("group session: Grid and One at a time toggle visible in exercise step", async ({ page }) => {
  await addAthleteWithJersey(page, "Sam P", 9);
  await page.getByRole("button", { name: "Switch account / team code" }).click();
  await page.locator("button").first().click();
  await loginCoach(page);
  await page.getByRole("button", { name: /Start Group Session/ }).click();
  await page.getByLabel(/Sam P/).check();
  await page.getByRole("button", { name: /Next: Pick Session Type/ }).click();
  await page.getByText("Phase 1").first().click();
  await page.getByText("LIFT").first().click();
  await expect(page.getByRole("button", { name: "Grid" })).toBeVisible();
  await expect(page.getByRole("button", { name: "One at a time" })).toBeVisible();
});
