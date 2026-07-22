import { ConfigurationError } from '@mycli-cli/core';
import type { PluginManifest } from '@mycli-cli/plugin-system';

const REQUIRED = ['name', 'version'] as const;

export function validatePluginManifest(manifest: Partial<PluginManifest>): PluginManifest {
  for (const field of REQUIRED) {
    if (!manifest[field]) {
      throw new ConfigurationError(`plugin.json missing required field: ${field}`, {
        code: 'PLUGIN_INVALID',
      });
    }
  }

  if (!/^@[^/]+\/[^/]+/.test(manifest.name!)) {
    throw new ConfigurationError('plugin name should be scoped, e.g. @mycli-cli/plugin-example', {
      code: 'PLUGIN_INVALID',
    });
  }

  return manifest as PluginManifest;
}

export function pluginSlugFromName(name: string): string {
  return name.replace(/^@[^/]+\//, '').replace(/^plugin-/, '');
}

export function npmPackageFromName(name: string): string {
  const slug = pluginSlugFromName(name);
  return name.startsWith('@') ? `@mycli-cli/plugin-${slug}` : name;
}

export interface PluginScaffoldOptions {
  name: string;
  description?: string;
  author?: string;
  outputDir: string;
  dryRun?: boolean;
}

export interface PluginScaffoldResult {
  files: string[];
  slug: string;
  npmPackage: string;
}

export function buildPluginScaffoldFiles(
  options: PluginScaffoldOptions,
): Array<{ path: string; content: string }> {
  const manifest = validatePluginManifest({
    name: options.name,
    version: '1.0.0',
    description: options.description ?? 'MyCLI community plugin',
    author: options.author ?? 'Community',
    compatibility: '>=1.0.0',
  });

  const slug = pluginSlugFromName(manifest.name);
  const npmPackage = npmPackageFromName(manifest.name);

  const pluginJson = {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    main: 'dist/index.js',
    compatibility: manifest.compatibility,
    slug,
    npmPackage,
    keywords: ['mycli', slug],
  };

  return [
    {
      path: 'plugin.json',
      content: `${JSON.stringify(pluginJson, null, 2)}\n`,
    },
    {
      path: 'package.json',
      content: `${JSON.stringify(
        {
          name: npmPackage,
          version: '1.0.0',
          description: manifest.description,
          type: 'module',
          license: 'MIT',
          exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
          main: './dist/index.js',
          scripts: {
            build: 'tsc -p tsconfig.json',
            typecheck: 'tsc -p tsconfig.json --noEmit',
            test: 'vitest run --passWithNoTests',
          },
          dependencies: {
            '@mycli-cli/plugin-sdk': 'workspace:*',
          },
          devDependencies: {
            typescript: '^5.7.3',
            vitest: '^2.1.8',
            '@types/node': '^22.10.5',
          },
        },
        null,
        2,
      )}\n`,
    },
    {
      path: 'src/index.ts',
      content: `import { definePlugin } from '@mycli-cli/plugin-sdk';

export default definePlugin({
  name: '${manifest.name}',
  version: '${manifest.version}',
  description: '${manifest.description}',
  async install(ctx) {
    ctx.app.logger.info('Installed ${manifest.name}');
  },
  commands() {
    return [
      {
        name: '${slug}',
        description: '${manifest.description}',
        async handler() {
          console.log('${manifest.name} plugin command');
        },
      },
    ];
  },
});
`,
    },
    {
      path: 'README.md',
      content: `# ${manifest.name}\n\n${manifest.description}\n\n\`\`\`bash\nmy plugin install ${manifest.name}\n\`\`\`\n`,
    },
    {
      path: 'tsconfig.json',
      content: `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
`,
    },
  ];
}
