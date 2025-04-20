import Redis from "ioredis";
import { env } from "~/lambda/env";

export class RedisClient {
  private static instance: Redis;

  private constructor() {}

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        username: env.REDIS_USERNAME,
        db: env.REDIS_DB,
      });

      RedisClient.instance.on("connect", () => {
        console.info("Connected to Redis successfully");
      });
    }
    return RedisClient.instance;
  }
}
