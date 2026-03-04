const LoginPage = require('../../pages/loginpage');
const TimesheetByDayPage = require('../../pages/timesheetbydaypage');
const { BASE_URL } = require('../constants');

async function loginAndOpenTimesheetByDay(page) {
  await page.goto(BASE_URL);
  if (/microsoftonline|login|signin/i.test(page.url())) {
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication();
  }

  const timesheetByDayPage = new TimesheetByDayPage(page);
  const isHeadingVisible = await timesheetByDayPage.heading.isVisible().catch(() => false);
  if (!isHeadingVisible) {
    await timesheetByDayPage.openTimesheetByDay();
  }

  return timesheetByDayPage;
}

function pickAnotherOption(options, currentValue) {
  const current = `${currentValue || ''}`.trim().toLowerCase();
  return options.find((option) => {
    const normalized = `${option}`.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === current) return false;
    if (normalized.includes('choose')) return false;
    if (normalized.includes('select')) return false;
    return true;
  });
}

module.exports = {
  loginAndOpenTimesheetByDay,
  pickAnotherOption,
};
