class FavouritesPage {
  constructor(page) {
    this.page = page;

    this.favouritesNavLink = page.getByRole('link', { name: /Favourites/i }).first();
    this.heading = page.getByRole('heading', { name: /Favourite Projects/i }).first();

    this.projectDropdown = page.locator('select').first();
    this.projectDropdownTrigger = page.locator('#select2-selectedProject-container').first();
    this.addButton = page.getByRole('button', { name: /^Add$/i }).first();

    this.entriesDropdown = page
      .locator('xpath=//*[normalize-space()="Show:"]/following::select[1]')
      .first();
    this.searchInput = page.getByRole('textbox', { name: /Search/i }).first();

    this.table = page.locator('table').first();
    this.tableRows = this.table.locator('tbody tr');
    this.costCodeHeader = this.table.getByRole('columnheader', { name: /Cost Code/i }).first();
    this.projectNameHeader = this.table.getByRole('columnheader', { name: /Project Name/i }).first();
    this.actionsHeader = this.table.getByRole('columnheader', { name: /Actions/i }).first();
    this.emptyState = this.table.getByText(/No data available/i).first();
    this.resultSummary = page.locator('p').filter({ hasText: /Showing/i }).first();
  }

  async openFromTopNav() {
    await this.favouritesNavLink.click();
    await this.heading.waitFor({ state: 'visible' });
  }

  async getProjectOptions() {
    const options = await this.projectDropdown.locator('option').allTextContents().catch(() => []);
    return options.map((option) => option.trim()).filter(Boolean);
  }

  async addProject(projectOption) {
    await this.projectDropdown.selectOption({ label: projectOption });
    await this.addButton.click();
  }

  async setEntriesPerPage(value) {
    await this.entriesDropdown.selectOption(`${value}`);
  }

  async search(text) {
    await this.searchInput.fill(text);
  }

  async getDataRowCount() {
    const rowCount = await this.tableRows.count();
    if (rowCount === 0) return 0;

    let realRows = 0;
    for (let index = 0; index < rowCount; index += 1) {
      const rowText = ((await this.tableRows.nth(index).textContent().catch(() => '')) || '').trim().toLowerCase();
      if (!rowText) continue;
      if (rowText.includes('no data available')) continue;
      realRows += 1;
    }

    return realRows;
  }

  async hasDeleteControl(rowIndex = 0) {
    const deleteControl = await this.getDeleteControl(rowIndex);
    return Boolean(deleteControl);
  }

  async deleteRow(rowIndex = 0) {
    const deleteControl = await this.getDeleteControl(rowIndex);
    if (!deleteControl) {
      throw new Error(`Could not find delete control for row ${rowIndex}.`);
    }

    await deleteControl.click({ force: true });
  }

  async deleteRowByAnyMeans(rowIndex = 0) {
    const targetRow = this.tableRows.nth(rowIndex);
    if ((await targetRow.count()) === 0) {
      throw new Error(`Could not find row ${rowIndex} to delete.`);
    }

    const robustCandidates = [
      targetRow.locator('td').last().locator('button, a, [role="button"], i').first(),
      targetRow.locator('[title*="Delete" i], [aria-label*="Delete" i], .ti-trash, .fa-trash').first(),
      this.page.locator('tbody tr').nth(rowIndex).locator('td').last().locator('*').first(),
    ];

    for (const candidate of robustCandidates) {
      if ((await candidate.count()) === 0) continue;
      if (!(await candidate.isVisible().catch(() => false))) continue;
      await candidate.click({ force: true });
      return;
    }

    throw new Error(`No clickable delete control found for row ${rowIndex}.`);
  }

  async getResultSummaryText() {
    const text = await this.resultSummary.textContent().catch(() => '');
    return (text || '').trim();
  }

  async getFavouriteRowData(rowIndex = 0) {
    const row = this.tableRows.nth(rowIndex);
    if ((await row.count()) === 0) {
      return { costCode: '', projectName: '' };
    }

    const costCode = ((await row.locator('td').nth(0).textContent().catch(() => '')) || '').trim();
    const projectName = ((await row.locator('td').nth(1).textContent().catch(() => '')) || '').trim();
    return { costCode, projectName };
  }

  async getDeleteControl(rowIndex = 0) {
    const targetRow = this.tableRows.nth(rowIndex);
    if ((await targetRow.count()) === 0) return null;

    const actionCell = targetRow.locator('td').last();
    const deleteCandidates = [
      actionCell.locator('[title*="Delete" i], [aria-label*="Delete" i]').first(),
      actionCell.getByRole('button', { name: /Delete|Remove/i }).first(),
      actionCell.locator('button').first(),
      actionCell.locator('a').first(),
      actionCell.locator('[role="button"]').first(),
      actionCell.locator('i').first(),
    ];

    for (const candidate of deleteCandidates) {
      if ((await candidate.count()) === 0) continue;
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }

    return null;
  }
}

module.exports = FavouritesPage;
