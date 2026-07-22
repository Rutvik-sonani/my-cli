export type AuthStrategy =
  | 'jwt'
  | 'refresh-token'
  | 'session'
  | 'oauth'
  | 'magic-link'
  | 'otp'
  | 'passkeys'
  | 'mfa';

export type OAuthProvider = 'google' | 'github' | 'facebook';

export type AuthOrm =
  | 'prisma'
  | 'drizzle'
  | 'typeorm'
  | 'mongoose'
  | 'sequelize'
  | 'mikroorm'
  | 'none';

export interface AuthSetupOptions {
  cwd?: string;
  strategies: AuthStrategy[];
  oauthProviders?: OAuthProvider[];
  language?: 'typescript' | 'javascript';
  modulesPath?: string;
  orm?: AuthOrm;
  dryRun?: boolean;
}

export interface AuthSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface AuthTemplateData {
  strategies: AuthStrategy[];
  oauthProviders: OAuthProvider[];
  hasJwt: boolean;
  hasRefresh: boolean;
  hasSession: boolean;
  hasOAuth: boolean;
  hasMagicLink: boolean;
  hasOtp: boolean;
  hasPasskeys: boolean;
  hasMfa: boolean;
  orm: string;
  modulesPath: string;
}
