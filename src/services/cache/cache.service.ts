import type { CacheAdapter, CacheOptions, ICacheService } from "~/types";
import { MemoryCacheAdapter } from "./adapters/memory-cache.adapter";

export class CacheService implements ICacheService {
  private static instance: CacheService;
  private readonly adapter: CacheAdapter;
  private readonly defaultTTL: number;

  private constructor(
    defaultTTL = 15 * 60 * 1000,
    adapter: CacheAdapter = new MemoryCacheAdapter(),
  ) {
    // 15 minutes default, because of lambda limits
    this.defaultTTL = defaultTTL;
    this.adapter = adapter;
  }

  public static getInstance(adapter: CacheAdapter) {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(undefined, adapter);
    }

    return CacheService.instance;
  }

  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T | null>,
    options = {},
  ) {
    const cached = this.get<T>(key);

    if (cached) {
      return cached;
    }

    const data = await fetchFn();

    this.set(key, data, options);

    return data;
  }

  public get<T>(key: string) {
    return this.adapter.get<T>(key);
  }

  public set<T>(key: string, data: T, options: CacheOptions = {}) {
    this.adapter.set(key, data, {
      ttl: options.ttl || this.defaultTTL,
    });
  }

  public delete(key: string) {
    this.adapter.delete(key);
  }

  public clear() {
    this.adapter.clear();
  }

  public getCacheKeys() {
    return this.adapter.getCacheKeys();
  }
}
