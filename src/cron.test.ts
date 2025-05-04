import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { config } from "./config"; // Corrected import path
import {
  KifliLmProductFactory,
  type KifliLmProductFactoryArgs,
  UserFactory,
  type UserFactoryArgs,
  WatchProductFactory,
  type WatchProductFactoryArgsWithoutUserId,
} from "./testing/factories";

// Create a spy we can check later
const sendMessageSpy = jest.fn();
// Mock the Grammy Api
jest.mock("grammy", () => ({
  Api: jest.fn().mockImplementation(() => ({
    sendMessage: sendMessageSpy,
  })),
}));

const dynamodbMock = mockClient(DynamoDBClient);

// Import the handler after mocking dependencies
import { handler } from "./cron";
import { mockedResources } from "./testing/constants";
import {
  expectSuccessLambdaResponse,
  mockCryptoUUID,
  mockFetch,
  mockFetchError,
} from "./testing/utils";
import {
  expectNoProductAnalyticsInserted,
  expectNoProductUpdates,
  expectNoUserUpdates,
  expectProductAnalyticsInserted,
  expectProductLastNotifiedAtUpdated,
  expectUserLastNotifiedAtUpdated,
} from "./testing/utils/dynamo.utils";

describe("Cron Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dynamodbMock.reset();
    // Ensure real timers are used by default unless overridden in a test
    jest.useRealTimers();
  });

  describe("General Cases", () => {
    it("should execute successfully with no products to monitor", async () => {
      dynamodbMock.on(ScanCommand).resolves({
        Items: [],
      });

      mockFetch([
        {
          ok: true,
          json: () => Promise.resolve([]),
        },
      ]);

      const result = await handler();

      expectSuccessLambdaResponse(result);
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expectNoUserUpdates(dynamodbMock);
      expectNoProductUpdates(dynamodbMock);
      expectNoProductAnalyticsInserted(dynamodbMock);
    });

    it("should handle fetch errors gracefully", async () => {
      const mockWatchProducts = new WatchProductFactory({
        userId: 1,
        productId: 123,
        productName: "Test Product",
        minDiscountPercentage: 20,
        lastNotifiedAt: undefined,
      }).build();

      dynamodbMock
        .on(ScanCommand, {
          TableName: mockedResources.WatchProductsTable.name,
        })
        .resolves({
          Items: mockWatchProducts.map((product) =>
            marshall(product, {
              removeUndefinedValues: true,
              convertClassInstanceToMap: true,
            }),
          ),
        });

      // Mock an error in fetchLastMinuteProducts
      mockFetchError();

      const result = await handler();

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe("Cron job failed");
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expectNoUserUpdates(dynamodbMock);
      expectNoProductUpdates(dynamodbMock);
      expectNoProductAnalyticsInserted(dynamodbMock);
    });
  });

  describe("Send Notifications", () => {
    it("should send notifications to users when conditions are met", async () => {
      const userFactory = new UserFactory({
        id: 1,
        sleepEnabled: false,
        sleepFrom: "22:00",
        sleepTo: "08:00",
        timezone: "Europe/Budapest",
      })
        .products([
          {
            productId: 123,
            productName: "Test Product",
            minDiscountPercentage: 20,
            lastNotifiedAt: undefined,
          },
          {
            productId: 456,
            productName: "Test Product 2",
            minDiscountPercentage: 10,
            lastNotifiedAt: undefined,
          },
        ])
        .build();

      const kifliLmProducts = new KifliLmProductFactory([
        {
          productId: 123,
          name: "Test Product",
          maxAvailableAmount: 5,
          originalPrice: 1000,
          salePrice: 800, // 20% discount
        },
        {
          productId: 456,
          name: "Test Product 2",
          maxAvailableAmount: 5,
          originalPrice: 2000,
          salePrice: 1200, // 40% discount
        },
      ]).build();
      const mockUser = userFactory.user;
      const mockWatchProducts = userFactory.watchProducts;
      const mockAvailableProducts = kifliLmProducts;
      const analyticsIdOne = "123e4567-e89b-12d3-a456-426614174000";
      const analyticsIdTwo = "58382e54-f367-4c09-8ec8-29b564f9c05e";
      const testTime = new Date();

      dynamodbMock
        .on(ScanCommand, { TableName: mockedResources.UsersTable.name })
        .resolves({
          Items: [
            marshall(mockUser, {
              removeUndefinedValues: true,
              convertClassInstanceToMap: true,
            }),
          ],
        });

      dynamodbMock
        .on(ScanCommand, {
          TableName: mockedResources.WatchProductsTable.name,
        })
        .resolves({
          Items: mockWatchProducts.map((product) =>
            marshall(product, {
              removeUndefinedValues: true,
              convertClassInstanceToMap: true,
            }),
          ),
        });

      mockFetch([
        {
          ok: true,
          json: async () => mockAvailableProducts,
        },
      ]);
      // Mock UUIDs for analytics entries
      mockCryptoUUID(analyticsIdOne);
      mockCryptoUUID(analyticsIdTwo);

      const result = await handler();

      expectSuccessLambdaResponse(result);

      // Check if sendMessage was called correctly
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockUser.id.toString(),
        "🔥 *Báttya, most őrület van\\!* 🤩\n" +
          "\n" +
          "Nézd meg ezeket a csodás akciókat:\n" +
          "\n" +
          "*Test Product*\n" +
          "💰 *Ár*: ~1000 Ft~ *800 Ft*\n" +
          "💵 *Megtakarítás*: 200 Ft \\(20%\\)\n" +
          "📦 *Raktáron*: 5 db\n" +
          "🔗 [Termék megtekintése](https://www.kifli.hu/123?lm=1)\n" +
          "\n" +
          "*Test Product 2*\n" +
          "💰 *Ár*: ~2000 Ft~ *1200 Ft*\n" +
          "💵 *Megtakarítás*: 800 Ft \\(40%\\)\n" +
          "📦 *Raktáron*: 5 db\n" +
          "🔗 [Termék megtekintése](https://www.kifli.hu/456?lm=1)\n" +
          "\n" +
          "🎉 *Ne hagyd, hogy lecsússz róluk, kapd el, amíg még van\\!*",
        { parse_mode: "MarkdownV2" },
      );

      // Check if UpdateCommand was called for user notification
      expectUserLastNotifiedAtUpdated(dynamodbMock, mockUser.id);
      expectProductLastNotifiedAtUpdated(
        dynamodbMock,
        mockWatchProducts.map((product) => ({
          userId: mockUser.id,
          productId: product.productId,
        })),
      );
      expectProductAnalyticsInserted(dynamodbMock, [
        {
          id: analyticsIdOne,
          productId: 123,
          discountPercentage: 20,
          fetchedAt: testTime.toISOString(),
          originalPrice: 1000,
          productName: "Test Product",
          salePrice: 800,
          stockQuantity: 5,
        },
        {
          id: analyticsIdTwo,
          productId: 456,
          discountPercentage: 40,
          fetchedAt: testTime.toISOString(),
          originalPrice: 2000,
          productName: "Test Product 2",
          salePrice: 1200,
          stockQuantity: 5,
        },
      ]);
    });
  });

  describe("Do Not Send Notifications", () => {
    const setupNotificationTest = ({
      userConfig,
      watchProductConfig,
      kifliProductConfig,
      testTime,
    }: {
      userConfig: UserFactoryArgs;
      watchProductConfig: WatchProductFactoryArgsWithoutUserId;
      kifliProductConfig: KifliLmProductFactoryArgs;
      testTime?: Date;
    }) => {
      if (testTime) {
        jest.useFakeTimers().setSystemTime(testTime);
      }

      const { user, watchProducts } = new UserFactory(userConfig)
        .products([watchProductConfig])
        .build();
      const availableProducts = new KifliLmProductFactory(
        kifliProductConfig,
      ).build();
      const analyticsId = "123e4567-e89b-12d3-a456-426614174000";

      dynamodbMock
        .on(ScanCommand, { TableName: mockedResources.UsersTable.name })
        .resolves({
          Items: [
            marshall(user, {
              removeUndefinedValues: true,
              convertClassInstanceToMap: true,
            }),
          ],
        });

      dynamodbMock
        .on(ScanCommand, {
          TableName: mockedResources.WatchProductsTable.name,
        })
        .resolves({
          Items: watchProducts.map((product) =>
            marshall(product, {
              removeUndefinedValues: true,
              convertClassInstanceToMap: true,
            }),
          ),
        });

      mockFetch([
        {
          ok: true,
          json: async () => availableProducts,
        },
      ]);
      mockCryptoUUID(analyticsId);

      return { user, watchProducts, availableProducts, analyticsId };
    };

    const assertNoNotificationSent = (
      result: Awaited<ReturnType<typeof handler>>,
      {
        expectAnalytics = true,
        productId = 123,
        discountPercentage = 20,
        originalPrice = 1000,
        salePrice = 800,
        stockQuantity = 5,
        productName = "Test Product",
        analyticsId = "123e4567-e89b-12d3-a456-426614174000",
      }: {
        expectAnalytics?: boolean;
        productId?: number;
        discountPercentage?: number;
        originalPrice?: number;
        salePrice?: number;
        stockQuantity?: number;
        productName?: string;
        analyticsId?: string;
      },
    ) => {
      expectSuccessLambdaResponse(result);
      expect(sendMessageSpy).not.toHaveBeenCalled();
      expectNoUserUpdates(dynamodbMock);
      expectNoProductUpdates(dynamodbMock);
      if (expectAnalytics) {
        expectProductAnalyticsInserted(dynamodbMock, [
          {
            id: analyticsId,
            productId: productId,
            discountPercentage: discountPercentage,
            fetchedAt: new Date().toISOString(),
            originalPrice: originalPrice,
            productName: productName,
            salePrice: salePrice,
            stockQuantity: stockQuantity,
          },
        ]);
      } else {
        expectNoProductAnalyticsInserted(dynamodbMock);
      }
    };

    describe("when user is sleeping", () => {
      it.each([
        ["07:59", "Europe/Budapest", true], // Just before wake up
        ["22:00", "Europe/Budapest", true], // Exactly at sleep time
        ["02:00", "Europe/Budapest", true], // Middle of the night
        ["08:00", "Europe/Budapest", false], // Exactly wake up time
        ["12:00", "Europe/Budapest", false], // Midday
        // Test timezone difference - sleep 22:00-08:00 Budapest (UTC+2), test time is UTC
        ["20:00Z", "Europe/Budapest", true], // 22:00 Budapest time -> Sleep
        ["06:00Z", "Europe/Budapest", false], // 08:00 Budapest time -> Awake
      ])(
        "should not send notification at %s (%s timezone), expected sleep: %s",
        async (timeStr, timezone, shouldBeSleeping) => {
          const testTime = new Date(`2024-04-21 ${timeStr}`);
          const userConfig = {
            id: 1,
            sleepEnabled: true,
            sleepFrom: "22:00",
            sleepTo: "08:00",
            timezone,
          };
          const watchProductConfig = {
            productId: 123,
            productName: "Test Product",
            minDiscountPercentage: 10,
            lastNotifiedAt: undefined,
          };
          const kifliProductConfig = {
            productId: 123,
            name: "Test Product",
            maxAvailableAmount: 5,
            originalPrice: 1000,
            salePrice: 800, // 20% discount
          };

          const { analyticsId } = setupNotificationTest({
            userConfig,
            watchProductConfig,
            kifliProductConfig,
            testTime,
          });
          const result = await handler();

          if (shouldBeSleeping) {
            assertNoNotificationSent(result, {
              analyticsId,
              discountPercentage: 20,
              originalPrice: 1000,
              salePrice: 800,
            });
          } else {
            // If not sleeping, expect notification to be sent (minimal check)
            expect(sendMessageSpy).toHaveBeenCalledTimes(1);
            expectUserLastNotifiedAtUpdated(dynamodbMock, userConfig.id);
            expectProductLastNotifiedAtUpdated(dynamodbMock, [
              {
                userId: userConfig.id,
                productId: watchProductConfig.productId,
              },
            ]);
            expectProductAnalyticsInserted(dynamodbMock, [
              {
                id: analyticsId,
                productId: kifliProductConfig.productId,
                discountPercentage: 20,
                fetchedAt: testTime.toISOString(),
                originalPrice: kifliProductConfig.originalPrice,
                productName: kifliProductConfig.name,
                salePrice: kifliProductConfig.salePrice!,
                stockQuantity: kifliProductConfig.maxAvailableAmount,
              },
            ]);
          }
        },
      );
    });

    describe("when product was notified recently", () => {
      it("should not send notification if last notified within cooldown period", async () => {
        const testTime = new Date("2024-04-21 09:00:00Z"); // Assume cooldown is 24h
        const lastNotifiedTime = new Date("2024-04-20 10:00:00Z"); // Notified 23 hours ago

        const userConfig = {
          id: 1,
          sleepEnabled: false,
          timezone: "Europe/Budapest",
        };
        const watchProductConfig = {
          productId: 123,
          productName: "Test Product",
          minDiscountPercentage: 10,
          lastNotifiedAt: lastNotifiedTime.toISOString(),
        };
        const kifliProductConfig: KifliLmProductFactoryArgs = {
          productId: 123,
          name: "Test Product",
          maxAvailableAmount: 5,
          originalPrice: 1000,
          salePrice: 800, // 20% discount
        };

        const { analyticsId } = setupNotificationTest({
          userConfig,
          watchProductConfig,
          kifliProductConfig,
          testTime,
        });
        const result = await handler();

        assertNoNotificationSent(result, {
          analyticsId,
          discountPercentage: 20,
          originalPrice: 1000,
          salePrice: 800,
        });
      });

      it("should send notification if last notified outside cooldown period", async () => {
        const testTime = new Date("2024-04-21 09:00:00Z"); // Assume cooldown is 24h
        const lastNotifiedTime = new Date("2024-04-20 08:59:59Z"); // Notified > 24 hours ago

        const userConfig = {
          id: 1,
          sleepEnabled: false,
          timezone: "Europe/Budapest",
        };
        const watchProductConfig = {
          productId: 123,
          productName: "Test Product",
          minDiscountPercentage: 10,
          lastNotifiedAt: lastNotifiedTime.toISOString(),
        };
        const kifliProductConfig: KifliLmProductFactoryArgs = {
          productId: 123,
          name: "Test Product",
          maxAvailableAmount: 5,
          originalPrice: 1000,
          salePrice: 800, // 20% discount
        };

        const { analyticsId } = setupNotificationTest({
          userConfig,
          watchProductConfig,
          kifliProductConfig,
          testTime,
        });
        const result = await handler();

        // Expect notification to be sent
        expectSuccessLambdaResponse(result);
        expect(sendMessageSpy).toHaveBeenCalledTimes(1);
        expectUserLastNotifiedAtUpdated(dynamodbMock, userConfig.id);
        expectProductLastNotifiedAtUpdated(dynamodbMock, [
          { userId: userConfig.id, productId: watchProductConfig.productId },
        ]);
        expectProductAnalyticsInserted(dynamodbMock, [
          {
            id: analyticsId,
            productId: kifliProductConfig.productId,
            discountPercentage: 20,
            fetchedAt: testTime.toISOString(),
            originalPrice: kifliProductConfig.originalPrice,
            productName: kifliProductConfig.name,
            salePrice: kifliProductConfig.salePrice!,
            stockQuantity: kifliProductConfig.maxAvailableAmount,
          },
        ]);
      });
    });

    describe("when minimum discount percentage is not met", () => {
      it("should not send notification", async () => {
        const userConfig = {
          id: 1,
          sleepEnabled: false,
        };
        const watchProductConfig = {
          productId: 123,
          productName: "Test Product",
          minDiscountPercentage: 30, // User wants at least 30%
          lastNotifiedAt: undefined,
        };
        const kifliProductConfig: KifliLmProductFactoryArgs = {
          productId: 123,
          name: "Test Product",
          maxAvailableAmount: 5,
          originalPrice: 1000,
          salePrice: 750, // Actual discount is 25%
        };

        const { analyticsId } = setupNotificationTest({
          userConfig,
          watchProductConfig,
          kifliProductConfig,
        });
        const result = await handler();

        assertNoNotificationSent(result, {
          analyticsId,
          discountPercentage: 25, // Correct calculated discount
          originalPrice: 1000,
          salePrice: 750,
        });
      });
    });

    describe("when product is out of stock", () => {
      it("should not send notification and not save analytics", async () => {
        const userConfig = {
          id: 1,
          sleepEnabled: false,
        };
        const watchProductConfig = {
          productId: 123,
          productName: "Test Product",
          minDiscountPercentage: 10,
          lastNotifiedAt: undefined,
        };
        const kifliProductConfig: KifliLmProductFactoryArgs = {
          productId: 123,
          name: "Test Product",
          maxAvailableAmount: 0, // Out of stock
          originalPrice: 1000,
          salePrice: 600,
        };

        setupNotificationTest({
          userConfig,
          watchProductConfig,
          kifliProductConfig,
        });
        const result = await handler();

        assertNoNotificationSent(result, { expectAnalytics: false });
      });
    });

    describe("when minimum analytics discount percentage is not met", () => {
      it("should send notification and not save analytics", async () => {
        const analyticsThreshold = config.MIN_DISCOUNT_PERCENTAGE_FOR_ANALYTICS; // Currently 10
        const actualDiscountPercentage = analyticsThreshold - 1; // e.g., 9%
        const userMinDiscountPercentage = 5; // User wants >= 5%
        const originalPrice = 1000;
        const salePrice = originalPrice * (1 - actualDiscountPercentage / 100); // e.g., 910

        const userConfig = {
          id: 1,
          sleepEnabled: false,
        };
        const watchProductConfig = {
          productId: 123,
          productName: "Test Product Low Discount",
          minDiscountPercentage: userMinDiscountPercentage, // User threshold met
          lastNotifiedAt: undefined,
        };
        const kifliProductConfig: KifliLmProductFactoryArgs = {
          productId: 123,
          name: "Test Product Low Discount",
          maxAvailableAmount: 5,
          originalPrice: originalPrice,
          salePrice: salePrice, // Actual discount is below analytics threshold
        };

        setupNotificationTest({
          userConfig,
          watchProductConfig,
          kifliProductConfig,
        });
        const result = await handler();

        // Expect notification AND no analytics entry
        expectSuccessLambdaResponse(result);
        expect(sendMessageSpy).toHaveBeenCalledTimes(1);
        expectUserLastNotifiedAtUpdated(dynamodbMock, userConfig.id);
        expectProductLastNotifiedAtUpdated(dynamodbMock, [
          { userId: userConfig.id, productId: watchProductConfig.productId },
        ]);
        expectNoProductAnalyticsInserted(dynamodbMock);
      });
    });
  });
});
