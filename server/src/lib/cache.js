/**
 * Tiny TTL cache — Map + timestamps.
 * ponytail: in-memory only; swap for Redis if we ever run >1 replica.
 */
export function createCache({ ttlMs = 60 * 60 * 1000, maxEntries = 500 } = {}) {
  const store = new Map();

  const evictExpired = (now) => {
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  };

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      if (store.size >= maxEntries) evictExpired(Date.now());
      if (store.size >= maxEntries) {
        // drop oldest inserted (Map preserves insertion order)
        const firstKey = store.keys().next().value;
        if (firstKey !== undefined) store.delete(firstKey);
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    delete(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    get size() {
      return store.size;
    },
  };
}
