import type { FileSystem } from '@mycli/filesystem';
import type { TemplateEngine } from '@mycli/template-engine';
import type { AuthTemplateData } from './types.js';

const USER_AUTH_FIELDS = `
  mfaSecret     String?  @map("mfa_secret")
  mfaEnabled    Boolean  @default(false) @map("mfa_enabled")
  oAuthAccounts OAuthAccount[]
  passkeys      PasskeyCredential[]`;

const USER_AUTH_RELATIONS_MARKER = 'refreshTokens RefreshToken[]';

/**
 * Appends auth-related Prisma models and User fields when missing.
 */
export async function patchPrismaSchemaForAuth(
  fs: FileSystem,
  templates: TemplateEngine,
  data: AuthTemplateData,
): Promise<string[]> {
  const schemaPath = 'prisma/schema.prisma';
  if (!(await fs.exists(schemaPath))) {
    return [];
  }

  let schema = await fs.read(schemaPath);
  const written: string[] = [];

  if (data.hasMfa && !schema.includes('mfaSecret')) {
    if (schema.includes(USER_AUTH_RELATIONS_MARKER)) {
      schema = schema.replace(
        USER_AUTH_RELATIONS_MARKER,
        `${USER_AUTH_RELATIONS_MARKER}\n  oAuthAccounts OAuthAccount[]\n  passkeys      PasskeyCredential[]\n  mfaSecret     String?  @map("mfa_secret")\n  mfaEnabled    Boolean  @default(false) @map("mfa_enabled")`,
      );
    } else if (schema.includes('model User')) {
      schema = schema.replace(/model User \{([\s\S]*?)@@map\("users"\)/, (match, body) => {
        if (body.includes('mfaSecret')) return match;
        return `model User {${body}${USER_AUTH_FIELDS}\n\n  @@map("users")`;
      });
    }
    written.push(`${schemaPath} (user auth fields)`);
  } else if (data.hasOAuth && !schema.includes('oAuthAccounts OAuthAccount')) {
    if (schema.includes(USER_AUTH_RELATIONS_MARKER)) {
      schema = schema.replace(
        USER_AUTH_RELATIONS_MARKER,
        `${USER_AUTH_RELATIONS_MARKER}\n  oAuthAccounts OAuthAccount[]\n  passkeys      PasskeyCredential[]`,
      );
      written.push(`${schemaPath} (user relations)`);
    }
  }

  const fragment = await templates.renderFile('features/auth/prisma-auth-models.prisma.ejs', {
    data: data as unknown as Record<string, unknown>,
  });

  const modelsToAdd: Array<{ marker: string; include: boolean }> = [
    { marker: 'model OAuthState', include: data.hasOAuth },
    { marker: 'model OAuthAccount', include: data.hasOAuth },
    { marker: 'model MagicLinkToken', include: data.hasMagicLink },
    { marker: 'model OtpCode', include: data.hasOtp },
    { marker: 'model PasskeyCredential', include: data.hasPasskeys },
    { marker: 'model PasskeyChallenge', include: data.hasPasskeys },
  ];

  for (const { marker, include } of modelsToAdd) {
    if (!include || schema.includes(marker)) continue;
    schema = `${schema.trimEnd()}\n${extractModel(fragment, marker)}\n`;
    written.push(`${schemaPath} (${marker})`);
  }

  if (written.length > 0) {
    await fs.write(schemaPath, schema);
  }

  return written;
}

function extractModel(fragment: string, marker: string): string {
  const start = fragment.indexOf(marker);
  if (start === -1) return '';
  const rest = fragment.slice(start);
  const next = rest.indexOf('\nmodel ', marker.length);
  return next === -1 ? rest.trim() : rest.slice(0, next).trim();
}
