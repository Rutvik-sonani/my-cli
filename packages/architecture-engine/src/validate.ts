import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { ArchitectureDependencyRulesFile, DependencyRule } from '@mycli-cli/enterprise-core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';

export interface ArchitectureViolation {
  file: string;
  importPath: string;
  rule: DependencyRule;
  message: string;
}

export interface ArchitectureValidationResult {
  ok: boolean;
  style?: string;
  rulesLoaded: number;
  filesScanned: number;
  violations: ArchitectureViolation[];
}

const IMPORT_RE =
  /import\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const TS_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function ruleMatchesFile(rulePath: string, filePath: string): boolean {
  const rule = normalizePath(rulePath);
  const file = normalizePath(filePath);
  if (rule.endsWith('/*')) {
    const prefix = rule.slice(0, -2);
    return file.startsWith(`${prefix}/`) || file === prefix;
  }
  return file.startsWith(rule.endsWith('/') ? rule : `${rule}/`) || file === rule;
}

function importMatchesPattern(importPath: string, pattern: string): boolean {
  const normalized = normalizePath(importPath);
  const pat = normalizePath(pattern);
  if (pat.endsWith('/*')) {
    return normalized.startsWith(pat.slice(0, -1));
  }
  return normalized === pat || normalized.startsWith(`${pat}/`);
}

function findMatchingRule(filePath: string, rules: DependencyRule[]): DependencyRule | undefined {
  return rules.find((rule) => ruleMatchesFile(rule.path, filePath));
}

function extractImports(source: string): string[] {
  const imports: string[] = [];
  IMPORT_RE.lastIndex = 0;
  for (;;) {
    const match = IMPORT_RE.exec(source);
    if (match === null) break;
    const path = match[1] ?? match[2];
    if (path) imports.push(path);
  }
  return imports;
}

async function collectSourceFiles(
  fs: FileSystem,
  dir: string,
  acc: string[] = [],
): Promise<string[]> {
  if (!(await fs.isDirectory(dir))) return acc;
  const entries = await fs.list(dir);
  for (const entry of entries) {
    const name = entry.relativePath.split(/[\\/]/).pop() ?? '';
    if (entry.isDirectory) {
      if (['node_modules', 'dist', 'coverage', '.git'].includes(name)) continue;
      await collectSourceFiles(fs, entry.path, acc);
    } else if (TS_EXT.test(entry.relativePath)) {
      acc.push(entry.relativePath);
    }
  }
  return acc;
}

export async function loadDependencyRules(
  cwd: string,
  fs?: FileSystem,
): Promise<ArchitectureDependencyRulesFile | null> {
  const filesystem = fs ?? createFileSystem(cwd);
  const path = '.architecture/dependency-rules.json';
  if (!(await filesystem.exists(path))) return null;
  const raw = await filesystem.read(path);
  return JSON.parse(raw) as ArchitectureDependencyRulesFile;
}

export async function validateArchitectureBoundaries(
  cwd: string,
  options: { fs?: FileSystem; scanDirs?: string[] } = {},
): Promise<ArchitectureValidationResult> {
  const fs = options.fs ?? createFileSystem(cwd);
  const rulesFile = await loadDependencyRules(cwd, fs);
  if (!rulesFile?.rules?.length) {
    return { ok: true, rulesLoaded: 0, filesScanned: 0, violations: [] };
  }

  const scanRoots = options.scanDirs ?? ['src', 'services', 'shared'];
  const files: string[] = [];
  for (const root of scanRoots) {
    if (await fs.exists(root)) {
      await collectSourceFiles(fs, root, files);
    }
  }

  const violations: ArchitectureViolation[] = [];

  for (const file of files) {
    const rule = findMatchingRule(file, rulesFile.rules);
    if (!rule) continue;

    const content = await fs.read(file);
    const imports = extractImports(content);

    for (const imp of imports) {
      if (!imp.startsWith('.') && !imp.startsWith('@/')) continue;
      const resolved = normalizePath(join(file, '..', imp));

      for (const forbidden of rule.mustNotImport) {
        if (importMatchesPattern(resolved, forbidden) || importMatchesPattern(imp, forbidden)) {
          violations.push({
            file,
            importPath: imp,
            rule,
            message: `${file} must not import ${imp} (${rule.layer}: ${rule.description})`,
          });
        }
      }
    }
  }

  return {
    ok: violations.length === 0,
    style: rulesFile.style,
    rulesLoaded: rulesFile.rules.length,
    filesScanned: files.length,
    violations,
  };
}

export async function validateArchitectureBoundariesFromDisk(
  projectRoot: string,
): Promise<ArchitectureValidationResult> {
  const path = join(projectRoot, '.architecture/dependency-rules.json');
  try {
    const raw = await readFile(path, 'utf8');
    const rulesFile = JSON.parse(raw) as ArchitectureDependencyRulesFile;
    const fs = createFileSystem(projectRoot);
    const scanRoots = ['src', 'services', 'shared'];
    const files: string[] = [];
    for (const root of scanRoots) {
      if (await fs.exists(root)) {
        await collectSourceFiles(fs, root, files);
      }
    }
    const violations: ArchitectureViolation[] = [];
    for (const file of files) {
      const rule = findMatchingRule(file, rulesFile.rules);
      if (!rule) continue;
      const content = await fs.read(file);
      for (const imp of extractImports(content)) {
        if (!imp.startsWith('.')) continue;
        const resolved = normalizePath(relative(projectRoot, join(projectRoot, file, '..', imp)));
        for (const forbidden of rule.mustNotImport) {
          if (importMatchesPattern(resolved, forbidden) || importMatchesPattern(imp, forbidden)) {
            violations.push({
              file,
              importPath: imp,
              rule,
              message: `${file} must not import ${imp}`,
            });
          }
        }
      }
    }
    return {
      ok: violations.length === 0,
      style: rulesFile.style,
      rulesLoaded: rulesFile.rules.length,
      filesScanned: files.length,
      violations,
    };
  } catch {
    return { ok: true, rulesLoaded: 0, filesScanned: 0, violations: [] };
  }
}
