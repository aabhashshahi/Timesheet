class TimesheetByMonthPage {
  constructor(page) {
    this.page = page;

    this.timesheetByMonthLink = page.getByRole('link', { name: /Timesheet by Month/i }).first();
    this.heading = page.getByRole('heading', { name: /Timesheet by Month/i }).first();

    this.filterSection = page.locator('main div').filter({ hasText: /Year[\s\S]*Select User/i }).first();
    this.yearDropdown = page.locator('#yearSelect').or(this.filterSection.locator('select').first()).first();
    this.userDropdown = this.filterSection.locator('[role="combobox"]').first();
    this.yearNavigationButtons = this.filterSection.locator('button');
    this.previousYearButton = this.yearNavigationButtons.nth(0);
    this.nextYearButton = this.yearNavigationButtons.nth(1);

    this.yearSummaryText = page.locator('text=/Year\\s*-\\s*\\d{4}/i').first();
    this.dataRows = page.locator('table tbody tr:visible').filter({ has: page.locator('td input:visible') });

    this.addProjectPanel = page.locator('div').filter({ hasText: /Select a project to add to list/i }).first();
    this.projectDropdown = this.addProjectPanel
      .getByRole('combobox', { name: /Choose project/i })
      .or(this.addProjectPanel.locator('select').first())
      .first();
    this.addProjectButton = this.addProjectPanel.getByRole('button', { name: /Add/i }).first();

    this.copyFromYearPanel = page.locator('div').filter({ hasText: /Copy from year/i }).first();
    this.copyYearDropdown = this.copyFromYearPanel.locator('select').first();
    this.copyButton = this.copyFromYearPanel.getByRole('button', { name: /Copy/i }).first();

    this.saveButton = page.getByRole('button', { name: /Save/i }).first();
    this.submitAndLockButton = page.getByRole('button', { name: /Submit And Lock|Submit & Lock/i }).first();
  }

  async openTimesheetByMonth() {
    await this.timesheetByMonthLink.click();
    await this.heading.waitFor({ state: 'visible' });
  }

  async waitForLoad() {
    await this.heading.waitFor({ state: 'visible' });
  }

  async selectYear(option) {
    await this.selectOption(this.yearDropdown, option);
  }

  async selectUser(option) {
    await this.selectOption(this.userDropdown, option);
  }

  async goToPreviousYear() {
    await this.previousYearButton.click();
  }

  async goToNextYear() {
    await this.nextYearButton.click();
  }

  async getYearSummary() {
    const value = await this.yearSummaryText.textContent();
    return (value || '').trim();
  }

  monthHoursInput(month, rowIndex = 0) {
    const monthIndex = this.getMonthIndex(month);
    return this.dataRows.nth(rowIndex).locator('input').nth(monthIndex);
  }

  async fillMonthHours(month, hours, rowIndex = 0) {
    const input = this.monthHoursInput(month, rowIndex);
    await input.click();
    await input.fill(`${hours}`);
    await input.press('Tab');
  }

  async setMonthHoursRaw(month, value, rowIndex = 0) {
    const input = this.monthHoursInput(month, rowIndex);
    await input.evaluate((element, nextValue) => {
      element.focus();
      element.value = `${nextValue}`;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.blur();
    }, `${value}`);
  }

  async getMonthHours(month, rowIndex = 0) {
    return (await this.monthHoursInput(month, rowIndex).inputValue()).trim();
  }

  async getDataRowCount() {
    return this.dataRows.count();
  }

  async getYearOptions() {
    return this.getDropdownOptions(this.yearDropdown);
  }

  async getProjectOptions() {
    return this.getDropdownOptions(this.projectDropdown, true);
  }

  async getSelectedYear() {
    return this.getSelectedOptionText(this.yearDropdown);
  }

  async getProjectNames() {
    const rowCount = await this.dataRows.count();
    const names = [];

    for (let index = 0; index < rowCount; index += 1) {
      const nameCell = this.dataRows.nth(index).locator('td').nth(1);
      const name = (await nameCell.textContent({ timeout: 5000 }).catch(() => '')) || '';
      const trimmed = name.trim();
      if (trimmed) names.push(trimmed);
    }

    return names;
  }

  async getRowTotal(rowIndex = 0) {
    const row = this.dataRows.nth(rowIndex);
    const cells = row.locator('td');
    const cellCount = await cells.count();
    if (cellCount < 2) return Number.NaN;

    const totalCell = cells.nth(cellCount - 2);
    const totalText = (await totalCell.textContent({ timeout: 5000 }).catch(() => '')) || '';
    return this.toNumber(totalText);
  }

  async getMonthTotal(month) {
    const monthIndex = this.getMonthIndex(month);
    const totalRows = this.page.locator('table tbody tr').filter({ hasText: /^Total$/i });
    const totalRowCount = await totalRows.count();
    if (totalRowCount === 0) return Number.NaN;

    const totalCell = totalRows.last().locator('td').nth(2 + monthIndex);
    const totalText = (await totalCell.textContent({ timeout: 5000 }).catch(() => '')) || '';
    return this.toNumber(totalText);
  }

  async hasValidationMessage() {
    const candidates = [
      this.page.locator('.field-validation-error').first(),
      this.page.locator('.validation-summary-errors').first(),
      this.page.locator('.text-danger').first(),
      this.page.getByRole('heading', { name: /Validation Errors/i }).first(),
      this.page.getByText(/invalid|cannot|not allowed|maximum|negative|duplicate|already exists/i).first(),
    ];

    for (const candidate of candidates) {
      if ((await candidate.count()) === 0) continue;
      if (await candidate.isVisible()) return true;
    }

    return false;
  }

  async addProject(option) {
    await this.selectOption(this.projectDropdown, option);
    await this.addProjectButton.click();
  }

  async copyFromYear(option) {
    await this.selectOption(this.copyYearDropdown, option);
    await this.copyButton.click();
  }

  async deleteProjectRow(rowIndex = 0) {
    const deleteControl = await this.getDeleteControl(rowIndex);
    if (!deleteControl) {
      throw new Error(`Could not find delete control for row ${rowIndex}.`);
    }

    const dialogHandler = async (dialog) => {
      await dialog.accept();
    };

    this.page.on('dialog', dialogHandler);
    try {
      await deleteControl.click({ force: true });
      await this.page.waitForTimeout(250);
    } finally {
      this.page.off('dialog', dialogHandler);
    }
  }

  async hasDeleteControl(rowIndex = 0) {
    const deleteControl = await this.getDeleteControl(rowIndex);
    return Boolean(deleteControl);
  }

  async getFirstDeletableRowIndex() {
    const rowCount = await this.getDataRowCount();
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const hasControl = await this.hasDeleteControl(rowIndex);
      if (hasControl) return rowIndex;
    }
    return -1;
  }

  async isUndoVisible() {
    const undoControl = await this.getUndoControl();
    if (!undoControl) return false;
    return undoControl.isVisible();
  }

  async clickUndo() {
    const undoControl = await this.getUndoControl();
    if (!undoControl) {
      throw new Error('Undo control is not visible.');
    }
    await undoControl.click({ force: true });
  }

  async clickSave() {
    await this.saveButton.click();
  }

  async clickSubmitAndLock() {
    await this.submitAndLockButton.click();
  }

  async getDeleteControl(rowIndex = 0) {
    const row = this.dataRows.nth(rowIndex);
    if ((await row.count()) === 0) return null;

    const actionCell = row.locator('td').last();
    const deleteCandidates = [
      actionCell.locator('[title*="Delete" i], [aria-label*="Delete" i]').first(),
      actionCell.getByRole('button').first(),
      actionCell.locator('button').first(),
      actionCell.locator('a').first(),
      actionCell.locator('[role="button"]').first(),
      actionCell.locator('i').first(),
    ];

    for (const candidate of deleteCandidates) {
      if ((await candidate.count()) === 0) continue;
      if (!(await candidate.isVisible().catch(() => false))) continue;
      if (!(await this.isActionableDeleteControl(candidate))) continue;
      return candidate;
    }

    return null;
  }

  async isActionableDeleteControl(locator) {
    return locator.evaluate((element) => {
      const target = element.closest('button, a, [role="button"], i') || element;
      if (!target) return false;

      const classText = `${target.className || ''}`.toLowerCase();
      const parentClassText = `${(target.parentElement && target.parentElement.className) || ''}`.toLowerCase();
      const ariaDisabled = `${target.getAttribute('aria-disabled') || ''}`.toLowerCase();
      const disabledAttr = target.getAttribute('disabled');
      const pointerEvents = window.getComputedStyle(target).pointerEvents;

      const blockedByClass =
        classText.includes('disabled') ||
        classText.includes('text-muted') ||
        classText.includes('no-access') ||
        classText.includes('readonly') ||
        parentClassText.includes('disabled') ||
        parentClassText.includes('text-muted');

      if (blockedByClass) return false;
      if (disabledAttr !== null) return false;
      if (ariaDisabled === 'true') return false;
      if (pointerEvents === 'none') return false;

      return true;
    }).catch(() => false);
  }

  async isRowMarkedDeleted(rowIndex = 0) {
    const row = this.dataRows.nth(rowIndex);
    if ((await row.count()) === 0) return false;

    const className = (await row.getAttribute('class').catch(() => '')) || '';
    if (/line-through|deleted|remove/i.test(className)) return true;

    const hasUndoClass = (await row.locator('.undoRemove').count().catch(() => 0)) > 0;
    return hasUndoClass;
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
        if ((await optionCandidate.count()) === 0) continue;
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

  async getDropdownOptions(dropdown, allowCustomOptions = false) {
    const isNativeSelect = await this.isNativeSelect(dropdown);
    if (!isNativeSelect) {
      if (!allowCustomOptions) return [];

      await dropdown.click().catch(() => {});
      const optionTexts = await this.page.getByRole('option').allTextContents().catch(() => []);
      await this.page.keyboard.press('Escape').catch(() => {});
      return optionTexts.map((option) => option.trim()).filter(Boolean);
    }

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
    if ((await dropdown.count()) === 0) return false;

    try {
      const tagName = await dropdown.evaluate((element) => element.tagName.toLowerCase());
      return tagName === 'select';
    } catch {
      return false;
    }
  }

  async getUndoControl() {
    const rows = this.page.locator('table tbody tr:visible');
    const rowCount = await rows.count();

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = rows.nth(rowIndex);
      const firstCellText = ((await row.locator('td').first().textContent().catch(() => '')) || '').trim().toLowerCase();
      if (firstCellText === 'total') continue;

      const actionCell = row.locator('td').last();
      const candidates = [
        actionCell.locator('.undoRemove button, .undoRemove a, .undoRemove [role="button"]').first(),
        actionCell.locator('.undoRemove .ti').first(),
        actionCell.locator('.undoRemove').first(),
      ];

      for (const candidate of candidates) {
        if ((await candidate.count()) === 0) continue;
        if (await candidate.isVisible().catch(() => false)) return candidate;
      }
    }

    return null;
  }

  async hasAnyUndoState() {
    const rows = this.page.locator('table tbody tr:visible');
    const rowCount = await rows.count();

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = rows.nth(rowIndex);
      const firstCellText = ((await row.locator('td').first().textContent().catch(() => '')) || '').trim().toLowerCase();
      if (firstCellText === 'total') continue;

      const className = (await row.getAttribute('class').catch(() => '')) || '';
      if (/line-through|deleted|remove/i.test(className)) return true;

      const hasUndoClass = (await row.locator('.undoRemove').count().catch(() => 0)) > 0;
      if (hasUndoClass) return true;
    }

    return false;
  }

  escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  toNumber(value) {
    const normalized = `${value || ''}`.replace(/[^0-9.-]/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  getMonthIndex(month) {
    const key = `${month}`.trim().toLowerCase();
    const monthMap = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    };

    if (!Object.prototype.hasOwnProperty.call(monthMap, key)) {
      throw new Error(`Unsupported month "${month}". Use Jan..Dec.`);
    }

    return monthMap[key];
  }
}

module.exports = TimesheetByMonthPage;
