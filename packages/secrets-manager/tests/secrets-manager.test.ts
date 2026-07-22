import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createSecretsManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

describe('SecretsManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('plans secret sync from .env', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-secrets-'));
    const fs = createFileSystem(dir);
    await fs.write(
      '.env',
      'DATABASE_URL=postgres://localhost\nJWT_SECRET=abc\nNODE_ENV=development\n',
    );

    const secrets = createSecretsManager({ cwd: dir, filesystem: fs });
    const plan = await secrets.planSync({ provider: 'railway', appName: 'shop' });

    expect(plan.toSync).toHaveLength(2);
    expect(plan.skipped).toContain('NODE_ENV');
    expect(plan.commands[0]).toContain('railway variables set DATABASE_URL=');
  });

  it('syncs with dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-secrets-dry-'));
    const fs = createFileSystem(dir);
    await fs.write('.env', 'API_KEY=secret\n');

    const secrets = createSecretsManager({ cwd: dir, filesystem: fs });
    const result = await secrets.sync({ provider: 'fly', appName: 'api', dryRun: true });

    expect(result.synced).toHaveLength(1);
    expect(result.commands[0]).toContain('fly secrets set');
  });

  it('executes provider sync commands when not dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-secrets-exec-'));
    const fs = createFileSystem(dir);
    await fs.write('.env', 'API_KEY=secret\n');

    const calls: string[] = [];
    const mockExec = async (command: string, args: string[]) => {
      calls.push(`${command} ${args.join(' ')}`);
      return { exitCode: 0, stdout: 'ok', stderr: '' };
    };

    const secrets = createSecretsManager({ cwd: dir, filesystem: fs, executor: mockExec });
    const result = await secrets.sync({ provider: 'fly', appName: 'api', dryRun: false });

    expect(result.synced).toHaveLength(1);
    expect(calls[0]).toContain('fly secrets set API_KEY=secret');
    expect(result.message).toContain('Synced 1 secrets');
  });

  it('generates secrets documentation', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-secrets-doc-'));
    const secrets = createSecretsManager({
      cwd: dir,
      filesystem: createFileSystem(dir),
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await secrets.setupDocs({ provider: 'aws', appName: 'shop' });
    expect(result.files).toContain('deploy/secrets.aws.md');
  });
});
