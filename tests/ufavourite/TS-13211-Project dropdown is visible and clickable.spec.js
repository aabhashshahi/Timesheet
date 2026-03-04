const { test, expect } = require('./fixtures');
const { loginAndOpenFavourites } = require('./helpers');

test.setTimeout(60000);

test('TS-13211 Project dropdown is visible and clickable', async ({ page }) => {
  const favouritesPage = await loginAndOpenFavourites(page);

  await expect(favouritesPage.projectDropdown).toBeVisible();
  await expect(favouritesPage.projectDropdownTrigger).toBeVisible();
  await favouritesPage.projectDropdownTrigger.click();

  const options = await favouritesPage.getProjectOptions();
  expect(Array.isArray(options)).toBeTruthy();
});



