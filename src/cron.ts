import {
  BatchWriteItemCommand,
  type BatchWriteItemCommandOutput,
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
  type UpdateItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyResult } from "aws-lambda";
import { Api } from "grammy";
import { Resource } from "sst";
import { config } from "~/config";
import { KifliService } from "~/services/kifli.service";
import type {
  KifliLastMinuteProduct,
  ProductAnalytics,
  User,
  WatchProduct,
} from "./types";

const api = new Api(process.env.TELEGRAM_BOT_TOKEN!);
const dbClient = new DynamoDBClient();
const kifliService = new KifliService();

export const handler = async (): Promise<APIGatewayProxyResult> => {
  console.log("Cron job triggered at", new Date().toISOString());

  try {
    const [watchProducts, users] = await Promise.all([
      fetchWatchProducts(),
      fetchUsers(),
    ]);

    console.log(`Found ${watchProducts.length} products to monitor`);

    const productIds = watchProducts.map((watch) => watch.productId);
    const availableDiscountedProducts = (
      await kifliService.fetchLastMinuteProducts(productIds)
    )
      .filter((product) => product.prices.saleId)
      .filter((product) => product.stock.maxAvailableAmount > 0);

    await Promise.all([
      processUserNotifications(
        users,
        watchProducts,
        availableDiscountedProducts,
      ),
      processProductAnalytics(availableDiscountedProducts),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Cron job executed successfully!",
      }),
    };
  } catch (error) {
    console.error("Error in cron job execution:", error);
    // TODO: Send message to admin???

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Cron job failed",
      }),
    };
  }
};

async function processUserNotifications(
  users: Pick<
    User,
    "id" | "sleepEnabled" | "sleepFrom" | "sleepTo" | "timezone"
  >[],
  watchProducts: WatchProduct[],
  availableDiscountedProducts: KifliLastMinuteProduct[],
): Promise<void> {
  const activeUsers = filterActiveUsers(users);
  // Filter out users that are not notifiable
  const notifiableProducts = filterNotifiableProducts(watchProducts).filter(
    (product) => activeUsers.some((user) => user.id === product.userId),
  );

  console.log(`Found ${activeUsers.length} active users`);
  console.log(`Found ${notifiableProducts.length} notifiable products`);

  const productsWithRelevantDiscounts = findProductsWithRelevantDiscounts(
    availableDiscountedProducts,
    notifiableProducts,
  );

  console.log(
    `Found ${Object.keys(productsWithRelevantDiscounts).length} products with relevant discounts`,
  );

  let totalNotificationsSent = 0;

  for (const userId in productsWithRelevantDiscounts) {
    const products = productsWithRelevantDiscounts[userId];

    if (!products?.length) {
      continue;
    }

    totalNotificationsSent += products.length;
    await sendUserNotification(userId, products);
  }

  console.log(`Sent total of ${totalNotificationsSent} notifications`);
}

async function sendUserNotification(
  userId: string,
  products: KifliLastMinuteProduct[],
): Promise<void> {
  if (products.length === 0) return;

  const messageText = buildNotificationMessage(products);
  const now = new Date().toISOString();
  const productIds = products.map((product) => product.productId);

  // Send the message first
  await api.sendMessage(userId, messageText, {
    parse_mode: "MarkdownV2",
  });

  await Promise.all([
    updateUserLastNotifiedAt(userId, now),
    updateProductsLastNotifiedAt(userId, productIds, now),
  ]);
}

