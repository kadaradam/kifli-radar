import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
  type UpdateItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyResult } from "aws-lambda";
import { Api } from "grammy";
import { Resource } from "sst";
import { config } from "~/config";
import { KifliService } from "~/services/kifli.service";
import type { KifliLastMinuteProduct, User, WatchProduct } from "./types";

const api = new Api(process.env.TELEGRAM_BOT_TOKEN!);
const dbClient = new DynamoDBClient();
const kifliService = new KifliService();

export const handler = async (): Promise<APIGatewayProxyResult> => {
  console.log("Cron job triggered at", new Date().toISOString());

  try {
    const [notifiableProducts, notifiableUsers] = await Promise.all([
      getNotifiableProducts(),
      getNotifiableUsers(),
    ]);

    console.log(`Found ${notifiableProducts.length} notifiable products`);
    console.log(`Found ${notifiableUsers.length} notifiable users`);

    // Filter out users that are not notifiable
    const products = notifiableProducts.filter((product) =>
      notifiableUsers.some((user) => user.id === product.userId),
    );

    const discountedProducts = await findDiscountedProducts(products);

    console.log(
      `Found ${Object.keys(discountedProducts).length} discounted products`,
    );

    let totalDiscountedProducts = 0;

    for (const userId in discountedProducts) {
      const products = discountedProducts[userId];

      if (!products) {
        continue;
      }

      totalDiscountedProducts += products.length;

      await sendDiscountNotification(userId, products);
    }

    console.log(`Sent total of ${totalDiscountedProducts} notifications`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Cron job executed successfully!",
      }),
    };
  } catch (error) {
    console.error("Error fetching and processing products:", error);

    // TODO: Send message to admin???

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Cron job failed",
      }),
    };
  }
};

async function findDiscountedProducts(
  watchList: WatchProduct[],
): Promise<Record<string, KifliLastMinuteProduct[]>> {
  const productIds = watchList.map((watch) => watch.productId);

  const products =
    await kifliService.fetchLastMinuteStatusForProducts(productIds);

  const productsWithDiscount = products
    .filter((product) => product.prices.saleId)
    .filter((product) => product.stock.maxAvailableAmount > 0)
    .filter((product) => {
      const salePrice = product.prices.salePrice;
      const originalPrice = product.prices.originalPrice;
      const watchItem = watchList.find(
        (watch) => watch.productId === product.productId,
      );

      if (!salePrice || !watchItem?.minDiscountPercentage) {
        return false;
      }

      const discountPercentage = (1 - salePrice / originalPrice) * 100;
      return discountPercentage >= watchItem.minDiscountPercentage;
    })
    .reduce((acc: Record<string, KifliLastMinuteProduct[]>, product) => {
      const watchItems = watchList.filter(
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

  return productsWithDiscount;
}

async function sendDiscountNotification(
  userId: string,
  products: KifliLastMinuteProduct[],
): Promise<void> {
  if (products.length === 0) return;

  let messageText = "🔥 *Báttya, most őrület van\\!* 🤩\n\n";
  messageText += "Nézd meg ezeket a csodás akciókat:\n\n";

  // Add each product with its details
  for (const product of products) {
    const discountAmount =
      product.prices.originalPrice - product.prices.salePrice!;
    const discountPercentage = Math.round(
      (1 - product.prices.salePrice! / product.prices.originalPrice) * 100,
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
    messageText += `🔗 [Termék megtekintése](https://www.kifli.hu/${product.productId})\n\n`;
  }

  messageText += "🎉 *Ne hagyd, hogy lecsússz róluk, kapd el, amíg még van\\!*";

  // Send the message first
  await api.sendMessage(userId, messageText, {
    parse_mode: "MarkdownV2",
  });

  const now = new Date().toISOString();
  const productIds = products.map((product) => product.productId);

  await Promise.all([
    updateUserLastNotifiedAt(userId, now),
    updateProductsLastNotifiedAt(userId, productIds, now),
  ]);
}

// TODO: Create user and product services

async function getNotifiableProducts(): Promise<WatchProduct[]> {
  const result = await dbClient.send(
    // TODO: add index to deletedAt
    new ScanCommand({
      TableName: Resource.WatchProductsTable.name,
      FilterExpression: "attribute_not_exists(deletedAt)",
      ProjectionExpression:
        "productId, productName, userId, minDiscountPercentage, lastNotifiedAt",
    }),
  );

  const products =
    result.Items?.map((item) => unmarshall(item) as WatchProduct) ?? [];

  return products.filter((product) => {
    // Filter out products that were notified in the last 24 hours

    if (!product.lastNotifiedAt) {
      return true;
    }

    const diffHours =
      (Date.now() - new Date(product.lastNotifiedAt).getTime()) /
      (1000 * 60 * 60);
    return diffHours >= config.NEW_NOTIFICATION_THRESHOLD_IN_HOURS;
  });
}

async function getNotifiableUsers(): Promise<
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

  const users = result.Items?.map((item) => unmarshall(item) as User) ?? [];

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
    return (
      nowHours < sleepFromHours ||
      (nowHours === sleepFromHours && nowMinutes < sleepFromMinutes) ||
      nowHours > sleepToHours ||
      (nowHours === sleepToHours && nowMinutes > sleepToMinutes)
    );
  });
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

const escapeMarkdown = (text: string | number) => {
  return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
};

const formatNumber = (num: number) => {
  return Number.isInteger(num) ? num : Number.parseFloat(num.toFixed(2));
};

const getTimeInTimeZone = (timezone: string) => {
  const now = new Date();
  const timeInTimeZone = new Date(
    now.toLocaleString("en-US", { timeZone: timezone }),
  );
  return timeInTimeZone;
};
