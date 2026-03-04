const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetOverview } = require('./helpers');

test.setTimeout(90000);

test('TS-13232 View action opens detailed timesheet', async ({ page }) => {
  const overviewPage = await loginAndOpenTimesheetOverview(page);
  await expect(overviewPage.table).toBeVisible();
  const rowCount = await overviewPage.getDataRowCount();

  if (rowCount > 0) {
    await overviewPage.clickView(0);
  }

  await expect(
    page.getByRole('heading', {
      name: /Timesheet by Day|Timesheet by Month|Timesheet Overview/i,
    }).first()
  ).toBeVisible();
});
