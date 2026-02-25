const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/loginpage');
const { BASE_URL } = require('../constants');

test('TS-13165 Login with valid credentials', async ({ page }) => {
  await page.goto(BASE_URL);

  const loginPage = new LoginPage(page);
  await loginPage.loginToApplication();

  await expect(page).toHaveURL(/timesheet/i);
});
