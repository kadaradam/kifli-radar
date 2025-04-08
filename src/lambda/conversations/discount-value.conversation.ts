import {
  ConditionalCheckFailedException,
  type DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { Conversation } from "@grammyjs/conversations";
import { Resource } from "sst";
import type { AppContext } from "../context";

export const ASK_FOR_DISCOUNT_VALUE_KEY = "askForDiscountValue";

// Define a conversation for asking a value (refactored)
export const askForDiscountValue =
  (dbClient: DynamoDBClient) =>
  async (
    conversation: Conversation<AppContext, AppContext>,
    ctx: AppContext,
  ) => {
    const check = conversation.checkpoint();
    const response = await conversation.wait(); // Wait for user input
    const input = Number(response.message?.text);

    if (Number.isNaN(input) || input < 5 || input > 100) {
      await ctx.reply("❌ Bruh, ez nem jó! Adj egy számot 5 és 100 között! 🎯");

      // Rewind the conversation to the start
      await conversation.rewind(check);
      //await ctx.conversation.enter(ASK_FOR_DISCOUNT_VALUE_KEY);
      return;
    }

    // Read session data inside a conversation.
    const session = await conversation.external((ctx) => ctx.session);
    const userId = ctx.from?.id;

    if (!userId || !session.userWatchSelectedProduct) {
      await ctx.reply("Itt valami elcsesződött! Próbáld újra később! 😅");
      return;
    }

    const productId = session.userWatchSelectedProduct.id;
    const productName = session.userWatchSelectedProduct.name;

    await createWatchProduct(dbClient, {
      productId,
      productName,
      userId,
      minDiscountPercentage: input,
    });

    // Remove user selected product
    session.userWatchSelectedProduct = undefined;

    // Save session data inside a conversation.
    await conversation.external((ctx) => {
      ctx.session = session;
    });

    await ctx.reply(
      `🎉 Kész tesó! Figyeljük a terméket, és szólok ha ${input}% kedvezmény lesz rajta! 🚀`,
      { parse_mode: "Markdown" },
    );

    return; // Exit conversation when valid input is received
  };

async function createWatchProduct(
  dbClient: DynamoDBClient,
  {
    productId,
    productName,
    userId,
    minDiscountPercentage,
  }: {
    productId: number;
    productName: string;
    userId: number;
    minDiscountPercentage: number;
  },
): Promise<void> {
  const now = new Date().toISOString();

  try {
    // First try to update if item exists and is deleted
    await dbClient.send(
      new UpdateItemCommand({
        TableName: Resource.WatchProductsTable.name,
        Key: {
          userId: { N: userId.toString() },
          productId: { N: productId.toString() },
        },
        UpdateExpression:
          "SET updatedAt = :updatedAt, minDiscountPercentage = :minDiscountPercentage REMOVE deletedAt",
        ConditionExpression: "attribute_exists(deletedAt)",
        ExpressionAttributeValues: {
          ":updatedAt": { S: now },
          ":minDiscountPercentage": { N: minDiscountPercentage.toString() },
        },
      }),
    );
  } catch (error) {
    if (
      error instanceof
      ConditionalCheckFailedException /* && error.name === "ConditionalCheckFailedException" */
    ) {
      // If item doesn't exist or isn't deleted, create new item
      await dbClient.send(
        new PutItemCommand({
          TableName: Resource.WatchProductsTable.name,
          Item: {
            productId: { N: productId.toString() },
            productName: { S: productName },
            userId: { N: userId.toString() },
            minDiscountPercentage: { N: minDiscountPercentage.toString() },
            createdAt: { S: now },
            updatedAt: { S: now },
          },
        }),
      );
    } else {
      throw error;
    }
  }
}
