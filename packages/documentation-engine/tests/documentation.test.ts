import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DOCUMENTATION_CATALOG,
  createDocumentationGenerator,
  createDocumentationManager,
  listDocumentationDocuments,
  parseDocumentationKinds,
  resolveDocumentationPaths,
} from '../src/index.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('documentation config', () => {
  it('lists all enterprise documents', () => {
    expect(DOCUMENTATION_CATALOG).toHaveLength(7);
    expect(listDocumentationDocuments().map((d) => d.filename)).toEqual([
      'ARCHITECTURE.md',
      'SECURITY.md',
      'COMPLIANCE.md',
      'OPERATIONS.md',
      'SCALING.md',
      'DISASTER_RECOVERY.md',
      'API_GUIDE.md',
    ]);
    expect(parseDocumentationKinds('architecture,security')).toEqual(['architecture', 'security']);
    expect(resolveDocumentationPaths().root).toBe('src/documentation');
  });
});

describe('DocumentationGenerator', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates all docs without overwriting existing files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'docs-gen-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    await fs.writeJson('.myclirc.json', {
      projectName: 'demo',
      architectureStyle: 'clean-architecture',
      database: 'postgresql',
      language: 'typescript',
      features: { security: true, observability: true, auth: true },
    });
    await writeFile(join(dir, 'SECURITY.md'), '# custom security\n');

    const generator = createDocumentationGenerator({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const report = await generator.generate({ projectName: 'demo' });
    expect(report.created).toBe(6);
    expect(report.skipped).toBe(1);
    expect(await pathExists(join(dir, 'ARCHITECTURE.md'))).toBe(true);
    expect(await pathExists(join(dir, 'OPERATIONS.md'))).toBe(true);
    expect(await pathExists(join(dir, 'SCALING.md'))).toBe(true);
    expect(await pathExists(join(dir, 'DISASTER_RECOVERY.md'))).toBe(true);
    expect(await pathExists(join(dir, 'API_GUIDE.md'))).toBe(true);
    expect(await pathExists(join(dir, 'COMPLIANCE.md'))).toBe(true);

    const security = await readFile(join(dir, 'SECURITY.md'), 'utf8');
    expect(security).toContain('custom security');

    const architecture = await readFile(join(dir, 'ARCHITECTURE.md'), 'utf8');
    expect(architecture).toContain('clean-architecture');
    expect(architecture).toContain('postgresql');
  });

  it('overwrites when force is set and supports only filter', async () => {
    dir = await mkdtemp(join(tmpdir(), 'docs-force-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    await fs.writeJson('.myclirc.json', { projectName: 'demo' });
    await writeFile(join(dir, 'ARCHITECTURE.md'), '# old\n');

    const generator = createDocumentationGenerator({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const report = await generator.generate({
      force: true,
      only: ['architecture'],
    });
    expect(report.overwritten).toBe(1);
    const content = await readFile(join(dir, 'ARCHITECTURE.md'), 'utf8');
    expect(content).toContain('Architecture — demo');
    expect(content).not.toContain('# old');
  });

  it('supports dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'docs-dry-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    await fs.writeJson('.myclirc.json', { projectName: 'demo' });

    const generator = createDocumentationGenerator({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const report = await generator.generate({ dryRun: true });
    expect(report.dryRun).toBe(true);
    expect(report.results.every((r) => r.status === 'planned')).toBe(true);
    expect(await pathExists(join(dir, 'ARCHITECTURE.md'))).toBe(false);
  });
});

describe('DocumentationManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds documentation tooling', async () => {
    dir = await mkdtemp(join(tmpdir(), 'docs-setup-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createDocumentationManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({ appName: 'demo', language: 'typescript' });
    expect(result.files.length).toBeGreaterThan(6);
    expect(await pathExists(join(dir, 'src/documentation/documentation.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'DOCUMENTATION.md'))).toBe(true);
  });
});
