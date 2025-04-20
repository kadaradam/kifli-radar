import type {
  GetItemCommandInput,
  PutItemCommandInput,
  PutItemCommandOutput,
  QueryCommandInput,
  UpdateItemCommandInput,
  UpdateItemCommandOutput,
} from "@aws-sdk/client-dynamodb";

export interface ICachedDBClient {
  query<T>(
    params: QueryCommandInput,
    options?: { ttl?: number; cacheKey?: string },
  ): Promise<T[]>;
  getItem<T>(
    params: GetItemCommandInput,
    options?: { ttl?: number; cacheKey?: string },
  ): Promise<T | null>;
  putItem<T>(
    params: PutItemCommandInput,
    options?: { cacheKey?: string },
  ): Promise<PutItemCommandOutput>;
  updateItem<T>(
    params: UpdateItemCommandInput,
    options?: { cacheKey?: string },
  ): Promise<UpdateItemCommandOutput>;
  invalidateTable(tableName: string): void;
}
