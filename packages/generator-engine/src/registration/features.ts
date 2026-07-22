import type { FileSystem } from '@mycli/filesystem';
import { upsertMarkedBlock } from './barrel.js';

const IMPORT_BEGIN = '// <mycli:feature-imports>';
const IMPORT_END = '// </mycli:feature-imports>';
const BEGIN = '// <mycli:features>';
const END = '// </mycli:features>';

export type FeatureRouteKind = 'auth' | 'rbac' | 'docs';

const FEATURE_META: Record<
  FeatureRouteKind,
  { importName: string; importPath: string; call: string }
> = {
  auth: {
    importName: 'registerAuthRoutes',
    importPath: '../modules/auth/index.js',
    call: '  await registerAuthRoutes(app);',
  },
  rbac: {
    importName: 'registerRbacRoutes',
    importPath: '../modules/rbac/index.js',
    call: '  await registerRbacRoutes(app);',
  },
  docs: {
    importName: 'registerDocsRoutes',
    importPath: '../docs/docs.routes.js',
    call: '  await registerDocsRoutes(app);',
  },
};

/**
 * Registers Fastify-style feature route plugins into src/routes/features.ts.
 * Idempotent via marker blocks — used by `my add auth|rbac|swagger`.
 */
export async function ensureFeatureRouteRegistration(options: {
  fs: FileSystem;
  feature: FeatureRouteKind;
  routesPath?: string;
  dryRun?: boolean;
}): Promise<{ path: string; action: 'create' | 'update' | 'skip'; detail: string }> {
  const routesPath = options.routesPath ?? 'src/routes/features.ts';
  const meta = FEATURE_META[options.feature];
  const importLine = `import { ${meta.importName} } from '${meta.importPath}';`;

  const exists = await options.fs.exists(routesPath);
  let content = exists ? await options.fs.read(routesPath) : createFeatureRoutesSkeleton();

  if (content.includes(meta.importName) && content.includes(meta.call.trim())) {
    return { path: routesPath, action: 'skip', detail: 'already registered' };
  }

  content = upsertMarkedBlock(content, IMPORT_BEGIN, IMPORT_END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.includes(importLine)) {
      lines.push(importLine);
    }
    return `${lines.join('\n')}\n`;
  });

  content = upsertMarkedBlock(content, BEGIN, END, (block) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    if (!lines.includes(meta.call)) {
      lines.push(meta.call);
    }
    return `${lines.join('\n')}\n`;
  });

  if (!options.dryRun) {
    await options.fs.write(routesPath, content, { overwrite: true });
  }

  return {
    path: routesPath,
    action: exists ? 'update' : 'create',
    detail: meta.importName,
  };
}

function createFeatureRoutesSkeleton(): string {
  return `/**
 * Feature route plugins — maintained by MyCLI (\`my add auth|rbac|swagger\`).
 */
import type { FastifyInstance } from 'fastify';

${IMPORT_BEGIN}
${IMPORT_END}

export async function registerFeatureRoutes(app: FastifyInstance): Promise<void> {
${BEGIN}
${END}
}
`;
}
