# Automate--Timesheet

Playwright end-to-end automation for the De Heus Timesheet web app.

## Stack

- Node.js (CommonJS)
- Playwright (`@playwright/test`)
- GitHub Actions CI

## Project Structure

```text
pages/
  loginpage.js
  settingspage.js
  timesheetbydaypage.js
  timesheetbymonthpage.js
scripts/
  send-slack-report.js
  test-and-notify.js
tests/
  constants.js
  login/
  settings/
  timesheet by day/
  timesheet by month/
.github/workflows/playwright.yml
playwright.config.js
```

## Prerequisites

- Node.js 18+
- npm
- Test credentials for Timesheet

## Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Install Playwright browsers:

```bash
npx playwright install --with-deps
```

3. Create `.env` in project root:

```env
MS_EMAIL=your_test_email
MS_PASSWORD=your_test_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C1234567890
SLACK_HTML_REPORT_PATH=playwright-report/index.html
SLACK_HTML_REPORT_NAME=report.html
```

Slack summary requires one of:

- `SLACK_WEBHOOK_URL`, or
- `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID` (bot fallback path)

`SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID` are also required for HTML file upload to Slack.

`SLACK_HTML_REPORT_PATH` and `SLACK_HTML_REPORT_NAME` are optional overrides for uploaded file path/name.

`PLAYWRIGHT_REPORT_URL` is set by CI automatically (from GitHub Pages deployment) and included in Slack messages when available.

## Run Tests

Run all tests with Slack summary (even when tests fail):

```bash
npm run test:e2e
```

`test:e2e` and `test:notify` run the same notify flow.

```bash
npm run test:notify
```

Run selected tests with Slack summary:

```bash
npm run test:only -- tests/login --project=chrome
```

Run Timesheet by Day suite with Slack summary:

```bash
npm run test:only -- "tests/timesheet by day" --project=chrome
```

Run Timesheet by Month suite with Slack summary:

```bash
npm run test:only -- "tests/timesheet by month" --project=chrome
```

Run tests without Slack notification:

```bash
npm run test:raw -- tests/login --project=chrome
```

Send Slack summary only (requires existing JSON report):

```bash
npm run report:slack
```

## Reporting

Configured in `playwright.config.js`:

- HTML report: `playwright-report/`
- JSON report: `test-results/results.json`

HTML auto-open is disabled for notify runs to avoid blocking Slack send.

Open HTML report manually:

```bash
npx playwright show-report
```

## Fixtures

Suite fixtures create and reuse storage state so each test does not log in from scratch:

- Day suite storage: `.auth/timesheet-user.json` via `tests/timesheet by day/fixtures.js`
- Month suite storage: `.auth/timesheet-month-user.json` via `tests/timesheet by month/fixtures.js`
- Month fixture also sets default dashboard preference to `Monthly` before saving storage state

## CI Slack Automation

Workflow: `.github/workflows/playwright.yml`

After each CI run, a Slack summary is sent automatically (if Slack webhook secret is configured), including:

- run status (PASSED/FAILED)
- total, passed, failed, skipped
- test-level details (failed and passed lists, capped for message size)
- GitHub Actions run URL
- GitHub Pages link to Playwright HTML report (non-PR events)
- optional HTML report file upload (`report.html`) when bot token + channel ID are configured

GitHub Pages requirement (one-time repository setup):

- Repository `Settings` -> `Pages` -> `Build and deployment` -> `Source: GitHub Actions`

Required GitHub repository secrets:

- `MS_EMAIL`
- `MS_PASSWORD`
- `SLACK_WEBHOOK_URL`

Optional GitHub repository secrets (for HTML file upload to Slack):

- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`

## Current Coverage

- Login flows (redirect, valid, invalid email, invalid password, empty email)
- Settings: switch default timesheet Daily/Monthly and verify dashboard mode
- Timesheet by Day TS-13275 page loads after successful login
- Timesheet by Day TS-13279 user can add hours on selected existing project
- Timesheet by Day TS-13280 Year Dropdown Functionality
- Timesheet by Day TS-13281 Week Dropdown Functionality
- Timesheet by Day TS-13282 Previous Week Navigation Left
- Timesheet by Day TS-13283 Next Week Navigation Right
- Timesheet by Day TS-13284 system rejects negative hours
- Timesheet by Day TS-13285 system rejects more than 24 hours in a day
- Timesheet by Day TS-13286 total hours across all projects do not exceed 24
- Timesheet by Month TS-13303 Load Timesheet for Selected Year
- Timesheet by Month TS-13304 Navigate to Previous/Next Year
- Timesheet by Month TS-13305 Add a Project to Timesheet
- Timesheet by Month TS-13306 Prevent Adding Duplicate Projects
- Timesheet by Month TS-13308 Enter Hours for Each Month
- Timesheet by Month TS-13309 Validate Non-Numeric Input
- Timesheet by Month TS-13311 Automatic Total Calculation
- Timesheet by Month TS-13312 Delete a Project Row
- Timesheet by Month TS-13313 Undo Appears After Clicking Delete
- Timesheet by Month TS-13314 Undo Restores the Deleted Row
