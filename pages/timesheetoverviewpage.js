class TimesheetOverviewPage {
  constructor(page) {
    this.page = page;

    this.timesheetOverviewLink = page.getByRole('link', { name: /Timesheet Overview/i }).first();
    this.heading = page.getByRole('heading', { name: /Timesheet Overview/i }).first();

    this.dateRangeInput = page.locator('input').filter({ hasText: /\d{2}[-/]\d{2}[-/]\d{4}/ }).first();
    this.quickSelectPanel = page.getByText(/Quick Select/i).first();
    this.thisMonthQuickSelect = page.getByText(/^This Month$/i).first();
    this.applyButton = page.getByRole('button', { name: /^Apply$/i }).first();

    this.userDropdown = page.locator('select').first();
    this.searchInput = page.getByRole('textbox', { name: /Search timesheets|Search/i }).first();
    this.entriesDropdown = page
      .locator('xpath=//*[normalize-space()="Show:"]/following::select[1]')
      .first();

    this.table = page.locator('table').first();
    this.tableRows = this.table.locator('tbody tr');
    this.fromHeader = this.table.getByRole('columnheader', { name: /From/i }).first();
    this.toHeader = this.table.getByRole('columnheader', { name: /^To$/i }).first();
    this.filledDateHeader = this.table.getByRole('columnheader', { name: /Filled Date/i }).first();
    this.submittedHeader = this.table.getByRole('columnheader', { name: /Submitted/i }).first();
    this.totalHoursHeader = this.table.getByRole('columnheader', { name: /Total Hours/i }).first();
    this.actionsHeader = this.table.getByRole('columnheader', { name: /Actions/i }).first();
  }

  async open() {
    await this.timesheetOverviewLink.click();
    await this.heading.waitFor({ state: 'visible' });
  }

  async getDataRowCount() {
    const rowCount = await this.tableRows.count();
    let total = 0;

    for (let index = 0; index < rowCount; index += 1) {
      const rowText = ((await this.tableRows.nth(index).textContent().catch(() => '')) || '').trim().toLowerCase();
      if (!rowText) continue;
      if (rowText.includes('no data available')) continue;
      total += 1;
    }

    return total;
  }

  async openDateRangePicker() {
    await this.dateRangeInput.click();
  }

  async applyThisMonthQuickSelect() {
    await this.openDateRangePicker();
    await this.thisMonthQuickSelect.click();
    await this.applyButton.click();
  }

  async search(text) {
    await this.searchInput.fill(text);
  }

  async setEntriesPerPage(value) {
    await this.entriesDropdown.selectOption(`${value}`);
  }

  async getRowText(rowIndex = 0) {
    return ((await this.tableRows.nth(rowIndex).textContent().catch(() => '')) || '').trim();
  }

  async getProjectMonthNameFromRow(rowIndex = 0) {
    const row = this.tableRows.nth(rowIndex);
    const text = ((await row.textContent().catch(() => '')) || '').trim();
    return text;
  }

  async clickView(rowIndex = 0) {
    const row = this.tableRows.nth(rowIndex);
    const actionCell = row.locator('td').last();
    const candidates = [
      actionCell.getByRole('button').first(),
      actionCell.locator('a').first(),
      actionCell.locator('[role="button"]').first(),
      actionCell.locator('i').first(),
    ];

    for (const candidate of candidates) {
      if ((await candidate.count()) === 0) continue;
      if (!(await candidate.isVisible().catch(() => false))) continue;
      await candidate.click({ force: true });
      return;
    }

    throw new Error(`Could not find a view action for row ${rowIndex}.`);
  }

  async getSubmittedValues(limit = 10) {
    const rowCount = Math.min(await this.tableRows.count(), limit);
    const values = [];

    for (let index = 0; index < rowCount; index += 1) {
      const row = this.tableRows.nth(index);
      const submittedCell = row.locator('td').nth(3);
      const value = ((await submittedCell.textContent().catch(() => '')) || '').trim();
      if (value) values.push(value.toUpperCase());
    }

    return values;
  }
}

module.exports = TimesheetOverviewPage;
