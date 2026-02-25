const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const REPORT_PATH = path.join(ROOT_DIR, 'test-results', 'results.json');
const DEFAULT_DETAIL_LIMIT = 20;

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

function normalizeStatus(status) {
  if (status === 'passed') return 'passed';
  if (status === 'skipped') return 'skipped';
  return 'failed';
}

function firstLine(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\r?\n/g, ' ').trim();
}

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function collectTestCases(suites, suitePath = [], collected = []) {
  for (const suite of suites || []) {
    const nextSuitePath = suite.title ? [...suitePath, suite.title] : suitePath;

    for (const spec of suite.specs || []) {
      const fullTitle = [...nextSuitePath, spec.title].filter(Boolean).join(' > ');

      for (const testCase of spec.tests || []) {
        const results = testCase.results || [];
        const finalResult = results[results.length - 1] || {};
        const status = normalizeStatus(finalResult.status || testCase.status);
        const rawError =
          (finalResult.errors && finalResult.errors[0] && finalResult.errors[0].message) ||
          (finalResult.error && finalResult.error.message) ||
          '';

        collected.push({
          status,
          title: fullTitle || spec.title || 'Unnamed test',
          file: spec.file || suite.file || '',
          line: spec.line || suite.line || '',
          projectName: testCase.projectName || '',
          error: firstLine(rawError),
        });
      }
    }

    collectTestCases(suite.suites || [], nextSuitePath, collected);
  }

  return collected;
}

function summarizeTestCases(testCases) {
  return testCases.reduce(
    (totals, testCase) => {
      totals[testCase.status] += 1;
      return totals;
    },
    { passed: 0, failed: 0, skipped: 0 }
  );
}

function parseDetailLimit() {
  const rawValue = process.env.SLACK_TEST_DETAIL_LIMIT;
  const parsed = Number.parseInt(rawValue || `${DEFAULT_DETAIL_LIMIT}`, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DETAIL_LIMIT;
  }
  return parsed;
}

