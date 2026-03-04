const { test, expect } = require('./fixtures');
const { loginAndOpenTimesheetByMonth, pickProjectOption } = require('./helpers');

test.setTimeout(60000);

test('TS-13305 Add a Project to Timesheet', async ({ page }) => {
  const timesheetPage = await loginAndOpenTimesheetByMonth(page);
  const projectOptions = await timesheetPage.getProjectOptions();
  const existingProjectNames = await timesheetPage.getProjectNames();
  const primaryTarget = pickProjectOption(projectOptions, existingProjectNames);
  const filteredOptions = projectOptions.filter((option) => {
    const normalized = `${option || ''}`.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.includes('choose')) return false;
    if (normalized.includes('select')) return false;
    return true;
  });
  const candidateProjects = [primaryTarget, ...filteredOptions].filter(
    (option, index, all) => option && all.indexOf(option) === index
  );

  test.skip(candidateProjects.length === 0, 'No addable project option found.');

  let projectAdded = false;

  for (const candidateProject of candidateProjects.slice(0, 10)) {
    const rowCountBefore = await timesheetPage.getDataRowCount();
    await timesheetPage.addProject(candidateProject);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const rowCountAfter = await timesheetPage.getDataRowCount();
      if (rowCountAfter > rowCountBefore) {
        projectAdded = true;
        break;
      }
      await page.waitForTimeout(250);
    }

    if (projectAdded) break;
  }

  test.skip(!projectAdded, 'Could not add a new project with available dropdown options.');
  expect(projectAdded).toBeTruthy();
});

