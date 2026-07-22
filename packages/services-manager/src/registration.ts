import type { FileSystem } from '@mycli-cli/filesystem';
import { upsertMarkedBlock } from '@mycli-cli/generator-engine';

const EXPORT_BEGIN = '// <mycli:exports>';
const EXPORT_END = '// </mycli:exports>';

export async function ensureServicesBarrelExport(options: {
  fs: FileSystem;
  servicesPath: string;
  folder: string;
  dryRun?: boolean;
}): Promise<{ path: string; action: 'create' | 'update' | 'skip' }> {
  const barrelPath = `${options.servicesPath}/index.ts`;
  const exportLine = `export * from './${options.folder}/index.js';`;

  const exists = await options.fs.exists(barrelPath);
  let content = exists
    ? await options.fs.read(barrelPath)
    : `/**\n * Services barrel — maintained by MyCLI (\`my add cache|queue|…\`).\n */\n${EXPORT_BEGIN}\n${EXPORT_END}\n`;

  if (content.includes(exportLine)) {
    return { path: barrelPath, action: 'skip' };
  }

  content = upsertMarkedBlock(content, EXPORT_BEGIN, EXPORT_END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.includes(exportLine)) {
      lines.push(exportLine);
    }
    return `${lines.join('\n')}\n`;
  });

  if (!options.dryRun) {
    await options.fs.write(barrelPath, content, { overwrite: true });
  }

  return { path: barrelPath, action: exists ? 'update' : 'create' };
}

const IMPORT_BEGIN = '// <mycli:feature-imports>';
const IMPORT_END = '// </mycli:feature-imports>';
const FEATURE_BEGIN = '// <mycli:features>';
const FEATURE_END = '// </mycli:features>';

export async function ensurePaymentRouteRegistration(options: {
  fs: FileSystem;
  routesPath?: string;
  dryRun?: boolean;
}): Promise<{ path: string; action: 'create' | 'update' | 'skip' }> {
  const routesPath = options.routesPath ?? 'src/routes/features.ts';
  const importLine = `import { registerPaymentRoutes } from '../services/payment/payment.routes.js';`;
  const call = '  await registerPaymentRoutes(app);';

  const exists = await options.fs.exists(routesPath);
  let content = exists
    ? await options.fs.read(routesPath)
    : `import type { FastifyInstance } from 'fastify';\n\n${IMPORT_BEGIN}\n${IMPORT_END}\n\nexport async function registerFeatureRoutes(app: FastifyInstance): Promise<void> {\n${FEATURE_BEGIN}\n${FEATURE_END}\n}\n`;

  if (content.includes('registerPaymentRoutes') && content.includes(call.trim())) {
    return { path: routesPath, action: 'skip' };
  }

  content = upsertMarkedBlock(content, IMPORT_BEGIN, IMPORT_END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.includes(importLine)) lines.push(importLine);
    return `${lines.join('\n')}\n`;
  });

  content = upsertMarkedBlock(content, FEATURE_BEGIN, FEATURE_END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.includes(call)) lines.push(call);
    return `${lines.join('\n')}\n`;
  });

  if (!options.dryRun) {
    await options.fs.write(routesPath, content, { overwrite: true });
  }

  return { path: routesPath, action: exists ? 'update' : 'create' };
}