function compactTestName(testCase) {
  const rawFile = (testCase.file || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (rawFile) {
    const noSpecSuffix = rawFile
      .replace(/\.spec\.[cm]?[jt]sx?$/i, '')
      .replace(/\.[cm]?[jt]sx?$/i, '');

    const segments = noSpecSuffix.split('/').filter(Boolean);
    if (segments.length > 0) {
      segments[0] = `${segments[0].charAt(0).toUpperCase()}${segments[0].slice(1)}`;
      return truncate(segments.join('\\'), 140);
    }
  }

  const fallbackTitle = (testCase.title || 'Unnamed test').split(' > ')[0];
  return truncate(fallbackTitle, 140);
}

function toTitleCase(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function parseTestMetadata(testCase) {
  const rawFile = (testCase.file || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const parts = rawFile.split('/').filter(Boolean);
  const moduleName = toTitleCase(parts[0] || '');
  const fileName = parts[parts.length - 1] || '';
  const baseName = fileName
    .replace(/\.spec\.[cm]?[jt]sx?$/i, '')
    .replace(/\.[cm]?[jt]sx?$/i, '');

  const idMatch = baseName.match(/TS-\d+/i);
  const testCaseId = idMatch ? idMatch[0].toUpperCase() : '--';

  let title = baseName;
  if (idMatch) {
    const idIndex = baseName.toUpperCase().indexOf(testCaseId);
    title = baseName.slice(idIndex + testCaseId.length).replace(/^[-_\s]+/, '');
  }
  title = title.replace(/[-_]+/g, ' ').trim();

  if (!title) {
    const fallback = compactTestName(testCase);
    title = fallback.includes('\\') ? fallback.split('\\').pop() : fallback;
  }

  return {
    moduleName: moduleName || '--',
    testCaseId,
    title: title || '--',
  };
}

function sanitizeCell(value) {
  return `${value || ''}`.replace(/[|\r\n\t]/g, ' ').trim();
}

function formatCell(value, width) {
  return truncate(sanitizeCell(value), width).padEnd(width, ' ');
}

function buildTableRows(testCases, limit, includeError = false) {
  const visibleCases = testCases.slice(0, limit);
  return visibleCases.map((testCase, index) => {
    const parsed = parseTestMetadata(testCase);
    const titleSuffix = includeError && testCase.error ? ` | ${truncate(firstLine(testCase.error), 45)}` : '';
    return [
      formatCell(`${index + 1}`, 3),
      formatCell(parsed.moduleName, 10),
      formatCell(parsed.testCaseId, 10),
      formatCell(`${parsed.title}${titleSuffix}`, 55),
    ].join(' | ');
  });
}

function buildTableChunks(title, testCases, limit, includeError = false, maxChars = 2800) {
  if (testCases.length === 0) return [];

  const rows = buildTableRows(testCases, limit, includeError);
  const header = [
    formatCell('#', 3),
    formatCell('Module', 10),
    formatCell('Test ID', 10),
    formatCell('Title', 55),
  ].join(' | ');
  const separator = `${'-'.repeat(3)}-+-${'-'.repeat(10)}-+-${'-'.repeat(10)}-+-${'-'.repeat(55)}`;

  const chunks = [];
  let continuation = 1;
  let currentRows = [header, separator];

  const pushChunk = () => {
    if (currentRows.length <= 2) return;
    const label = continuation === 1 ? `${title} (${testCases.length})` : `${title} (${testCases.length}) cont. ${continuation}`;
    chunks.push(`*${label}*\n\`\`\`\n${currentRows.join('\n')}\n\`\`\``);
    continuation += 1;
    currentRows = [header, separator];
  };

  for (const row of rows) {
    const candidate = `*${title} (${testCases.length})*\n\`\`\`\n${[...currentRows, row].join('\n')}\n\`\`\``;
    if (candidate.length > maxChars && currentRows.length > 2) {
      pushChunk();
    }
    currentRows.push(row);
  }

  pushChunk();

  const hiddenCount = testCases.length - rows.length;
  if (hiddenCount > 0 && chunks.length > 0) {
    chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n_${hiddenCount} more not shown_`;
  }

  return chunks;
}

function getStatusEmoji(runStatus) {
  if (runStatus === 'PASSED') return ':white_check_mark:';
  if (runStatus === 'FAILED') return ':x:';
  return ':warning:';
}

function getRunStatus(totals) {
  const explicitOutcome = (process.env.PLAYWRIGHT_OUTCOME || '').toLowerCase();
  if (totals.failed > 0) return 'FAILED';
  if (explicitOutcome === 'failure' || explicitOutcome === 'failed') return 'FAILED';
  if (totals.passed > 0) return 'PASSED';
  if (explicitOutcome === 'success' || explicitOutcome === 'passed') return 'PASSED';
  return 'UNKNOWN';
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

  let testCases = [];
  let reportWarning = '';

  if (fs.existsSync(REPORT_PATH)) {
    try {
      const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
      testCases = collectTestCases(report.suites || []);
    } catch (error) {
      reportWarning = `Report parse warning: ${firstLine(error.message)}`;
    }
  } else {
    reportWarning = 'Report file not found: test-results/results.json';
  }

  const totals = summarizeTestCases(testCases);
  const total = totals.passed + totals.failed + totals.skipped;
  const runStatus = getRunStatus(totals);
  const detailLimit = parseDetailLimit();

  const failedTests = testCases.filter((testCase) => testCase.status === 'failed');
  const passedTests = testCases.filter((testCase) => testCase.status === 'passed');
  const skippedTests = testCases.filter((testCase) => testCase.status === 'skipped');

  const runNumber = process.env.GITHUB_RUN_NUMBER ? ` #${process.env.GITHUB_RUN_NUMBER}` : '';
  const repository = process.env.GITHUB_REPOSITORY || '';
  const branch = process.env.GITHUB_REF_NAME || '';
  const runUrl =
    process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : '';

  const lines = [`Playwright run: ${runStatus}${runNumber}`];
  if (repository) lines.push(`Repo: ${repository}`);
  if (branch) lines.push(`Branch: ${branch}`);
  lines.push(`Total: ${total} | Passed: ${totals.passed} | Failed: ${totals.failed} | Skipped: ${totals.skipped}`);

  const failedTables = buildTableChunks('Failed tests', failedTests, detailLimit, true);
  const passedTables = buildTableChunks('Passed tests', passedTests, detailLimit, false);
  const skippedTables = buildTableChunks('Skipped tests', skippedTests, detailLimit, false);

  if (failedTests.length > 0) lines.push('', `Failed tests: ${failedTests.length}`);
  if (passedTests.length > 0) lines.push('', `Passed tests: ${passedTests.length}`);
  if (skippedTests.length > 0) lines.push('', `Skipped tests: ${skippedTests.length}`);

  if (reportWarning) {
    lines.push('', reportWarning);
  }

  if (runUrl) {
    lines.push('', `Run: ${runUrl}`);
  }

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${getStatusEmoji(runStatus)} *Playwright run: ${runStatus}${runNumber}*`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Total*\n${total}` },
        { type: 'mrkdwn', text: `*Passed*\n${totals.passed}` },
        { type: 'mrkdwn', text: `*Failed*\n${totals.failed}` },
        { type: 'mrkdwn', text: `*Skipped*\n${totals.skipped}` },
      ],
    },
  ];

  if (repository || branch) {
    const metaParts = [];
    if (repository) metaParts.push(`*Repo:* ${repository}`);
    if (branch) metaParts.push(`*Branch:* ${branch}`);
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: metaParts.join('    |    ') }],
    });
  }

  if (failedTables.length || passedTables.length || skippedTables.length) {
    blocks.push({ type: 'divider' });
  }

  failedTables.forEach((text) => {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
  });
  passedTables.forEach((text) => {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
  });
  skippedTables.forEach((text) => {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
  });

  if (reportWarning) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `:warning: ${reportWarning}` },
    });
  }

  if (runUrl) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `<${runUrl}|Open GitHub Actions run details>` },
    });
  }

  const payload = {
    text: lines.join('\n'),
    blocks,
  };

  await postToSlack(webhookUrl, payload);
  console.log('Slack notification sent.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