function buildNotificationMessage(products: KifliLastMinuteProduct[]): string {
  let messageText = "🔥 *Báttya, most őrület van\\!* 🤩\n\n";
  messageText += "Nézd meg ezeket a csodás akciókat:\n\n";

  for (const product of products) {
    const discountAmount =
      product.prices.originalPrice - product.prices.salePrice!;
    const discountPercentage = Math.round(
      (1 - product.prices.salePrice! / product.prices.originalPrice) * 100,
    );
    const lastMinuteProductUrl = kifliService.buildLastMinuteProductUrl(
      product.productId,
    );

    messageText += `*${escapeMarkdown(product.name)}*\n`;
    messageText += `💰 *Ár*: ~${escapeMarkdown(
      formatNumber(product.prices.originalPrice),
    )} Ft~ *${escapeMarkdown(formatNumber(product.prices.salePrice!))} Ft*\n`;
    messageText += `💵 *Megtakarítás*: ${escapeMarkdown(
      formatNumber(discountAmount),
    )} Ft \\(${escapeMarkdown(discountPercentage)}%\\)\n`;
    messageText += `📦 *Raktáron*: ${escapeMarkdown(
      product.stock.maxAvailableAmount,
    )} db\n`;
    messageText += `🔗 [Termék megtekintése](${lastMinuteProductUrl})\n\n`;
  }

  messageText += "🎉 *Ne hagyd, hogy lecsússz róluk, kapd el, amíg még van\\!*";
  return messageText;
}

function findProductsWithRelevantDiscounts(
  availableProducts: KifliLastMinuteProduct[],
  watchProducts: WatchProduct[],
): Record<string, KifliLastMinuteProduct[]> {
  return availableProducts
    .filter((product) => {
      const salePrice = product.prices.salePrice;
      const originalPrice = product.prices.originalPrice;
      const watchItem = watchProducts.find(
        (watch) => watch.productId === product.productId,
      );

      if (!salePrice || !watchItem?.minDiscountPercentage) {
        return false;
      }

      const discountPercentage = (1 - salePrice / originalPrice) * 100;
      return discountPercentage >= watchItem.minDiscountPercentage;
    })
    .reduce((acc: Record<string, KifliLastMinuteProduct[]>, product) => {
      const watchItems = watchProducts.filter(
        (watch) => watch.productId === product.productId,
      );

      if (!watchItems.length) {
        return acc;
      }

      for (const watchItem of watchItems) {
        const userId = watchItem.userId;

        if (!acc[userId]) {
          acc[userId] = [];
        }

        acc[userId].push(product);
      }

      return acc;
    }, {});
}

async function processProductAnalytics(
  products: KifliLastMinuteProduct[],
): Promise<BatchWriteItemCommandOutput> {
  const now = new Date().toISOString();

  const analyticsData = products.reduce((acc: ProductAnalytics[], product) => {
    const salePrice = product.prices.salePrice;
    const originalPrice = product.prices.originalPrice;

    if (!salePrice) {
      return acc;
    }

    const discountPercentage = formatNumber(
      (1 - salePrice / originalPrice) * 100,
    );

    if (discountPercentage < config.MIN_DISCOUNT_PERCENTAGE_FOR_ANALYTICS) {
      return acc;
    }

    acc.push({
      id: crypto.randomUUID(),
      productId: product.productId,
      productName: product.name,
      originalPrice,
      salePrice,
      discountPercentage: discountPercentage,
      stockQuantity: product.stock.maxAvailableAmount,
      fetchedAt: now,
    });

    return acc;
  }, []);

  return insertAnalytics(analyticsData);
}

function filterNotifiableProducts(products: WatchProduct[]): WatchProduct[] {
  return products.filter((product) => {
    // Filter out products that were notified in the last 24 hours

    if (!product.lastNotifiedAt) {
      return true;
    }

    const lastNotifiedDate = new Date(product.lastNotifiedAt);
    const now = new Date();

    const diffHours =
      (now.getTime() - lastNotifiedDate.getTime()) / (1000 * 60 * 60);

    return diffHours >= config.NEW_NOTIFICATION_THRESHOLD_IN_HOURS;
  });
}

