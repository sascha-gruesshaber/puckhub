/**
 * Minimal in-process TTL cache. One instance per concern; entries carry an
 * optional `scope` so a whole tenant can be invalidated at once.
 */

interface Entry<T> {
  value: T
  expiresAt: number
  scope: string | null
}

export interface TtlCache {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T, ttlMs: number, scope?: string | null): void
  /** Returns the cached value or computes, stores and returns it. */
  wrap<T>(key: string, ttlMs: number, fn: () => Promise<T>, scope?: string | null): Promise<T>
  /** Drops every entry whose key starts with `prefix` or whose scope equals `scope`. */
  invalidate(opts: { prefix?: string; scope?: string }): void
  clear(): void
  size(): number
}

export function createTtlCache(options: { enabled?: boolean; maxEntries?: number } = {}): TtlCache {
  const enabled = options.enabled ?? true
  const maxEntries = options.maxEntries ?? 5000
  const store = new Map<string, Entry<unknown>>()
  const inflight = new Map<string, Promise<unknown>>()

  function get<T>(key: string): T | undefined {
    if (!enabled) return undefined
    const entry = store.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      store.delete(key)
      return undefined
    }
    return entry.value as T
  }

  function set<T>(key: string, value: T, ttlMs: number, scope: string | null = null): void {
    if (!enabled) return
    if (store.size >= maxEntries) {
      // Drop the oldest insertion; Map preserves insertion order.
      const oldest = store.keys().next().value
      if (oldest !== undefined) store.delete(oldest)
    }
    store.set(key, { value, expiresAt: Date.now() + ttlMs, scope })
  }

  async function wrap<T>(key: string, ttlMs: number, fn: () => Promise<T>, scope: string | null = null): Promise<T> {
    const hit = get<T>(key)
    if (hit !== undefined) return hit
    if (!enabled) return fn()

    const pending = inflight.get(key) as Promise<T> | undefined
    if (pending) return pending

    const promise = fn()
      .then((value) => {
        set(key, value, ttlMs, scope)
        return value
      })
      .finally(() => {
        inflight.delete(key)
      })
    inflight.set(key, promise)
    return promise
  }

  function invalidate(opts: { prefix?: string; scope?: string }): void {
    for (const [key, entry] of store) {
      if ((opts.prefix && key.startsWith(opts.prefix)) || (opts.scope && entry.scope === opts.scope)) {
        store.delete(key)
      }
    }
  }

  return {
    get,
    set,
    wrap,
    invalidate,
    clear: () => store.clear(),
    size: () => store.size,
  }
}
