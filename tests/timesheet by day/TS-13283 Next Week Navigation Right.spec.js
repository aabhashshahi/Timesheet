const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByDay } = require('./helpers');

test.setTimeout(90000);

test('TS-13283 Next Week Navigation Right', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByDay(page);
  const currentWeekSummary = await timesheetPage.getWeekSummary();

  await timesheetPage.goToNextWeek();

  await expect.poll(async () => timesheetPage.getWeekSummary(), { timeout: 5000 }).not.toBe(currentWeekSummary);
});



