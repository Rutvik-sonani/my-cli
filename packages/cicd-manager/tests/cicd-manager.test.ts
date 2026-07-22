import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createCicdManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('CicdManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates GitHub Actions workflow', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cicd-gh-'));
    const fs = createFileSystem(dir);
    const cicd = createCicdManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await cicd.setup({ provider: 'github', appName: 'api' });
    expect(result.files).toContain('.github/workflows/ci.yml');
    expect(result.files).toContain('CICD.md');

    const ci = await readFile(join(dir, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('actions/setup-node');
  });

  it('generates GitLab CI pipeline', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cicd-gl-'));
    const fs = createFileSystem(dir);
    const cicd = createCicdManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await cicd.setup({ provider: 'gitlab', appName: 'api' });
    expect(result.files).toContain('.gitlab-ci.yml');

    const pipeline = await readFile(join(dir, '.gitlab-ci.yml'), 'utf8');
    expect(pipeline).toContain('stages:');
    expect(pipeline).toContain('lint');
  });

  it('generates Jenkins pipeline', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cicd-jk-'));
    const fs = createFileSystem(dir);
    const cicd = createCicdManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await cicd.setup({ provider: 'jenkins', appName: 'api' });
    const jenkins = await readFile(join(dir, 'Jenkinsfile'), 'utf8');
    expect(jenkins).toContain("stage('Test')");
  });

  it('supports dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-cicd-dry-'));
    const fs = createFileSystem(dir);
    const cicd = createCicdManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await cicd.setup({ provider: 'azure', appName: 'dry', dryRun: true });
    expect(await fileExists(join(dir, 'azure-pipelines.yml'))).toBe(false);
  });
});
