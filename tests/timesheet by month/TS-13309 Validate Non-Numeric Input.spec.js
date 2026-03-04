const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByMonth } = require('./helpers');

test.setTimeout(60000);

test('TS-13309 Validate Non-Numeric Input', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByMonth(page);
  const rowCount = await timesheetPage.getDataRowCount();

  test.skip(rowCount === 0, 'No project row available to validate input constraints.');

  await timesheetPage.setMonthHoursRaw('Jan', 'abc', 0);
  await timesheetPage.clickSave();

  const currentValue = await timesheetPage.getMonthHours('Jan', 0);
  const hasValidation = await timesheetPage.hasValidationMessage();
  const isRejected = hasValidation || !/[a-z]/i.test(`${currentValue}`.trim());

  expect(isRejected).toBeTruthy();
});

