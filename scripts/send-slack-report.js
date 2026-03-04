const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const REPORT_PATH = path.join(ROOT_DIR, 'test-results', 'results.json');
const HTML_REPORT_PATH = path.join(ROOT_DIR, 'playwright-report', 'index.html');
const DEFAULT_DETAIL_LIMIT = 100;
const DEFAULT_HTML_REPORT_NAME = 'report.html';
const TABLE_WIDTHS = {
  index: 3,
  module: 18,
  testId: 10,
  title: 47,
};

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
  const moduleSegment = parts[0] && parts[0].toLowerCase() === 'tests' ? parts[1] || parts[0] : parts[0] || '';
  const moduleName = toTitleCase(moduleSegment);
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
    const titleSuffix = includeError && testCase.error ? ` | ${truncate(firstLine(testCase.error), 35)}` : '';
    return [
      formatCell(`${index + 1}`, TABLE_WIDTHS.index),
      formatCell(parsed.moduleName, TABLE_WIDTHS.module),
      formatCell(parsed.testCaseId, TABLE_WIDTHS.testId),
      formatCell(`${parsed.title}${titleSuffix}`, TABLE_WIDTHS.title),
    ].join(' | ');
  });
}

function buildTableChunks(title, testCases, limit, includeError = false, maxChars = 2800) {
  if (testCases.length === 0) return [];

  const rows = buildTableRows(testCases, limit, includeError);
  const header = [
    formatCell('#', TABLE_WIDTHS.index),
    formatCell('Module', TABLE_WIDTHS.module),
    formatCell('Test ID', TABLE_WIDTHS.testId),
    formatCell('Title', TABLE_WIDTHS.title),
  ].join(' | ');
  const separator = `${'-'.repeat(TABLE_WIDTHS.index)}-+-${'-'.repeat(TABLE_WIDTHS.module)}-+-${'-'.repeat(
    TABLE_WIDTHS.testId
  )}-+-${'-'.repeat(TABLE_WIDTHS.title)}`;

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

function requestHttps({ url, method = 'POST', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method, headers }, (response) => {
      let responseBody = '';

      response.on('data', (chunk) => {
        responseBody += chunk;
      });

      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          body: responseBody,
          headers: response.headers,
        });
      });
    });

    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function postToSlack(webhookUrl, payload) {
  const body = JSON.stringify(payload);
  const response = await requestHttps({
    url: webhookUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    body,
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Slack send failed: ${response.statusCode} ${response.body}`);
  }
}

async function postSummaryWithBot(token, channelId, payload) {
  return postSlackApi(token, 'chat.postMessage', {
    channel: channelId,
    text: payload.text,
    blocks: payload.blocks,
    unfurl_links: false,
    unfurl_media: false,
  });
}

async function postSlackApi(token, methodName, payload, options = {}) {
  const useFormEncoding = options.formEncoded === true;
  const body = useFormEncoding
    ? new URLSearchParams(payload || {}).toString()
    : JSON.stringify(payload || {});

  const response = await requestHttps({
    url: `https://slack.com/api/${methodName}`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': useFormEncoding
        ? 'application/x-www-form-urlencoded; charset=utf-8'
        : 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    },
    body,
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Slack API ${methodName} request failed: ${response.statusCode} ${response.body}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(response.body);
  } catch (error) {
    throw new Error(`Slack API ${methodName} returned invalid JSON: ${firstLine(error.message)}`);
  }

  if (!parsed.ok) {
    const metadataMessages = Array.isArray(parsed.response_metadata && parsed.response_metadata.messages)
      ? parsed.response_metadata.messages
      : [];
    const metadataWarnings = Array.isArray(parsed.response_metadata && parsed.response_metadata.warnings)
      ? parsed.response_metadata.warnings
      : [];
    const detailParts = [...metadataMessages, ...metadataWarnings].filter(Boolean);
    const detailText = detailParts.length > 0 ? ` (${detailParts.join(' | ')})` : '';
    throw new Error(`Slack API ${methodName} failed: ${parsed.error || 'unknown_error'}${detailText}`);
  }

  return parsed;
}

