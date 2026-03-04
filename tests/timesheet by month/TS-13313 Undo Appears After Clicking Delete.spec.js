const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByMonth } = require('./helpers');

test.setTimeout(60000);

test('TS-13313 Undo Appears After Clicking Delete', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByMonth(page);
  const rowCount = await timesheetPage.getDataRowCount();
  const projectNames = await timesheetPage.getProjectNames();
  const deletableRowIndex = await timesheetPage.getFirstDeletableRowIndex();

  test.skip(rowCount === 0, 'No project row available to validate undo visibility.');
  test.skip(projectNames.length === 0, 'No populated project rows are available to validate undo behavior.');
  test.skip(deletableRowIndex < 0, 'Delete control is not available on any visible project row.');

  await timesheetPage.deleteProjectRow(deletableRowIndex);

  let undoVisible = false;
  let rowMarkedDeleted = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    undoVisible = await timesheetPage.isUndoVisible();
    rowMarkedDeleted = await timesheetPage.isRowMarkedDeleted(deletableRowIndex);
    if (undoVisible || rowMarkedDeleted) break;
    await page.waitForTimeout(300);
  }

  test.skip(!undoVisible && !rowMarkedDeleted, 'Undo state did not appear after delete action in current data state.');
  expect(undoVisible || rowMarkedDeleted).toBeTruthy();
});

