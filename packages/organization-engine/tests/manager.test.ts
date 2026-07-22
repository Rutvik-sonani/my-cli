import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli-cli/filesystem';
import { createTemplateEngine } from '@mycli-cli/template-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createOrganizationManager } from '../src/manager.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('OrganizationManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds organization platform services', async () => {
    dir = await mkdtemp(join(tmpdir(), 'org-engine-'));
    const fs = createFileSystem(dir);
    const templatesRoot = join(import.meta.dirname, '../../../apps/cli/templates');
    const manager = createOrganizationManager({
      cwd: dir,
      filesystem: fs,
      templateEngine: createTemplateEngine({ filesystem: fs, templatesRoot }),
      templatesRoot,
    });

    const result = await manager.setup({
      appName: 'demo',
      language: 'typescript',
    });

    expect(result.files.length).toBeGreaterThan(10);
    expect(await pathExists(join(dir, 'src/organizations/services/organization.service.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/organizations/services/team.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/organizations/services/member.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'src/organizations/services/permission.service.ts'))).toBe(
      true,
    );
    expect(await pathExists(join(dir, 'src/organizations/services/project.service.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'tests/organizations/organization.test.ts'))).toBe(true);
    expect(await pathExists(join(dir, 'ORGANIZATION.md'))).toBe(true);

    const permission = await readFile(
      join(dir, 'src/organizations/services/permission.service.ts'),
      'utf8',
    );
    expect(permission).toContain('owner');
    expect(permission).toContain('role:assign');
  });
});
