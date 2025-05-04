declare module "sst" {
  interface TableResource {
    name: string;
  }

  interface Resource {
    UsersTable: TableResource;
    WatchProductsTable: TableResource;
    ProductAnalyticsTable: TableResource;
  }

  export const Resource: Resource;
}
