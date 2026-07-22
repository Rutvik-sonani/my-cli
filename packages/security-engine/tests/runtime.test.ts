import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSecurityScanner } from '../src/runtime/security-scanner.js';
import {
  InMemoryRateLimiter,
  isSafeRedirect,
  sanitizePlainText,
} from '../src/runtime/security-utils.js';

describe('security utils', () => {
  it('sanitizes html and validates redirects', () => {
    expect(sanitizePlainText('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
    expect(isSafeRedirect('https://app.example.com/a', ['app.example.com'])).toBe(true);
    expect(isSafeRedirect('https://evil.com', ['app.example.com'])).toBe(false);
  });

  it('rate limits by key', () => {
    const limiter = new InMemoryRateLimiter(1, 60_000);
    expect(limiter.hit('a').allowed).toBe(true);
    expect(limiter.hit('a').allowed).toBe(false);
  });
});

describe('SecurityScanner', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('detects secrets, config, owasp, and license issues', async () => {
    dir = await mkdtemp(join(tmpdir(), 'sec-scan-'));
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo', version: '1.0.0', dependencies: {} }),
    );
    await writeFile(join(dir, 'leak.ts'), "const api_key = 'supersecretvalue123';\n");

    const scanner = createSecurityScanner();
    const report = await scanner.scan({ cwd: dir, projectName: 'demo' });

    expect(report.findings.some((f) => f.category === 'secrets')).toBe(true);
    expect(report.findings.some((f) => f.category === 'configuration')).toBe(true);
    expect(report.findings.some((f) => f.category === 'owasp')).toBe(true);
    expect(report.findings.some((f) => f.category === 'licenses')).toBe(true);
    expect(report.findings.some((f) => f.category === 'dependencies')).toBe(true);

    const md = scanner.renderMarkdown(report);
    expect(md).toContain('# Security Report — demo');
    expect(md).toContain('## Findings');
  });

  it('clears owasp findings after security modules exist', async () => {
    dir = await mkdtemp(join(tmpdir(), 'sec-scan-ok-'));
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'demo',
        version: '1.0.0',
        license: 'MIT',
        dependencies: { '@fastify/helmet': '^13.0.0' },
      }),
    );
    await mkdir(join(dir, 'src/security/csrf'), { recursive: true });
    await mkdir(join(dir, 'src/security/validation'), { recursive: true });
    await mkdir(join(dir, 'src/security/sanitization'), { recursive: true });
    await writeFile(join(dir, '.env.example'), 'FOO=\n');

    const scanner = createSecurityScanner();
    const report = await scanner.scan({ cwd: dir, projectName: 'demo' });
    expect(report.findings.some((f) => f.id === 'owasp-csrf')).toBe(false);
    expect(report.findings.some((f) => f.id === 'cfg-security-module')).toBe(false);
  });
});
