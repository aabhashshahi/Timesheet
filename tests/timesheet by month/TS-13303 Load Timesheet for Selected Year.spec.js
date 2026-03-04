const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByMonth } = require('./helpers');

test.setTimeout(90000);

test('TS-13303 Load Timesheet for Selected Year', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByMonth(page);

  await expect(timesheetPage.heading).toBeVisible();
  await expect(timesheetPage.yearDropdown).toBeVisible();
  await expect(timesheetPage.userDropdown).toBeVisible();
  await expect(timesheetPage.dataRows.first()).toBeVisible();

  const selectedYear = await timesheetPage.getSelectedYear();
  const yearSummary = await timesheetPage.getYearSummary();
  const referenceText = `${yearSummary} ${selectedYear}`.trim();

  expect(/\b\d{4}\b/.test(referenceText)).toBeTruthy();
});
