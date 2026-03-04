const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByDay } = require('./helpers');

test.setTimeout(60000);

test('TS-13282 Previous Week Navigation Left', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByDay(page);
  const currentWeekSummary = await timesheetPage.getWeekSummary();

  await timesheetPage.goToPreviousWeek();

  await expect.poll(async () => timesheetPage.getWeekSummary(), { timeout: 5000 }).not.toBe(currentWeekSummary);
});




