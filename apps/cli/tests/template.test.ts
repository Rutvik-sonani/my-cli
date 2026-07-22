import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('my template (Phase 16)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject() {
    dir = await mkdtemp(join(tmpdir(), 'mycli-tpl-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'demo',
        language: 'typescript',
        paths: { templateMarketplace: 'src/template-marketplace' },
      }),
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module' }),
    );
  }

  it('sets up template marketplace client', async () => {
    await scaffoldProject();
    const cli = await createCli();
    const result = await cli.run(['template', 'setup']);
    expect(result.exitCode).toBe(0);

    expect(
      await pathExists(join(dir, 'src/template-marketplace/client/marketplace.client.ts')),
    ).toBe(true);
    expect(await pathExists(join(dir, 'src/template-marketplace/catalog/builtin-catalog.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'TEMPLATE_MARKETPLACE.md'))).toBe(true);

    const config = JSON.parse(await readFile(join(dir, '.myclirc.json'), 'utf8'));
    expect(config.features.templateMarketplace).toBe(true);
    expect(config.paths.templateMarketplace).toBe('src/template-marketplace');

    await cli.shutdown();
  });

  it('searches, installs, and publishes templates', async () => {
    await scaffoldProject();
    const cli = await createCli();

    const search = await cli.run(['template', 'search', 'api']);
    expect(search.exitCode).toBe(0);

    const install = await cli.run(['template', 'install', 'api-crud']);
    expect(install.exitCode).toBe(0);
    expect(await pathExists(join(dir, 'templates/installed/api-crud/template.json'))).toBe(true);

    const source = join(dir, 'custom-tpl');
    await mkdir(source, { recursive: true });
    await writeFile(
      join(source, 'template.json'),
      JSON.stringify({
        name: 'custom-hook',
        version: '1.0.0',
        author: 'Demo',
        description: 'Custom published template',
        tags: ['custom'],
      }),
    );
    await writeFile(join(source, 'README.md'), '# custom-hook\n');

    const publish = await cli.run([
      'template',
      'publish',
      './custom-tpl',
      '--visibility',
      'organization',
      '--org',
      'demo',
    ]);
    expect(publish.exitCode).toBe(0);
    expect(await pathExists(join(dir, '.mycli/template-catalog/custom-hook/template.json'))).toBe(
      true,
    );

    const catalog = JSON.parse(
      await readFile(join(dir, '.mycli/template-catalog/index.json'), 'utf8'),
    );
    expect(catalog.templates.some((t: { name: string }) => t.name === 'custom-hook')).toBe(true);

    await cli.shutdown();
  });
});
