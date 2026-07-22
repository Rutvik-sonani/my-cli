import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ConsentRecord,
  ConsentStatus,
  CookieCategory,
  CookieEvent,
  DataProcessingRecord,
  PrivacyUserStore,
  UserDataDeletionResult,
  UserDataExport,
} from '@mycli/enterprise-core';

export class InMemoryPrivacyUserStore implements PrivacyUserStore {
  private readonly profiles = new Map<string, Record<string, unknown>>();

  setProfile(userId: string, profile: Record<string, unknown>): void {
    this.profiles.set(userId, { ...profile });
  }

  async getProfile(userId: string): Promise<Record<string, unknown> | null> {
    return this.profiles.get(userId) ?? null;
  }

  async deleteProfile(userId: string): Promise<boolean> {
    return this.profiles.delete(userId);
  }
}

export class ConsentStore {
  private readonly records: ConsentRecord[] = [];

  async record(
    userId: string,
    purpose: string,
    status: ConsentStatus,
    options: { source?: string; metadata?: Record<string, unknown> } = {},
  ): Promise<ConsentRecord> {
    const entry: ConsentRecord = {
      id: randomUUID(),
      userId,
      purpose,
      status,
      recordedAt: new Date(),
      source: options.source,
      metadata: options.metadata,
    };
    this.records.push(entry);
    return entry;
  }

  async listByUser(userId: string): Promise<ConsentRecord[]> {
    return this.records.filter((record) => record.userId === userId);
  }

  async deleteByUser(userId: string): Promise<number> {
    let removed = 0;
    for (let i = this.records.length - 1; i >= 0; i -= 1) {
      if (this.records[i]?.userId === userId) {
        this.records.splice(i, 1);
        removed += 1;
      }
    }
    return removed;
  }
}

export class CookieTracker {
  private readonly events: CookieEvent[] = [];

  async track(
    category: CookieCategory,
    name: string,
    action: CookieEvent['action'],
    options: { userId?: string; metadata?: Record<string, unknown> } = {},
  ): Promise<CookieEvent> {
    const event: CookieEvent = {
      id: randomUUID(),
      userId: options.userId,
      category,
      name,
      action,
      timestamp: new Date(),
      metadata: options.metadata,
    };
    this.events.push(event);
    return event;
  }

  async listByUser(userId: string): Promise<CookieEvent[]> {
    return this.events.filter((event) => event.userId === userId);
  }

  async deleteByUser(userId: string): Promise<number> {
    let removed = 0;
    for (let i = this.events.length - 1; i >= 0; i -= 1) {
      if (this.events[i]?.userId === userId) {
        this.events.splice(i, 1);
        removed += 1;
      }
    }
    return removed;
  }
}

export class ProcessingRegistry {
  private readonly records: DataProcessingRecord[] = [];

  async record(
    userId: string,
    purpose: string,
    legalBasis: string,
    dataCategories: string[],
    options: { processor?: string; metadata?: Record<string, unknown> } = {},
  ): Promise<DataProcessingRecord> {
    const entry: DataProcessingRecord = {
      id: randomUUID(),
      userId,
      purpose,
      legalBasis,
      dataCategories,
      recordedAt: new Date(),
      processor: options.processor,
      metadata: options.metadata,
    };
    this.records.push(entry);
    return entry;
  }

  async listByUser(userId: string): Promise<DataProcessingRecord[]> {
    return this.records.filter((record) => record.userId === userId);
  }

  async deleteByUser(userId: string): Promise<number> {
    let removed = 0;
    for (let i = this.records.length - 1; i >= 0; i -= 1) {
      if (this.records[i]?.userId === userId) {
        this.records.splice(i, 1);
        removed += 1;
      }
    }
    return removed;
  }
}

export interface PrivacyServiceOptions {
  userStore?: PrivacyUserStore;
  consentStore?: ConsentStore;
  cookieTracker?: CookieTracker;
  processingRegistry?: ProcessingRegistry;
  tombstoneOnDelete?: boolean;
}

/**
 * Orchestrates subject-access export, erasure, consent, cookies, and processing records.
 */
export class PrivacyService {
  private readonly userStore: PrivacyUserStore;
  readonly consents: ConsentStore;
  readonly cookies: CookieTracker;
  readonly processing: ProcessingRegistry;
  private readonly tombstoneOnDelete: boolean;

  constructor(options: PrivacyServiceOptions = {}) {
    this.userStore = options.userStore ?? new InMemoryPrivacyUserStore();
    this.consents = options.consentStore ?? new ConsentStore();
    this.cookies = options.cookieTracker ?? new CookieTracker();
    this.processing = options.processingRegistry ?? new ProcessingRegistry();
    this.tombstoneOnDelete = options.tombstoneOnDelete ?? true;
  }

  async exportUserData(userId: string): Promise<UserDataExport> {
    const profile = (await this.userStore.getProfile(userId)) ?? { userId };
    return {
      userId,
      exportedAt: new Date(),
      profile,
      consents: await this.consents.listByUser(userId),
      cookies: await this.cookies.listByUser(userId),
      processingRecords: await this.processing.listByUser(userId),
    };
  }

  async exportUserDataToFile(
    userId: string,
    outputDir: string,
  ): Promise<{ export: UserDataExport; filePath: string }> {
    const data = await this.exportUserData(userId);
    await mkdir(outputDir, { recursive: true });
    const filePath = join(
      outputDir,
      `${userId}-${data.exportedAt.toISOString().replace(/[:.]/g, '-')}.json`,
    );
    await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    return { export: data, filePath };
  }

  async deleteUserData(userId: string): Promise<UserDataDeletionResult> {
    const removedConsents = await this.consents.deleteByUser(userId);
    const removedCookies = await this.cookies.deleteByUser(userId);
    const removedProcessingRecords = await this.processing.deleteByUser(userId);
    await this.userStore.deleteProfile(userId);

    return {
      userId,
      deletedAt: new Date(),
      removedConsents,
      removedCookies,
      removedProcessingRecords,
      tombstone: this.tombstoneOnDelete,
    };
  }
}

export function createPrivacyService(options?: PrivacyServiceOptions): PrivacyService {
  return new PrivacyService(options);
}
