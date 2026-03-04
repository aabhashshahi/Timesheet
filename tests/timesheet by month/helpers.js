const LoginPage = require('../../pages/loginpage');
const SettingsPage = require('../../pages/settingspage');
const TimesheetByMonthPage = require('../../pages/timesheetbymonthpage');
const { BASE_URL } = require('../constants');

async function loginAndOpenTimesheetByMonth(page) {
  await page.goto(BASE_URL);
  if (/microsoftonline|login|signin/i.test(page.url())) {
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication();
  }

  const timesheetByMonthPage = new TimesheetByMonthPage(page);
  const isHeadingVisible = await timesheetByMonthPage.heading.isVisible().catch(() => false);
  if (isHeadingVisible) {
    return timesheetByMonthPage;
  }

  if ((await timesheetByMonthPage.timesheetByMonthLink.count()) > 0) {
    await timesheetByMonthPage.openTimesheetByMonth().catch(() => {});
  }

  const isMonthHeadingVisible = await timesheetByMonthPage.heading.isVisible().catch(() => false);
  if (!isMonthHeadingVisible) {
    const settingsPage = new SettingsPage(page);
    await settingsPage.openSettings();
    await settingsPage.setDefaultTimesheetToMonth();
    await settingsPage.clickUpdate();
    await settingsPage.openTimesheetByMonth();
    await timesheetByMonthPage.waitForLoad();
  }

  return timesheetByMonthPage;
}

function normalizeText(value) {
  return `${value || ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function pickAnotherOption(options, currentValue) {
  const current = normalizeText(currentValue);
  return options.find((option) => {
    const normalized = normalizeText(option);
    if (!normalized) return false;
    if (normalized === current) return false;
    if (normalized.includes('choose')) return false;
    if (normalized.includes('select')) return false;
    return true;
  });
}

function pickProjectOption(options, existingProjectNames = []) {
  const existingNames = existingProjectNames.map(normalizeText).filter(Boolean);
  const validOptions = options.filter((option) => {
    const normalized = normalizeText(option);
    if (!normalized) return false;
    if (normalized.includes('choose')) return false;
    if (normalized.includes('select')) return false;
    return true;
  });

  const notInRows = validOptions.find((option) => {
    const normalizedOption = normalizeText(option);
    return !existingNames.some(
      (projectName) => normalizedOption.includes(projectName) || projectName.includes(normalizedOption)
    );
  });

  return notInRows || validOptions[0];
}

function findDuplicateProjectOption(options, existingProjectNames = []) {
  const existingNames = existingProjectNames.map(normalizeText).filter(Boolean);
  if (existingNames.length === 0) return '';

  return (
    options.find((option) => {
      const normalizedOption = normalizeText(option);
      if (!normalizedOption) return false;
      if (normalizedOption.includes('choose')) return false;
      if (normalizedOption.includes('select')) return false;

      return existingNames.some(
        (projectName) => normalizedOption.includes(projectName) || projectName.includes(normalizedOption)
      );
    }) || ''
  );
}

module.exports = {
  loginAndOpenTimesheetByMonth,
  pickAnotherOption,
  pickProjectOption,
  findDuplicateProjectOption,
};
