const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByDay, pickAnotherOption } = require('./helpers');

test.setTimeout(90000);

test('TS-13280 Year Dropdown Functionality', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByDay(page);
  const options = await timesheetPage.getYearOptions();
  const currentYear = await timesheetPage.getSelectedYear();
  const targetYear = pickAnotherOption(options, currentYear);

  test.skip(!targetYear, 'Need at least two year options to validate year dropdown switching.');

  await timesheetPage.selectYear(targetYear);

  await expect
    .poll(async () => (await timesheetPage.getSelectedYear()).trim().toLowerCase(), { timeout: 5000 })
    .toBe(targetYear.trim().toLowerCase());
});


