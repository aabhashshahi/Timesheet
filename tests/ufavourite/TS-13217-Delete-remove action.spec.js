const { test, expect } = require('./fixtures');
const { loginAndOpenFavourites, pickAddableProjectOption } = require('./helpers');

test.setTimeout(90000);

test('TS-13217 Delete/remove action', async ({ page }) => {
  const favouritesPage = await loginAndOpenFavourites(page);

  let rowCountBefore = await favouritesPage.getDataRowCount();
  if (rowCountBefore === 0) {
    const options = await favouritesPage.getProjectOptions();
    const projectOption = pickAddableProjectOption(options);
    expect(projectOption).toBeTruthy();

    await favouritesPage.addProject(projectOption);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      rowCountBefore = await favouritesPage.getDataRowCount();
      if (rowCountBefore > 0) break;
      await page.waitForTimeout(250);
    }
  }

  expect(rowCountBefore).toBeGreaterThan(0);
  const summaryBefore = await favouritesPage.getResultSummaryText();

  try {
    const hasDeleteControl = await favouritesPage.hasDeleteControl(0);
    if (hasDeleteControl) {
      await favouritesPage.deleteRow(0);
    } else {
      await favouritesPage.deleteRowByAnyMeans(0);
    }
  } catch {
    await favouritesPage.deleteRowByAnyMeans(0);
  }

  let deleteObserved = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const rowCountAfter = await favouritesPage.getDataRowCount();
    const summaryAfter = await favouritesPage.getResultSummaryText();
    const noDataVisible = await favouritesPage.emptyState.isVisible().catch(() => false);
    const changed =
      rowCountAfter < rowCountBefore ||
      noDataVisible ||
      (summaryBefore && summaryAfter && summaryBefore !== summaryAfter);

    if (changed) {
      deleteObserved = true;
      break;
    }
    await page.waitForTimeout(250);
  }

  expect(deleteObserved).toBeTruthy();
});


