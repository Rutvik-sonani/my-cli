import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';

describe('my workflow commands (integration)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffoldProject(scripts: Record<string, string>) {
    dir = await mkdtemp(join(tmpdir(), 'mycli-workflow-'));
    process.chdir(dir);
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', type: 'module', scripts }),
    );
  }

  it.each(['dev', 'test', 'lint', 'build'] as const)(
    'my %s --dry-run previews package.json script',
    async (command) => {
      await scaffoldProject({
        dev: 'node --watch src/index.js',
        test: 'vitest run',
        lint: 'biome check .',
        build: 'tsc -p tsconfig.json',
      });
      const cli = await createCli();
      const infoSpy = vi.spyOn(cli.prompts, 'info');

      const result = await cli.run([command, '--dry-run']);
      expect(result.exitCode).toBe(0);
      expect(infoSpy).toHaveBeenCalledWith(expect.stringMatching(/^Would run:/));

      infoSpy.mockRestore();
      await cli.shutdown();
    },
  );
});
