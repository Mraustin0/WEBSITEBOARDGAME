// unit test for the in-memory cache used by bgg.service
import { describe, expect, it, vi } from 'vitest';
import { createCache } from '../src/lib/cache.js';

describe('cache TTL', () => {
  it('returns value within TTL', () => {
    const c = createCache({ ttlMs: 1000 });
    c.set('k', 'v');
    expect(c.get('k')).toBe('v');
  });

  it('expires value after TTL', () => {
    vi.useFakeTimers();
    const c = createCache({ ttlMs: 1000 });
    c.set('k', 'v');
    vi.advanceTimersByTime(1001);
    expect(c.get('k')).toBeUndefined();
    vi.useRealTimers();
  });

  it('respects maxEntries by dropping oldest', () => {
    const c = createCache({ ttlMs: 60_000, maxEntries: 2 });
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('b')).toBe(2);
    expect(c.get('c')).toBe(3);
  });
});
