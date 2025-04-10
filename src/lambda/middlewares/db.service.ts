import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { NextFunction } from "grammy";
import type { AppContext } from "../context";

const dbClient = new DynamoDBClient();

// Middleware to register dbClient to context
export const db = () => async (ctx: AppContext, next: NextFunction) => {
  if (!ctx.dbClient) {
    ctx.dbClient = dbClient;
  }

  await next();
};
