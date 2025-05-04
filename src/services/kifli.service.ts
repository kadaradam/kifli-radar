import type {
  IKifliService,
  KifliLastMinuteProduct,
  KifliProduct,
} from "~/types";

const KIFLI_API_URL = "https://kifli.hu/api/v1/";

/**
 * Service class for interacting with the Kifli.hu API
 * Provides methods to fetch product information and check last-minute deals
 */
export class KifliService implements IKifliService {
  /**
   * Extracts the product ID from a Kifli.hu product URL
   * @param url - The full Kifli.hu product URL
   * @returns The product ID if found, null otherwise
   * @example
   * getProductIdFromUrl("https://kifli.hu/123456") // returns "123456"
   */
  public getProductIdFromUrl(url: string) {
    const match = url.match(/kifli\.hu\/(\d+)/);
    return match?.[1] ?? null;
  }

  /**
   * Builds a product URL with the last-minute parameter
   * @param productId - The ID of the product
   * @returns The product URL with the last-minute parameter
   */
  public buildLastMinuteProductUrl(productId: number) {
    return `https://www.kifli.hu/${productId}?lm=1`;
  }

  /**
   * Fetches detailed product information for a single product
   * @param productId - The ID of the product to fetch
   * @returns Promise resolving to the product details
   */
  public async getProduct(productId: string) {
    const request = await fetch(`${KIFLI_API_URL}/products/${productId}`);

    if (!request.ok || request.status === 404) {
      return null;
    }

    const data = (await request.json()) as KifliProduct;
    return data;
  }

  /**
   * Fetches last-minute products for specific products
   * @param productIds - Array of product IDs to check for last-minute deals
   * @returns Promise resolving to an array of products with their last-minute status
   */
  // TODO: Handle multiple requests if there are more products
  public async fetchLastMinuteProducts(productIds: number[]) {
    if (!productIds.length) {
      return [];
    }

    const productIdsQs = productIds.join("&products=");

    const request = await fetch(
      `${KIFLI_API_URL}/products/card?products=${productIdsQs}&categoryType=last-minute`,
    );
    const data = (await request.json()) as KifliLastMinuteProduct[];
    return data;
  }
}
