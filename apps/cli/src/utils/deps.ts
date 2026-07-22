import { createDependencyManager } from '@mycli/dependency-manager';
import { createFileSystem } from '@mycli/filesystem';

export interface DependencyRecords {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function mergeDependencyRecords(...sources: DependencyRecords[]): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  for (const source of sources) {
    Object.assign(dependencies, source.dependencies ?? {});
    Object.assign(devDependencies, source.devDependencies ?? {});
  }
  return { dependencies, devDependencies };
}

export async function mergeDepsIntoPackageJson(
  cwd: string,
  deps: Record<string, string>,
  devDeps: Record<string, string>,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;
  const names = [...Object.keys(deps), ...Object.keys(devDeps)];
  if (names.length === 0) return;
  const fs = createFileSystem(cwd);
  if (!(await fs.exists('package.json'))) {
    return;
  }
  const dm = createDependencyManager({ cwd });
  await dm.updatePackageJson((pkg) => {
    const dependencies = (pkg.dependencies as Record<string, string> | undefined) ?? {};
    const devDependencies = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
    Object.assign(dependencies, deps);
    Object.assign(devDependencies, devDeps);
    pkg.dependencies = dependencies;
    pkg.devDependencies = devDependencies;
    return pkg;
  }, cwd);
}
