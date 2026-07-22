/**
 * Security platform contracts (Phase 12).
 */
export type SecurityFindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type SecurityScanCategory =
  | 'dependencies'
  | 'secrets'
  | 'configuration'
  | 'owasp'
  | 'licenses';

export interface SecurityFinding {
  id: string;
  category: SecurityScanCategory;
  severity: SecurityFindingSeverity;
  title: string;
  description: string;
  file?: string;
  line?: number;
  remediation?: string;
}

export interface SecurityScanSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface SecurityScanReport {
  id: string;
  generatedAt: Date;
  projectName: string;
  findings: SecurityFinding[];
  summary: SecurityScanSummary;
}

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: boolean;
  frameguard?: boolean;
  hidePoweredBy?: boolean;
  hsts?: boolean;
  noSniff?: boolean;
  xssFilter?: boolean;
}

export interface CorsConfig {
  origins: string[];
  credentials: boolean;
  methods?: string[];
}

export interface CsrfConfig {
  cookieName: string;
  headerName: string;
  enabled: boolean;
}

export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export interface SecurityPlatformConfig {
  headers: SecurityHeadersConfig;
  cors: CorsConfig;
  csrf: CsrfConfig;
  rateLimit: RateLimitConfig;
}
