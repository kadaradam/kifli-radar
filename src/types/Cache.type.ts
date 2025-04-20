export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

export type CacheMemory = Map<string, CacheItem<unknown>>;
