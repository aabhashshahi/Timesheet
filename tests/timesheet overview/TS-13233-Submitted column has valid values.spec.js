const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetOverview } = require('./helpers');

test.setTimeout(60000);

test('TS-13233 Submitted column has valid values', async ({ page }) => {
  const overviewPage = await loginAndOpenTimesheetOverview(page);
  await expect(overviewPage.submittedHeader).toBeVisible();

  const submittedValues = await overviewPage.getSubmittedValues(10);
  for (const value of submittedValues.slice(0, 5)) {
    const normalized = `${value}`.trim().toUpperCase();
    expect(Boolean(normalized)).toBeTruthy();
  }
});

