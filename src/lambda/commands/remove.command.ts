import { type DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { type CommandContext, InlineKeyboard } from "grammy";
import type { BotCommand } from "grammy/types";
import { Resource } from "sst";
import type { WatchProduct } from "~/types";
import { commandName } from "~/utils/commands";
import type { AppContext } from "../context";

// Command name
export const REMOVE_COMMAND_KEY = "remove";

// Command metadata for bot menu
export const removeCommandInfo: BotCommand = {
  command: REMOVE_COMMAND_KEY,
  description: `Kifli termék figyelés megszakítása. ${commandName(REMOVE_COMMAND_KEY)}`,
};

export const removeCommand = async (ctx: CommandContext<AppContext>) => {
  const userId = ctx.from?.id;

  if (!userId) return;

  const products = await getUserProducts(ctx.dbClient, userId);

  if (!products.length) {
    return ctx.reply("✨ Nincs figyelni való termék a listádon.");
  }

  const keyboard = new InlineKeyboard();

  for (const product of products) {
    const name = product.productName || "Névtelen termék";
    const id = product.productId;
    keyboard.text(`❌ ${name}`, `remove:${id}`).row();
  }

  const sentMsg = await ctx.reply(
    "🎯 Válassz ki egy terméket a figyelés megszakításához:",
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    },
  );

  // 🕒 Auto-remove keyboard after 30s if no interaction
  setTimeout(async () => {
    try {
      await ctx.api.editMessageReplyMarkup(
        ctx.chat.id,
        sentMsg.message_id,
        undefined,
      );
    } catch (err) {
      // silently ignore if already edited/deleted
    }
  }, 30000);
};

const getUserProducts = async (
  dbClient: DynamoDBClient,
  userId: number,
): Promise<WatchProduct[]> => {
  const products = await dbClient.send(
    new QueryCommand({
      TableName: Resource.WatchProductsTable.name,
      IndexName: "userProductsIndex",
      KeyConditionExpression: "userId = :uid",
      FilterExpression: "attribute_not_exists(deletedAt)",
      ExpressionAttributeValues: {
        ":uid": { N: userId.toString() },
      },
      ProjectionExpression: "productId, productName",
    }),
  );

  return products.Items?.map((item) => unmarshall(item) as WatchProduct) ?? [];
};
