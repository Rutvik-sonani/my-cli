import { constants } from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { FilesystemError } from '@mycli-cli/core';

export interface WriteFileOptions {
  overwrite?: boolean;
  dryRun?: boolean;
  encoding?: BufferEncoding;
}

export interface EnsureDirOptions {
  dryRun?: boolean;
}

export interface CopyOptions {
  overwrite?: boolean;
  dryRun?: boolean;
}

export interface FileEntry {
  path: string;
  relativePath: string;
  isDirectory: boolean;
}

/**
 * Production filesystem abstraction with dry-run support and safe path handling.
 */
export class FileSystem {
  constructor(private readonly root: string = process.cwd()) {}

  resolve(...segments: string[]): string {
    const root = resolve(this.root);
    const target = resolve(root, ...segments);
    if (target !== root && !target.startsWith(root + sep)) {
      throw new FilesystemError(`Path escapes filesystem root: ${target}`, {
        code: 'FILESYSTEM_ERROR',
        details: { root: this.root, target },
      });
    }
    return target;
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(this.resolve(path), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async isFile(path: string): Promise<boolean> {
    try {
      const info = await stat(this.resolve(path));
      return info.isFile();
    } catch {
      return false;
    }
  }

  async isDirectory(path: string): Promise<boolean> {
    try {
      const info = await stat(this.resolve(path));
      return info.isDirectory();
    } catch {
      return false;
    }
  }

  async read(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    try {
      return await readFile(this.resolve(path), encoding);
    } catch (cause) {
      throw new FilesystemError(`Failed to read file: ${path}`, {
        code: 'FILE_NOT_FOUND',
        details: { path },
        cause,
      });
    }
  }

  async readJson<T = unknown>(path: string): Promise<T> {
    const content = await this.read(path);
    try {
      return JSON.parse(content) as T;
    } catch (cause) {
      throw new FilesystemError(`Invalid JSON in file: ${path}`, {
        code: 'FILESYSTEM_ERROR',
        details: { path },
        cause,
      });
    }
  }

  async write(path: string, content: string, options: WriteFileOptions = {}): Promise<void> {
    const absolute = this.resolve(path);
    const overwrite = options.overwrite ?? true;
    const dryRun = options.dryRun ?? false;

    if (!overwrite && (await this.exists(path))) {
      throw new FilesystemError(`File already exists: ${path}`, {
        code: 'FILE_EXISTS',
        details: { path },
      });
    }

    if (dryRun) {
      return;
    }

    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, options.encoding ?? 'utf8');
  }

  async writeJson(path: string, value: unknown, options: WriteFileOptions = {}): Promise<void> {
    const content = `${JSON.stringify(value, null, 2)}\n`;
    await this.write(path, content, options);
  }

  async ensureDir(path: string, options: EnsureDirOptions = {}): Promise<void> {
    if (options.dryRun) {
      return;
    }
    await mkdir(this.resolve(path), { recursive: true });
  }

  async remove(
    path: string,
    options: { recursive?: boolean; dryRun?: boolean; force?: boolean } = {},
  ): Promise<void> {
    if (options.dryRun) {
      return;
    }
    await rm(this.resolve(path), {
      recursive: options.recursive ?? true,
      force: options.force ?? true,
    });
  }

  async copy(from: string, to: string, options: CopyOptions = {}): Promise<void> {
    const source = this.resolve(from);
    const destination = this.resolve(to);

    if (!options.overwrite && (await this.exists(to))) {
      throw new FilesystemError(`Destination already exists: ${to}`, {
        code: 'FILE_EXISTS',
        details: { path: to },
      });
    }

    if (options.dryRun) {
      return;
    }

    await this.ensureDir(dirname(relative(this.root, destination) || '.'));
    const sourceStat = await stat(source);
    if (sourceStat.isDirectory()) {
      await this.copyDirectory(source, destination, options);
      return;
    }
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }

  async move(from: string, to: string, options: CopyOptions = {}): Promise<void> {
    if (options.dryRun) {
      return;
    }
    await this.ensureDir(dirname(to));
    await rename(this.resolve(from), this.resolve(to));
  }

  async list(path = '.', options: { recursive?: boolean } = {}): Promise<FileEntry[]> {
    const absolute = this.resolve(path);
    const entries: FileEntry[] = [];

    const walk = async (current: string): Promise<void> => {
      const items = await readdir(current, { withFileTypes: true });
      for (const item of items) {
        const full = join(current, item.name);
        const rel = relative(this.root, full);
        entries.push({
          path: full,
          relativePath: rel,
          isDirectory: item.isDirectory(),
        });
        if (options.recursive && item.isDirectory()) {
          await walk(full);
        }
      }
    };

    await walk(absolute);
    return entries;
  }

  async append(path: string, content: string, options: WriteFileOptions = {}): Promise<void> {
    const existing = (await this.exists(path)) ? await this.read(path) : '';
    await this.write(path, existing + content, options);
  }

  withRoot(root: string): FileSystem {
    return new FileSystem(this.resolve(root));
  }

  getRoot(): string {
    return this.root;
  }

  private async copyDirectory(
    source: string,
    destination: string,
    options: CopyOptions,
  ): Promise<void> {
    await mkdir(destination, { recursive: true });
    const items = await readdir(source, { withFileTypes: true });
    for (const item of items) {
      const from = join(source, item.name);
      const to = join(destination, item.name);
      if (item.isDirectory()) {
        await this.copyDirectory(from, to, options);
      } else {
        await copyFile(from, to);
      }
    }
  }
}

export function createFileSystem(root?: string): FileSystem {
  return new FileSystem(root);
}
