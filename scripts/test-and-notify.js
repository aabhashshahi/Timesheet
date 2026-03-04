const { spawnSync } = require('child_process');
const path = require('path');

function runCommand(command, args, extraEnv = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, ...extraEnv },
  });
}

const testArgs = process.argv.slice(2);
const testResult = runCommand('npx', ['playwright', 'test', ...testArgs], {
  PLAYWRIGHT_HTML_OPEN: 'never',
});
const testExitCode = Number.isInteger(testResult.status) ? testResult.status : 1;
console.log(`Playwright test run completed with exit code ${testExitCode}.`);

const dryRunFlags = new Set(['--list', '-l', '--help', '-h']);
const isDryRun = testArgs.some((arg) => dryRunFlags.has(arg));
if (isDryRun) {
  console.log('Dry-run flag detected; Slack notification skipped.');
  process.exit(testExitCode);
}

console.log('Sending Slack summary...');
const slackResult = runCommand(
  'node',
  ['scripts/send-slack-report.js'],
  { PLAYWRIGHT_OUTCOME: testExitCode === 0 ? 'success' : 'failure' }
);
const slackExitCode = Number.isInteger(slackResult.status) ? slackResult.status : 1;
console.log(`Slack summary step completed with exit code ${slackExitCode}.`);

if (testExitCode !== 0) {
  process.exit(testExitCode);
}

process.exit(slackExitCode);
