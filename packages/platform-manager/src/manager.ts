import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  buildPlatformTemplateData,
  featureFolderName,
  getDocTemplate,
  getEnvLines,
  getFeatureFiles,
  getPlatformDependencies,
  normalizePlatformFeature,
} from './config.js';
import { ensurePlatformBarrelExport } from './registration.js';
import type { PlatformFeature, PlatformSetupOptions, PlatformSetupResult } from './types.js';

/**
 * Generates platform modules: observability, security, tenancy, feature-flags, search.
 */
export class PlatformManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
    } = {},
  ) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  normalizeFeature(input: string): PlatformFeature | null {
    return normalizePlatformFeature(input);
  }

  listFeatures(): PlatformFeature[] {
    return ['observability', 'security', 'tenancy', 'feature-flags', 'search'];
  }

  async setup(options: PlatformSetupOptions): Promise<PlatformSetupResult> {
    const feature = options.feature;
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const platformPath = options.platformPath ?? 'src/platform';
    const folder = featureFolderName(feature);
    const base = join(platformPath, folder);
    const data = buildPlatformTemplateData(options);
    const templateData = data as unknown as Record<string, unknown>;
    const written: string[] = [];
    const tenancyMode = options.tenancyMode ?? 'single-db';

    for (const file of getFeatureFiles(feature, tenancyMode)) {
      const outPath = file.root ? file.out(base) : file.out(base);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const doc = getDocTemplate(feature);
    const docContent = await this.templates.renderFile(doc.template, { data: templateData });
    if (!options.dryRun) {
      await fs.write(doc.out, docContent);
      const envSection = `# ${feature.toUpperCase()}\n${getEnvLines(feature, data.provider, data.appName, tenancyMode).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
      const overview = await this.templates.renderFile('features/platform/PLATFORM.md.ejs', {
        data: { appName: data.appName },
      });
      await fs.write('PLATFORM.md', overview);
    }
    written.push(doc.out, '.env.example', 'PLATFORM.md');

    const barrel = await ensurePlatformBarrelExport({
      fs,
      platformPath,
      folder,
      dryRun: options.dryRun,
    });
    written.push(barrel.path);

    const deps = getPlatformDependencies(feature, data.provider);
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }
}

export function createPlatformManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): PlatformManager {
  return new PlatformManager(options);
}

export type {
  PlatformFeature,
  PlatformSetupOptions,
  PlatformSetupResult,
  TenancyMode,
} from './types.js';
export { normalizePlatformFeature } from './config.js';
