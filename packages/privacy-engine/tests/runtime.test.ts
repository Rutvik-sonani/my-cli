import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ConsentStore,
  CookieTracker,
  InMemoryPrivacyUserStore,
  PrivacyService,
  ProcessingRegistry,
  createPrivacyService,
} from '../src/runtime/privacy-service.js';

describe('PrivacyService', () => {
  it('exports user data with consent, cookies, and processing records', async () => {
    const userStore = new InMemoryPrivacyUserStore();
    userStore.setProfile('u1', { email: 'a@b.com' });
    const service = createPrivacyService({ userStore });

    await service.consents.record('u1', 'marketing', 'granted');
    await service.cookies.track('analytics', '_ga', 'set', { userId: 'u1' });
    await service.processing.record('u1', 'account', 'contract', ['email']);

    const exported = await service.exportUserData('u1');
    expect(exported.profile.email).toBe('a@b.com');
    expect(exported.consents).toHaveLength(1);
    expect(exported.cookies).toHaveLength(1);
    expect(exported.processingRecords).toHaveLength(1);
  });

  it('deletes user data and returns counts', async () => {
    const service = new PrivacyService({
      consentStore: new ConsentStore(),
      cookieTracker: new CookieTracker(),
      processingRegistry: new ProcessingRegistry(),
    });
    await service.consents.record('u2', 'analytics', 'granted');
    await service.cookies.track('preferences', 'theme', 'set', { userId: 'u2' });
    await service.processing.record('u2', 'billing', 'contract', ['card']);

    const result = await service.deleteUserData('u2');
    expect(result.removedConsents).toBe(1);
    expect(result.removedCookies).toBe(1);
    expect(result.removedProcessingRecords).toBe(1);
    expect(result.tombstone).toBe(true);

    const after = await service.exportUserData('u2');
    expect(after.consents).toHaveLength(0);
  });

  it('writes export JSON to disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'privacy-export-'));
    try {
      const userStore = new InMemoryPrivacyUserStore();
      userStore.setProfile('u3', { name: 'Ada' });
      const service = createPrivacyService({ userStore });
      const { filePath, export: data } = await service.exportUserDataToFile('u3', dir);
      expect(data.userId).toBe('u3');
      const raw = await readFile(filePath, 'utf8');
      expect(JSON.parse(raw).profile.name).toBe('Ada');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
