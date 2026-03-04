const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByDay, pickAnotherOption } = require('./helpers');

test.setTimeout(60000);

test('TS-13281 Week Dropdown Functionality', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByDay(page);
  const options = await timesheetPage.getWeekOptions();
  const currentWeek = await timesheetPage.getSelectedWeek();
  const targetWeek = pickAnotherOption(options, currentWeek);

  test.skip(!targetWeek, 'Need at least two week options to validate week dropdown switching.');

  await timesheetPage.selectWeek(targetWeek);

  await expect
    .poll(async () => (await timesheetPage.getSelectedWeek()).trim().toLowerCase(), { timeout: 5000 })
    .toBe(targetWeek.trim().toLowerCase());
});



