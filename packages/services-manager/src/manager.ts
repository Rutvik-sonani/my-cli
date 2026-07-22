import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import {
  buildServiceTemplateData,
  getDocTemplate,
  getEnvLines,
  getServiceDependencies,
  getServiceFiles,
  normalizeService,
  serviceFolderName,
} from './config.js';
import { ensurePaymentRouteRegistration, ensureServicesBarrelExport } from './registration.js';
import type { ServiceKind, ServiceSetupOptions, ServiceSetupResult } from './types.js';

/**
 * Generates infrastructure service modules (cache, queue, events, mail, storage, payment).
 */
export class ServicesManager {
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

  async setup(options: ServiceSetupOptions): Promise<ServiceSetupResult> {
    const service = normalizeService(options.service);
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const servicesPath = options.servicesPath ?? 'src/services';
    const folder = serviceFolderName(service);
    const base = join(servicesPath, folder);
    const data = buildServiceTemplateData(options);
    const templateData = data as unknown as Record<string, unknown>;
    const written: string[] = [];

    for (const file of getServiceFiles(service, data.provider)) {
      const outPath = file.out(base);
      const content = await this.templates.renderFile(file.template, { data: templateData });
      if (!options.dryRun) {
        await fs.write(outPath, content);
      }
      written.push(outPath);
    }

    const doc = getDocTemplate(service);
    const docContent = await this.templates.renderFile(doc.template, { data: templateData });
    if (!options.dryRun) {
      await fs.write(doc.out, docContent);
      const envSection = `# ${service.toUpperCase()}\n${getEnvLines(service, data.provider, data.appName).join('\n')}\n`;
      await fs.append('.env.example', `\n${envSection}`);
      const overview = await this.templates.renderFile('features/services/SERVICES.md.ejs', {
        data: { appName: data.appName },
      });
      await fs.write('SERVICES.md', overview);
    }
    written.push(doc.out, '.env.example', 'SERVICES.md');

    const barrel = await ensureServicesBarrelExport({
      fs,
      servicesPath,
      folder,
      dryRun: options.dryRun,
    });
    written.push(barrel.path);

    if (service === 'payment') {
      const routes = await ensurePaymentRouteRegistration({ fs, dryRun: options.dryRun });
      written.push(routes.path);
    }

    const deps = getServiceDependencies(service, data.provider);
    return {
      files: written,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
    };
  }

  listServices(): ServiceKind[] {
    return ['cache', 'queue', 'events', 'mail', 'storage', 'upload', 'payment'];
  }
}

export function createServicesManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): ServicesManager {
  return new ServicesManager(options);
}

export type { ServiceKind, ServiceSetupOptions, ServiceSetupResult } from './types.js';
