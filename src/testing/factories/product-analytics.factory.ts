import type { ProductAnalytics } from "~/types";

export interface ProductAnalyticsFactoryArgs {
  id?: string;
  productId?: number;
  productName?: string;
  fetchedAt?: string;
  discountPercentage?: number;
  stockQuantity?: number;
  originalPrice?: number;
  salePrice?: number;
}

export class ProductAnalyticsFactory {
  private args: ProductAnalyticsFactoryArgs;

  constructor(args: ProductAnalyticsFactoryArgs = {}) {
    this.args = args;
  }

  build(): ProductAnalytics {
    return {
      id: this.args.id ?? `analytics_${Date.now()}`,
      productId: this.args.productId ?? 1000,
      productName: this.args.productName ?? "Test Product",
      fetchedAt: this.args.fetchedAt ?? new Date().toISOString(),
      discountPercentage: this.args.discountPercentage ?? 0,
      stockQuantity: this.args.stockQuantity ?? 10,
      originalPrice: this.args.originalPrice ?? 1000,
      salePrice: this.args.salePrice ?? 800,
    };
  }
}
