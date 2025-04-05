import {
  type DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { CallbackQueryContext } from "grammy";
import { Resource } from "sst";
import type { AppContext } from "../context";

export const productRemoveCallback =
  (dbClient: DynamoDBClient) =>
  async (ctx: CallbackQueryContext<AppContext>) => {
    const userId = ctx.from?.id;
    const productId = ctx.match[1];

    if (!userId || !productId) {
      await ctx.answerCallbackQuery({
        text: "❌ Hiba történt a termék eltávolítása közben",
      });
      return;
    }

    await removeUserProduct(dbClient, { userId, productId });

    await ctx.answerCallbackQuery({
      text: "✅ Sikeresen eltávolítottam a terméket a figyelőlistádról",
    });

    // Update the message to show confirmation + remove keyboard
    await ctx.editMessageText("✅ A termék eltávolítva a figyelőlistádról");
  };

const removeUserProduct = async (
  dbClient: DynamoDBClient,
  { userId, productId }: { userId: number; productId: string },
): Promise<void> => {
  await dbClient.send(
    new UpdateItemCommand({
      TableName: Resource.WatchProductsTable.name,
      Key: {
        userId: { N: userId.toString() },
        productId: { N: productId },
      },
      UpdateExpression: "SET isActive = :inactive, updatedAt = :now",
      ExpressionAttributeValues: {
        ":inactive": { BOOL: false },
        ":now": { S: new Date().toISOString() },
      },
    }),
  );
};
