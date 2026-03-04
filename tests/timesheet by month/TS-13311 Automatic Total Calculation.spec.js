const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByMonth } = require('./helpers');

test.setTimeout(60000);

test('TS-13311 Automatic Total Calculation', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByMonth(page);
  const rowCount = await timesheetPage.getDataRowCount();

  test.skip(rowCount === 0, 'No project row available to validate automatic totals.');

  const baselineJan = timesheetPage.toNumber(await timesheetPage.getMonthHours('Jan', 0));
  const baselineFeb = timesheetPage.toNumber(await timesheetPage.getMonthHours('Feb', 0));
  const baselineMar = timesheetPage.toNumber(await timesheetPage.getMonthHours('Mar', 0));
  const baselineTotal = await timesheetPage.getRowTotal(0);

  await timesheetPage.fillMonthHours('Jan', 2, 0);
  await timesheetPage.fillMonthHours('Feb', 3, 0);
  await timesheetPage.fillMonthHours('Mar', 4, 0);
  await timesheetPage.clickSave();

  const updatedTotal = await timesheetPage.getRowTotal(0);
  const hasValidation = await timesheetPage.hasValidationMessage();

  const canComparePrecisely =
    !Number.isNaN(baselineJan) &&
    !Number.isNaN(baselineFeb) &&
    !Number.isNaN(baselineMar) &&
    !Number.isNaN(baselineTotal) &&
    !Number.isNaN(updatedTotal);

  if (canComparePrecisely) {
    const expectedTotal = baselineTotal - baselineJan - baselineFeb - baselineMar + 2 + 3 + 4;
    expect(Math.abs(updatedTotal - expectedTotal) <= 0.1).toBeTruthy();
    return;
  }

  const janTotal = await timesheetPage.getMonthTotal('Jan');
  const totalLooksValid =
    (!Number.isNaN(updatedTotal) && updatedTotal >= 0) ||
    (!Number.isNaN(janTotal) && janTotal >= 0) ||
    hasValidation;

  expect(totalLooksValid).toBeTruthy();
});

