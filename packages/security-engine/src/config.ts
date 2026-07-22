import { join } from 'node:path';

export interface SecurityPathConfig {
  security?: string;
}

export interface SecurityPaths {
  root: string;
  headers: string;
  cors: string;
  csrf: string;
  rateLimit: string;
  sanitization: string;
  validation: string;
}

export function resolveSecurityPaths(config: SecurityPathConfig = {}): SecurityPaths {
  const root = config.security ?? 'src/security';

  return {
    root,
    headers: join(root, 'headers'),
    cors: join(root, 'cors'),
    csrf: join(root, 'csrf'),
    rateLimit: join(root, 'rate-limit'),
    sanitization: join(root, 'sanitization'),
    validation: join(root, 'validation'),
  };
}

export function getSecurityEnvLines(appName: string): string[] {
  return [
    `SECURITY_APP=${appName}`,
    'SECURITY_ENABLED=true',
    'CORS_ORIGIN=http://localhost:3000',
    'CSRF_COOKIE_NAME=csrf_token',
    'CSRF_HEADER_NAME=x-csrf-token',
    'RATE_LIMIT_MAX=100',
    'RATE_LIMIT_WINDOW_MS=60000',
    'HELMET_ENABLED=true',
  ];
}

export function getSecurityDependencies(): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  return {
    dependencies: {
      '@fastify/helmet': '^13.0.1',
      '@fastify/cors': '^10.0.2',
      '@fastify/rate-limit': '^10.2.1',
      '@fastify/csrf-protection': '^7.0.1',
      'sanitize-html': '^2.14.0',
      zod: '^3.24.1',
    },
    devDependencies: {
      '@types/sanitize-html': '^2.13.0',
    },
  };
}
