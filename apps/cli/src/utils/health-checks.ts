import { connect } from 'node:net';
import { createDependencyManager } from '@mycli-cli/dependency-manager';
import { execa } from 'execa';

export interface DatabasePingResult {
  ok: boolean;
  message: string;
  scheme?: string;
}

export interface DependencyAuditResult {
  ok: boolean;
  message: string;
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

function normalizeDatabaseUrl(raw: string): URL | undefined {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) return undefined;

  try {
    if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
      const host = trimmed.includes('mongodb+srv://')
        ? trimmed.replace('mongodb+srv://', '').split('/')[0]?.split('@').pop()
        : new URL(trimmed).hostname;
      const port = trimmed.includes('mongodb+srv://')
        ? 27017
        : Number(new URL(trimmed).port || 27017);
      return new URL(`tcp://${host}:${port}`);
    }

    const normalized = trimmed.replace(/^postgres(ql)?:/, 'http:').replace(/^mysql:/, 'http:');
    return new URL(normalized);
  } catch {
    return undefined;
  }
}

export async function pingDatabase(
  databaseUrl: string,
  timeoutMs = 3000,
): Promise<DatabasePingResult> {
  const parsed = normalizeDatabaseUrl(databaseUrl);
  if (!parsed?.hostname) {
    return { ok: false, message: 'Invalid DATABASE_URL format' };
  }

  const port = Number(parsed.port || (parsed.protocol === 'http:' ? 5432 : 5432));
  const scheme = databaseUrl.startsWith('mysql')
    ? 'mysql'
    : databaseUrl.startsWith('mongodb')
      ? 'mongodb'
      : 'postgresql';

  const reachable = await new Promise<boolean>((resolve) => {
    const socket = connect({ host: parsed.hostname, port, timeout: timeoutMs }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });

  return {
    ok: reachable,
    scheme,
    message: reachable
      ? `${scheme} host reachable at ${parsed.hostname}:${port}`
      : `${scheme} host unreachable at ${parsed.hostname}:${port}`,
  };
}

export async function runDependencyAudit(cwd: string): Promise<DependencyAuditResult> {
  const deps = createDependencyManager({ cwd });
  let manager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'npm';

  try {
    const detected = await deps.detect();
    if (detected.manager === 'pnpm' || detected.manager === 'yarn' || detected.manager === 'bun') {
      manager = detected.manager;
    }
  } catch {
    // default npm
  }

  const command =
    manager === 'pnpm'
      ? ['pnpm', 'audit', '--json']
      : manager === 'yarn'
        ? ['yarn', 'npm', 'audit', '--json']
        : manager === 'bun'
          ? ['bun', 'pm', 'audit']
          : ['npm', 'audit', '--json'];

  const result = await execa(command[0]!, command.slice(1), { cwd, reject: false });
  if (result.exitCode !== 0 && !result.stdout.trim()) {
    return {
      ok: false,
      message: 'Dependency audit failed to run',
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
    };
  }

  try {
    const payload = JSON.parse(result.stdout) as {
      metadata?: {
        vulnerabilities?: {
          total?: number;
          critical?: number;
          high?: number;
          moderate?: number;
          low?: number;
        };
      };
    };
    const vuln = payload.metadata?.vulnerabilities ?? {};
    const total = vuln.total ?? 0;
    const critical = vuln.critical ?? 0;
    const high = vuln.high ?? 0;
    const moderate = vuln.moderate ?? 0;
    const low = vuln.low ?? 0;

    return {
      ok: total === 0,
      message:
        total === 0
          ? 'No known dependency vulnerabilities'
          : `${total} vulnerabilities (critical: ${critical}, high: ${high}, moderate: ${moderate}, low: ${low})`,
      total,
      critical,
      high,
      moderate,
      low,
    };
  } catch {
    return {
      ok: result.exitCode === 0,
      message:
        result.exitCode === 0 ? 'Dependency audit passed' : 'Dependency audit reported issues',
      total: result.exitCode === 0 ? 0 : 1,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
    };
  }
}

export interface SecretScanFinding {
  file: string;
  line: number;
  pattern: string;
}

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'aws-access-key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'private-key', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    name: 'generic-api-key',
    regex: /(?:api[_-]?key|secret[_-]?key)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
  },
  { name: 'jwt-like', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
];

export async function scanSecrets(
  cwd: string,
  readFile: (path: string) => Promise<string>,
  listFiles: (dir: string) => Promise<string[]>,
): Promise<SecretScanFinding[]> {
  const findings: SecretScanFinding[] = [];
  const files = await listFiles(cwd);

  for (const file of files) {
    if (!/\.(ts|js|tsx|jsx|json|env|yaml|yml|md)$/i.test(file)) continue;
    const content = await readFile(file);
    const lines = content.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(line)) {
          findings.push({ file, line: index + 1, pattern: pattern.name });
        }
      }
    }
  }

  return findings;
}
