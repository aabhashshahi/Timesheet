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

    async handlePostSubmitPrompts() {
        const optionalButtons = [
            this.page.getByRole('button', { name: /No|Skip|Cancel|Not now/i }).first(),
            this.page.locator('#idBtn_Back').first(),
            this.page.locator('#idSIButton9').first(),
        ];

        for (let attempt = 0; attempt < 6; attempt += 1) {
            for (const button of optionalButtons) {
                const visible = await button.isVisible().catch(() => false);
                if (!visible) continue;
                await button.click({ timeout: 3000 }).catch(() => {});
                await this.page.waitForTimeout(500);
            }

            const reachedApp = /timesheet|userfavourite|usersheet|setting/i.test(this.page.url());
            if (reachedApp) return;
            await this.page.waitForTimeout(1000);
        }
    }

    async clickStaySignedInNo() {
        const isVisible = await this.staySignedInNoButton
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);

        if (isVisible) {
            await this.staySignedInNoButton.click();
        }
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
        await this.handlePostSubmitPrompts();
        await this.clickStaySignedInNo();
        await this.page
            .waitForURL(/timesheet|userfavourite|usersheet|setting/i, { timeout: 60000 })
            .catch(() => {});
    }
}

module.exports = LoginPage;

