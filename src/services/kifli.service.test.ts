import { KifliService } from "./kifli.service";

// Using known, likely stable product IDs from Kifli.hu
// Example: Gurmet előkészített sertés/marha hús (20%) (https://kifli.hu/28732-gurmet-elokeszitett-sertes-marha-hus-20) -> 28732
// Example: Banán (https://kifli.hu/971843-banan) -> 971843
const VALID_PRODUCT_ID_NUMERIC = 28732;
const VALID_PRODUCT_ID_STRING = "28732";
const VALID_PRODUCT_URL = `https://kifli.hu/${VALID_PRODUCT_ID_STRING}-gurmet-elokeszitett-sertes-marha-hus-20`;
const ANOTHER_VALID_PRODUCT_ID = 971843;
const INVALID_PRODUCT_ID = "999999999"; // Assuming this ID doesn't exist

// Increase timeout for tests making real network calls
const NETWORK_TEST_TIMEOUT = 30000; // 30 seconds

describe("KifliService", () => {
  let kifliService: KifliService;

  beforeEach(() => {
    kifliService = new KifliService();
  });

  describe("getProductIdFromUrl", () => {
    it("should extract product ID from a valid URL", () => {
      const productId = kifliService.getProductIdFromUrl(VALID_PRODUCT_URL);
      expect(productId).toBe(VALID_PRODUCT_ID_STRING);
    });

    it("should return null if URL does not contain a product ID", () => {
      const url = "https://kifli.hu/vasarlas";
      const productId = kifliService.getProductIdFromUrl(url);
      expect(productId).toBeNull();
    });

    it("should return null for invalid URL format", () => {
      const url = "invalid-url";
      const productId = kifliService.getProductIdFromUrl(url);
      expect(productId).toBeNull();
    });

    it("should return null for empty string", () => {
      const url = "";
      const productId = kifliService.getProductIdFromUrl(url);
      expect(productId).toBeNull();
    });
  });

  describe("buildLastMinuteProductUrl", () => {
    it("should build the correct last-minute product URL", () => {
      const expectedUrl = `https://www.kifli.hu/${VALID_PRODUCT_ID_NUMERIC}?lm=1`;
      const actualUrl = kifliService.buildLastMinuteProductUrl(
        VALID_PRODUCT_ID_NUMERIC,
      );
      expect(actualUrl).toBe(expectedUrl);
    });
  });

  describe("getProduct", () => {
    it(
      "should fetch product details for a valid product ID",
      async () => {
        const product = await kifliService.getProduct(VALID_PRODUCT_ID_STRING);

        if (!product) {
          throw new Error("Product is null");
        }

        expect(product).toBeDefined();
        expect(product.id).toBe(VALID_PRODUCT_ID_NUMERIC);

        expect(product.name).toBeDefined();
        expect(typeof product.name).toBe("string");

        expect(product.images).toBeDefined();
        expect(Array.isArray(product.images)).toBe(true);
        expect(product.images.length).toBeGreaterThan(0);
        expect(product.images[0]).toBeDefined();
        expect(typeof product.images[0]).toBe("string");
      },
      NETWORK_TEST_TIMEOUT,
    );

    it(
      "should handle non-existent product ID",
      async () => {
        const product = await kifliService.getProduct(INVALID_PRODUCT_ID);

        expect(product).toBeNull();
      },
      NETWORK_TEST_TIMEOUT,
    );
  });

  describe("fetchLastMinuteProducts", () => {
    it(
      "should fetch last minute product details for valid product IDs",
      async () => {
        const productIds = [VALID_PRODUCT_ID_NUMERIC, ANOTHER_VALID_PRODUCT_ID];
        const products = await kifliService.fetchLastMinuteProducts(productIds);

        expect(Array.isArray(products)).toBe(true);

        if (products.length > 0) {
          const product = products[0];

          expect(product).toHaveProperty("productId");
          expect(typeof product.productId).toBe("number");

          expect(product).toHaveProperty("name");
          expect(typeof product.name).toBe("string");

          expect(product).toHaveProperty("prices");
          expect(typeof product.prices.saleId).toBe("number");
          expect(typeof product.prices.originalPrice).toBe("number");
          expect(typeof product.prices.salePrice).toBe("number");

          expect(product).toHaveProperty("stock");
          expect(typeof product.stock.maxAvailableAmount).toBe("number");
        }
      },
      NETWORK_TEST_TIMEOUT,
    );

    it(
      "should return an empty array when fetching with an empty product ID list",
      async () => {
        const products = await kifliService.fetchLastMinuteProducts([]);
        expect(products).toEqual([]);
      },
      NETWORK_TEST_TIMEOUT,
    );

    it(
      "should handle non-existent product IDs gracefully",
      async () => {
        const productIds = [Number.parseInt(INVALID_PRODUCT_ID, 10)]; // Use a likely non-existent ID
        const products = await kifliService.fetchLastMinuteProducts(productIds);

        expect(Array.isArray(products)).toBe(true);
        expect(products.length).toBe(0);
      },
      NETWORK_TEST_TIMEOUT,
    );
  });
});
