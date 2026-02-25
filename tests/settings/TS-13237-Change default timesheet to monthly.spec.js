const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/loginpage');
const SettingsPage = require('../../pages/settingspage');
const { BASE_URL } = require('../constants');

test.setTimeout(90000);

test('TS-13237 Change default timesheet to Monthly', async ({ page }) => {
  await page.goto(BASE_URL);

  const loginPage = new LoginPage(page);
  await loginPage.loginToApplication();

  const settingsPage = new SettingsPage(page);
  await settingsPage.openSettings();
  await settingsPage.setDefaultTimesheetToMonth();
  await settingsPage.clickUpdate();
  await settingsPage.openTimesheetByMonth();

  await expect(page.getByRole('heading', { name: /Timesheet by Month/i })).toBeVisible();
});
