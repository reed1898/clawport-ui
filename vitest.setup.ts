/**
 * Vitest setup: Fix Node 25+ built-in localStorage shadowing jsdom's implementation.
 * Node 25 ships a bare Web Storage API on globalThis that lacks .clear()/.getItem()/.setItem().
 * jsdom provides a full implementation, but Node's built-in takes precedence.
 *
 * We create a proper in-memory Storage polyfill that matches the Web Storage API.
 */
import { beforeAll, beforeEach } from 'vitest'
import { invalidateCache } from '@/lib/cache'

// Clear in-memory TTL cache between tests to prevent stale data leaking
beforeEach(() => {
  invalidateCache()
})

class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number { return this.store.size }

  clear(): void { this.store.clear() }
  getItem(key: string): string | null { return this.store.get(key) ?? null }
  setItem(key: string, value: string): void { this.store.set(key, String(value)) }
  removeItem(key: string): void { this.store.delete(key) }
  key(index: number): string | null {
    const keys = [...this.store.keys()]
    return keys[index] ?? null
  }
  [Symbol.iterator]() { return this.store.entries() }
}

const storage = new MemoryStorage()

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  writable: true,
  configurable: true,
})

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  })
}
