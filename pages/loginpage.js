class LoginPage {
    constructor(page) {
        this.page = page;
        this.username = page.getByLabel('Email, phone, or Skype').or(page.locator('#i0116')).first();
        this.nextButton = page.getByRole('button', { name: 'Next' }).or(page.locator('#idSIButton9')).first();
        this.password = page.getByLabel('Password').or(page.locator('#passwordInput')).first();
        this.submitButton = page.getByRole('button', { name: 'Sign in' }).or(page.locator('#submitButton')).first();
        this.staySignedInNoButton = page.getByRole('button', { name: 'No' }).or(page.locator('#idBtn_Back')).first();
    }

    async enterEmail(email) {
        await this.username.fill(email);
    }

    async clickNext() {
        await this.nextButton.click();
    }

    async enterPassword(password) {
        await this.password.fill(password);
    }

    async clickSubmit() {
        await this.submitButton.click();
    }

    async clickStaySignedInNo() {
        await this.staySignedInNoButton.click();
    }

    async loginToApplication() {
        const email = process.env.MS_EMAIL;
        const password = process.env.MS_PASSWORD;

        if (!email || !password) {
            throw new Error('Missing credentials: set MS_EMAIL and MS_PASSWORD in .env');
        }

        await this.enterEmail(email);
        await this.clickNext();
        await this.enterPassword(password);
        await this.clickSubmit();
        await this.clickStaySignedInNo();
    }
}

module.exports = LoginPage;
