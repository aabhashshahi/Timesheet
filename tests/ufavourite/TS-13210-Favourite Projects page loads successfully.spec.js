const { test, expect } = require('./fixtures');
const { loginAndOpenFavourites } = require('./helpers');

test.setTimeout(60000);

test('TS-13210 Favourite Projects page loads successfully', async ({ page }) => {
  const favouritesPage = await loginAndOpenFavourites(page);

  await expect(favouritesPage.heading).toBeVisible();
  await expect(favouritesPage.table).toBeVisible();
  await expect(favouritesPage.resultSummary).toBeVisible();
});



