const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/loginpage');
const { BASE_URL } = require('../constants');

test('TS-13167 Login with invalid password', async ({ page }) => {
  const email = process.env.MS_EMAIL;
  if (!email) {
    throw new Error('Missing MS_EMAIL in .env for invalid password test.');
  }

  await page.goto(BASE_URL);

  const loginPage = new LoginPage(page);
  await loginPage.enterEmail(email);
  await loginPage.clickNext();
  await loginPage.enterPassword('WrongPassword123!');
  await loginPage.clickSubmit();

  await expect(page).toHaveURL(/microsoftonline|login|signin/i);
});
