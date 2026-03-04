const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByDay } = require('./helpers');

test.setTimeout(60000);

test('TS-13285 system rejects more than 24 hours in a day', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByDay(page);

  await timesheetPage.fillDayHours('Mon', 25, 0);
  await timesheetPage.clickSave();

  const currentValue = await timesheetPage.getDayHours('Mon', 0);
  const numericValue = timesheetPage.toNumber(currentValue);
  const hasValidation = await timesheetPage.hasValidationMessage();
  const isRejected =
    (!Number.isNaN(numericValue) && numericValue <= 24) ||
    hasValidation ||
    `${currentValue}`.trim() !== '25';

  expect(isRejected).toBeTruthy();
});



