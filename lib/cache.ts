/**
 * Simple in-memory TTL cache for expensive operations (CLI calls, filesystem scans).
 *
 * Each cache entry stores a value and an expiry timestamp.
 * Expired entries are lazily evicted on next access.
 *
 * Usage:
 *   const result = await cachedCall('agents-cli', 30_000, () => expensiveCall())
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

/**
 * Return a cached value if fresh, otherwise call `fn()` and cache the result.
 *
 * @param key    Unique cache key
 * @param ttlMs  Time-to-live in milliseconds
 * @param fn     Factory function (sync or async)
 */
export async function cachedCall<T>(
  key: string,
  ttlMs: number,
  fn: () => T | Promise<T>,
): Promise<T> {
  const now = Date.now()
  const entry = store.get(key) as CacheEntry<T> | undefined

  if (entry && entry.expiresAt > now) {
    return entry.value
  }

  const value = await fn()
  store.set(key, { value, expiresAt: now + ttlMs })
  return value
}

/**
 * Synchronous variant for execSync-based calls.
 */
export function cachedCallSync<T>(
  key: string,
  ttlMs: number,
  fn: () => T,
): T {
  const now = Date.now()
  const entry = store.get(key) as CacheEntry<T> | undefined

  if (entry && entry.expiresAt > now) {
    return entry.value
  }

  const value = fn()
  store.set(key, { value, expiresAt: now + ttlMs })
  return value
}

/**
 * Invalidate a specific cache key or all keys.
 */
export function invalidateCache(key?: string): void {
  if (key) {
    store.delete(key)
  } else {
    store.clear()
  }
}
