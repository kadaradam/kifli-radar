import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { NextFunction } from "grammy";
import { CachedDBClient, MemoryCacheAdapter, RedisClient } from "~/services";
import { RedisCacheAdapter } from "~/services/cache/adapters/redis-cache.adapter";
import type { CacheAdapter, CacheMemory } from "~/types";
import type { AppContext } from "../context";
import { env } from "../env";

const dbClient = new DynamoDBClient();

// Middleware to register dbClient to context
export const db = () => async (ctx: AppContext, next: NextFunction) => {
  if (!ctx.db) {
    if (!ctx.session?.cache) {
      throw new Error("'cache' field is not set in Grammy session");
    }

    const cacheAdapter = getCacheAdapter(ctx.session.cache);
    ctx.db = new CachedDBClient(dbClient, cacheAdapter);
  }

  await next();
};

const getCacheAdapter = (cacheMemory: CacheMemory): CacheAdapter => {
  if (env.CACHE_DRIVER === "redis") {
    const redis = RedisClient.getInstance({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      username: env.REDIS_USERNAME,
      db: env.REDIS_DB,
    });
    return new RedisCacheAdapter(redis);
  }

  return new MemoryCacheAdapter(cacheMemory);
};
