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

const testResult = runCommand('npx', ['playwright', 'test']);
const testExitCode = Number.isInteger(testResult.status) ? testResult.status : 1;

const slackResult = runCommand(
  'node',
  ['scripts/send-slack-report.js'],
  { PLAYWRIGHT_OUTCOME: testExitCode === 0 ? 'success' : 'failure' }
);
const slackExitCode = Number.isInteger(slackResult.status) ? slackResult.status : 1;

if (testExitCode !== 0) {
  process.exit(testExitCode);
}

process.exit(slackExitCode);
