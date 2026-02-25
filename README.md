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
scripts/
  send-slack-report.js
  test-and-notify.js
tests/
  constants.js
  login/
  settings/
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
```

`SLACK_WEBHOOK_URL` is only needed for Slack reporting.

## Run Tests

Run all tests:

```bash
npm run test:e2e
```

Run all tests + Slack summary:

```bash
npm run test:notify
```

`test:notify` always attempts Slack reporting after tests, even if some tests fail.

Send Slack summary only (requires existing JSON report):

```bash
npm run report:slack
```

Run only login tests:

```bash
npx playwright test tests/login --project=chrome
```

Run only settings tests:

```bash
npx playwright test tests/settings --project=chrome
```

## Reporting

Configured in `playwright.config.js`:

- HTML report: `playwright-report/`
- JSON report: `test-results/results.json`

Open HTML report:

```bash
npx playwright show-report
```

## CI Slack Automation

Workflow: `.github/workflows/playwright.yml`

After each CI run, a Slack summary is sent automatically (if Slack webhook secret is configured), including:

- run status (PASSED/FAILED)
- total, passed, failed, skipped
- test-level details (failed and passed lists, capped for message size)
- GitHub Actions run URL

Required GitHub repository secrets:

- `MS_EMAIL`
- `MS_PASSWORD`
- `SLACK_WEBHOOK_URL`

## Current Coverage

- Login flows (redirect, valid, invalid email, invalid password, empty email)
- Settings: switch default timesheet Daily/Monthly and verify dashboard mode
