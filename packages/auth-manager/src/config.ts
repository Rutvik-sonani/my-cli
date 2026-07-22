import type { AuthSetupOptions, AuthTemplateData } from './types.js';

export function buildAuthTemplateData(options: AuthSetupOptions): AuthTemplateData {
  const strategies = options.strategies ?? ['jwt', 'refresh-token'];
  return {
    strategies,
    oauthProviders: options.oauthProviders ?? [],
    hasJwt: strategies.includes('jwt') || strategies.includes('refresh-token'),
    hasRefresh: strategies.includes('refresh-token'),
    hasSession: strategies.includes('session'),
    hasOAuth: strategies.includes('oauth'),
    hasMagicLink: strategies.includes('magic-link'),
    hasOtp: strategies.includes('otp'),
    hasPasskeys: strategies.includes('passkeys'),
    hasMfa: strategies.includes('mfa'),
    orm: options.orm ?? 'prisma',
    modulesPath: options.modulesPath ?? 'src/modules',
  };
}

export function authDependencies(data: AuthTemplateData): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const dependencies: Record<string, string> = {
    jose: '^5.9.6',
  };
  const devDependencies: Record<string, string> = {};

  if (data.hasSession) {
    dependencies['@fastify/secure-session'] = '^8.1.0';
  }
  if (data.hasOAuth) {
    dependencies.arctic = '^2.2.0';
  }
  if (data.hasPasskeys) {
    dependencies['@simplewebauthn/server'] = '^11.0.0';
  }
  if (data.hasMfa) {
    dependencies.otplib = '^12.0.1';
  }
  if (data.orm === 'prisma') {
    dependencies['@prisma/client'] = '^6.2.1';
  }
  if (data.orm === 'drizzle') {
    dependencies['drizzle-orm'] = '^0.38.4';
    dependencies.pg = '^8.13.1';
  }
  if (data.orm === 'typeorm') {
    dependencies.typeorm = '^0.3.20';
    dependencies.pg = '^8.13.1';
    dependencies['reflect-metadata'] = '^0.2.2';
  }
  if (data.orm === 'mongoose') {
    dependencies.mongoose = '^8.9.3';
  }
  if (data.orm === 'sequelize') {
    dependencies.sequelize = '^6.37.5';
    dependencies.pg = '^8.13.1';
    dependencies['pg-hstore'] = '^2.3.4';
  }
  if (data.orm === 'mikroorm') {
    dependencies['@mikro-orm/core'] = '^6.4.4';
    dependencies['@mikro-orm/postgresql'] = '^6.4.4';
  }

  return { dependencies, devDependencies };
}

export function authEnvLines(data: AuthTemplateData): string[] {
  const lines = [
    'JWT_SECRET=change-me-in-production',
    'JWT_EXPIRES_IN=15m',
    'REFRESH_TOKEN_EXPIRES_IN=7d',
  ];
  if (data.hasSession) {
    lines.push('SESSION_SECRET=change-me-in-production');
  }
  if (data.hasOAuth) {
    for (const provider of data.oauthProviders) {
      lines.push(`${provider.toUpperCase()}_CLIENT_ID=`);
      lines.push(`${provider.toUpperCase()}_CLIENT_SECRET=`);
      lines.push(
        `${provider.toUpperCase()}_REDIRECT_URI=http://localhost:3000/auth/${provider}/callback`,
      );
    }
  }
  if (data.hasMagicLink) {
    lines.push('MAGIC_LINK_EXPIRES_IN=15m');
    lines.push('APP_URL=http://localhost:3000');
  }
  if (data.hasOtp) {
    lines.push('OTP_EXPIRES_IN=5m');
  }
  if (data.hasPasskeys) {
    lines.push('WEBAUTHN_RP_NAME=MyCLI App');
    lines.push('WEBAUTHN_RP_ID=localhost');
    lines.push('WEBAUTHN_ORIGIN=http://localhost:3000');
  }
  return lines;
}
