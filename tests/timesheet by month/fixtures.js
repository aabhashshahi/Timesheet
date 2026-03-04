const fs = require('fs');
const path = require('path');
const base = require('@playwright/test');
const LoginPage = require('../../pages/loginpage');
const SettingsPage = require('../../pages/settingspage');
const { BASE_URL } = require('../constants');

const AUTH_DIR = path.join(__dirname, '..', '..', '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'timesheet-month-user.json');

let authSetupPromise;

async function ensureAuthState(browser) {
  if (fs.existsSync(AUTH_FILE)) return;

  if (!authSetupPromise) {
    authSetupPromise = (async () => {
      fs.mkdirSync(AUTH_DIR, { recursive: true });

      const setupContext = await browser.newContext();
      const setupPage = await setupContext.newPage();

      await setupPage.goto(BASE_URL);
      if (/microsoftonline|login|signin/i.test(setupPage.url())) {
        const loginPage = new LoginPage(setupPage);
        await loginPage.loginToApplication();
      }

      const settingsPage = new SettingsPage(setupPage);
      await settingsPage.openSettings();
      await settingsPage.setDefaultTimesheetToMonth();
      await settingsPage.clickUpdate();

      await setupContext.storageState({ path: AUTH_FILE });
      await setupContext.close();
    })();
  }

  await authSetupPromise;
}

const test = base.test.extend({
  context: async ({ browser }, use) => {
    await ensureAuthState(browser);
    const context = await browser.newContext({ storageState: AUTH_FILE });
    await use(context);
    await context.close();
  },
});
const { expect } = base;

module.exports = {
  test,
  expect,
  AUTH_FILE,
};
