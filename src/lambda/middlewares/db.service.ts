import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { NextFunction } from "grammy";
import { CachedDBClient, MemoryCacheAdapter } from "~/services";
import type { AppContext } from "../context";

const dbClient = new DynamoDBClient();

// Middleware to register dbClient to context
export const db = () => async (ctx: AppContext, next: NextFunction) => {
  if (!ctx.db) {
    if (!ctx.session?.cache) {
      throw new Error("'cache' field is not set in Grammy session");
    }

    const cacheAdapter = new MemoryCacheAdapter(ctx.session.cache);
    ctx.db = new CachedDBClient(dbClient, cacheAdapter);
  }

  await next();
};
