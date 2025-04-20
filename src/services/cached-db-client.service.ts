import {
  type DynamoDBClient,
  GetItemCommand,
  type GetItemCommandInput,
  PutItemCommand,
  type PutItemCommandInput,
  QueryCommand,
  type QueryCommandInput,
  UpdateItemCommand,
  type UpdateItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { CacheAdapter, ICachedDBClient } from "~/types";
import { CacheService } from "./cache/cache.service";

export class CachedDBClient implements ICachedDBClient {
  private readonly cacheService: CacheService;
  private readonly dbClient: DynamoDBClient;

  constructor(dbClient: DynamoDBClient, cacheAdapter: CacheAdapter) {
    this.dbClient = dbClient;
    this.cacheService = CacheService.getInstance(cacheAdapter);
  }

  public async query<T>(
    params: QueryCommandInput,
    options: { ttl?: number; cacheKey?: string } = {},
  ) {
    const cacheKey = this.generateComplexCacheKey(params, options.cacheKey);

    return this.cacheService.getOrSet<T[]>(
      cacheKey,
      async () => {
        const result = await this.dbClient.send(new QueryCommand(params));

        if (!result.Items) {
          return [];
        }

        return result.Items.map((item) => unmarshall(item) as T);
      },
      { ttl: options.ttl },
    ) as Promise<T[]>;
  }

  public async getItem<T>(
    params: GetItemCommandInput,
    options: { ttl?: number; cacheKey?: string } = {},
  ) {
    const cacheKey = this.generateComplexCacheKey(params, options.cacheKey);

    return this.cacheService.getOrSet<T>(
      cacheKey,
      async () => {
        const result = await this.dbClient.send(new GetItemCommand(params));

        if (!result.Item) {
          return null;
        }

        return unmarshall(result.Item) as T;
      },
      { ttl: options.ttl },
    );
  }

  public async putItem(
    params: PutItemCommandInput,
    options?: { cacheKey?: string },
  ) {
    const table = params.TableName;

    if (table) {
      await this.invalidateTable(table, options?.cacheKey);
    }

    return this.dbClient.send(new PutItemCommand(params));
  }

  public async updateItem(
    params: UpdateItemCommandInput,
    options?: { cacheKey?: string },
  ) {
    const table = params.TableName;

    if (table) {
      await this.invalidateTable(table, options?.cacheKey);
    }

    return this.dbClient.send(new UpdateItemCommand(params));
  }

  public async invalidateTable(tableName: string, key?: string) {
    const pattern = key ? `db:${tableName}:${key}:` : `db:${tableName}:`;

    for (const key of await this.cacheService.getCacheKeys()) {
      if (key.startsWith(pattern)) {
        this.cacheService.delete(key);
      }
    }
  }

  private generateComplexCacheKey(params: QueryCommandInput, key?: string) {
    const pattern = key
      ? `db:${params.TableName}:${key}`
      : `db:${params.TableName}`;
    return `${pattern}:${JSON.stringify(params.KeyConditionExpression)}:${JSON.stringify(params.ExpressionAttributeValues)}`;
  }
}
