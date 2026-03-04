const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByMonth } = require('./helpers');

test.setTimeout(90000);

test('TS-13312 Delete a Project Row', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByMonth(page);
  const rowCountBefore = await timesheetPage.getDataRowCount();
  const projectNamesBefore = await timesheetPage.getProjectNames();
  const deletableRowIndex = await timesheetPage.getFirstDeletableRowIndex();

  test.skip(rowCountBefore === 0, 'No project row available to delete.');
  test.skip(projectNamesBefore.length === 0, 'No populated project rows are available to delete.');
  test.skip(deletableRowIndex < 0, 'Delete control is not available on any visible project row.');

  await timesheetPage.deleteProjectRow(deletableRowIndex);
  await timesheetPage.clickSave();

  let deleteObserved = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const rowCountAfter = await timesheetPage.getDataRowCount();
    const undoVisible = await timesheetPage.isUndoVisible();
    const rowMarkedDeleted = await timesheetPage.isRowMarkedDeleted(deletableRowIndex);
    const deleteControlStillVisible = await timesheetPage.hasDeleteControl(deletableRowIndex);
    const stateChanged =
      rowCountAfter < rowCountBefore ||
      undoVisible ||
      rowMarkedDeleted ||
      !deleteControlStillVisible;
    if (stateChanged) {
      deleteObserved = true;
      break;
    }
    await page.waitForTimeout(300);
  }

  if (!deleteObserved) {
    const projectNamesAfter = await timesheetPage.getProjectNames();
    deleteObserved = projectNamesAfter.join('||') !== projectNamesBefore.join('||');
  }

  expect(deleteObserved).toBeTruthy();
});
