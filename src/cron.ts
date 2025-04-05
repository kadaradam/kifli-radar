import {
  DynamoDBClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyResult } from "aws-lambda";
import { Api } from "grammy";
import { Resource } from "sst";
import { KifliService } from "~/services/kifli.service";
import type { KifliLastMinuteProduct, User, WatchProduct } from "./types";

const api = new Api(process.env.TELEGRAM_BOT_TOKEN!);
const dbClient = new DynamoDBClient();
const kifliService = new KifliService();

export const handler = async (): Promise<APIGatewayProxyResult> => {
  console.log("Cron job triggered at", new Date().toISOString());

  try {
    const [products, snoozedUsers] = await Promise.all([
      getProducts(),
      getSnoozedUsers(),
    ]);

    console.log(`Found ${products.length} active watch products`);
    console.log(`Found ${snoozedUsers.length} snoozed users`);

    const discountedProducts = await findDiscountedProducts(
      products,
      snoozedUsers,
    );

    let totalDiscountedProducts = 0;

    for (const chatId in discountedProducts) {
      const products = discountedProducts[chatId];

      if (!products) {
        continue;
      }

      totalDiscountedProducts += products.length;

      await sendDiscountNotification(chatId, products);
    }

    await updateLastNotifiedAt(discountedProducts);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Cron job executed successfully! Total discounted products: ${totalDiscountedProducts}`,
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
  snoozedUsers: User[],
): Promise<Record<string, KifliLastMinuteProduct[]>> {
  const productIds = watchList
    .filter((watch) => watch.isActive)
    .filter((watch) => !snoozedUsers.some((user) => user.id === watch.userId))
    .map((watch) => watch.productId);

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

  // Create inline snooze buttons for the last product
  /* const lastProduct = products[products.length - 1];
  const keyboard = new InlineKeyboard();

  if (lastProduct) {
    keyboard
      .text("2 óra off 🛋️", `snooze:${lastProduct.productId}_2`)
      .text("4 óra off 🛋️", `snooze:${lastProduct.productId}_4`)
      .row()
      .text("8 óra off 🛋️", `snooze:${lastProduct.productId}_8`)
      .text("24 óra off 🛋️", `snooze:${lastProduct.productId}_24`);
  } */

  // Send the message
  await api.sendMessage(userId, messageText, {
    parse_mode: "MarkdownV2",
  });

  // Set a timer to remove the buttons after 5 minutes
  /*  setTimeout(
    async () => {
      await api.editMessageReplyMarkup(userId, message.message_id, {
        reply_markup: undefined,
      });
    },
    5 * 60 * 1000,
  ); */
}

async function getProducts(): Promise<WatchProduct[]> {
  const now = new Date().toISOString();

  const result = await dbClient.send(
    new ScanCommand({
      TableName: Resource.WatchProductsTable.name,
      FilterExpression:
        "isActive = :active AND (attribute_not_exists(notifyAfter) OR notifyAfter < :now)",
      ExpressionAttributeValues: {
        ":active": { BOOL: true },
        ":now": { S: now },
      },
    }),
    /* new QueryCommand({
      TableName: Resource.WatchProductsTable.name,
      IndexName: "byNotifyAfter",
      KeyConditionExpression: "isActive = :active AND notifyAfter < :now",
      ExpressionAttributeValues: {
        ":active": { BOOL: true },
        ":now": { S: now },
      },
    }), */
  );

  return result.Items?.map((item) => unmarshall(item) as WatchProduct) ?? [];
}

async function getSnoozedUsers(): Promise<User[]> {
  const now = new Date().toISOString();
  const result = await dbClient.send(
    new QueryCommand({
      TableName: Resource.UsersTable.name,
      IndexName: "byNotifyAfter",
      KeyConditionExpression: "notifyAfterPK = :gsi1pk AND notifyAfter > :now",
      ExpressionAttributeValues: {
        ":gsi1pk": { S: "USER_WITH_NOTIFY_AFTER" },
        ":now": { S: now },
      },
    }),
  );

  return result.Items?.map((item) => unmarshall(item) as User) ?? [];
}

async function updateLastNotifiedAt(
  discountedProducts: Record<string, KifliLastMinuteProduct[]>,
): Promise<void> {
  const now = new Date().toISOString();

  const userIds = Object.keys(discountedProducts);
}

const escapeMarkdown = (text: string | number) => {
  return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
};

const formatNumber = (num: number) => {
  return Number.isInteger(num) ? num : Number.parseFloat(num.toFixed(2));
};
