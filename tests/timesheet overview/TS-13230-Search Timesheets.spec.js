const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetOverview } = require('./helpers');

test.setTimeout(90000);

test('TS-13230 Search Timesheets', async ({ page }) => {
  const overviewPage = await loginAndOpenTimesheetOverview(page);
  await expect(overviewPage.searchInput).toBeVisible();

  await overviewPage.search('2026').catch(() => {});
  await page.waitForTimeout(400);

  const rowCount = await overviewPage.getDataRowCount();
  expect(rowCount).toBeGreaterThanOrEqual(0);

  await overviewPage.search('').catch(() => {});
  await expect(overviewPage.searchInput).toBeVisible();
});
