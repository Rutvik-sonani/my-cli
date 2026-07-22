import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { SecretScanFinding } from './health-checks.js';

async function walk(dir: string, root: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, root, files);
    } else {
      files.push(full.slice(root.length + 1));
    }
  }
  return files;
}

export async function listProjectFiles(cwd: string): Promise<string[]> {
  return walk(cwd, cwd);
}

export async function readProjectFile(cwd: string, relativePath: string): Promise<string> {
  return readFile(join(cwd, relativePath), 'utf8');
}

export function formatSecretFindings(findings: SecretScanFinding[]): string {
  if (findings.length === 0) return 'No potential secrets detected';
  return findings.map((f) => `${f.file}:${f.line} (${f.pattern})`).join('\n');
}
