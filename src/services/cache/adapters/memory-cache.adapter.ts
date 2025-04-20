import type { CacheAdapter, CacheMemory, CacheOptions } from "~/types";

export class MemoryCacheAdapter implements CacheAdapter {
  private cache: CacheMemory;

  constructor(_cache?: CacheMemory) {
    this.cache = _cache || new Map();
  }

  get<T>(key: string) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    const now = Date.now();

    if (item.ttl && now - item.timestamp > item.ttl) {
      this.delete(key);

      return null;
    }

    return item.data as T;
  }

  set<T>(key: string, data: T, options: CacheOptions = {}) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: options.ttl,
    });
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getCacheKeys() {
    return Array.from(this.cache.keys());
  }
}
