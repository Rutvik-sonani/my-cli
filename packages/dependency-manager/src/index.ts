import { DependencyError } from '@mycli-cli/core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { execa } from 'execa';

export type PackageManagerName = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface DetectResult {
  manager: PackageManagerName;
  lockfile?: string;
}

export interface InstallOptions {
  cwd?: string;
  dev?: boolean;
  exact?: boolean;
  packageManager?: PackageManagerName;
  dryRun?: boolean;
}

export interface RunScriptOptions {
  cwd?: string;
  packageManager?: PackageManagerName;
  env?: NodeJS.ProcessEnv;
}

export interface DependencyManagerOptions {
  cwd?: string;
  filesystem?: FileSystem;
  preferred?: PackageManagerName;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const LOCKFILES: Array<{ file: string; manager: PackageManagerName }> = [
  { file: 'pnpm-lock.yaml', manager: 'pnpm' },
  { file: 'yarn.lock', manager: 'yarn' },
  { file: 'bun.lockb', manager: 'bun' },
  { file: 'bun.lock', manager: 'bun' },
  { file: 'package-lock.json', manager: 'npm' },
];

/**
 * Detects and drives npm/pnpm/yarn/bun for dependency installation and scripts.
 */
export class DependencyManager {
  private readonly cwd: string;
  private readonly fs: FileSystem;
  private readonly preferred?: PackageManagerName;

  constructor(options: DependencyManagerOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(this.cwd);
    this.preferred = options.preferred;
  }

  async detect(): Promise<DetectResult> {
    if (this.preferred && (await this.isAvailable(this.preferred))) {
      const lock = LOCKFILES.find((l) => l.manager === this.preferred);
      return { manager: this.preferred, lockfile: lock?.file };
    }

    for (const entry of LOCKFILES) {
      if (await this.fs.exists(entry.file)) {
        if (await this.isAvailable(entry.manager)) {
          return { manager: entry.manager, lockfile: entry.file };
        }
      }
    }

    const order: PackageManagerName[] = ['pnpm', 'bun', 'yarn', 'npm'];
    for (const manager of order) {
      if (await this.isAvailable(manager)) {
        return { manager };
      }
    }

    throw new DependencyError('No supported package manager found (npm, pnpm, yarn, bun)', {
      code: 'PACKAGE_MANAGER_NOT_FOUND',
    });
  }

  async isAvailable(manager: PackageManagerName): Promise<boolean> {
    try {
      const result = await execa(manager, ['--version'], { cwd: this.cwd, reject: false });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async install(packages: string[] = [], options: InstallOptions = {}): Promise<CommandResult> {
    const cwd = options.cwd ?? this.cwd;
    const detected = options.packageManager
      ? { manager: options.packageManager }
      : await this.detect();

    if (options.dryRun) {
      return {
        exitCode: 0,
        stdout: `[dry-run] ${detected.manager} install ${packages.join(' ')}`,
        stderr: '',
      };
    }

    const args = buildInstallArgs(detected.manager, packages, options);

    try {
      const result = await execa(detected.manager, args, {
        cwd,
        stdio: 'inherit',
      });
      return {
        exitCode: result.exitCode ?? 0,
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? ''),
      };
    } catch (cause) {
      throw new DependencyError(`Failed to install dependencies with ${detected.manager}`, {
        code: 'DEPENDENCY_INSTALL_FAILED',
        details: { manager: detected.manager, packages, args },
        cause,
      });
    }
  }

  async add(packages: string[], options: InstallOptions = {}): Promise<CommandResult> {
    return this.install(packages, options);
  }

  async remove(packages: string[], options: InstallOptions = {}): Promise<CommandResult> {
    const cwd = options.cwd ?? this.cwd;
    const detected = options.packageManager
      ? { manager: options.packageManager }
      : await this.detect();

    const args =
      detected.manager === 'npm'
        ? ['uninstall', ...packages]
        : detected.manager === 'yarn'
          ? ['remove', ...packages]
          : ['remove', ...packages];

    try {
      const result = await execa(detected.manager, args, { cwd, stdio: 'inherit' });
      return {
        exitCode: result.exitCode ?? 0,
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? ''),
      };
    } catch (cause) {
      throw new DependencyError(`Failed to remove packages with ${detected.manager}`, {
        code: 'DEPENDENCY_INSTALL_FAILED',
        details: { manager: detected.manager, packages },
        cause,
      });
    }
  }

  async run(
    script: string,
    scriptArgs: string[] = [],
    options: RunScriptOptions = {},
  ): Promise<CommandResult> {
    const cwd = options.cwd ?? this.cwd;
    const detected = options.packageManager
      ? { manager: options.packageManager }
      : await this.detect();

    const args =
      detected.manager === 'npm'
        ? ['run', script, ...(scriptArgs.length ? ['--', ...scriptArgs] : [])]
        : detected.manager === 'yarn'
          ? ['run', script, ...scriptArgs]
          : ['run', script, ...scriptArgs];

    const result = await execa(detected.manager, args, {
      cwd,
      stdio: 'inherit',
      env: options.env,
    });
    return {
      exitCode: result.exitCode ?? 0,
      stdout: String(result.stdout ?? ''),
      stderr: String(result.stderr ?? ''),
    };
  }

  async updatePackageJson(
    mutator: (pkg: Record<string, unknown>) => Record<string, unknown> | undefined,
    cwd = this.cwd,
  ): Promise<void> {
    const fs = createFileSystem(cwd);
    const pkgPath = 'package.json';
    if (!(await fs.exists(pkgPath))) {
      throw new DependencyError('package.json not found', {
        code: 'DEPENDENCY_INSTALL_FAILED',
        details: { cwd },
      });
    }
    const pkg = await fs.readJson<Record<string, unknown>>(pkgPath);
    const next = mutator(pkg) ?? pkg;
    await fs.writeJson(pkgPath, next);
  }

  async ensurePackageJson(initial: Record<string, unknown>, cwd = this.cwd): Promise<void> {
    const fs = createFileSystem(cwd);
    if (await fs.exists('package.json')) {
      return;
    }
    await fs.writeJson('package.json', initial);
  }
}

function buildInstallArgs(
  manager: PackageManagerName,
  packages: string[],
  options: InstallOptions,
): string[] {
  if (packages.length === 0) {
    return manager === 'yarn' ? [] : ['install'];
  }

  if (manager === 'npm') {
    return [
      'install',
      ...packages,
      ...(options.dev ? ['--save-dev'] : []),
      ...(options.exact ? ['--save-exact'] : []),
    ];
  }
  if (manager === 'yarn') {
    return [
      'add',
      ...packages,
      ...(options.dev ? ['--dev'] : []),
      ...(options.exact ? ['--exact'] : []),
    ];
  }
  if (manager === 'bun') {
    return [
      'add',
      ...packages,
      ...(options.dev ? ['--dev'] : []),
      ...(options.exact ? ['--exact'] : []),
    ];
  }
  // pnpm
  return [
    'add',
    ...packages,
    ...(options.dev ? ['-D'] : []),
    ...(options.exact ? ['--save-exact'] : []),
  ];
}

export function createDependencyManager(options?: DependencyManagerOptions): DependencyManager {
  return new DependencyManager(options);
}
