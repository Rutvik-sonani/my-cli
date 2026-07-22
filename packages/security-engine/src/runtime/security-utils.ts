/**
 * Lightweight runtime helpers for generated security middleware contracts.
 */
export function sanitizePlainText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripNullBytes(input: string): string {
  return input.replace(/\0/g, '');
}

export function isSafeRedirect(url: string, allowedHosts: string[]): boolean {
  try {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return allowedHosts.includes(parsed.host) || allowedHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  hit(key: string, now = Date.now()): { allowed: boolean; remaining: number } {
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.max - 1 };
    }
    current.count += 1;
    const allowed = current.count <= this.max;
    return { allowed, remaining: Math.max(0, this.max - current.count) };
  }
}
