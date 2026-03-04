const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByDay } = require('./helpers');

test.setTimeout(60000);

test('TS-13279 user can add hours on selected existing project', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByDay(page);

  await timesheetPage.fillDayHours('Mon', 2, 0);
  await timesheetPage.clickSave();

  const savedHours = await timesheetPage.getDayHours('Mon', 0);
  const numericValue = timesheetPage.toNumber(savedHours);

  if (Number.isNaN(numericValue)) {
    expect(savedHours).toContain('2');
    return;
  }

  expect(numericValue).toBeGreaterThanOrEqual(2);
});



