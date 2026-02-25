const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/loginpage');
const { BASE_URL } = require('../constants');

test('TS-13166 Login with invalid email', async ({ page }) => {
  await page.goto(BASE_URL);

  const loginPage = new LoginPage(page);
  await loginPage.enterEmail('invalid-email');
  await loginPage.clickNext();

  await expect(page).toHaveURL(/microsoftonline|login|signin/i);
});
