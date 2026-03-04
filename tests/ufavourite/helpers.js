const LoginPage = require('../../pages/loginpage');
const FavouritesPage = require('../../pages/favouritespage');
const { BASE_URL } = require('../constants');

async function loginAndOpenFavourites(page) {
  await page.goto(BASE_URL);
  if (/microsoftonline|login|signin/i.test(page.url())) {
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication();
  }

  const favouritesPage = new FavouritesPage(page);
  const isVisible = await favouritesPage.heading.isVisible().catch(() => false);
  if (!isVisible) {
    await favouritesPage.openFromTopNav();
  }

  return favouritesPage;
}

function pickAddableProjectOption(options) {
  return options.find((option) => {
    const normalized = `${option || ''}`.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.includes('select')) return false;
    if (normalized.includes('choose')) return false;
    if (normalized.includes('please')) return false;
    return true;
  });
}

module.exports = {
  loginAndOpenFavourites,
  pickAddableProjectOption,
};
