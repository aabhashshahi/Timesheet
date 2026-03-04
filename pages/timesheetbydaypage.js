class TimesheetByDayPage {
    constructor(page) {
        this.page = page;

        this.timesheetByDayLink = page.getByRole('link', { name: /Timesheet by Day/i }).first();
        this.heading = page.getByRole('heading', { name: /Timesheet by Day/i }).first();

        this.filterSection = page.locator('main div').filter({ hasText: /Year[\s\S]*Week[\s\S]*Select User/i }).first();
        this.yearDropdown = this.filterSection.locator('select').nth(0);
        this.weekDropdown = this.filterSection.locator('select').nth(1);
        this.userDropdown = this.filterSection.locator('[role="combobox"]').last();

        this.weekNavigationButtons = this.weekDropdown.locator('xpath=ancestor::div[1]/following-sibling::div[1]//button');
        this.previousWeekButton = this.weekNavigationButtons.nth(0);
        this.nextWeekButton = this.weekNavigationButtons.nth(1);

        this.weekSummaryText = page.locator('text=/\\d{4}\\s*-\\s*Week\\s*\\d+/i').first();
        this.dataRows = page.locator('table tbody tr').filter({ has: page.locator('td input') });

        this.addProjectPanel = page.locator('div').filter({ hasText: /Select a project to add to list/i }).first();
        this.projectDropdown = this.addProjectPanel.locator('select').first();
        this.addProjectButton = this.addProjectPanel.getByRole('button', { name: /Add/i }).first();

        this.copyFromWeekPanel = page.locator('div').filter({ hasText: /Copy from week/i }).first();
        this.copyWeekDropdown = this.copyFromWeekPanel.locator('select').first();
        this.copyButton = this.copyFromWeekPanel.getByRole('button', { name: /Copy/i }).first();

        this.saveButton = page.getByRole('button', { name: /Save/i }).first();
        this.submitAndLockButton = page.getByRole('button', { name: /Submit And Lock|Submit & Lock/i }).first();
    }

    async openTimesheetByDay() {
        await this.timesheetByDayLink.click();
        await this.heading.waitFor({ state: 'visible' });
    }

    async waitForLoad() {
        await this.heading.waitFor({ state: 'visible' });
    }

    async selectYear(option) {
        await this.selectOption(this.yearDropdown, option);
    }

    async selectWeek(option) {
        await this.selectOption(this.weekDropdown, option);
    }

    async selectUser(option) {
        await this.selectOption(this.userDropdown, option);
    }

    async goToPreviousWeek() {
        await this.previousWeekButton.click();
    }

    async goToNextWeek() {
        await this.nextWeekButton.click();
    }

    async getWeekSummary() {
        const value = await this.weekSummaryText.textContent();
        return (value || '').trim();
    }

    dayHoursInput(day, rowIndex = 0) {
        const dayIndex = this.getDayIndex(day);
        return this.dataRows.nth(rowIndex).locator('input').nth(dayIndex);
    }

    async fillDayHours(day, hours, rowIndex = 0) {
        const input = this.dayHoursInput(day, rowIndex);
        await input.fill(`${hours}`);
        await input.press('Tab');
    }

    async getDayHours(day, rowIndex = 0) {
        return (await this.dayHoursInput(day, rowIndex).inputValue()).trim();
    }

    async getDataRowCount() {
        return this.dataRows.count();
    }

    async getYearOptions() {
        return this.getDropdownOptions(this.yearDropdown);
    }

    async getWeekOptions() {
        return this.getDropdownOptions(this.weekDropdown);
    }

    async getProjectOptions() {
        return this.getDropdownOptions(this.projectDropdown);
    }

    async getSelectedYear() {
        return this.getSelectedOptionText(this.yearDropdown);
    }

    async getSelectedWeek() {
        return this.getSelectedOptionText(this.weekDropdown);
    }

    async getDayTotal(day) {
        const dayIndex = this.getDayIndex(day);
        const totalRows = this.page.locator('table tbody tr').filter({ hasText: /^Total$/i });
        const totalRowCount = await totalRows.count();
        if (totalRowCount === 0) {
            return Number.NaN;
        }

        const totalCell = totalRows.last().locator('td').nth(2 + dayIndex);
        const totalText = (await totalCell.textContent({ timeout: 5000 }).catch(() => '')) || '';
        return this.toNumber(totalText);
    }

    async hasValidationMessage() {
        const candidates = [
            this.page.locator('.field-validation-error').first(),
            this.page.locator('.validation-summary-errors').first(),
            this.page.locator('.text-danger').first(),
            this.page.getByRole('heading', { name: /Validation Errors/i }).first(),
            this.page.getByText(/invalid|cannot|not allowed|maximum|negative|24/i).first(),
        ];

        for (const candidate of candidates) {
            if (await candidate.count() === 0) continue;
            if (await candidate.isVisible()) return true;
        }

        return false;
    }

    async addProject(option) {
        await this.selectOption(this.projectDropdown, option);
        await this.addProjectButton.click();
    }

    async copyFromWeek(option) {
        await this.selectOption(this.copyWeekDropdown, option);
        await this.copyButton.click();
    }

    async clickSave() {
        await this.saveButton.click();
    }

    async clickSubmitAndLock() {
        await this.submitAndLockButton.click();
    }

    async selectOption(dropdown, option) {
        const value = `${option}`.trim();
        const isNativeSelect = await this.isNativeSelect(dropdown);

        if (!isNativeSelect) {
            await dropdown.click();
            const optionRegex = new RegExp(`^\\s*${this.escapeRegExp(value)}\\s*$`, 'i');
            const optionCandidates = [
                this.page.getByRole('option', { name: optionRegex }).first(),
                this.page.locator('[role="option"]', { hasText: optionRegex }).first(),
                this.page.getByText(optionRegex).first(),
            ];

            for (const optionCandidate of optionCandidates) {
                if (await optionCandidate.count() === 0) continue;
                await optionCandidate.click();
                return;
            }

            throw new Error(`Could not find option "${value}" in custom dropdown.`);
        }

        const attempts = [{ label: value }, { value }, value];

        let lastError;
        for (const attempt of attempts) {
            try {
                await dropdown.selectOption(attempt);
                return;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError;
    }

    async getDropdownOptions(dropdown) {
        const isNativeSelect = await this.isNativeSelect(dropdown);
        if (!isNativeSelect) return [];

        const options = await dropdown.locator('option').allTextContents();
        return options.map((option) => option.trim()).filter(Boolean);
    }

    async getSelectedOptionText(dropdown) {
        const isNativeSelect = await this.isNativeSelect(dropdown);
        if (!isNativeSelect) {
            const value = await dropdown.inputValue().catch(() => '');
            return (value || '').trim();
        }

        const selected = await dropdown.locator('option:checked').first().textContent();
        return (selected || '').trim();
    }

    async isNativeSelect(dropdown) {
        if (await dropdown.count() === 0) return false;

        try {
            const tagName = await dropdown.evaluate((element) => element.tagName.toLowerCase());
            return tagName === 'select';
        } catch {
            return false;
        }
    }

    escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    toNumber(value) {
        const normalized = `${value || ''}`.replace(/[^0-9.-]/g, '');
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    getDayIndex(day) {
        const key = `${day}`.trim().toLowerCase();
        const dayMap = {
            mon: 0,
            monday: 0,
            tue: 1,
            tues: 1,
            tuesday: 1,
            wed: 2,
            wednesday: 2,
            thu: 3,
            thur: 3,
            thurs: 3,
            thursday: 3,
            fri: 4,
            friday: 4,
            sat: 5,
            saturday: 5,
            sun: 6,
            sunday: 6,
        };

        if (!Object.prototype.hasOwnProperty.call(dayMap, key)) {
            throw new Error(`Unsupported day "${day}". Use Mon/Tue/Wed/Thu/Fri/Sat/Sun.`);
        }

        return dayMap[key];
    }
}

module.exports = TimesheetByDayPage;
