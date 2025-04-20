import type { CacheOptions } from "../Cache.type";

type MaybePromise<T> = T | Promise<T>;

export interface CacheAdapter {
  get<T>(key: string): MaybePromise<T | null>;
  set<T>(key: string, data: T, options: CacheOptions): MaybePromise<void>;
  delete(key: string): MaybePromise<void>;
  clear(): MaybePromise<void>;
  getCacheKeys(): MaybePromise<string[]>;
}
