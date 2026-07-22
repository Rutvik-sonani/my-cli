import type { FileSystem } from '@mycli-cli/filesystem';
import type { TemplateEngine } from '@mycli-cli/template-engine';

export type NodeToolchain = 'nvm' | 'volta' | 'asdf' | 'none';

export interface ToolchainSetupOptions {
  nodeVersion?: string;
  toolchain?: NodeToolchain;
  dryRun?: boolean;
}

export interface ToolchainSetupResult {
  files: string[];
  packageJsonPatch?: Record<string, unknown>;
}

export async function setupNodeToolchain(
  fs: FileSystem,
  templates: TemplateEngine,
  options: ToolchainSetupOptions = {},
): Promise<ToolchainSetupResult> {
  const nodeVersion = options.nodeVersion ?? '22';
  const toolchain = options.toolchain ?? 'nvm';
  const written: string[] = [];
  let packageJsonPatch: Record<string, unknown> | undefined;

  if (toolchain === 'nvm' || toolchain === 'none') {
    if (!options.dryRun) {
      await fs.write('.nvmrc', `${nodeVersion}\n`);
    }
    written.push('.nvmrc');
  }

  if (toolchain === 'asdf') {
    const content = await templates.renderFile('features/toolchain/tool-versions.ejs', {
      data: { nodeVersion },
    });
    if (!options.dryRun) {
      await fs.write('.tool-versions', content);
    }
    written.push('.tool-versions');
  }

  if (toolchain === 'volta') {
    packageJsonPatch = {
      volta: {
        node: `${nodeVersion}.0.0`,
      },
    };
    if (!options.dryRun) {
      await fs.write('.nvmrc', `${nodeVersion}\n`);
    }
    written.push('.nvmrc', 'package.json#volta');
  }

  return { files: written, packageJsonPatch };
}
