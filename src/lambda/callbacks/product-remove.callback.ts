import type { CallbackQueryContext } from "grammy";
import { Resource } from "sst";
import type { ICachedDBClient } from "~/types";
import type { AppContext } from "../context";

export const productRemoveCallback = async (
  ctx: CallbackQueryContext<AppContext>,
) => {
  const userId = ctx.from?.id;
  const productId = ctx.match[1];
  const { db } = ctx;

  if (!userId || !productId) {
    await ctx.answerCallbackQuery({
      text: "❌ Hiba történt a termék eltávolítása közben",
    });
    return;
  }

  await removeUserProduct(db, { userId, productId });

  await ctx.answerCallbackQuery({
    text: "✅ Sikeresen eltávolítottam a terméket a figyelőlistádról",
  });

  // Update the message to show confirmation + remove keyboard
  await ctx.editMessageText("✅ A termék eltávolítva a figyelőlistádról");
};

const removeUserProduct = async (
  db: ICachedDBClient,
  { userId, productId }: { userId: number; productId: string },
): Promise<void> => {
  const now = new Date().toISOString();

  await db.updateItem(
    {
      TableName: Resource.WatchProductsTable.name,
      Key: {
        userId: { N: userId.toString() },
        productId: { N: productId },
      },
      UpdateExpression: "SET deletedAt = :deletedAt, updatedAt = :now",
      ExpressionAttributeValues: {
        ":deletedAt": { S: now },
        ":now": { S: now },
      },
    },
    { cacheKey: userId.toString() },
  );
};
