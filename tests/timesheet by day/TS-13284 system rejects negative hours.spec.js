const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByDay } = require('./helpers');

test.setTimeout(60000);

test('TS-13284 system rejects negative hours', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByDay(page);

  await timesheetPage.fillDayHours('Mon', -1, 0);
  await timesheetPage.clickSave();

  const currentValue = await timesheetPage.getDayHours('Mon', 0);
  const numericValue = timesheetPage.toNumber(currentValue);
  const hasValidation = await timesheetPage.hasValidationMessage();
  const isRejected =
    (!Number.isNaN(numericValue) && numericValue >= 0) ||
    hasValidation ||
    !`${currentValue}`.trim().startsWith('-');

  expect(isRejected).toBeTruthy();
});



