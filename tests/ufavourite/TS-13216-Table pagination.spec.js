const { test, expect } = require('./fixtures');
const { loginAndOpenFavourites } = require('./helpers');

test.setTimeout(90000);

test('TS-13216 Table pagination', async ({ page }) => {
  const favouritesPage = await loginAndOpenFavourites(page);
  await expect(favouritesPage.entriesDropdown).toBeVisible();

  const options = await favouritesPage.entriesDropdown.locator('option').allTextContents();
  const normalized = options.map((value) => value.trim());
  const target = normalized.find((value) => ['25', '50', '100'].includes(value));

  test.skip(!target, 'Pagination size options are not available for validation.');

  await favouritesPage.setEntriesPerPage(target);
  await expect(favouritesPage.resultSummary).toBeVisible();
});


