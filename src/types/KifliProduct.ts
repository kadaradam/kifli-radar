interface Country {
  name: string;
  nameId: string;
  code: string;
}

interface FilterValue {
  name: string;
  slug: string;
}

interface Filter {
  type: string;
  slug: string;
  values: FilterValue[];
}

export interface KifliProduct {
  id: number;
  name: string;
  slug: string;
  mainCategoryId: number;
  unit: string;
  textualAmount: string;
  badges: string[];
  archived: boolean;
  premiumOnly: boolean;
  brand: string;
  images: string[];
  countries: Country[];
  canBeFavorite: boolean;
  canBeRated: boolean;
  information: string[];
  image3dData: null | unknown;
  adviceForSafeUse: null | string;
  countryOfOriginFlagIcon: null | string;
  productStory: null | string;
  filters: Filter[];
  weightedItem: boolean;
  packageRatio: number;
  sellerId: number;
  flag: null | string;
  attachments: unknown[];
}