function filterActiveUsers(
  users: Pick<
    User,
    "id" | "sleepEnabled" | "sleepFrom" | "sleepTo" | "timezone"
  >[],
): Pick<User, "id" | "sleepEnabled" | "sleepFrom" | "sleepTo" | "timezone">[] {
  return users.filter((user) => {
    // Auto include users that are not sleeping
    if (!user.sleepEnabled || !user.timezone) {
      return true;
    }

    const now = getTimeInTimeZone(user.timezone);
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();

    const [sleepFromHours, sleepFromMinutes] = user.sleepFrom
      .split(":")
      .map(Number);
    const [sleepToHours, sleepToMinutes] = user.sleepTo.split(":").map(Number);

    // If any of the sleep times are invalid, we should notify the user
    if (
      [sleepFromHours, sleepFromMinutes, sleepToHours, sleepToMinutes].some(
        Number.isNaN,
      )
    ) {
      return true;
    }

    // Include users that are in sleep mode and the current time is not between the sleep times
    // Convert all times to minutes for easier comparison
    const currentTime = nowHours * 60 + nowMinutes;
    const sleepFromTime = sleepFromHours * 60 + sleepFromMinutes;
    const sleepToTime = sleepToHours * 60 + sleepToMinutes;

    if (sleepFromTime > sleepToTime) {
      return currentTime < sleepFromTime && currentTime >= sleepToTime;
    }

    return currentTime < sleepFromTime || currentTime >= sleepToTime;
  });
}

// TODO: Create user and product services

async function fetchUsers(): Promise<
  Pick<User, "id" | "sleepEnabled" | "sleepFrom" | "sleepTo" | "timezone">[]
> {
  const result = await dbClient.send(
    new ScanCommand({
      TableName: Resource.UsersTable.name,
      ProjectionExpression: "id, sleepEnabled, sleepFrom, sleepTo, #tz",
      ExpressionAttributeNames: {
        "#tz": "timezone",
      },
    }),
  );

  return result.Items?.map((item) => unmarshall(item) as User) ?? [];
}

async function fetchWatchProducts(): Promise<WatchProduct[]> {
  const result = await dbClient.send(
    // TODO: add index to deletedAt
    new ScanCommand({
      TableName: Resource.WatchProductsTable.name,
      FilterExpression: "attribute_not_exists(deletedAt)",
      ProjectionExpression:
        "productId, productName, userId, minDiscountPercentage, lastNotifiedAt",
    }),
  );

  return result.Items?.map((item) => unmarshall(item) as WatchProduct) ?? [];
}

async function updateUserLastNotifiedAt(
  userId: string,
  date: string,
): Promise<UpdateItemCommandOutput> {
  return dbClient.send(
    new UpdateItemCommand({
      TableName: Resource.UsersTable.name,
      Key: { id: { N: userId } },
      UpdateExpression: "SET lastNotifiedAt = :now",
      ExpressionAttributeValues: { ":now": { S: date } },
    }),
  );
}

async function updateProductsLastNotifiedAt(
  userId: string,
  productIds: number[],
  date: string,
): Promise<UpdateItemCommandOutput[]> {
  return Promise.all(
    productIds.map((productId) =>
      dbClient.send(
        new UpdateItemCommand({
          TableName: Resource.WatchProductsTable.name,
          Key: {
            productId: { N: productId.toString() },
            userId: { N: userId },
          },
          UpdateExpression: "SET lastNotifiedAt = :now",
          ExpressionAttributeValues: { ":now": { S: date } },
        }),
      ),
    ),
  );
}

async function insertAnalytics(
  analytics: ProductAnalytics[],
): Promise<BatchWriteItemCommandOutput> {
  return dbClient.send(
    new BatchWriteItemCommand({
      RequestItems: {
        [Resource.ProductAnalyticsTable.name]: analytics.map((item) => ({
          PutRequest: { Item: marshall(item) },
        })),
      },
    }),
  );
}

const escapeMarkdown = (text: string | number): string => {
  return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
};

const formatNumber = (num: number): number => {
  return Number.isInteger(num) ? num : Number.parseFloat(num.toFixed(2));
};

const getTimeInTimeZone = (timezone: string): Date => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: timezone }));
};
