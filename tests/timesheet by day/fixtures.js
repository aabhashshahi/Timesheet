const fs = require('fs');
const path = require('path');
const base = require('@playwright/test');
const LoginPage = require('../../pages/loginpage');
const { BASE_URL } = require('../constants');

const AUTH_DIR = path.join(__dirname, '..', '..', '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'timesheet-user.json');

let authSetupPromise;

async function ensureAuthState(browser) {
  if (fs.existsSync(AUTH_FILE)) return;

  if (!authSetupPromise) {
    authSetupPromise = (async () => {
      fs.mkdirSync(AUTH_DIR, { recursive: true });

      const setupContext = await browser.newContext();
      const setupPage = await setupContext.newPage();

      await setupPage.goto(BASE_URL);
      const loginPage = new LoginPage(setupPage);
      await loginPage.loginToApplication();

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
