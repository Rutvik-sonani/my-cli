#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
/**
 * E2E smoke: create a generated API project, install deps, build, and run tests.
 * Usage: node scripts/e2e-generated-app.mjs
 *
 * Set MYCLI_E2E_MINIMAL=1 to run the narrow no-database smoke (legacy path).
 * Set MYCLI_E2E_LIVE=0 to skip starting the app server for integration tests.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const appName = process.env.MYCLI_E2E_APP_NAME ?? 'e2e-app';
const minimal = process.env.MYCLI_E2E_MINIMAL === '1';
const live = !minimal && process.env.MYCLI_E2E_LIVE !== '0';

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}`);
  }
}

function waitForHealth(baseUrl, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const request = http.get(`${baseUrl}/health`, (response) => {
        response.resume();
        if (response.statusCode === 200) {
          resolve();
        } else {
          schedule();
        }
      });
      request.on('error', schedule);
    };
    const schedule = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Server not ready at ${baseUrl}/health`));
        return;
      }
      setTimeout(attempt, 300);
    };
    attempt();
  });
}

async function main() {
  const workDir = await mkdtemp(join(tmpdir(), 'mycli-e2e-'));
  const appDir = join(workDir, appName);
  const cliEntry = join(repoRoot, 'apps/cli/dist/index.js');
  let server;

  console.log(`Workspace: ${workDir}`);
  console.log(`Mode: ${minimal ? 'minimal (no database)' : 'default (postgresql + prisma)'}`);
  console.log(`Live integration: ${live ? 'yes' : 'no'}`);

  try {
    run('pnpm', ['build'], { cwd: repoRoot });
    run('node', [join(repoRoot, 'scripts/copy-cli-templates.mjs')]);

    console.log(`\nCreating ${appName}...`);
    const createArgs = [cliEntry, 'create', appName, '--yes', '--skip-git', '--skip-install'];
    if (minimal) {
      createArgs.push('--database', 'none', '--orm', 'none');
    }
    run('node', createArgs, { cwd: workDir });

    console.log('\nInstalling dependencies...');
    run('npm', ['install'], { cwd: appDir });

    if (!minimal) {
      console.log('\nGenerating Prisma client...');
      run('npm', ['run', 'db:generate'], { cwd: appDir });
    }

    console.log('\nBuilding generated project...');
    run('npm', ['run', 'build'], { cwd: appDir });

    const testEnv = { ...process.env };

    if (live) {
      const port = process.env.MYCLI_E2E_PORT ?? '3456';
      const baseUrl = `http://127.0.0.1:${port}`;
      console.log(`\nStarting generated app on ${baseUrl}...`);
      server = spawn('node', ['dist/index.js'], {
        cwd: appDir,
        env: { ...process.env, PORT: port },
        stdio: 'pipe',
      });
      server.stdout?.on('data', (chunk) => process.stdout.write(chunk));
      server.stderr?.on('data', (chunk) => process.stderr.write(chunk));

      await waitForHealth(baseUrl);
      testEnv.TEST_BASE_URL = baseUrl;
      console.log('\nRunning generated project tests (live /health integration)...');
    } else {
      console.log('\nRunning generated project tests...');
    }

    run('npm', ['test'], { cwd: appDir, env: testEnv });

    console.log('\n✔ Generated app E2E smoke passed');
  } finally {
    if (server && !server.killed) {
      server.kill('SIGTERM');
    }
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('\n✖ Generated app E2E smoke failed');
  console.error(error);
  process.exit(1);
});
