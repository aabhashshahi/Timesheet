const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/loginpage');
const SettingsPage = require('../../pages/settingspage');
const { BASE_URL } = require('../constants');

test.setTimeout(90000);

test('TS-13238 Change default timesheet to Daily', async ({ page }) => {
  await page.goto(BASE_URL);

  const loginPage = new LoginPage(page);
  await loginPage.loginToApplication();

  const settingsPage = new SettingsPage(page);
  await settingsPage.openSettings();
  await settingsPage.setDefaultTimesheetToDay();
  await settingsPage.clickUpdate();
  await settingsPage.openTimesheetByDay();

  await expect(page.getByRole('heading', { name: /Timesheet by Day/i })).toBeVisible();
});
