import type { CacheOptions } from "../Cache.type";

export interface ICacheService {
  getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T | null>,
    options?: CacheOptions,
  ): Promise<T | null>;
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, options?: CacheOptions): void;
  delete(key: string): void;
  clear(): void;
  getCacheKeys(): string[];
}
