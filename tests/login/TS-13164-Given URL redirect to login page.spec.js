const { test, expect } = require('@playwright/test');
const { BASE_URL } = require('../constants');

test('TS-13169 Given URL redirect to login page', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveURL(/login|signin|microsoftonline/i);
});
