const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetOverview } = require('./helpers');

test.setTimeout(60000);

test('TS-13229 Filter by date range', async ({ page }) => {
  const overviewPage = await loginAndOpenTimesheetOverview(page);
  await expect(overviewPage.heading).toBeVisible();
  await expect(overviewPage.table).toBeVisible();
  await expect(page.getByText(/Date Range/i).first()).toBeVisible();
});

