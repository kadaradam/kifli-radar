import type { KifliLastMinuteProduct } from "~/types";

export interface KifliLmProductFactoryArgs {
  name: string;
  productId: number;
  originalPrice: number;
  salePrice: number;
  maxAvailableAmount: number;
}

export class KifliLmProductFactory {
  private args: KifliLmProductFactoryArgs[] = [];

  constructor(args: KifliLmProductFactoryArgs[] | KifliLmProductFactoryArgs) {
    this.args = Array.isArray(args) ? args : [args];
  }

  build(): KifliLastMinuteProduct[] {
    return this.args.map((arg) => ({
      productId: arg.productId,
      name: arg.name,
      image: {
        path: "test.jpg",
        backgroundColor: "#ffffff",
      },
      slug: "test-product",
      brand: null,
      countryOfOriginFlagIconPath: null,
      favorites: {
        canBeFavorite: true,
        favorite: false,
      },
      unit: "db",
      textualAmount: "1 db",
      weightedItem: false,
      badges: [],
      prices: {
        originalPrice: arg.originalPrice,
        salePrice: arg.salePrice,
        unitPrice: arg.salePrice,
        saleId: 1,
        salePriceStyle: {
          textColor: "#ffffff",
          backgroundColor: "#ff0000",
        },
        currency: "HUF",
      },
      stock: {
        maxAvailableAmount: arg.maxAvailableAmount,
        availabilityStatus: "AVAILABLE",
        availabilityReason: null,
      },
      tooltips: [],
      ratings: [],
    }));
  }
}
