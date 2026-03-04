const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByDay } = require('./helpers');

test.setTimeout(60000);

test('TS-13275 page loads after successful login', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByDay(page);

  await expect(timesheetPage.heading).toBeVisible();
  await expect(timesheetPage.yearDropdown).toBeVisible();
  await expect(timesheetPage.weekDropdown).toBeVisible();
  await expect(timesheetPage.userDropdown).toBeVisible();
  await expect(timesheetPage.dataRows.first()).toBeVisible();
});


