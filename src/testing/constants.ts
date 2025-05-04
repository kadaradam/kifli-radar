import type { Resource } from "sst";

export const mockedResources: Resource = {
  UsersTable: {
    name: "UsersTable",
  },
  WatchProductsTable: {
    name: "WatchProductsTable",
  },
  ProductAnalyticsTable: {
    name: "ProductAnalyticsTable",
  },
} as const as Resource;
