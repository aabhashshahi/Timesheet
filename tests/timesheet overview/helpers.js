const LoginPage = require('../../pages/loginpage');
const TimesheetOverviewPage = require('../../pages/timesheetoverviewpage');
const { BASE_URL } = require('../constants');

async function loginAndOpenTimesheetOverview(page) {
  await page.goto(BASE_URL);
  if (/microsoftonline|login|signin/i.test(page.url())) {
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication();
  }

  const overviewPage = new TimesheetOverviewPage(page);
  const isVisible = await overviewPage.heading.isVisible().catch(() => false);
  if (!isVisible) {
    await overviewPage.open();
  }

  return overviewPage;
}

module.exports = {
  loginAndOpenTimesheetOverview,
};
