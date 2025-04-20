import type { CacheOptions } from "../Cache.type";

export interface CacheAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, options: CacheOptions): void;
  delete(key: string): void;
  clear(): void;
  getCacheKeys(): string[];
}
