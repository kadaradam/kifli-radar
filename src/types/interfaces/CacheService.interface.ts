import type { CacheOptions } from "../Cache.type";

export interface ICacheService {
  getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T | null>,
    options?: CacheOptions,
  ): Promise<T | null>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getCacheKeys(): Promise<string[]>;
}
