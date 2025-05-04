import Redis, { type RedisOptions } from "ioredis";

export class RedisClient {
  private static instance: Redis;

  private constructor() {}

  public static getInstance(options: RedisOptions): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(options);

      RedisClient.instance.on("connect", () => {
        console.info("Connected to Redis successfully");
      });
    }
    return RedisClient.instance;
  }
}
