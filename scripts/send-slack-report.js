const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const REPORT_PATH = path.join(ROOT_DIR, 'test-results', 'results.json');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const envLines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of envLines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function summarizeSuites(suites) {
  const totals = { passed: 0, failed: 0, skipped: 0 };

  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const testCase of spec.tests || []) {
        const results = testCase.results || [];
        const finalResult = results[results.length - 1];
        const status = finalResult && finalResult.status;

        if (status === 'passed') totals.passed += 1;
        else if (status === 'skipped') totals.skipped += 1;
        else totals.failed += 1;
      }
    }

    const nested = summarizeSuites(suite.suites || []);
    totals.passed += nested.passed;
    totals.failed += nested.failed;
    totals.skipped += nested.skipped;
  }

  return totals;
}

function postToSlack(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const request = https.request(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (response) => {
      let responseBody = '';

      response.on('data', (chunk) => {
        responseBody += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve();
          return;
        }
        reject(new Error(`Slack send failed: ${response.statusCode} ${responseBody}`));
      });
    });

    request.on('error', reject);
    request.write(JSON.stringify(payload));
    request.end();
  });
}

async function main() {
  loadEnvFile(ENV_PATH);

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL is missing. Add it to .env.');
  }

  if (!fs.existsSync(REPORT_PATH)) {
    throw new Error('Report file not found: test-results/results.json. Run tests first.');
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const totals = summarizeSuites(report.suites || []);
  const total = totals.passed + totals.failed + totals.skipped;
  const runStatus = totals.failed > 0 ? 'FAILED' : 'PASSED';

  const payload = {
    text: [
      `Playwright run: ${runStatus}`,
      `Total: ${total}`,
      `Passed: ${totals.passed}`,
      `Failed: ${totals.failed}`,
      `Skipped: ${totals.skipped}`,
    ].join('\n'),
  };

  await postToSlack(webhookUrl, payload);
  console.log('Slack notification sent.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
