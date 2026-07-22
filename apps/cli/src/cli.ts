import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CliEngine, createCliEngine } from '@mycli-cli/cli-engine';
import { createI18nFromDir } from '@mycli-cli/prompt-engine';
import { createCommands } from './commands/index.js';
import { resolveLocalesRoot } from './paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

export async function createCli(): Promise<CliEngine> {
  const version = readVersion();
  const locale = process.env.MYCLI_LOCALE ?? 'en';
  const i18n = createI18nFromDir(resolveLocalesRoot(), locale);
  const engine = createCliEngine({
    name: 'MyCLI',
    binName: 'my',
    version,
    i18n,
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    dryRun: process.argv.includes('--dry-run'),
  });

  engine.registerCommands(createCommands(engine));
  await engine.initialize({ discoverPlugins: true });
  return engine;
}
