import type { KifliLastMinuteProduct } from "../KifliLastMinuteProduct.type";
import type { KifliProduct } from "../KifliProduct.type";

export interface IKifliService {
  getProductIdFromUrl(url: string): string | null;
  buildLastMinuteProductUrl(productId: number): string;
  getProduct(productId: string): Promise<KifliProduct | null>;
  fetchLastMinuteProducts(
    productIds: number[],
  ): Promise<KifliLastMinuteProduct[]>;
}
