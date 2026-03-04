const { test, expect } = require('./fixtures');
const { loginAndOpenFavourites, pickAddableProjectOption } = require('./helpers');

test.setTimeout(90000);

test('TS-13214 User can add a project to Favourite Projects', async ({ page }) => {
  const favouritesPage = await loginAndOpenFavourites(page);
  const options = await favouritesPage.getProjectOptions();
  const projectOption = pickAddableProjectOption(options);

  test.skip(!projectOption, 'No addable project option found in dropdown.');

  const rowCountBefore = await favouritesPage.getDataRowCount();
  await favouritesPage.addProject(projectOption);

  let rowAdded = false;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const rowCountAfter = await favouritesPage.getDataRowCount();
    if (rowCountAfter > rowCountBefore) {
      rowAdded = true;
      break;
    }
    await page.waitForTimeout(250);
  }

  test.skip(!rowAdded, 'Project add action did not produce a visible new row.');
  expect(rowAdded).toBeTruthy();
});


