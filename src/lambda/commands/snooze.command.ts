import {
  type DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { CommandContext } from "grammy";
import type { BotCommand } from "grammy/types";
import { Resource } from "sst";
import { commandName } from "~/utils/commands";
import { config } from "../config";
import type { AppContext } from "../context";

// Command name
export const SNOOZE_COMMAND_KEY = "snooze";

// Command metadata for bot menu
export const snoozeCommandInfo: BotCommand = {
  command: SNOOZE_COMMAND_KEY,
  description: `Akció értesítések szüneteltetése. ${commandName(
    SNOOZE_COMMAND_KEY,
  )} «óra» (1-${config.MAX_SNOOZE_HOURS})`,
};

export const snoozeCommand =
  (dbClient: DynamoDBClient) => async (ctx: CommandContext<AppContext>) => {
    const userId = ctx.from?.id;

    if (!userId) return;

    const hours = Number.parseInt(ctx.match);

    if (Number.isNaN(hours) || hours < 1 || hours > config.MAX_SNOOZE_HOURS) {
      return ctx.reply(
        `🚫 Helytelen érték. Kérlek adj meg egy értéket 1 és ${config.MAX_SNOOZE_HOURS} között.`,
      );
    }

    await snoozeUser(dbClient, { userId, hours });

    await ctx.reply(`🔕 Oké, ${hours} óráig nem írok! 😴`);
  };

const snoozeUser = async (
  dbClient: DynamoDBClient,
  { userId, hours }: { userId: number; hours: number },
) => {
  const now = new Date();
  const snoozeUntil = new Date(now.getTime() + hours * 60 * 60 * 1000);

  await dbClient.send(
    new UpdateItemCommand({
      TableName: Resource.UsersTable.name,
      Key: {
        id: { N: userId.toString() },
      },
      UpdateExpression:
        "SET notifyAfter = :notify_after, updatedAt = :now, notifyAfterPK = :gsi1pk",
      ExpressionAttributeValues: {
        ":notify_after": { S: snoozeUntil.toString() },
        ":now": { S: now.toISOString() },
        ":gsi1pk": { S: "USER_WITH_NOTIFY_AFTER" },
      },
    }),
  );
};
