const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByMonth } = require('./helpers');

test.setTimeout(60000);

test('TS-13308 Enter Hours for Each Month', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByMonth(page);
  const rowCount = await timesheetPage.getDataRowCount();

  test.skip(rowCount === 0, 'No project row available to enter monthly hours.');

  const monthValues = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12,
  };

  for (const [month, value] of Object.entries(monthValues)) {
    await timesheetPage.fillMonthHours(month, value, 0);
  }

  await timesheetPage.clickSave();

  for (const month of Object.keys(monthValues)) {
    const currentValue = await timesheetPage.getMonthHours(month, 0);
    const numericValue = timesheetPage.toNumber(currentValue);
    expect(Number.isNaN(numericValue)).toBeFalsy();
  }
});

