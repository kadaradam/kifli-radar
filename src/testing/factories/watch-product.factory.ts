import type { WatchProduct } from "~/types";

export interface WatchProductFactoryArgs {
  userId: number;
  productId?: number;
  productName?: string;
  minDiscountPercentage?: number;
  lastNotifiedAt?: string;
  deletedAt?: string;
}

export class WatchProductFactory {
  private args: WatchProductFactoryArgs[] = [];

  constructor(args: WatchProductFactoryArgs | WatchProductFactoryArgs[]) {
    this.args = Array.isArray(args) ? args : [args];
  }

  build(): WatchProduct[] {
    const now = new Date();

    return this.args.map((arg) => ({
      userId: arg.userId,
      productId: arg.productId ?? 1000,
      productName: arg.productName ?? "Test Product",
      minDiscountPercentage: arg.minDiscountPercentage ?? 20,
      deletedAt: arg.deletedAt,
      lastNotifiedAt: arg.lastNotifiedAt,
      createdAt: now,
      updatedAt: now,
    }));
  }
}
