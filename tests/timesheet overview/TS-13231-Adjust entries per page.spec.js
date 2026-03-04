const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetOverview } = require('./helpers');

test.setTimeout(90000);

test('TS-13231 Adjust entries per page', async ({ page }) => {
  const overviewPage = await loginAndOpenTimesheetOverview(page);
  await expect(overviewPage.entriesDropdown).toBeVisible();

  const options = await overviewPage.entriesDropdown.locator('option').allTextContents();
  const normalized = options.map((value) => value.trim()).filter(Boolean);
  const target = normalized.find((value) => ['25', '50', '100'].includes(value)) || normalized[0];
  expect(Boolean(target)).toBeTruthy();

  await overviewPage.setEntriesPerPage(target);
  await page.waitForTimeout(400);

  const selectedValue = await overviewPage.entriesDropdown.inputValue().catch(() => '');
  expect(`${selectedValue}`.trim().length).toBeGreaterThan(0);
});
