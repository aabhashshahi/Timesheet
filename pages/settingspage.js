class SettingsPage {
    constructor(page) {
        this.page = page;
        this.settingsLink = page.getByRole('link', { name: 'Settings' }).first();
        this.timesheetTypeDropdown = page.locator('#TimesheetTypeId');
        this.updateButton = page.getByRole('button', { name: 'Update' }).first();
        this.timesheetByDayLink = page.getByRole('link', { name: /Timesheet by Day/i }).first();
        this.timesheetByMonthLink = page.getByRole('link', { name: /Timesheet by Month/i }).first();
    }

    async openSettings() {
    await this.settingsLink.click();
    await this.page.waitForURL(/\/setting(\/index)?$/i);
    }

    async setDefaultTimesheetToDay() {
    await this.timesheetTypeDropdown.selectOption({ label: 'Daily' });
    }

    async setDefaultTimesheetToMonth() {
    await this.timesheetTypeDropdown.selectOption({ label: 'Monthly' });
    }


    async clickUpdate() {
        await this.updateButton.click();
    }

    async openTimesheetByDay() {
        await this.timesheetByDayLink.click();
    }

    async openTimesheetByMonth() {
        await this.timesheetByMonthLink.click();
    }
}

module.exports = SettingsPage;
