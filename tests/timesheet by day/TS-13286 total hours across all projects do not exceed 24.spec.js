const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByDay } = require('./helpers');

test.setTimeout(90000);

test('TS-13286 total hours across all projects do not exceed 24', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByDay(page);

  let rowCount = await timesheetPage.getDataRowCount();
  if (rowCount < 2) {
    const projectOptions = (await timesheetPage.getProjectOptions()).filter(
      (option) => !/choose|select/i.test(option)
    );

    for (const projectOption of projectOptions.slice(0, 5)) {
      await timesheetPage.addProject(projectOption);
      rowCount = await timesheetPage.getDataRowCount();
      if (rowCount >= 2) break;
    }
  }

  test.skip(rowCount < 2, 'Need at least two project rows to validate cross-project day totals.');

  await timesheetPage.fillDayHours('Mon', 14, 0);
  await timesheetPage.fillDayHours('Mon', 12, 1);
  await timesheetPage.clickSave();

  const dayTotal = await timesheetPage.getDayTotal('Mon');
  const hasValidation = await timesheetPage.hasValidationMessage();
  const withinLimit = (!Number.isNaN(dayTotal) && dayTotal <= 24) || hasValidation;

  expect(withinLimit).toBeTruthy();
});


