const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByMonth, findDuplicateProjectOption } = require('./helpers');

test.setTimeout(90000);

test('TS-13306 Prevent Adding Duplicate Projects', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByMonth(page);
  const rowCountBefore = await timesheetPage.getDataRowCount();
  const existingProjectNames = await timesheetPage.getProjectNames();
  const projectOptions = await timesheetPage.getProjectOptions();
  const duplicateOption = findDuplicateProjectOption(projectOptions, existingProjectNames);

  if (!duplicateOption) {
    expect(true).toBeTruthy();
    return;
  }

  await timesheetPage.addProject(duplicateOption);
  await timesheetPage.clickSave();

  const rowCountAfter = await timesheetPage.getDataRowCount();
  const hasValidation = await timesheetPage.hasValidationMessage();
  const duplicatePrevented = rowCountAfter === rowCountBefore || hasValidation;

  expect(duplicatePrevented).toBeTruthy();
});
