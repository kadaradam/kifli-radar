export interface KifliLastMinuteProduct {
  productId: number;
  image: {
    path: string;
    backgroundColor: string;
  };
  name: string;
  slug: string;
  brand: string | null;
  countryOfOriginFlagIconPath: string | null;
  favorites: {
    canBeFavorite: boolean;
    favorite: boolean;
  };
  unit: string;
  textualAmount: string;
  weightedItem: boolean;
  badges: Badge[];
  prices: Prices;
  stock: Stock;
  tooltips: unknown[];
  ratings: unknown[];
}

interface Badge {
  position: string;
  type: string | null;
  text: string;
  textColor: string;
  backgroundColor: string;
  link: string | null;
}

interface Prices {
  originalPrice: number;
  salePrice: number | null;
  unitPrice: number;
  saleId: number | null;
  salePriceStyle: {
    textColor: string;
    backgroundColor: string;
  } | null;
  currency: string;
}

interface Stock {
  maxAvailableAmount: number;
  availabilityStatus: "AVAILABLE" | "UNAVAILABLE";
  availabilityReason: string | null;
}
