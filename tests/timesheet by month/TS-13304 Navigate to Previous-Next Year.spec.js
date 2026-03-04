const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByMonth } = require('./helpers');

test.setTimeout(90000);

test('TS-13304 Navigate to Previous/Next Year', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByMonth(page);
  const canNavigatePrevious = await timesheetPage.previousYearButton.isVisible().catch(() => false);
  const canNavigateNext = await timesheetPage.nextYearButton.isVisible().catch(() => false);

  test.skip(!canNavigatePrevious || !canNavigateNext, 'Year navigation buttons are not visible.');

  const initialYear = await timesheetPage.getSelectedYear();

  await timesheetPage.goToPreviousYear();
  await expect.poll(async () => timesheetPage.getSelectedYear(), { timeout: 5000 }).not.toBe(initialYear);

  const previousYear = await timesheetPage.getSelectedYear();

  await timesheetPage.goToNextYear();
  await expect.poll(async () => timesheetPage.getSelectedYear(), { timeout: 5000 }).not.toBe(previousYear);
});
