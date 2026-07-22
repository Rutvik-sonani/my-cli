/**
 * Privacy management contracts (Phase 9).
 */
export type ConsentStatus = 'granted' | 'denied' | 'withdrawn' | 'pending';

export type CookieCategory = 'necessary' | 'analytics' | 'marketing' | 'preferences';

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  status: ConsentStatus;
  recordedAt: Date;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface CookieEvent {
  id: string;
  userId?: string;
  category: CookieCategory;
  name: string;
  action: 'set' | 'read' | 'cleared';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface DataProcessingRecord {
  id: string;
  userId: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  recordedAt: Date;
  processor?: string;
  metadata?: Record<string, unknown>;
}

export interface UserDataExport {
  userId: string;
  exportedAt: Date;
  profile: Record<string, unknown>;
  consents: ConsentRecord[];
  cookies: CookieEvent[];
  processingRecords: DataProcessingRecord[];
}

export interface UserDataDeletionResult {
  userId: string;
  deletedAt: Date;
  removedConsents: number;
  removedCookies: number;
  removedProcessingRecords: number;
  tombstone?: boolean;
}

export interface PrivacyUserStore {
  getProfile(userId: string): Promise<Record<string, unknown> | null>;
  deleteProfile(userId: string): Promise<boolean>;
}
