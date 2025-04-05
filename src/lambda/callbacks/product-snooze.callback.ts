import {
  type DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { CallbackQueryContext } from "grammy";
import { Resource } from "sst";
import type { AppContext } from "../context";

export const productSnoozeCallback =
  (dbClient: DynamoDBClient) =>
  async (ctx: CallbackQueryContext<AppContext>) => {
    if (!ctx.match[1] || !ctx.match[2]) {
      return;
    }

    const userId = ctx.from.id;
    const productId = ctx.match[1]; // Extract product ID
    const hours = Number.parseInt(ctx.match[2]); // Extract snooze time

    // Calculate snooze expiration time
    await saveSnoozeSetting(dbClient, {
      userId,
      productId,
      hours,
    });

    // Save snooze setting

    await ctx.answerCallbackQuery(`🔕 Oké, ${hours} óráig nem írok! 😴`);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }); // Remove the inline keyboard by editing the original message
  };

async function saveSnoozeSetting(
  dbClient: DynamoDBClient,
  {
    userId,
    productId,
    hours,
  }: { userId: number; productId: string; hours: number },
) {
  const now = new Date();
  const snoozeUntil = now.getTime() + hours * 60 * 60 * 1000;

  await dbClient.send(
    new UpdateItemCommand({
      TableName: Resource.WatchProductsTable.name,
      Key: {
        userId: { N: userId.toString() },
        productId: { N: productId },
      },
      UpdateExpression: "SET notifyAfter = :notify_after, updatedAt = :now",
      ExpressionAttributeValues: {
        ":notify_after": { S: snoozeUntil.toString() },
        ":now": { S: now.toISOString() },
      },
    }),
  );
}