async function uploadSlackExternalFile(uploadUrl, fileBuffer, contentType) {
  const response = await requestHttps({
    url: uploadUrl,
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length,
    },
    body: fileBuffer,
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Slack external upload failed: ${response.statusCode} ${response.body}`);
  }
}

async function uploadFileToSlack({ token, channelId, filePath, fileName, contentType, initialComment }) {
  if (!fs.existsSync(filePath)) {
    return {
      skipped: true,
      reason: `File not found: ${path.relative(ROOT_DIR, filePath)}`,
    };
  }

  const safeFileName = path.basename((fileName || '').trim());
  if (!safeFileName) {
    return {
      skipped: true,
      reason: 'Upload filename is empty. Provide a valid file name.',
    };
  }

  const fileBuffer = fs.readFileSync(filePath);
  if (fileBuffer.length <= 0) {
    return {
      skipped: true,
      reason: `File is empty: ${path.relative(ROOT_DIR, filePath)}`,
    };
  }

  const uploadInit = await postSlackApi(token, 'files.getUploadURLExternal', {
    filename: safeFileName,
    length: `${fileBuffer.length}`,
  }, { formEncoded: true });

  if (!uploadInit.upload_url || !uploadInit.file_id) {
    throw new Error('Slack API files.getUploadURLExternal did not return upload_url and file_id.');
  }

  await uploadSlackExternalFile(uploadInit.upload_url, fileBuffer, contentType);

  const uploadComplete = await postSlackApi(token, 'files.completeUploadExternal', {
    files: [{ id: uploadInit.file_id, title: safeFileName }],
    channel_id: channelId,
    initial_comment: initialComment,
  });

  const uploadedFile = Array.isArray(uploadComplete.files) ? uploadComplete.files[0] : null;
  return {
    skipped: false,
    fileId: uploadInit.file_id,
    permalink: uploadedFile && uploadedFile.permalink ? uploadedFile.permalink : '',
  };
}

async function uploadHtmlReportToSlack({ token, channelId, filePath, fileName, initialComment }) {
  return uploadFileToSlack({
    token,
    channelId,
    filePath,
    fileName,
    contentType: 'text/html; charset=utf-8',
    initialComment,
  });
}

async function main() {
  loadEnvFile(ENV_PATH);

  const webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
  const slackBotToken = process.env.SLACK_BOT_TOKEN || '';
  const slackChannelId = process.env.SLACK_CHANNEL_ID || '';
  const hasBotSummaryPath = Boolean(slackBotToken && slackChannelId);

  if (!webhookUrl && !hasBotSummaryPath) {
    throw new Error('Slack summary cannot be sent. Set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN + SLACK_CHANNEL_ID.');
  }
  const htmlReportPath = process.env.SLACK_HTML_REPORT_PATH
    ? path.resolve(ROOT_DIR, process.env.SLACK_HTML_REPORT_PATH)
    : HTML_REPORT_PATH;
  const htmlReportName = (process.env.SLACK_HTML_REPORT_NAME || DEFAULT_HTML_REPORT_NAME).trim() || DEFAULT_HTML_REPORT_NAME;

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

  let summarySent = false;
  let webhookError = '';

  if (webhookUrl) {
    try {
      await postToSlack(webhookUrl, payload);
      summarySent = true;
      console.log('Slack summary notification sent (webhook).');
    } catch (error) {
      webhookError = firstLine(error.message);
      console.warn(`Slack webhook summary failed: ${webhookError}`);
    }
  }

  if (!summarySent && hasBotSummaryPath) {
    await postSummaryWithBot(slackBotToken, slackChannelId, payload);
    summarySent = true;
    console.log('Slack summary notification sent (bot).');
  }

  if (!summarySent) {
    throw new Error(
      `Slack summary could not be sent.${webhookError ? ` Webhook error: ${webhookError}` : ''}`
    );
  }

  if (!slackBotToken || !slackChannelId) {
    console.log('Slack HTML report upload skipped: set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID to enable it.');
    return;
  }

  try {
    const initialComment = `For detailed report, download this HTML file.${runUrl ? `\nRun: ${runUrl}` : ''}`;
    const uploadResult = await uploadHtmlReportToSlack({
      token: slackBotToken,
      channelId: slackChannelId,
      filePath: htmlReportPath,
      fileName: htmlReportName,
      initialComment,
    });

    if (uploadResult.skipped) {
      console.warn(`Slack HTML report upload skipped: ${uploadResult.reason}`);
      return;
    }

    console.log(
      `Slack HTML report uploaded${uploadResult.permalink ? `: ${uploadResult.permalink}` : ` (file ID: ${uploadResult.fileId})`}.`
    );
  } catch (error) {
    console.warn(`Slack HTML report upload failed (non-blocking): ${firstLine(error.message)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

