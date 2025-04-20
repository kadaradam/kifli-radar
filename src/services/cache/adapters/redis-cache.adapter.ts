import type { Redis } from "ioredis";
import type { CacheAdapter, CacheOptions } from "~/types";

export class RedisCacheAdapter implements CacheAdapter {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, options: CacheOptions): Promise<void> {
    if (options.ttl) {
      await this.redis.set(
        key,
        JSON.stringify(value),
        "EX",
        options.ttl / 1000, // Convert ms to seconds
      );
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async clear(): Promise<void> {
    await this.redis.flushall();
  }

  async getCacheKeys(): Promise<string[]> {
    return await this.redis.keys("*");
  }
}
